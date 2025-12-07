const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const QRCode = require('qrcode');
const urlService = require('./urlService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Helper function to validate URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// GET all URLs in database (for debugging)
app.get('/api/debug/urls', async (req, res) => {
  try {
    const pool = require('./database');
    const sql = require('mssql');
    const result = await pool
      .request()
      .query('SELECT short_code, original_url FROM urls');
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE short URL
app.post('/api/shorten', async (req, res) => {
  console.log('\n========== POST /api/shorten ==========');
  console.log('Raw request body:', JSON.stringify(req.body));
  
  let { url, expires_at } = req.body;

  // Trim and validate URL
  url = url ? url.trim() : null;
  console.log('Trimmed URL:', url);
  
  if (!url || !isValidUrl(url)) {
    console.log('Invalid URL, rejecting');
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    console.log('Calling urlService.createShortUrl...');
    const shortCode = await urlService.createShortUrl(url, expires_at || null);
    const shortUrl = `${BASE_URL}/${shortCode}`;

    console.log('Response:', { short_url: shortUrl, short_code: shortCode });
    res.json({
      short_url: shortUrl,
      short_code: shortCode
    });
  } catch (err) {
    console.error('Error creating short URL:', err);
    res.status(500).json({ error: 'Failed to shorten' });
  }
});

// GET STATS for a short code (must be before generic /:shortCode route)
app.get('/api/stats/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const stats = await urlService.getUrlStats(shortCode);
    res.json(stats);
  } catch (err) {
    console.error('Error retrieving stats:', err);
    res.status(404).json({ error: 'Not found' });
  }
});

// GENERATE QR CODE (must be before generic /:shortCode route)
app.get('/api/qr/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const shortUrl = `${BASE_URL}/${shortCode}`;

  res.setHeader('Content-Type', 'image/png');

  QRCode.toFileStream(res, shortUrl, {
    width: 256,
    margin: 1
  });
});

// REDIRECT to original URL (generic route - must be last)
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const row = await urlService.getUrlByShortCode(shortCode);
    await urlService.incrementClickCount(shortCode);
    res.redirect(row.original_url);
  } catch (err) {
    console.error('Error retrieving URL:', err);
    
    if (err.status === 'expired') {
      res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { background: white; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            h1 { color: #d32f2f; margin: 0 0 10px 0; }
            p { color: #666; margin: 10px 0; }
            .expiry-time { color: #999; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏰ Link Expired</h1>
            <p>This shortened URL has expired and is no longer accessible.</p>
            <p class="expiry-time">Expired at: ${new Date(err.expires_at).toLocaleString()}</p>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { background: white; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            h1 { color: #d32f2f; margin: 0 0 10px 0; }
            p { color: #666; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍 Not Found</h1>
            <p>This shortened URL does not exist.</p>
          </div>
        </body>
        </html>
      `);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on ${BASE_URL}`);
  console.log(`API available at ${BASE_URL}/api`);
});
