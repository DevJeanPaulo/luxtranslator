const http=require("http"),https=require("https"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000;
const API_KEY=process.env.ANTHROPIC_API_KEY||'';
const MIME={'.html':'text/html;charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png'};

http.createServer((req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}

  if(req.url==="/api/check"){
    res.writeHead(200,{"Content-Type":"application/json"});
    res.end(JSON.stringify({hasKey:!!API_KEY}));
    return;
  }

  if(req.url==="/api/translate"&&req.method==="POST"){
    let b="";
    req.on("data",c=>b+=c);
    req.on("end",()=>{
      let p;
      try{p=JSON.parse(b);}catch(e){res.writeHead(400);res.end(JSON.stringify({error:"Invalid JSON"}));return;}
      const key=API_KEY||p.apiKey||'';
      if(!key){res.writeHead(401);res.end(JSON.stringify({error:"No API key"}));return;}
      const d=JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:p.messages});
      const o={hostname:"api.anthropic.com",port:443,path:"/v1/messages",method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","Content-Length":Buffer.byteLength(d)}};
      const r=https.request(o,s=>{
        let x="";
        s.on("data",c=>x+=c);
        s.on("end",()=>{res.writeHead(s.statusCode,{"Content-Type":"application/json"});res.end(x);});
      });
      r.on("error",e=>{res.writeHead(500);res.end(JSON.stringify({error:e.message}));});
      r.write(d);r.end();
    });
    return;
  }

  let fp=req.url==='/'?'/tradutor.html':req.url;
  fp=path.join(process.cwd(),fp);
  const ext=path.extname(fp);
  if(fs.existsSync(fp)){
    res.writeHead(200,{"Content-Type":MIME[ext]||'text/plain'});
    res.end(fs.readFileSync(fp));
  }else{
    const html=path.join(process.cwd(),'tradutor.html');
    if(fs.existsSync(html)){res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});res.end(fs.readFileSync(html));}
    else{res.writeHead(404);res.end("Not found");}
  }
}).listen(PORT,()=>console.log("LuxTranslator em http://localhost:"+PORT));
