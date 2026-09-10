const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const ROOT=__dirname, DATA=path.join(ROOT,'data.json'), PORT=process.env.PORT||3000, sessions=new Set();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
function read(){return JSON.parse(fs.readFileSync(DATA,'utf8'));}function write(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2),'utf8');}
function send(res,status,obj,headers={}){const body=typeof obj==='string'?obj:JSON.stringify(obj);res.writeHead(status,{'Content-Type':headers['Content-Type']||'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(body);}
function auth(req,res){const t=(req.headers.authorization||'').replace(/^Bearer /,'');if(!t||!sessions.has(t)){send(res,401,{error:'Unauthorized'});return false}return true;}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>35*1024*1024)req.destroy();});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
const server=http.createServer(async(req,res)=>{try{const u=url.parse(req.url,true), p=u.pathname;
 if(req.method==='POST'&&p==='/api/login'){const x=await body(req);if(x.username==='admin'&&x.password==='admin123'){const t=crypto.randomBytes(24).toString('hex');sessions.add(t);return send(res,200,{ok:true,token:t})}return send(res,401,{ok:false,error:'Username অথবা Password ভুল'});}
 if(req.method==='GET'&&p==='/api/site')return send(res,200,read());
 if(p.startsWith('/api/admin')){if(!auth(req,res))return;
  if(req.method==='GET'&&p==='/api/admin/data')return send(res,200,read());
  if(req.method==='PUT'&&p==='/api/admin/data'){const x=await body(req),old=read();const d={site:{...old.site,...(x.site||{})},options:Array.isArray(x.options)?x.options:old.options};write(d);return send(res,200,{ok:true,data:d});}
  if(req.method==='POST'&&p==='/api/admin/options'){const x=await body(req),d=read();if(!String(x.name||'').trim())return send(res,400,{error:'Option name required'});const o={id:'opt-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:String(x.name).trim(),icon:String(x.icon||'📌'),logo:String(x.logo||''),content:String(x.content||''),visible:x.visible!==false};d.options.push(o);write(d);return send(res,200,{ok:true,data:d});}
  if(req.method==='DELETE'&&p.startsWith('/api/admin/options/')){const id=decodeURIComponent(p.split('/').pop()),d=read();if(d.options.length<=1)return send(res,400,{error:'At least one option is required'});d.options=d.options.filter(o=>o.id!==id);write(d);return send(res,200,{ok:true,data:d});}
 }
 if(req.method==='GET'){let file=p==='/admin'?'admin.html':p==='/admin/'?'admin.html':p==='/' ? 'index.html' : p.slice(1)||'index.html';if(file.includes('..'))return send(res,403,'Forbidden',{'Content-Type':'text/plain'});const fp=path.join(ROOT,file);if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){const ext=path.extname(fp);res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-store':'public,max-age=3600'});return fs.createReadStream(fp).pipe(res)}}
 send(res,404,'Not found',{'Content-Type':'text/plain; charset=utf-8'});
 }catch(e){console.error(e);send(res,500,{error:e.message})}});
server.listen(PORT,()=>console.log('Ludo Baji Admin V6 running on '+PORT));
