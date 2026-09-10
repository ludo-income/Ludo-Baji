const http=require('http');const fs=require('fs');const path=require('path');
const PORT=process.env.PORT||10000,ROOT=__dirname,DB=path.join(ROOT,'data.json');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp'};
function read(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch{return {settings:{name:'Ludo Baji',logo:'7543.jpg'},options:[]}}}
function write(data){fs.writeFileSync(DB,JSON.stringify(data,null,2),'utf8')}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>8*1024*1024)req.destroy()});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}
function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(typeof data==='string'?data:JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{
 const url=(req.url||'/').split('?')[0];
 if(req.method==='GET'&&url==='/api/state')return send(res,200,read());
 if(req.method==='POST'&&url==='/api/state'){try{const incoming=await body(req);if(!incoming.settings||!Array.isArray(incoming.options))return send(res,400,{error:'Invalid state'});write(incoming);return send(res,200,{ok:true,state:incoming})}catch(e){return send(res,400,{error:'Invalid JSON'})}}
 if(req.method==='GET'&&url==='/api/health')return send(res,200,{ok:true});
 let p=url==='/admin'?'/admin.html':(url==='/'?'/index.html':url);let file=path.normalize(path.join(ROOT,p));if(!file.startsWith(ROOT+path.sep))return send(res,403,'Forbidden','text/plain; charset=utf-8');
 fs.stat(file,(err,st)=>{if(err||!st.isFile())return send(res,404,'404 - File not found','text/plain; charset=utf-8');let ext=path.extname(file).toLowerCase();res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res)})
});server.listen(PORT,'0.0.0.0',()=>console.log('Ludo Baji running on '+PORT));
