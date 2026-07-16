const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DEEPL_KEY = process.env.DEEPL_API_KEY || '';
const MIME = {'.html':'text/html;charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png'};

function proxyPost(hostname, path, headers, body, res) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const options = {
    hostname, port: 443, path, method: 'POST',
    timeout: 20000,
    headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }
  };
  const req = https.request(options, r => {
    let data = '';
    r.on('data', c => data += c);
    r.on('end', () => {
      if (!res.headersSent) {
        res.writeHead(r.statusCode, {'Content-Type': r.headers['content-type'] || 'application/json'});
        res.end(data);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); if (!res.headersSent) { res.writeHead(504); res.end(JSON.stringify({error:'timeout'})); }});
  req.on('error', e => { if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }});
  req.write(payload);
  req.end();
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Check keys
  if (req.url === '/api/check') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({hasKey: !!API_KEY, hasDeepL: !!DEEPL_KEY}));
    return;
  }

  // DeepL proxy
  if (req.url === '/api/deepl' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(b);
        const key = DEEPL_KEY || p.deeplKey || '';
        if (!key) { res.writeHead(401); res.end(JSON.stringify({error:'No DeepL key'})); return; }
        
        // Build form data for DeepL
        const params = new URLSearchParams();
        params.append('text', p.text || '');
        params.append('target_lang', p.target_lang || 'PT');
        if (p.source_lang) params.append('source_lang', p.source_lang);
        
        const formBody = params.toString();
        const deeplHost = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
        proxyPost(
          deeplHost,
          '/v2/translate',
          {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'DeepL-Auth-Key ' + key
          },
          formBody,
          res
        );
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({error:'Invalid JSON'})); }
    });
    return;
  }

  // Anthropic proxy
  if (req.url === '/api/translate' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(b);
        const key = API_KEY || p.apiKey || '';
        if (!key) { res.writeHead(401); res.end(JSON.stringify({error:'No API key'})); return; }
        proxyPost(
          'api.anthropic.com',
          '/v1/messages',
          {'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
          JSON.stringify({model:'claude-sonnet-4-6', max_tokens:500, messages: p.messages}),
          res
        );
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({error:'Invalid JSON'})); }
    });
    return;
  }

  // Static files
  let fp = req.url === '/' ? '/tradutor.html' : req.url.split('?')[0];
  fp = path.join(process.cwd(), fp);
  try {
    if (fs.existsSync(fp)) {
      res.writeHead(200, {'Content-Type': MIME[path.extname(fp)] || 'text/plain'});
      res.end(fs.readFileSync(fp));
    } else {
      const html = path.join(process.cwd(), 'tradutor.html');
      if (fs.existsSync(html)) { res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'}); res.end(fs.readFileSync(html)); }
      else { res.writeHead(404); res.end('Not found'); }
    }
  } catch(e) { if (!res.headersSent) { res.writeHead(500); res.end('Error'); } }

}).listen(PORT, () => console.log('LuxTranslator em http://localhost:' + PORT));

process.on('uncaughtException', e => console.error('Uncaught:', e.message));
