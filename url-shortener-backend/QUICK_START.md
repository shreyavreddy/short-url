# ⚡ Quick Start Guide

Get your URL Shortener Backend running in minutes!

## 30-Second Setup

```bash
# 1. Navigate to project
cd url-shortener-backend

# 2. Install dependencies
npm install

# 3. Start server
npm start
```

**Done!** Server runs at `http://localhost:5000`

---

## 5-Minute API Test

### Create a Short URL

```bash
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
```

**Response:**
```json
{
  "short_url": "http://localhost:5000/abc123",
  "short_code": "abc123"
}
```

### Access the Short URL

```bash
curl -L http://localhost:5000/abc123
```

Redirects to `https://github.com`

### Get Statistics

```bash
curl http://localhost:5000/api/stats/abc123
```

**Response:**
```json
{
  "short_code": "abc123",
  "original_url": "https://github.com",
  "click_count": 1,
  "created_at": "2025-12-07T10:00:00.000Z",
  "expires_at": null
}
```

### Generate QR Code

```bash
curl -o qrcode.png http://localhost:5000/api/qr/abc123
```

Saves QR code as PNG image!

---

## Feature Testing

### Test 1: Duplicate URL Detection

```bash
# First request - creates new short code
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Result: short_code = "xyz789"

# Second request - returns same short code
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Result: short_code = "xyz789" (SAME!)
```

### Test 2: URL Expiration

```bash
# Create URL that expires in 1 minute
FUTURE=$(node -e "console.log(new Date(Date.now()+60000).toISOString())")

curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\",\"expires_at\":\"$FUTURE\"}"
```

Access immediately → Works ✓
Wait 1+ minute → Shows "Link Expired" page ✓

---

## Setup Guide

### Prerequisites

- Node.js 14+
- npm or yarn
- Azure SQL Database

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/url-shortener-backend.git
cd url-shortener-backend
```

### 2. Install Dependencies

```bash
npm install
```

Installs:
- Express.js
- MSSQL driver
- QR code generator
- And more...

### 3. Configure Database

Edit `database.js` with your Azure SQL credentials:

```javascript
const config = {
  server: 'your-server.database.windows.net',
  database: 'your-database',
  authentication: {
    options: {
      userName: 'your-username',
      password: 'your-password'
    }
  }
};
```

### 4. Start Server

```bash
npm start
```

**Expected Output:**
```
Backend server running on http://localhost:5000
API available at http://localhost:5000/api
[INFO] Connected to Azure SQL Database
[INFO] URLs table is ready
```

### 5. Test API

```bash
curl http://localhost:5000/api/debug/urls
```

If you see `[]`, you're ready!

---

## Common Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Install new package
npm install package-name

# Check Node version
node --version

# Check npm version
npm --version
```

---

## File Structure

```
url-shortener-backend/
├── server.js          ← API routes
├── urlService.js      ← Business logic
├── database.js        ← Database connection
├── package.json       ← Dependencies
│
├── README.md          ← Full documentation
├── ARCHITECTURE.md    ← Design & patterns
├── DEPLOYMENT.md      ← Production guide
├── DOCUMENTATION.md   ← Doc overview
│
└── node_modules/      ← Installed packages
```

---

## API Endpoints (Quick Reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/shorten` | Create short URL |
| `GET` | `/:shortCode` | Redirect to original |
| `GET` | `/api/stats/:shortCode` | Get statistics |
| `GET` | `/api/qr/:shortCode` | Generate QR code |
| `GET` | `/api/debug/urls` | List all URLs |

---

## Next Steps

1. **Read Full Documentation**
   - Check `README.md` for complete API docs
   - Check `ARCHITECTURE.md` for design details

2. **Deploy to Production**
   - See `DEPLOYMENT.md` for Azure App Service
   - See `DEPLOYMENT.md` for Docker setup

3. **Add Monitoring**
   - Read `DEPLOYMENT.md` for Application Insights
   - Set up alerts and logging

4. **Integrate with Your App**
   - Use the REST API from your application
   - Store short codes in your database

---

## Troubleshooting

### Server won't start

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:1433`

**Fix:** Check Azure SQL connection in `database.js`:
- Verify server address
- Verify credentials
- Check firewall allows your IP

### API returns 404

**Issue:** Short code not found

**Fix:** 
- Check short code spelling
- Verify URL was created first
- Check database connection

### Duplicate still creating new codes

**Issue:** Same URL creates different short codes

**Fix:**
- Ensure URL matches exactly (including protocol)
- Check for extra whitespace
- Restart server if needed

---

## Need Help?

- **Can't connect to database?** → See DEPLOYMENT.md → Troubleshooting
- **API not working?** → See README.md → Troubleshooting
- **Want to understand code?** → See ARCHITECTURE.md → Design Patterns
- **Need to deploy?** → See DEPLOYMENT.md → Azure App Service

---

## Quick Checklist

- [x] Node.js installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Database credentials configured
- [ ] Server started (`npm start`)
- [ ] API tested (curl request)
- [ ] Ready to build!

---

**You're all set! 🚀**

Start with a simple API call and build from there!

```bash
# One-liner to test everything
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}' && echo ""
```

---

**For full documentation, see:**
- README.md (API Reference)
- ARCHITECTURE.md (System Design)
- DEPLOYMENT.md (Production Setup)
