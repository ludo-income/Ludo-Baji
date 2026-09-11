const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const db=require('./database');
const ROOT=__dirname,PORT=process.env.PORT||3000,SECRET=String(process.env.ADMIN_SECRET||''),ADMIN_USERNAME=String(process.env.ADMIN_USERNAME||''),ADMIN_PASSWORD=String(process.env.ADMIN_PASSWORD||''),ADMIN_ROLE=String(process.env.ADMIN_ROLE||'super_admin');
const USER_SECRET=String(process.env.USER_SECRET||'');
const CORS_ORIGIN=String(process.env.CORS_ORIGIN||'').trim();
const TRUST_PROXY=String(process.env.TRUST_PROXY||'').toLowerCase()==='true';
const MAX_BODY_BYTES=Math.max(1024*1024,Number(process.env.MAX_BODY_MB||10)*1024*1024);
const ADMIN_TOKEN_TTL_MS=Math.max(15,Number(process.env.ADMIN_TOKEN_TTL_MINUTES||480))*60*1000;
const ADMIN_LOGIN_WINDOW_MS=15*60*1000,ADMIN_LOGIN_MAX_ATTEMPTS=Math.max(3,Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS||5));
const adminSessions=new Map(),adminLoginAttempts=new Map();
function requireSecurityEnv(){const missing=[];if(!ADMIN_USERNAME||ADMIN_USERNAME.length<3||ADMIN_USERNAME.length>100)missing.push('ADMIN_USERNAME (3-100 characters)');if(!ADMIN_PASSWORD||ADMIN_PASSWORD.length<12||ADMIN_PASSWORD.length>200)missing.push('ADMIN_PASSWORD (12-200 characters)');if(!SECRET||SECRET.length<32)missing.push('ADMIN_SECRET (minimum 32 characters)');if(!USER_SECRET||USER_SECRET.length<32)missing.push('USER_SECRET (minimum 32 characters)');if(SECRET&&USER_SECRET&&SECRET===USER_SECRET)missing.push('USER_SECRET must be different from ADMIN_SECRET');if(missing.length)throw new Error('Required security environment variables are missing/unsafe: '+missing.join(', '));}
requireSecurityEnv();
const OTP_TTL_MS=Math.max(60,Number(process.env.OTP_TTL_SECONDS||300))*1000;
const OTP_COOLDOWN_MS=Math.max(30,Number(process.env.OTP_COOLDOWN_SECONDS||60))*1000;
const OTP_MAX_ATTEMPTS=Math.max(3,Number(process.env.OTP_MAX_ATTEMPTS||5));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
async function read(){return db.getData()}
async function write(d){return db.saveData(d)}
function send(res,status,body,type='application/json; charset=utf-8'){const h={'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(),microphone=(),geolocation=()'};if(CORS_ORIGIN){h['Access-Control-Allow-Origin']=CORS_ORIGIN;h['Access-Control-Allow-Headers']='Content-Type, Authorization';h['Access-Control-Allow-Methods']='GET,POST,PUT,DELETE,OPTIONS';h['Vary']='Origin'}res.writeHead(status,h);res.end(typeof body==='string'?body:JSON.stringify(body))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>MAX_BODY_BYTES){req.destroy();reject(new Error('Payload too large'))}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function signToken(payload,secret){const p=Buffer.from(JSON.stringify(payload)).toString('base64url');const s=crypto.createHmac('sha256',secret).update(p).digest('base64url');return p+'.'+s}
function verifyToken(raw,secret){try{const [p,s]=String(raw||'').split('.');if(!p||!s)return null;const es=crypto.createHmac('sha256',secret).update(p).digest('base64url');if(s.length!==es.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(es)))return null;const x=JSON.parse(Buffer.from(p,'base64url').toString());if(!x.e||Date.now()>x.e)return null;return x}catch{return null}}
function passwordMatches(input,expected){const a=Buffer.from(String(input||''));const b=Buffer.from(String(expected||''));return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function clientKey(req){if(TRUST_PROXY){const xf=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(xf)return xf}return req.socket.remoteAddress||'unknown'}
function loginBlocked(key){const now=Date.now(),x=adminLoginAttempts.get(key);if(!x)return false;if(now-x.first>ADMIN_LOGIN_WINDOW_MS){adminLoginAttempts.delete(key);return false}return x.count>=ADMIN_LOGIN_MAX_ATTEMPTS}
function recordLoginFailure(key){const now=Date.now(),x=adminLoginAttempts.get(key);if(!x||now-x.first>ADMIN_LOGIN_WINDOW_MS){adminLoginAttempts.set(key,{first:now,count:1});return}x.count++;adminLoginAttempts.set(key,x)}
function clearLoginFailures(key){adminLoginAttempts.delete(key)}
function issueAdminToken(){const jti=crypto.randomBytes(24).toString('hex'),e=Date.now()+ADMIN_TOKEN_TTL_MS;adminSessions.set(jti,{expiresAt:e,role:ADMIN_ROLE});return signToken({u:'admin',e,jti,role:ADMIN_ROLE},SECRET)}
function permissionForPath(method,p){if(p==='/api/admin/data'||p.startsWith('/api/admin/main-options'))return 'website';if(p.startsWith('/api/admin/payment-methods'))return 'deposits';if(p.startsWith('/api/admin/deposits'))return 'deposits';if(p.startsWith('/api/admin/withdrawals'))return 'withdrawals';if(p.startsWith('/api/admin/users'))return 'users';if(p.startsWith('/api/admin/matches')||p==='/api/admin/match-players')return 'matches';if(p.startsWith('/api/admin/transactions'))return 'transactions';if(p.startsWith('/api/admin/support'))return 'support';if(p.startsWith('/api/admin/reports'))return 'reports';if(p.startsWith('/api/admin/audit-log'))return 'audit';if(p.startsWith('/api/admin/roles'))return 'roles';if(p.startsWith('/api/admin/banners')||p.startsWith('/api/admin/faqs')||p.startsWith('/api/admin/pages'))return 'website';if(p.startsWith('/api/admin/system')||p.startsWith('/api/admin/notice'))return 'settings';return null}
async function auth(req,res){const raw=String(req.headers.authorization||'').replace(/^Bearer\s+/i,''),x=verifyToken(raw,SECRET);if(!x||x.u!=='admin'||!x.jti){send(res,401,{error:'Unauthorized'});return null}const session=adminSessions.get(x.jti);if(!session||session.expiresAt<=Date.now()){adminSessions.delete(x.jti);send(res,401,{error:'Session expired'});return null}if(session.role!==ADMIN_ROLE||x.role!==ADMIN_ROLE){adminSessions.delete(x.jti);send(res,403,{error:'Admin role is not permitted'});return null}const d=await read(),roles=Array.isArray(d.adminRoles)?d.adminRoles:[],role=roles.find(r=>String(r.id)===ADMIN_ROLE);if(!role){send(res,403,{error:'Configured admin role does not exist'});return null}const perm=permissionForPath(req.method,req.url.split('?')[0]);const permissions=Array.isArray(role.permissions)?role.permissions:[];if(perm&&!(permissions.includes('*')||permissions.includes(perm))){send(res,403,{error:'Permission denied'});return null}return x}
function revokeAdminToken(req){const raw=String(req.headers.authorization||'').replace(/^Bearer\s+/i,''),x=verifyToken(raw,SECRET);if(x?.jti)adminSessions.delete(x.jti);}
function userAuth(req,res){const x=verifyToken((req.headers.authorization||'').replace(/^Bearer\s+/i,''),USER_SECRET);if(!x||x.typ!=='user'){send(res,401,{ok:false,error:'Login required'});return null}return x}
function normalizeBDPhone(input){let s=String(input||'').trim().replace(/[\s()-]/g,'');if(/^01\d{9}$/.test(s))return '+880'+s.slice(1);if(/^8801\d{9}$/.test(s))return '+'+s;if(/^\+8801\d{9}$/.test(s))return s;return null}
function otpHash(email,otp){return crypto.createHash('sha256').update(email+'|'+otp+'|'+USER_SECRET).digest('hex')}
function makeOtp(){return String(crypto.randomInt(0,1000000)).padStart(6,'0')}
function normalizeEmail(input){const e=String(input||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254?e:null}
function maskEmail(email){const [local,domain]=String(email).split('@');if(!domain)return '****';return (local.length<=2?(local[0]||'*'):local.slice(0,2))+'***@'+domain}
async function addAudit(action,target,detail){try{const d=await read();d.auditLogs=Array.isArray(d.auditLogs)?d.auditLogs:[];d.auditLogs.unshift({id:'A-'+Date.now()+Math.random().toString(36).slice(2,5),action,target:String(target||''),detail,created_at:new Date().toISOString()});d.auditLogs=d.auditLogs.slice(0,2000);await write(d)}catch{}}

async function sendOtpEmail(email,otp){
  const host=process.env.SMTP_HOST,port=Number(process.env.SMTP_PORT||465),user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM||user;
  if(host&&user&&pass){let nodemailer;try{nodemailer=require('nodemailer')}catch{throw new Error('Email provider dependency is missing. Run npm install.')}const transporter=nodemailer.createTransport({host,port,secure:String(process.env.SMTP_SECURE||'true').toLowerCase()==='true',auth:{user,pass}});await transporter.sendMail({from,to:email,subject:'Ludo Baji Login OTP',text:`Your Ludo Baji OTP is ${otp}. It expires in 5 minutes. Do not share this OTP with anyone.`});return {sent:true,provider:'smtp'};}
  if(String(process.env.OTP_DEV_MODE||'').toLowerCase()==='true'){console.log(`[OTP DEV] ${email}: ${otp}`);return {sent:false,dev:true,otp};}
  throw new Error('Email provider is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM, or enable OTP_DEV_MODE for testing.');
}
async function userLoginOtpEnabled(){const d=await read();return d.system?.user_login_otp!==false}
const MAIN_PAGE_DEFAULTS=[
  {id:'match',name:'Match',icon:'🎮',content:'Match system-এর content এখানে Auto Show হবে।'},
  {id:'deposit',name:'Deposit',icon:'💳',content:'Deposit system-এর content এখানে Auto Show হবে।'},
  {id:'statement',name:'My Statement',icon:'🏷️',content:'My Statement system-এর content এখানে Auto Show হবে।'},
  {id:'withdraw',name:'Withdraw',icon:'💰',content:'Withdraw system-এর content এখানে Auto Show হবে।'},
  {id:'support',name:'Support',icon:'✅',content:'Support system-এর content এখানে Auto Show হবে।'},
  {id:'mymatch',name:'My Match',icon:'🎮',content:'My Match system-এর content এখানে Auto Show হবে।'},
  {id:'notifications',name:'Notifications',icon:'🔔',content:'Notifications system-এর content এখানে Auto Show হবে।'},
  {id:'referral',name:'Referral',icon:'🔗',content:'Referral system-এর content এখানে Auto Show হবে।'},
  {id:'leaderboard',name:'Leaderboard',icon:'🏆',content:'Leaderboard system-এর content এখানে Auto Show হবে。'}
];
function normalizeMainOptions(d){
  const list=Array.isArray(d.mainOptions)?d.mainOptions.slice():[]; const byId=new Map(list.map(x=>[String(x.id),x])); let changed=false;
  MAIN_PAGE_DEFAULTS.forEach((def,i)=>{let x=byId.get(def.id); if(!x){x={...def,logo:'',visible:true};list.push(x);byId.set(def.id,x);changed=true} const before=JSON.stringify(x); x.visible=x.visible!==false; x.order=Number(x.order||i+1); x.short_name=x.short_name||''; x.button_text=x.button_text||''; x.action=x.action||'auto'; x.background=x.background||'#092d21'; x.text_color=x.text_color||'#ffffff'; x.border_radius=Number.isFinite(Number(x.border_radius))?Number(x.border_radius):12; if(JSON.stringify(x)!==before)changed=true});
  d.mainOptions=list.sort((a,b)=>Number(a.order||999)-Number(b.order||999)); return {data:d,changed};
}

const server=http.createServer(async(req,res)=>{try{
 const u=url.parse(req.url,true),p=u.pathname;
 if(req.method==='OPTIONS'){const h={};if(CORS_ORIGIN){h['Access-Control-Allow-Origin']=CORS_ORIGIN;h['Access-Control-Allow-Headers']='Content-Type, Authorization';h['Access-Control-Allow-Methods']='GET,POST,PUT,DELETE,OPTIONS';h['Vary']='Origin'}res.writeHead(204,h);return res.end()}
 if(p.startsWith('/api/')&&p!=='/api/site'&&!p.startsWith('/api/admin')){const md=await read();if(md.system?.maintenance?.enabled===true)return send(res,503,{ok:false,error:'Ludo Baji Website & App Update চলছে। এখন প্রবেশ করা যাবে না।'});}
 if(req.method==='POST'&&p==='/api/login'){const key=clientKey(req);if(loginBlocked(key))return send(res,429,{ok:false,error:'অনেকবার ভুল Login চেষ্টা হয়েছে। 15 মিনিট পরে আবার চেষ্টা করুন'});const x=await body(req);const username=String(x.username||''),password=String(x.password||'');if(username.length>100||password.length>200)return send(res,400,{ok:false,error:'Invalid login data'});if(passwordMatches(username,ADMIN_USERNAME)&&passwordMatches(password,ADMIN_PASSWORD)){clearLoginFailures(key);return send(res,200,{ok:true,token:issueAdminToken(),expires_in:Math.floor(ADMIN_TOKEN_TTL_MS/1000),role:ADMIN_ROLE})}recordLoginFailure(key);return send(res,401,{ok:false,error:'Username অথবা Password ভুল'})}
 if(req.method==='POST'&&p==='/api/admin/logout'){const x=await auth(req,res);if(!x)return;revokeAdminToken(req);return send(res,200,{ok:true})}
 if(req.method==='POST'&&p==='/api/auth/request-otp'){
   if(!(await userLoginOtpEnabled()))return send(res,403,{ok:false,error:'User Login / OTP System is currently OFF. Admin Panel থেকে ON করুন।'});
   const x=await body(req),email=normalizeEmail(x.email);if(!email)return send(res,400,{ok:false,error:'সঠিক Email/Gmail address দিন'});
   let user=await db.findUserByEmail(email);if(user&&user.status!=='active')return send(res,403,{ok:false,error:'এই অ্যাকাউন্টটি বন্ধ আছে'});
   const now=Date.now();if(user?.otp_sent_at&&now-new Date(user.otp_sent_at).getTime()<OTP_COOLDOWN_MS)return send(res,429,{ok:false,error:'আবার OTP চাইতে একটু অপেক্ষা করুন',retry_after:Math.ceil((OTP_COOLDOWN_MS-(now-new Date(user.otp_sent_at).getTime()))/1000)});
   if(!user)user=await db.createUserByEmail(email);
   const otp=makeOtp(),expires=new Date(now+OTP_TTL_MS).toISOString(),sent=new Date(now).toISOString();
   try{const result=await sendOtpEmail(email,otp);await db.setUserOtpByEmail(email,otpHash(email,otp),expires,sent);return send(res,200,{ok:true,message:result.dev?'Test OTP generated':'OTP sent successfully',email:maskEmail(email),expires_in:Math.floor(OTP_TTL_MS/1000),...(result.dev?{dev_otp:otp}: {})})}catch(e){return send(res,503,{ok:false,error:e.message})}
 }
 if(req.method==='POST'&&p==='/api/auth/verify-otp'){
   if(!(await userLoginOtpEnabled()))return send(res,403,{ok:false,error:'User Login / OTP System is currently OFF. Admin Panel থেকে ON করুন।'});
   const x=await body(req),email=normalizeEmail(x.email),otp=String(x.otp||'').trim();if(!email||!/^[0-9]{6}$/.test(otp))return send(res,400,{ok:false,error:'Email এবং ৬ সংখ্যার OTP দিন'});
   const user=await db.findUserByEmail(email);if(!user)return send(res,404,{ok:false,error:'অ্যাকাউন্ট পাওয়া যায়নি'});if(user.status!=='active')return send(res,403,{ok:false,error:'এই অ্যাকাউন্টটি বন্ধ আছে'});
   if(!user.otp_hash||!user.otp_expires_at)return send(res,400,{ok:false,error:'OTP-এর মেয়াদ শেষ। নতুন OTP নিন'});
   if(Date.now()>new Date(user.otp_expires_at).getTime()){await db.clearUserOtpByEmail(email);return send(res,400,{ok:false,error:'OTP-এর মেয়াদ শেষ। নতুন OTP নিন'});}
   if(Number(user.otp_attempts||0)>=OTP_MAX_ATTEMPTS){await db.clearUserOtpByEmail(email);return send(res,429,{ok:false,error:'অনেকবার ভুল OTP দেওয়া হয়েছে। নতুন OTP নিন'});}
   if(otpHash(email,otp)!==user.otp_hash){await db.updateOtpAttemptsByEmail(email,Number(user.otp_attempts||0)+1);return send(res,401,{ok:false,error:'OTP সঠিক নয়'});}
   await db.clearUserOtpByEmail(email);const fresh=await db.getUserById(user.id);await db.ensureUserWallet(fresh.id);const userToken=signToken({typ:'user',id:String(fresh.id),e:Date.now()+30*86400000},USER_SECRET);return send(res,200,{ok:true,token:userToken,user:{id:fresh.id,user_code:fresh.user_code,email:fresh.email||email,phone:fresh.phone||null,name:fresh.name||'',status:fresh.status}});
 }
 if(req.method==='GET'&&p==='/api/auth/me'){const x=userAuth(req,res);if(!x)return;const user=await db.getUserById(x.id);if(!user)return send(res,404,{ok:false,error:'User not found'});return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,email:user.email||'',phone:user.phone||null,name:user.name||'',status:user.status}})}
 if(req.method==='GET'&&p==='/api/user/dashboard'){const x=userAuth(req,res);if(!x)return;const user=await db.getUserById(x.id);if(!user)return send(res,404,{ok:false,error:'User not found'});const dashboard=await db.getUserDashboard(x.id);return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,email:user.email||'',phone:user.phone||null,name:user.name||'',status:user.status},dashboard})}
 if(req.method==='PUT'&&p==='/api/auth/profile'){const x=userAuth(req,res);if(!x)return;const b=await body(req),name=String(b.name||'').trim();if(name.length>60)return send(res,400,{ok:false,error:'Name too long'});const user=await db.updateUserName(x.id,name);return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,email:user.email||'',phone:user.phone||null,name:user.name||'',status:user.status}})}
 if(req.method==='GET'&&p==='/api/deposit/info'){
   const d=await read(); const methods=(d.paymentMethods||[]).filter(m=>m.enabled!==false).sort((a,b)=>Number(a.order||999)-Number(b.order||999)); return send(res,200,{ok:true,methods});
 }
 if(req.method==='GET'&&p==='/api/user/deposits'){
   const x=userAuth(req,res);if(!x)return;
   return send(res,200,{ok:true,deposits:await db.listUserDeposits(x.id)});
 }
 if(req.method==='POST'&&p==='/api/user/deposits'){
   const x=userAuth(req,res);if(!x)return;
   const b=await body(req),method=String(b.method||'').toLowerCase(),amount=Number(b.amount),transactionId=String(b.transaction_id||'').trim(),screenshot=String(b.screenshot||'');
   const pd=(await read()).paymentMethods||[], pm=pd.find(m=>m.id===method&&m.enabled!==false);
   if(!pm)return send(res,400,{ok:false,error:'এই Payment Method বর্তমানে বন্ধ'}); if(!Number.isFinite(amount)||amount<Number(pm.min_deposit||0)||amount>Number(pm.max_deposit||1000000))return send(res,400,{ok:false,error:`Deposit amount ৳${pm.min_deposit||0} থেকে ৳${pm.max_deposit||1000000} এর মধ্যে দিন`});
   if(!/^[A-Za-z0-9._-]{3,100}$/.test(transactionId))return send(res,400,{ok:false,error:'সঠিক Transaction ID দিন'});
   if(!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(screenshot))return send(res,400,{ok:false,error:'Payment screenshot upload করুন'});
   const comma=screenshot.indexOf(','),bytes=comma>0?Buffer.byteLength(screenshot.slice(comma+1),'base64'):0;if(bytes>8*1024*1024)return send(res,413,{ok:false,error:'Screenshot সর্বোচ্চ 8MB হতে পারবে'});
   try{const d=await db.createDeposit(x.id,method,amount,transactionId,screenshot);return send(res,201,{ok:true,message:'Deposit request জমা হয়েছে। Admin approval-এর অপেক্ষায় আছে।',deposit:{id:d.id,method:d.method,amount:Number(d.amount),transaction_id:d.transaction_id,status:d.status,created_at:d.created_at}})}catch(e){return send(res,400,{ok:false,error:e.message||'Deposit failed'})}
 }
 if(req.method==='GET'&&p==='/api/user/transactions'){
   const x=userAuth(req,res);if(!x)return;
   return send(res,200,{ok:true,transactions:await db.listUserTransactions(x.id)});
 }
 if(req.method==='GET'&&p==='/api/user/withdrawals'){
   const x=userAuth(req,res);if(!x)return;
   return send(res,200,{ok:true,withdrawals:await db.listUserWithdrawals(x.id)});
 }
 if(req.method==='POST'&&p==='/api/user/withdrawals'){
   const x=userAuth(req,res);if(!x)return;
   const b=await body(req),method=String(b.method||'').toLowerCase(),accountNumber=String(b.account_number||'').trim(),amount=Number(b.amount),balanceType=String(b.balance_type||'winning').toLowerCase();
   const minWithdrawal=Math.max(1,Number(process.env.MIN_WITHDRAWAL||100)),maxWithdrawal=Math.max(minWithdrawal,Number(process.env.MAX_WITHDRAWAL||1000000));
   if(!['bkash','nagad'].includes(method))return send(res,400,{ok:false,error:'bKash অথবা Nagad নির্বাচন করুন'});
   if(!['gaming','winning'].includes(balanceType))return send(res,400,{ok:false,error:'সঠিক Balance নির্বাচন করুন'});
   if(!/^01\d{9}$/.test(accountNumber)&&!/^(?:\+880|880)1\d{9}$/.test(accountNumber))return send(res,400,{ok:false,error:'সঠিক bKash/Nagad account number দিন'});
   if(!Number.isFinite(amount)||amount<minWithdrawal||amount>maxWithdrawal)return send(res,400,{ok:false,error:`Withdrawal amount ৳${minWithdrawal} থেকে ৳${maxWithdrawal} এর মধ্যে হতে হবে`});
   try{const d=await db.createWithdrawal(x.id,method,accountNumber,amount,balanceType);return send(res,201,{ok:true,message:'Withdrawal request জমা হয়েছে। Admin approval-এর অপেক্ষায় আছে।',withdrawal:{id:d.id,method:d.method,account_number:d.account_number,amount:Number(d.amount),balance_type:d.balance_type,status:d.status,created_at:d.created_at}})}catch(e){return send(res,400,{ok:false,error:e.message||'Withdrawal failed'})}
 }
 
 // ===== Steps 3-35 APIs =====
 if(req.method==='GET'&&p==='/api/payment-methods'){const d=await read();return send(res,200,{ok:true,methods:(d.paymentMethods||[]).filter(x=>x.enabled)});}
 if(req.method==='GET'&&p==='/api/user/matches'){const x=userAuth(req,res);if(!x)return;return send(res,200,{ok:true,matches:await db.listFeatureMatches(String(u.query.status||'all'))});}
 if(req.method==='GET'&&p==='/api/user/matches/mine'){const x=userAuth(req,res);if(!x)return;return send(res,200,{ok:true,matches:await db.listUserFeatureMatches(x.id)});}
 if(req.method==='GET'&&p.startsWith('/api/user/matches/')&&p.split('/').length===5){const x=userAuth(req,res);if(!x)return;const m=await db.getFeatureMatch(decodeURIComponent(p.split('/')[4]));if(!m)return send(res,404,{ok:false,error:'Match not found'});return send(res,200,{ok:true,match:m});}
 if(req.method==='POST'&&p.startsWith('/api/user/matches/')&&p.endsWith('/join')){const x=userAuth(req,res);if(!x)return;const id=decodeURIComponent(p.split('/')[4]);try{const r=await db.joinFeatureMatch(id,x.id);return send(res,200,{ok:true,message:'Match joined successfully',...r});}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/user/notifications'){const x=userAuth(req,res);if(!x)return;return send(res,200,{ok:true,notifications:await db.listNotifications(x.id)});}
 if(req.method==='POST'&&p==='/api/user/notifications/read'){const x=userAuth(req,res);if(!x)return;const b=await body(req);await db.markNotificationsRead(x.id,String(b.id||'all'));return send(res,200,{ok:true});}
 if(req.method==='GET'&&p==='/api/user/support'){const x=userAuth(req,res);if(!x)return;return send(res,200,{ok:true,messages:await db.supportList(x.id)});}
 if(req.method==='POST'&&p==='/api/user/support'){const x=userAuth(req,res);if(!x)return;const b=await body(req);try{return send(res,200,{ok:true,message:await db.supportSend(x.id,'user',b.message)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/user/referral'){const x=userAuth(req,res);if(!x)return;const user=await db.getUserById(x.id),d=await read(),cfg=d.referral||{};return send(res,200,{ok:true,code:(cfg.code_prefix||'LB')+String(user.user_code||user.id).replace(/\W/g,''),bonus:Number(cfg.bonus||0),enabled:cfg.enabled!==false});}
 if(p.startsWith('/api/admin')){const x=await auth(req,res);if(!x)return;}
 if(req.method==='GET'&&p==='/api/admin/users'){const q=String(u.query.q||'');return send(res,200,{ok:true,users:await db.listUsers(500,q)});}
 if(req.method==='POST'&&p.startsWith('/api/admin/users/')&&p.endsWith('/status')){const id=decodeURIComponent(p.split('/')[4]),b=await body(req);try{const user=await db.setUserStatus(id,b.status);await addAudit('user_status',id,b.status);return send(res,200,{ok:true,user});}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='POST'&&p.startsWith('/api/admin/users/')&&p.endsWith('/balance')){const id=decodeURIComponent(p.split('/')[4]),b=await body(req);try{const r=await db.adjustBalance(id,b.balance_type,b.amount,b.note);await addAudit('balance_adjustment',id,b);return send(res,200,{ok:true,result:r});}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/admin/payment-methods'){const d=await read();return send(res,200,{ok:true,methods:d.paymentMethods||[]});}
 if(req.method==='POST'&&p==='/api/admin/payment-methods'){const b=await body(req),d=await read();d.paymentMethods=Array.isArray(d.paymentMethods)?d.paymentMethods:[];const id=String(b.id||('PAY-'+Date.now().toString(36)));if(d.paymentMethods.some(x=>String(x.id)===id))return send(res,409,{ok:false,error:'Payment Method ID already exists'});const m={id,provider:String(b.provider||'Payment'),account_type:String(b.account_type||'Personal'),name:String(b.name||'Deposit Method'),number:String(b.number||''),account_name:String(b.account_name||''),logo:String(b.logo||''),enabled:b.enabled!==false,order:Number(b.order||d.paymentMethods.length+1),min_deposit:Number(b.min_deposit||0),max_deposit:Number(b.max_deposit||1000000),instructions:String(b.instructions||'')};if(!m.name||!m.number)return send(res,400,{ok:false,error:'Method Name ও Number required'});d.paymentMethods.push(m);await write(d);await addAudit('payment_method_create',id,m);return send(res,201,{ok:true,method:m});}
 if(req.method==='PUT'&&p.startsWith('/api/admin/payment-methods/')){const id=decodeURIComponent(p.split('/').pop()),b=await body(req),d=await read();d.paymentMethods=Array.isArray(d.paymentMethods)?d.paymentMethods:[];let m=d.paymentMethods.find(x=>x.id===id);if(!m){m={id,name:id};d.paymentMethods.push(m)}Object.assign(m,{provider:String(b.provider??m.provider??(String(id).toLowerCase().includes('nagad')?'Nagad':'Payment')),account_type:String(b.account_type??m.account_type??(String(m.name||'').match(/merchant/i)?'Merchant':String(m.name||'').match(/agent/i)?'Agent':String(m.name||'').match(/debit/i)?'Debit':'Personal')),name:String(b.name??m.name),number:String(b.number??m.number),account_name:String((b.account_name??m.account_name)??''),logo:String((b.logo??m.logo)??''),enabled:b.enabled!==undefined?!!b.enabled:m.enabled!==false,min_deposit:Number((b.min_deposit??m.min_deposit)??0),max_deposit:Number((b.max_deposit??m.max_deposit)??1000000),instructions:String((b.instructions??m.instructions)??'')});await write(d);await addAudit('payment_method_update',id,m);return send(res,200,{ok:true,method:m});}
 if(req.method==='DELETE'&&p.startsWith('/api/admin/payment-methods/')){const id=decodeURIComponent(p.split('/').pop()),d=await read();d.paymentMethods=Array.isArray(d.paymentMethods)?d.paymentMethods:[];const before=d.paymentMethods.length;d.paymentMethods=d.paymentMethods.filter(x=>String(x.id)!==id);if(d.paymentMethods.length===before)return send(res,404,{ok:false,error:'Payment Method not found'});await write(d);await addAudit('payment_method_delete',id,{});return send(res,200,{ok:true});}
 if(req.method==='POST'&&p==='/api/admin/matches'){const b=await body(req);try{const m=await db.createFeatureMatch(b);await addAudit('match_create',m.id,m.title);return send(res,201,{ok:true,match:m});}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/admin/matches'){return send(res,200,{ok:true,matches:await db.listFeatureMatches(String(u.query.status||'all'))});}
 if(req.method==='PUT'&&p.startsWith('/api/admin/matches/')){const id=decodeURIComponent(p.split('/').pop()),b=await body(req);try{return send(res,200,{ok:true,match:await db.updateFeatureMatch(id,b)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='DELETE'&&p.startsWith('/api/admin/matches/')){const id=decodeURIComponent(p.split('/').pop()),d=await read();d.matches=(d.matches||[]).filter(m=>String(m.id)!==String(id));await write(d);return send(res,200,{ok:true});}
 if(req.method==='POST'&&p.startsWith('/api/admin/matches/')&&p.endsWith('/cancel')){const id=decodeURIComponent(p.split('/')[4]);const m=await db.getFeatureMatch(id);if(!m)return send(res,404,{ok:false,error:'Match not found'});if(m.status==='cancelled')return send(res,400,{ok:false,error:'Already cancelled'});for(const pl of (m.players||[])){try{await db.adjustBalance(pl.user_id,'gaming',Number(m.entry_fee),'Match cancelled refund '+m.match_code)}catch{}}const d=await read();const mm=(d.matches||[]).find(a=>String(a.id)===String(id));if(mm){mm.status='cancelled';mm.updated_at=new Date().toISOString();}await write(d);await addAudit('match_cancel',id,m.match_code);return send(res,200,{ok:true,match:mm});}
 if(req.method==='POST'&&p.startsWith('/api/admin/matches/')&&p.endsWith('/room')){const id=decodeURIComponent(p.split('/')[4]),b=await body(req);try{return send(res,200,{ok:true,match:await db.setFeatureRoom(id,b.room_id,b.room_password)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='POST'&&p.startsWith('/api/admin/matches/')&&p.endsWith('/winner')){const id=decodeURIComponent(p.split('/')[4]),b=await body(req);try{return send(res,200,{ok:true,match:await db.setFeatureWinner(id,b.user_id)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='POST'&&p.startsWith('/api/admin/matches/')&&p.endsWith('/prize')){const id=decodeURIComponent(p.split('/')[4]);try{return send(res,200,{ok:true,match:await db.approveFeaturePrize(id)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/admin/match-players'){const id=String(u.query.match_id||'');const m=await db.getFeatureMatch(id);if(!m)return send(res,404,{ok:false,error:'Match not found'});const users=await db.listUsers(500);const map=new Map(users.map(a=>[String(a.id),a]));return send(res,200,{ok:true,players:(m.players||[]).map(p=>({...p,user:map.get(String(p.user_id))||null}))});}
 if(req.method==='GET'&&p==='/api/admin/users'){
   const q=String(u.query.q||'').trim(),status=String(u.query.status||'all');
   let users=await db.listUsers(1000,q); if(['active','blocked'].includes(status))users=users.filter(x=>x.status===status);
   return send(res,200,{ok:true,users});
  }
  if(req.method==='GET'&&/^\/api\/admin\/users\/[^/]+$/.test(p)){
   const id=decodeURIComponent(p.split('/').pop());const detail=await db.getUserAdminDetail(id,300);if(!detail)return send(res,404,{ok:false,error:'User not found'});return send(res,200,{ok:true,...detail});
  }
  if(req.method==='POST'&&/^\/api\/admin\/users\/[^/]+\/status$/.test(p)){
   const id=decodeURIComponent(p.split('/')[4]),b=await body(req),status=String(b.status||'').toLowerCase();if(!['active','blocked'].includes(status))return send(res,400,{ok:false,error:'Invalid user status'});
   try{const user=await db.setUserStatus(id,status);await addAudit(status==='blocked'?'user_block':'user_unblock',id,{user_code:user.user_code,admin:ADMIN_USERNAME});return send(res,200,{ok:true,user})}catch(e){return send(res,400,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&/^\/api\/admin\/users\/[^/]+\/balance$/.test(p)){
   const id=decodeURIComponent(p.split('/')[4]),b=await body(req),balanceType=String(b.balance_type||''),amount=Number(b.amount),note=String(b.note||'Admin balance adjustment').trim().slice(0,300);
   if(!['gaming','winning'].includes(balanceType)||!Number.isFinite(amount)||amount===0)return send(res,400,{ok:false,error:'Valid balance type and non-zero amount required'});
   try{const result=await db.adjustBalance(id,balanceType,amount,note);await addAudit('user_balance_adjust',id,{balance_type:balanceType,change:Number(amount.toFixed(2)),before:result.before,after:result.after,note,admin:ADMIN_USERNAME});return send(res,200,{ok:true,result})}catch(e){return send(res,400,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&/^\/api\/admin\/users\/[^/]+\/notify$/.test(p)){
   const id=decodeURIComponent(p.split('/')[4]),b=await body(req),title=String(b.title||'Admin Notification').trim(),message=String(b.message||'').trim();if(!title||!message||title.length>120||message.length>2000)return send(res,400,{ok:false,error:'Title and message required'});
   try{const user=await db.getUserById(id);if(!user)return send(res,404,{ok:false,error:'User not found'});const notification=await db.notifyUser(id,title,message);await addAudit('user_notification',id,{user_code:user.user_code,title,admin:ADMIN_USERNAME});return send(res,201,{ok:true,notification})}catch(e){return send(res,400,{ok:false,error:e.message})}
  }
 if(req.method==='GET'&&p==='/api/admin/support'){return send(res,200,{ok:true,messages:await db.adminSupport()});}
 if(req.method==='POST'&&p==='/api/admin/support'){const b=await body(req);try{return send(res,200,{ok:true,message:await db.supportSend(b.user_id,'admin',b.message)})}catch(e){return send(res,400,{ok:false,error:e.message})}}
 if(req.method==='GET'&&p==='/api/admin/reports'){const d=await read(),tx=await db.listAdminTransactions(10000),users=await db.listUsers(10000);return send(res,200,{ok:true,summary:{users:users.length,active_users:users.filter(x=>x.status==='active').length,blocked_users:users.filter(x=>x.status==='blocked').length,deposit:Number(tx.filter(x=>x.type==='deposit'&&x.status==='completed').reduce((a,x)=>a+Number(x.amount||0),0)),withdrawal:Number(tx.filter(x=>x.type==='withdrawal'&&x.status==='completed').reduce((a,x)=>a+Number(x.amount||0),0)),matches:(d.matches||[]).length},transactions:tx});}
 if(req.method==='GET'&&p==='/api/admin/audit-log'){const d=await read();return send(res,200,{ok:true,logs:d.auditLogs||[]});}
 if(req.method==='GET'&&p==='/api/admin/roles'){const d=await read();return send(res,200,{ok:true,roles:d.adminRoles||[]});}
 if(req.method==='PUT'&&p==='/api/admin/roles'){const b=await body(req),d=await read();d.adminRoles=Array.isArray(b.roles)?b.roles:[];await write(d);return send(res,200,{ok:true,roles:d.adminRoles});}
 if(req.method==='GET'&&p==='/api/admin/banners'){const d=await read();return send(res,200,{ok:true,banners:d.banners||[]});}
 if(req.method==='POST'&&p==='/api/admin/banners'){const b=await body(req),d=await read();d.banners=Array.isArray(d.banners)?d.banners:[];const x={id:'B-'+Date.now(),title:String(b.title||''),image:String(b.image||''),link:String(b.link||''),enabled:b.enabled!==false,order:Number(b.order||0)};d.banners.push(x);await write(d);return send(res,201,{ok:true,banner:x});}
 if(req.method==='PUT'&&p.startsWith('/api/admin/banners/')){const id=decodeURIComponent(p.split('/').pop()),b=await body(req),d=await read();const x=(d.banners||[]).find(a=>String(a.id)===id);if(!x)return send(res,404,{ok:false,error:'Banner not found'});Object.assign(x,b);await write(d);return send(res,200,{ok:true,banner:x});}
 if(req.method==='DELETE'&&p.startsWith('/api/admin/banners/')){const id=decodeURIComponent(p.split('/').pop()),d=await read();d.banners=(d.banners||[]).filter(x=>String(x.id)!==id);await write(d);return send(res,200,{ok:true});}
 if(req.method==='GET'&&p==='/api/admin/faqs'){const d=await read();return send(res,200,{ok:true,faqs:d.faqs||[]});}
 if(req.method==='POST'&&p==='/api/admin/faqs'){const b=await body(req),d=await read();d.faqs=Array.isArray(d.faqs)?d.faqs:[];const x={id:'F-'+Date.now(),question:String(b.question||''),answer:String(b.answer||''),enabled:b.enabled!==false,order:Number(b.order||0)};if(!x.question||!x.answer)return send(res,400,{ok:false,error:'Question and answer required'});d.faqs.push(x);await write(d);return send(res,201,{ok:true,faq:x});}
 if(req.method==='PUT'&&p==='/api/admin/pages'){const b=await body(req),d=await read();d.pages={...(d.pages||{}),...b};await write(d);return send(res,200,{ok:true,pages:d.pages});}
 if(req.method==='GET'&&p==='/api/admin/system'){const d=await read();return send(res,200,{ok:true,system:d.system||{}});}
 if(req.method==='PUT'&&p==='/api/admin/system'){const b=await body(req),d=await read();d.system={...(d.system||{}),...b,maintenance:{...(d.system?.maintenance||{}),...(b.maintenance||{})}};await write(d);return send(res,200,{ok:true,system:d.system});}
 if(req.method==='POST'&&p==='/api/admin/notice'){const b=await body(req),d=await read();d.notifications_global=Array.isArray(d.notifications_global)?d.notifications_global:[];const n={id:'N-'+Date.now(),title:String(b.title||'Notice'),message:String(b.message||''),created_at:new Date().toISOString()};d.notifications_global.unshift(n);const users=await db.listUsers(10000);if(!db.hasDatabase()){const fs=require('fs'),fp=path.join(ROOT,'notifications.json');let a=[];try{a=JSON.parse(fs.readFileSync(fp,'utf8'))}catch{};users.forEach(x=>a.unshift({id:Date.now()+Math.random(),user_id:x.id,title:n.title,message:n.message,read_at:null,created_at:n.created_at}));fs.writeFileSync(fp,JSON.stringify(a,null,2));}await write(d);return send(res,201,{ok:true,notice:n});}

 if(req.method==='GET'&&p==='/api/site'){const d=await read();return send(res,200,normalizeMainOptions(d).data)}
 if(p.startsWith('/api/admin')){const d=await read();
  if(req.method==='GET'&&p==='/api/admin/data'){normalizeMainOptions(d);d.paymentMethods=Array.isArray(d.paymentMethods)?d.paymentMethods:[];d.paymentMethods.forEach(m=>{m.provider=m.provider||(/nagad/i.test(String(m.id)+' '+String(m.name))?'Nagad':'bKash');m.account_type=m.account_type||(/merchant/i.test(String(m.name))?'Merchant':/agent/i.test(String(m.name))?'Agent':/debit/i.test(String(m.name))?'Debit':'Personal');m.enabled=m.enabled!==false;m.order=Number(m.order||0)});return send(res,200,{ok:true,data:d});}
  if(req.method==='GET'&&p==='/api/admin/transactions'){
    return send(res,200,{ok:true,transactions:await db.listAdminTransactions()});
  }
  if(req.method==='GET'&&p==='/api/admin/withdrawals'){
    const status=['all','pending','approved','rejected'].includes(String(u.query.status||'all'))?String(u.query.status||'all'):'all';
    return send(res,200,{ok:true,withdrawals:await db.listAdminWithdrawals(status)});
  }
  if(req.method==='POST'&&/^\/api\/admin\/withdrawals\/[^/]+\/review$/.test(p)){
    const id=decodeURIComponent(p.split('/')[4]),b=await body(req),status=String(b.status||'').toLowerCase(),note=String(b.note||'').trim();
    if(!['approved','rejected'].includes(status))return send(res,400,{ok:false,error:'Approve অথবা Reject নির্বাচন করুন'});
    try{const adminId=await db.getAdminId(ADMIN_USERNAME);const d=await db.reviewWithdrawal(id,status,adminId,note);return send(res,200,{ok:true,message:status==='approved'?'Withdrawal approved':'Withdrawal rejected',withdrawal:d})}catch(e){return send(res,400,{ok:false,error:e.message||'Review failed'})}
  }
  if(req.method==='GET'&&p==='/api/admin/deposits'){
    const status=['all','pending','approved','rejected'].includes(String(u.query.status||'all'))?String(u.query.status||'all'):'all';
    return send(res,200,{ok:true,deposits:await db.listAdminDeposits(status)});
  }
  if(req.method==='POST'&&/^\/api\/admin\/deposits\/[^/]+\/review$/.test(p)){
    const id=decodeURIComponent(p.split('/')[4]),b=await body(req),status=String(b.status||'').toLowerCase(),note=String(b.note||'').trim();
    if(!['approved','rejected'].includes(status))return send(res,400,{ok:false,error:'Approve অথবা Reject নির্বাচন করুন'});
    try{const adminId=await db.getAdminId(ADMIN_USERNAME);const d=await db.reviewDeposit(id,status,adminId,note);return send(res,200,{ok:true,message:status==='approved'?'Deposit approved':'Deposit rejected',deposit:d})}catch(e){return send(res,400,{ok:false,error:e.message||'Review failed'})}
  }
  if(req.method==='PUT'&&p==='/api/admin/data'){const x=await body(req);const nd={...d,site:{...d.site,...(x.site||{})},adminMenus:Array.isArray(x.adminMenus)?x.adminMenus:d.adminMenus,mainOptions:Array.isArray(x.mainOptions)?x.mainOptions:d.mainOptions,paymentMethods:Array.isArray(x.paymentMethods)?x.paymentMethods:d.paymentMethods,system:{...d.system,...(x.system||{})}};normalizeMainOptions(nd);await write(nd);return send(res,200,{ok:true,data:nd})}
  if(req.method==='POST'&&p==='/api/admin/main-options'){const x=await body(req);if(!String(x.name||'').trim())return send(res,400,{error:'Option Name দিন'});d.mainOptions.push({id:'main-'+Date.now()+Math.random().toString(36).slice(2,6),name:String(x.name).trim(),icon:String(x.icon||'📌'),logo:String(x.logo||''),content:String(x.content||''),visible:true});await write(d);return send(res,200,{ok:true,data:d})}
  if(req.method==='DELETE'&&p.startsWith('/api/admin/main-options/')){const id=decodeURIComponent(p.split('/').pop());d.mainOptions=d.mainOptions.filter(x=>x.id!==id);await write(d);return send(res,200,{ok:true,data:d})}
 }
 if(req.method==='GET'){let file=p==='/'?'index.html':p==='/admin'||p==='/admin/'?'admin.html':p.slice(1);if(file.includes('..'))return send(res,403,'Forbidden','text/plain');const fp=path.join(ROOT,file);if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream','Cache-Control':path.extname(fp)==='.html'?'no-store':'public,max-age=3600'});return fs.createReadStream(fp).pipe(res)}}
 send(res,404,'Not found','text/plain; charset=utf-8');
}catch(e){console.error(e);send(res,500,{error:'Server error'})}});
(async()=>{try{await db.init();server.listen(PORT,()=>console.log('Ludo Baji V8.2 listening on '+PORT+(db.hasDatabase()?' with PostgreSQL':' with local fallback')))}catch(e){console.error('Database initialization failed:',e.message);process.exit(1)}})();
