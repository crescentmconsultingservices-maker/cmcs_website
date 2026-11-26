const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Support local contact form submissions (simulating send_mail.php on local Node server)
  if (req.method === 'POST' && (reqPath === '/send_mail.php' || reqPath === '/api/contact')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('latin1');
      if (body.length > 6e6) req.destroy(); // 6MB protection for 5MB resume uploads
    });

    req.on('end', () => {
      let data = {};
      let resumeFilename = '';
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try { data = JSON.parse(body); } catch (e) { data = {}; }
      } else if (contentType.includes('multipart/form-data')) {
        // Simple multipart field + filename extraction
        const boundary = contentType.split('boundary=')[1];
        if (boundary) {
          const parts = body.split('--' + boundary);
          parts.forEach(part => {
            const fileMatch = part.match(/name="([^"]+)";\s*filename="([^"]+)"/);
            if (fileMatch) {
              resumeFilename = fileMatch[2].trim();
              return;
            }
            const nameMatch = part.match(/name="([^"]+)"/);
            if (nameMatch) {
              const fieldName = nameMatch[1];
              const value = part.split('\r\n\r\n')[1] ? part.split('\r\n\r\n')[1].replace(/\r\n$/, '') : '';
              data[fieldName] = value.trim();
            }
          });
        }
      } else {
        data = querystring.parse(body);
      }

      // Spam Honeypot check
      if (data._hp_company) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Message received.' }));
        return;
      }

      const userName = (data.user_name || '').trim();
      const userEmail = (data.user_email || '').trim();
      const subject = (data.subject || 'General Inquiry').trim();
      const message = (data.message || '').trim();

      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!userName || !userEmail || !emailRegex.test(userEmail) || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Please provide a valid name, email address, and message.'
        }));
        return;
      }

      console.log('\n======================================================');
      console.log('📬 [LOCAL DEV] CONTACT FORM SUBMISSION RECEIVED:');
      console.log(`   From:    ${userName} <${userEmail}>`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Message: ${message}`);
      if (resumeFilename) console.log(`   Resume:  ${resumeFilename}`);
      console.log(`   Time:    ${new Date().toLocaleString()}`);
      console.log('======================================================\n');

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        message: 'Thank you! Your message has been received. Our team will contact you shortly.'
      }));
    });
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(ROOT, reqPath);

  // Security: prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support Range headers for smooth video streaming (background-video.mp4)
    const range = req.headers.range;
    if (range && stats.size) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      file.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CMCS Web Server running at:`);
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://localhost:${PORT}/index.html`);
  console.log(`  (Contact form active at POST /send_mail.php)`);
});
