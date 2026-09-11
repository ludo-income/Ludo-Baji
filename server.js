const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const db=require('./database');
const ROOT=__dirname,PORT=process.env.PORT||3000,SECRET=process.env.ADMIN_SECRET||'Ludo-Baji-Admin-Secret-Change-Me-2026',ADMIN_USERNAME=process.env.ADMIN_USERNAME||'admin',ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'rakib999';
const USER_SECRET=process.env.USER_SECRET||SECRET;
const OTP_TTL_MS=Math.max(60,Number(process.env.OTP_TTL_SECONDS||300))*1000;
const OTP_COOLDOWN_MS=Math.max(30,Number(process.env.OTP_COOLDOWN_SECONDS||60))*1000;
const OTP_MAX_ATTEMPTS=Math.max(3,Number(process.env.OTP_MAX_ATTEMPTS||5));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
async function read(){return db.getData()}
async function write(d){return db.saveData(d)}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});res.end(typeof body==='string'?body:JSON.stringify(body))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>45*1024*1024){req.destroy();reject(new Error('Payload too large'))}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function signToken(payload,secret){const p=Buffer.from(JSON.stringify(payload)).toString('base64url');const s=crypto.createHmac('sha256',secret).update(p).digest('base64url');return p+'.'+s}
function verifyToken(raw,secret){try{const [p,s]=String(raw||'').split('.');if(!p||!s)return null;const es=crypto.createHmac('sha256',secret).update(p).digest('base64url');if(s.length!==es.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(es)))return null;const x=JSON.parse(Buffer.from(p,'base64url').toString());if(!x.e||Date.now()>x.e)return null;return x}catch{return null}}
function token(){return signToken({u:'admin',e:Date.now()+7*86400000},SECRET)}
function auth(req,res){const x=verifyToken((req.headers.authorization||'').replace(/^Bearer\s+/i,''),SECRET);if(!x||x.u!=='admin'){send(res,401,{error:'Unauthorized'});return false}return true}
function userAuth(req,res){const x=verifyToken((req.headers.authorization||'').replace(/^Bearer\s+/i,''),USER_SECRET);if(!x||x.typ!=='user'){send(res,401,{ok:false,error:'Login required'});return null}return x}
function normalizeBDPhone(input){let s=String(input||'').trim().replace(/[\s()-]/g,'');if(/^01\d{9}$/.test(s))return '+880'+s.slice(1);if(/^8801\d{9}$/.test(s))return '+'+s;if(/^\+8801\d{9}$/.test(s))return s;return null}
function otpHash(phone,otp){return crypto.createHash('sha256').update(phone+'|'+otp+'|'+USER_SECRET).digest('hex')}
function makeOtp(){return String(crypto.randomInt(0,1000000)).padStart(6,'0')}
function maskPhone(phone){return phone.slice(0,6)+'****'+phone.slice(-2)}
async function sendOtpSMS(phone,otp){
  const sid=process.env.TWILIO_ACCOUNT_SID, token=process.env.TWILIO_AUTH_TOKEN, from=process.env.TWILIO_FROM;
  if(sid&&token&&from){
    const https=require('https'), qs=require('querystring');
    const data=qs.stringify({To:phone,From:from,Body:`Your Ludo Baji OTP is ${otp}. It expires in 5 minutes.`});
    await new Promise((resolve,reject)=>{const req=https.request({hostname:'api.twilio.com',path:`/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,method:'POST',auth:`${sid}:${token}`,headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(data)}},r=>{let out='';r.on('data',c=>out+=c);r.on('end',()=>r.statusCode>=200&&r.statusCode<300?resolve():reject(new Error('SMS provider rejected the request')))});req.on('error',reject);req.write(data);req.end()});
    return {sent:true,provider:'twilio'};
  }
  if(String(process.env.OTP_DEV_MODE||'').toLowerCase()==='true'){console.log(`[OTP DEV] ${phone}: ${otp}`);return {sent:false,dev:true,otp};}
  throw new Error('SMS provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM, or enable OTP_DEV_MODE for testing.');
}
const server=http.createServer(async(req,res)=>{try{
 const u=url.parse(req.url,true),p=u.pathname;
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});return res.end()}
 if(req.method==='POST'&&p==='/api/login'){const x=await body(req);const username=String(x.username||''),password=String(x.password||'');if(username.length>100||password.length>200)return send(res,400,{ok:false,error:'Invalid login data'});return username===ADMIN_USERNAME&&password===ADMIN_PASSWORD?send(res,200,{ok:true,token:token()}):send(res,401,{ok:false,error:'Username অথবা Password ভুল'})}
 if(req.method==='POST'&&p==='/api/auth/request-otp'){
   const x=await body(req), phone=normalizeBDPhone(x.phone); if(!phone)return send(res,400,{ok:false,error:'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন'});
   let user=await db.findUser(phone); if(user&&user.status!=='active')return send(res,403,{ok:false,error:'এই অ্যাকাউন্টটি বন্ধ আছে'});
   const now=Date.now(); if(user?.otp_sent_at && now-new Date(user.otp_sent_at).getTime()<OTP_COOLDOWN_MS)return send(res,429,{ok:false,error:`আবার OTP চাইতে একটু অপেক্ষা করুন`,retry_after:Math.ceil((OTP_COOLDOWN_MS-(now-new Date(user.otp_sent_at).getTime()))/1000)});
   if(!user)user=await db.createUser(phone);
   const otp=makeOtp(),expires=new Date(now+OTP_TTL_MS).toISOString(),sent=new Date(now).toISOString();
   try{const result=await sendOtpSMS(phone,otp);await db.setUserOtp(phone,otpHash(phone,otp),expires,sent);return send(res,200,{ok:true,message:result.dev?'Test OTP generated':'OTP sent successfully',phone:maskPhone(phone),expires_in:Math.floor(OTP_TTL_MS/1000),...(result.dev?{dev_otp:otp}: {})})}catch(e){return send(res,503,{ok:false,error:e.message})}
 }
 if(req.method==='POST'&&p==='/api/auth/verify-otp'){
   const x=await body(req),phone=normalizeBDPhone(x.phone),otp=String(x.otp||'').trim();if(!phone||!/^[0-9]{6}$/.test(otp))return send(res,400,{ok:false,error:'মোবাইল নম্বর ও ৬ সংখ্যার OTP দিন'});
   const user=await db.findUser(phone);if(!user)return send(res,404,{ok:false,error:'অ্যাকাউন্ট পাওয়া যায়নি'});if(user.status!=='active')return send(res,403,{ok:false,error:'এই অ্যাকাউন্টটি বন্ধ আছে'});
   if(!user.otp_hash||!user.otp_expires_at)return send(res,400,{ok:false,error:'OTP-এর মেয়াদ শেষ। নতুন OTP নিন'});
   if(Date.now()>new Date(user.otp_expires_at).getTime()){await db.clearUserOtp(phone);return send(res,400,{ok:false,error:'OTP-এর মেয়াদ শেষ। নতুন OTP নিন'});
   }
   if(Number(user.otp_attempts||0)>=OTP_MAX_ATTEMPTS){await db.clearUserOtp(phone);return send(res,429,{ok:false,error:'অনেকবার ভুল OTP দেওয়া হয়েছে। নতুন OTP নিন'});
   }
   if(otpHash(phone,otp)!==user.otp_hash){await db.updateOtpAttempts(phone,Number(user.otp_attempts||0)+1);return send(res,401,{ok:false,error:'OTP সঠিক নয়'});}
   await db.clearUserOtp(phone);const fresh=await db.getUserById(user.id);await db.ensureUserWallet(fresh.id);const token=signToken({typ:'user',id:String(fresh.id),e:Date.now()+30*86400000},USER_SECRET);return send(res,200,{ok:true,token,user:{id:fresh.id,user_code:fresh.user_code,phone:fresh.phone,name:fresh.name||'',status:fresh.status}});
 }
 if(req.method==='GET'&&p==='/api/auth/me'){const x=userAuth(req,res);if(!x)return;const user=await db.getUserById(x.id);if(!user)return send(res,404,{ok:false,error:'User not found'});return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,phone:user.phone,name:user.name||'',status:user.status}})}
 if(req.method==='GET'&&p==='/api/user/dashboard'){const x=userAuth(req,res);if(!x)return;const user=await db.getUserById(x.id);if(!user)return send(res,404,{ok:false,error:'User not found'});const dashboard=await db.getUserDashboard(x.id);return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,phone:user.phone,name:user.name||'',status:user.status},dashboard})}
 if(req.method==='PUT'&&p==='/api/auth/profile'){const x=userAuth(req,res);if(!x)return;const b=await body(req),name=String(b.name||'').trim();if(name.length>60)return send(res,400,{ok:false,error:'Name too long'});const user=await db.updateUserName(x.id,name);return send(res,200,{ok:true,user:{id:user.id,user_code:user.user_code,phone:user.phone,name:user.name||'',status:user.status}})}
 if(req.method==='GET'&&p==='/api/deposit/info'){
   return send(res,200,{ok:true,methods:[
     {id:'bkash',name:'bKash',number:process.env.BKASH_NUMBER||'01301470686'},
     {id:'nagad',name:'Nagad',number:process.env.NAGAD_NUMBER||'01806097369'}
   ]});
 }
 if(req.method==='GET'&&p==='/api/user/deposits'){
   const x=userAuth(req,res);if(!x)return;
   return send(res,200,{ok:true,deposits:await db.listUserDeposits(x.id)});
 }
 if(req.method==='POST'&&p==='/api/user/deposits'){
   const x=userAuth(req,res);if(!x)return;
   const b=await body(req),method=String(b.method||'').toLowerCase(),amount=Number(b.amount),transactionId=String(b.transaction_id||'').trim(),screenshot=String(b.screenshot||'');
   if(!['bkash','nagad'].includes(method))return send(res,400,{ok:false,error:'bKash অথবা Nagad নির্বাচন করুন'});
   if(!Number.isFinite(amount)||amount<=0||amount>1000000)return send(res,400,{ok:false,error:'সঠিক Deposit amount দিন'});
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
 if(req.method==='GET'&&p==='/api/site'){return send(res,200,await read())}
 if(p.startsWith('/api/admin')){if(!auth(req,res))return;const d=await read();
  if(req.method==='GET'&&p==='/api/admin/data')return send(res,200,{ok:true,data:d});
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
  if(req.method==='PUT'&&p==='/api/admin/data'){const x=await body(req);const nd={site:{...d.site,...(x.site||{})},adminMenus:Array.isArray(x.adminMenus)?x.adminMenus:d.adminMenus,mainOptions:Array.isArray(x.mainOptions)?x.mainOptions:d.mainOptions};await write(nd);return send(res,200,{ok:true,data:nd})}
  if(req.method==='POST'&&p==='/api/admin/main-options'){const x=await body(req);if(!String(x.name||'').trim())return send(res,400,{error:'Option Name দিন'});d.mainOptions.push({id:'main-'+Date.now()+Math.random().toString(36).slice(2,6),name:String(x.name).trim(),icon:String(x.icon||'📌'),logo:String(x.logo||''),content:String(x.content||''),visible:true});await write(d);return send(res,200,{ok:true,data:d})}
  if(req.method==='DELETE'&&p.startsWith('/api/admin/main-options/')){const id=decodeURIComponent(p.split('/').pop());d.mainOptions=d.mainOptions.filter(x=>x.id!==id);await write(d);return send(res,200,{ok:true,data:d})}
 }
 if(req.method==='GET'){let file=p==='/'?'index.html':p==='/admin'||p==='/admin/'?'admin.html':p.slice(1);if(file.includes('..'))return send(res,403,'Forbidden','text/plain');const fp=path.join(ROOT,file);if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream','Cache-Control':path.extname(fp)==='.html'?'no-store':'public,max-age=3600'});return fs.createReadStream(fp).pipe(res)}}
 send(res,404,'Not found','text/plain; charset=utf-8');
}catch(e){console.error(e);send(res,500,{error:'Server error'})}});
(async()=>{try{await db.init();server.listen(PORT,()=>console.log('Ludo Baji V8.2 listening on '+PORT+(db.hasDatabase()?' with PostgreSQL':' with local fallback')))}catch(e){console.error('Database initialization failed:',e.message);process.exit(1)}})();
