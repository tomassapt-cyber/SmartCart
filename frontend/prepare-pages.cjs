// Adaptador do frontend: o Claude chama DEPOIS do inject e ANTES da limpeza.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function externalize(html,emit){
 html=html.replace(/<style\b([^>]*)>([^]*?)<\/style>/gi,(_,attrs,body)=>'<link rel="stylesheet"'+attrs+' href="'+emit(body,'css')+'">');
 return html.replace(/<script\b([^>]*)>([^]*?)<\/script>/gi,(all,attrs,body)=>{
  if(/\bsrc\s*=/.test(attrs)||(/\btype\s*=/.test(attrs)&&!(/type=["'](?:text\/javascript|application\/javascript)["']/i.test(attrs))))return all;
  return '<script'+attrs+' src="'+emit(body,'js')+'"></script>';
 });
}
function prepare(root){
 const assets=path.join(root,'assets');fs.mkdirSync(assets,{recursive:true});const files=new Set();
 const emit=(body,ext)=>{const f='cm-'+crypto.createHash('sha256').update(body).digest('hex').slice(0,16)+'.'+ext;fs.writeFileSync(path.join(assets,f),body);files.add(f);return '/assets/'+f};
 for(const f of ['index.html','catalogo.html']){const p=path.join(root,f);if(!fs.existsSync(p))throw Error('Falta '+f+' gerado pelo inject');const html=fs.readFileSync(p,'utf8');fs.writeFileSync(p,externalize(html,emit));}
 fs.copyFileSync(path.join(root,'index.html'),path.join(root,'seo-shell.html'));
 return {assets:files.size,htmlBytes:fs.statSync(path.join(root,'index.html')).size};
}
module.exports={externalize,prepare};
if(require.main===module)console.log(JSON.stringify(prepare(path.resolve(process.argv[2]||path.join(__dirname,'..')))));
