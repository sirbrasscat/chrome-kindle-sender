/**
 * Homelab SMTP Micro-Relay for Web to Kindle
 * Receives JSON webhook from Chrome extension and sends EPUB via your local/configured SMTP server.
 */

const http = require('http');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3080;
const AUTH_TOKEN = process.env.RELAY_AUTH_TOKEN || '';

// SMTP Configuration from environment variables
const smtpConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    console.warn('[Relay Warning] SMTP connection verification issue:', error.message);
  } else {
    console.log('[Relay Ready] Connected to SMTP server successfully at', smtpConfig.host);
  }
});

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  }

  if (req.url === '/send-kindle' && req.method === 'POST') {
    // Auth Check
    if (AUTH_TOKEN) {
      const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (token !== AUTH_TOKEN) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized: Invalid token' }));
      }
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Cap at 25MB for ebooks
      if (body.length > 25 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { to, from, subject, filename, epubBase64 } = payload;

        if (!to || !epubBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing required parameters: "to" and "epubBase64"' }));
        }

        const mailOptions = {
          from: from || process.env.DEFAULT_SENDER || 'kindle-relay@homelab.local',
          to: to,
          subject: subject || 'Web Article for Kindle',
          text: `Delivered by Homelab Kindle Relay.\nArticle: ${filename || 'article.epub'}`,
          attachments: [
            {
              filename: filename || 'article.epub',
              content: Buffer.from(epubBase64, 'base64'),
              contentType: 'application/epub+zip'
            }
          ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Sent] Dispatched ${filename} to ${to} (Message ID: ${info.messageId})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, messageId: info.messageId }));

      } catch (err) {
        console.error('[Relay Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal relay error' }));
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Homelab Kindle Relay listening on http://0.0.0.0:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/send-kindle`);
});
