const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MIME = {'.html':'text/html;charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png'};

const server = http.createServer((req, res) => {
  // Set timeout for all requests
  req.setTimeout(25000);
  res.setTimeout(25000);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.url === "/api/check") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({hasKey: !!API_KEY}));
    return;
  }

  if (req.url === "/api/translate" && req.method === "POST") {
    let b = "";
    req.on("data", c => { b += c; });
    req.on("end", () => {
      let p;
      try { p = JSON.parse(b); } 
      catch(e) { 
        if (!res.headersSent) { res.writeHead(400); res.end(JSON.stringify({error:"Invalid JSON"})); }
        return; 
      }

      const key = API_KEY || p.apiKey || '';
      if (!key) { 
        if (!res.headersSent) { res.writeHead(401); res.end(JSON.stringify({error:"No API key"})); }
        return; 
      }

      const messages = p.messages || [];
      if (!messages.length) {
        if (!res.headersSent) { res.writeHead(400); res.end(JSON.stringify({error:"No messages"})); }
        return;
      }

      const payload = JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: messages
      });

      const options = {
        hostname: "api.anthropic.com",
        port: 443,
        path: "/v1/messages",
        method: "POST",
        timeout: 20000,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", c => data += c);
        proxyRes.on("end", () => {
          if (!res.headersSent) {
            res.writeHead(proxyRes.statusCode, {"Content-Type":"application/json"});
            res.end(data);
          }
        });
      });

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.writeHead(504);
          res.end(JSON.stringify({error:"Anthropic API timeout"}));
        }
      });

      proxyReq.on("error", (e) => {
        console.error("Proxy error:", e.message);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({error: e.message}));
        }
      });

      proxyReq.write(payload);
      proxyReq.end();
    });

    req.on("error", (e) => {
      console.error("Request error:", e.message);
      if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({error:e.message})); }
    });
    return;
  }

  // Serve static files
  let fp = req.url === '/' ? '/tradutor.html' : req.url.split('?')[0];
  fp = path.join(process.cwd(), fp);
  const ext = path.extname(fp);
  try {
    if (fs.existsSync(fp)) {
      res.writeHead(200, {"Content-Type": MIME[ext] || 'text/plain'});
      res.end(fs.readFileSync(fp));
    } else {
      const html = path.join(process.cwd(), 'tradutor.html');
      if (fs.existsSync(html)) {
        res.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
        res.end(fs.readFileSync(html));
      } else {
        res.writeHead(404); res.end("Not found");
      }
    }
  } catch(e) {
    if (!res.headersSent) { res.writeHead(500); res.end("Server error"); }
  }
});

server.timeout = 30000;
server.listen(PORT, () => console.log("LuxTranslator em http://localhost:" + PORT));

process.on('uncaughtException', (e) => console.error('Uncaught:', e.message));
process.on('unhandledRejection', (e) => console.error('Unhandled:', e));
