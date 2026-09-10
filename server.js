const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
let Pool=null;
if(process.env.DATABASE_URL){try{Pool=require('pg').Pool}catch(e){console.error('pg package missing; install dependencies with npm install')}}
const ROOT=__dirname,DATA=path.join(ROOT,'data.json'),PORT=process.env.PORT||3000,SECRET=process.env.ADMIN_SECRET||'change-this-admin-secret';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
let pool=null,dbReady=false;
if(process.env.DATABASE_URL&&Pool){pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});}
function readFile(){return JSON.parse(fs.readFileSync(DATA,'utf8'))}
function writeFile(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2),'utf8')}
async function initDb(){if(!pool)return;await pool.query(`CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1), data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);const r=await pool.query('SELECT id FROM app_state WHERE id=1');if(!r.rowCount){await pool.query('INSERT INTO app_state(id,data) VALUES(1,$1)',[JSON.stringify(readFile())]);}dbReady=true;console.log('PostgreSQL persistence enabled')}
async function read(){if(dbReady){const r=await pool.query('SELECT data FROM app_state WHERE id=1');return r.rows[0].data}return readFile()}
async function write(d){if(dbReady){await pool.query('UPDATE app_state SET data=$1,updated_at=NOW() WHERE id=1',[JSON.stringify(d)]);return}writeFile(d)}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});res.end(typeof body==='string'?body:JSON.stringify(body))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>50*1024*1024){req.destroy();reject(new Error('Payload too large'))}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function token(){const p=Buffer.from(JSON.stringify({u:'admin',e:Date.now()+7*86400000})).toString('base64url');const s=crypto.createHmac('sha256',SECRET).update(p).digest('base64url');return p+'.'+s}
function auth(req,res){try{const t=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const [p,s]=t.split('.');if(!p||!s)throw 0;const es=crypto.createHmac('sha256',SECRET).update(p).digest('base64url');if(s.length!==es.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(es)))throw 0;const x=JSON.parse(Buffer.from(p,'base64url').toString());if(x.u!=='admin'||Date.now()>x.e)throw 0;return true}catch(e){send(res,401,{error:'Unauthorized'});return false}}
const server=http.createServer(async(req,res)=>{try{const u=url.parse(req.url,true),p=u.pathname;if(req.method==='OPTIONS')return send(res,204,'','text/plain');
 if(req.method==='POST'&&p==='/api/login'){const x=await body(req);return x.username==='admin'&&x.password==='admin123'?send(res,200,{ok:true,token:token()}):send(res,401,{ok:false,error:'Username অথবা Password ভুল'})}
 if(req.method==='GET'&&p==='/api/site'){const d=await read();return send(res,200,d)}
 if(p.startsWith('/api/admin')){if(!auth(req,res))return;let d=await read();
  if(req.method==='GET'&&p==='/api/admin/data')return send(res,200,{ok:true,data:d,persistence:dbReady?'postgresql':'local-file'});
  if(req.method==='PUT'&&p==='/api/admin/data'){const x=await body(req);const nd={...d,site:{...d.site,...(x.site||{})},adminMenus:Array.isArray(x.adminMenus)?x.adminMenus:d.adminMenus,mainOptions:Array.isArray(x.mainOptions)?x.mainOptions:d.mainOptions,pages:{...(d.pages||{}),...(x.pages||{})}};await write(nd);return send(res,200,{ok:true,data:nd})}
  if(req.method==='POST'&&p==='/api/admin/main-options'){const x=await body(req);const n=String(x.name||'').trim();if(!n)return send(res,400,{error:'Option Name দিন'});d.mainOptions=d.mainOptions||[];d.mainOptions.push({id:'main-'+Date.now()+Math.random().toString(36).slice(2,7),name:n,icon:String(x.icon||'📌'),logo:String(x.logo||''),content:String(x.content||''),buttonText:String(x.buttonText||''),buttonUrl:String(x.buttonUrl||''),visible:true,order:d.mainOptions.length});await write(d);return send(res,200,{ok:true,data:d})}
  if(req.method==='PUT'&&p.startsWith('/api/admin/main-options/')){const id=decodeURIComponent(p.split('/').pop()),x=await body(req);const i=(d.mainOptions||[]).findIndex(a=>a.id===id);if(i<0)return send(res,404,{error:'Option not found'});d.mainOptions[i]={...d.mainOptions[i],...x,id};await write(d);return send(res,200,{ok:true,data:d})}
  if(req.method==='DELETE'&&p.startsWith('/api/admin/main-options/')){const id=decodeURIComponent(p.split('/').pop());d.mainOptions=(d.mainOptions||[]).filter(x=>x.id!==id);await write(d);return send(res,200,{ok:true,data:d})}
 }
 if(req.method==='GET'){let file=p==='/'?'index.html':p==='/admin'||p==='/admin/'?'admin.html':p.slice(1);if(file.includes('..'))return send(res,403,'Forbidden','text/plain');const fp=path.join(ROOT,file);if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream','Cache-Control':path.extname(fp)==='.html'?'no-store':'public,max-age=3600'});return fs.createReadStream(fp).pipe(res)}}
 send(res,404,'Not found','text/plain; charset=utf-8');
}catch(e){console.error(e);send(res,500,{error:e.message})}});
(async()=>{try{await initDb()}catch(e){console.error('DATABASE_URL unavailable; using local data.json:',e.message);dbReady=false}server.listen(PORT,()=>console.log('Ludo Baji Admin v10 listening on '+PORT))})();
