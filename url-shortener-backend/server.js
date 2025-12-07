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
    // Ensure the string can be parsed as a URL
    new URL(string);
    // Optionally, prevent local host or short-url-API from being shortened
    if (string.includes('localhost') || string.includes('azurewebsites.net')) {
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

// =======================================================
// ⭐ CORE CONFIGURATION ROUTES (Order is crucial)
// =======================================================

// 1. Root Route (Health Check) - Must be first for base URL health check
// This route will stop the default 404 on the base URL (e.g., https://your-app.azurewebsites.net/)
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'URL Shortener API',
        message: `API endpoints available under ${BASE_URL}/api`,
    });
});

// 2. API Routes (Specific) - Must be before the generic redirect route
// =======================================================

// DEBUG: GET all URLs in database 
app.get('/api/debug/urls', async (req, res) => {
  try {
    // IMPORTANT: Make sure this require('./database') pattern works or pre-load it
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
    
    // IMPORTANT: BASE_URL must be correctly set in Azure App Settings
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

// GET STATS for a short code
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

// GENERATE QR CODE
app.get('/api/qr/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const shortUrl = `${BASE_URL}/${shortCode}`;

  res.setHeader('Content-Type', 'image/png');

  QRCode.toFileStream(res, shortUrl, {
    width: 256,
    margin: 1
  });
});

// 3. Redirect Route (Generic) - MUST be the last route defined
// =======================================================

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