# URL Shortener Backend

A production-ready URL shortening service built with Node.js, Express, and Azure SQL Database. Generate short URLs with optional expiration, track click statistics, and generate QR codes.

## 🎯 Features

- ✅ **URL Shortening** - Convert long URLs into short, shareable links
- ✅ **Duplicate Detection** - Automatically reuses short codes for duplicate URLs
- ✅ **URL Expiration** - Set expiration times for temporary links
- ✅ **Click Tracking** - Monitor click statistics for each shortened URL
- ✅ **QR Code Generation** - Generate QR codes for shortened URLs
- ✅ **Azure SQL Integration** - Enterprise-grade database with cloud storage
- ✅ **RESTful API** - Clean, well-documented API endpoints
- ✅ **Error Handling** - Comprehensive error handling with user-friendly messages
- ✅ **Separation of Concerns** - Data access layer separated from API logic

## 🏗️ Architecture

### Tech Stack

- **Runtime**: Node.js (v14+)
- **Framework**: Express.js v5
- **Database**: Azure SQL Database
- **ORM/Query Builder**: mssql (native SQL driver)
- **Additional Libraries**:
  - `shortid` - Generate unique short codes
  - `qrcode` - QR code generation
  - `cors` - Cross-Origin Resource Sharing
  - `body-parser` - JSON request parsing
  - `dotenv` - Environment variable management

### Project Structure

```
url-shortener-backend/
├── server.js           # Express server and API routes
├── database.js         # Azure SQL connection pool setup
├── urlService.js       # Data access layer (Business logic)
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (not committed)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

### Design Patterns

#### 1. **Separation of Concerns (SoC)**
   - `server.js` - Handles HTTP requests and responses
   - `urlService.js` - Contains all database operations
   - `database.js` - Manages database connection

#### 2. **Single Responsibility Principle (SRP)**
   - Each module has one clear responsibility
   - Data access logic is isolated in `urlService.js`
   - API endpoints focus only on request/response handling

#### 3. **Promise-based Async/Await**
   - All database operations return Promises
   - Clean async/await syntax for error handling
   - Prevents callback hell

## 🚀 Getting Started

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Azure SQL Database instance
- Azure SQL credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/url-shortener-backend.git
   cd url-shortener-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   
   Update your `.env` file with Azure SQL credentials:
   ```env
   # Server Configuration
   PORT=5000
   BASE_URL=http://localhost:5000
   ```

5. **Start the server**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

Server will be available at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### 1. Create Shortened URL
Create a new shortened URL or return existing one for duplicate URLs.

```http
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "expires_at": "2025-12-31T23:59:59Z"  // Optional
}
```

**Response (200 OK)**
```json
{
  "short_url": "http://localhost:5000/abc123",
  "short_code": "abc123"
}
```

**Error Response (400 Bad Request)**
```json
{
  "error": "Invalid URL"
}
```

**Key Features:**
- Validates URL format before shortening
- Checks if URL already exists (returns existing short code)
- Generates unique short code if new
- Stores creation timestamp automatically
- Optional expiration date support

#### 2. Redirect to Original URL
Click a shortened URL to redirect to the original URL. Increments click counter.

```http
GET /:shortCode
```

**Responses:**
- `302 Found` - Redirects to original URL (if active and not expired)
- `410 Gone` - Link has expired
- `404 Not Found` - Short code doesn't exist

**Expired Link Page:**
```html
⏰ Link Expired
This shortened URL has expired and is no longer accessible.
Expired at: [timestamp]
```

**Not Found Page:**
```html
🔍 Not Found
This shortened URL does not exist.
```

#### 3. Get URL Statistics
Retrieve statistics for a shortened URL.

```http
GET /api/stats/:shortCode
```

**Response (200 OK)**
```json
{
  "short_code": "abc123",
  "original_url": "https://example.com/very/long/url",
  "click_count": 42,
  "created_at": "2025-12-07T10:00:00.000Z",
  "expires_at": null
}
```

**Error Response (404 Not Found)**
```json
{
  "error": "Not found"
}
```

#### 4. Generate QR Code
Generate a QR code image for a shortened URL.

```http
GET /api/qr/:shortCode
```

**Response (200 OK)**
- Returns PNG image of QR code
- Content-Type: `image/png`
- Default size: 256x256 pixels
- Margin: 1 pixel

#### 5. Debug - List All URLs (Development)
View all shortened URLs in the database (for debugging purposes).

```http
GET /api/debug/urls
```

**Response (200 OK)**
```json
[
  {
    "short_code": "abc123",
    "original_url": "https://example.com/very/long/url"
  },
  {
    "short_code": "xyz789",
    "original_url": "https://google.com"
  }
]
```

## 🔧 Database Configuration

### Azure SQL Connection

The application connects to Azure SQL using the `mssql` package. Connection parameters are configured in `database.js`:

```javascript
{
  server: 'shorturl.database.windows.net',
  database: 'shorturldb',
  authentication: {
    type: 'default',
    options: {
      userName: 'shreya',
      password: 'your-password'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000
  }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `BASE_URL` | Base URL for shortened links | `http://localhost:5000` | No |

### Database Schema

#### URLs Table
```sql
CREATE TABLE urls (
  short_code NVARCHAR(50) PRIMARY KEY,
  original_url NVARCHAR(MAX) NOT NULL,
  click_count INT DEFAULT 0,
  created_at DATETIME DEFAULT GETUTCDATE(),
  expires_at DATETIME NULL
)
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `short_code` | NVARCHAR(50) | Unique identifier (Primary Key) |
| `original_url` | NVARCHAR(MAX) | Full original URL |
| `click_count` | INT | Number of clicks (default: 0) |
| `created_at` | DATETIME | Creation timestamp (UTC) |
| `expires_at` | DATETIME | Optional expiration timestamp |

## 🧠 Business Logic

### Duplicate URL Handling

When the same URL is shortened multiple times:
1. ✅ Check if URL already exists in database
2. ✅ Return existing short code if found
3. ✅ Only create new entry if URL is new
4. ✅ Prevents database bloat and ensures consistency

**Example:**
```
Request 1: POST /api/shorten with "https://github.com"
Response: { short_code: "abc123", short_url: "http://localhost:5000/abc123" }

Request 2: POST /api/shorten with "https://github.com" (same URL)
Response: { short_code: "abc123", short_url: "http://localhost:5000/abc123" } ← Same!
Database: Only 1 entry (not 2)
```

### Expiration Handling

URLs can have optional expiration timestamps:

**Scenario 1: No expiration**
```json
{
  "url": "https://example.com",
  "expires_at": null
}
→ Link works forever
```

**Scenario 2: With expiration**
```json
{
  "url": "https://example.com",
  "expires_at": "2025-12-31T23:59:59Z"
}
→ Link works until December 31, 2025
→ After expiration, accessing link shows "Link Expired" page
→ Click count not incremented for expired links
```

### Click Tracking

Each successful redirect increments the click counter:
- ✅ Only for non-expired, valid URLs
- ✅ Provides usage analytics
- ✅ Useful for marketing and traffic analysis
- ✅ Retrievable via `/api/stats/:shortCode` endpoint

## 🔐 Security Features

1. **URL Validation** - Validates URLs before shortening using `URL()` constructor
2. **SQL Injection Prevention** - Uses parameterized queries with `mssql` package
3. **CORS Support** - Configurable cross-origin requests
4. **HTTPS Ready** - Works with SSL/TLS on production
5. **Environment Variables** - Sensitive data not hardcoded
6. **Connection Encryption** - Azure SQL connections are encrypted by default
7. **Input Sanitization** - Trims whitespace from URLs to prevent duplicates

## 🏢 File Structure and Responsibilities

### server.js
**Responsibility:** API Routes and HTTP handling

```javascript
// Exports:
- POST /api/shorten          // Create short URL
- GET /:shortCode            // Redirect to original
- GET /api/stats/:shortCode  // Get statistics
- GET /api/qr/:shortCode     // Generate QR code
- GET /api/debug/urls        // Debug endpoint
```

**Handles:**
- Request validation
- Error responses (HTTP status codes)
- Response formatting
- Calls to urlService functions

### urlService.js
**Responsibility:** Data Access Layer and Business Logic

```javascript
// Exports:
- createShortUrl(url, expiresAt)        // Create or get existing short URL
- getUrlByShortCode(shortCode)          // Fetch URL by code
- incrementClickCount(shortCode)        // Increment clicks
- getUrlStats(shortCode)                // Get full statistics
```

**Handles:**
- All database queries
- URL deduplication logic
- Expiration checking
- Error handling from database

### database.js
**Responsibility:** Database Connection Management

```javascript
// Exports:
- Connection pool (mssql)
```

**Handles:**
- Connection to Azure SQL
- Table creation on startup
- Connection pooling
- Connection error logging

## 🧪 Testing Examples

### Test 1: Create Short URL
```bash
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Expected Response:**
```json
{
  "short_url": "http://localhost:5000/abc123",
  "short_code": "abc123"
}
```

### Test 2: Test Duplicate Detection
```bash
# First request
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Second request (same URL)
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Expected:** Both return the same `short_code`

### Test 3: Create URL with Expiration
```bash
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "expires_at":"2025-12-31T23:59:59Z"
  }'
```

### Test 4: Retrieve Statistics
```bash
curl http://localhost:5000/api/stats/abc123
```

**Expected Response:**
```json
{
  "short_code": "abc123",
  "original_url": "https://example.com",
  "click_count": 5,
  "created_at": "2025-12-07T10:00:00.000Z",
  "expires_at": null
}
```

### Test 5: Get QR Code
```bash
curl -o qrcode.png http://localhost:5000/api/qr/abc123
```

Saves QR code as PNG image

## 🐛 Troubleshooting

### Connection Issues
**Error:** `[ERROR] SQL Pool Error: Connection timeout`

**Solution:**
1. Verify Azure SQL server is running
2. Check firewall rules allow your IP address
3. Verify credentials in database.js
4. Ensure database exists in Azure

### URL Not Shortening
**Error:** `Failed to shorten`

**Solution:**
1. Check URL is valid (must be proper HTTP/HTTPS URL)
2. Check Azure SQL connection is active
3. Review server logs for detailed error
4. Verify URL doesn't contain invalid characters

### Expired Link Still Redirecting
**Issue:** Old links show as working after expiration

**Solution:**
1. Verify system time is correct on server
2. Check `expires_at` format is ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
3. Review expiration logic in `urlService.js` line 67-74

### Database Table Not Created
**Error:** `Table 'urls' not found`

**Solution:**
1. Wait 5-10 seconds after server startup
2. Check Azure SQL firewall settings
3. Verify database.js connection parameters
4. Check server logs for connection errors

## 📈 Performance Considerations

1. **Database Connection Pooling** - Maintains up to 10 persistent connections (configurable)
2. **Query Optimization** - Short_code is indexed (Primary Key)
3. **Stateless Design** - Can scale horizontally behind load balancer
4. **Async Operations** - All operations non-blocking
5. **Memory Efficient** - Streams QR code data instead of buffering

## 🚢 Deployment Guide

### Deploy to Azure App Service

1. **Create App Service**
   ```bash
   az appservice plan create \
     --name myplan \
     --resource-group mygroup \
     --sku B1 \
     --is-linux
   
   az webapp create \
     --resource-group mygroup \
     --plan myplan \
     --name myapp \
     --runtime "node|18-lts"
   ```

2. **Configure Environment Variables**
   - Go to Azure Portal
   - App Service → Configuration → Application settings
   - Add `PORT=80`
   - Add `BASE_URL=https://myapp.azurewebsites.net`
   - Add database credentials if not in code

3. **Deploy Code**
   ```bash
   git push azure main
   ```

4. **Verify Deployment**
   ```bash
   curl https://myapp.azurewebsites.net/api/debug/urls
   ```

### Deploy to Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Build and Run:**
```bash
docker build -t url-shortener .
docker run -p 5000:5000 -e PORT=5000 url-shortener
```

### Deploy to Other Platforms

- **Heroku**: Push to Heroku Git remote
- **AWS Lambda**: Use serverless framework
- **Google Cloud Run**: Push Docker image
- **DigitalOcean**: Deploy on droplets or App Platform

## 📝 API Usage Examples

### JavaScript/Node.js Example
```javascript
// Create short URL
async function shortenUrl(url) {
  const response = await fetch('http://localhost:5000/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      url: url,
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    })
  });
  return await response.json();
}

// Get statistics
async function getStats(shortCode) {
  const response = await fetch(`http://localhost:5000/api/stats/${shortCode}`);
  return await response.json();
}

// Usage
const result = await shortenUrl('https://github.com/yourrepo');
console.log(result.short_url);
```

### Python Example
```python
import requests

# Create short URL
url = 'https://github.com/yourrepo'
response = requests.post('http://localhost:5000/api/shorten', 
  json={'url': url})
print(response.json()['short_url'])

# Get statistics
shortcode = 'abc123'
response = requests.get(f'http://localhost:5000/api/stats/{shortcode}')
print(response.json())
```

### cURL Examples
```bash
# Create short URL
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Get statistics
curl http://localhost:5000/api/stats/abc123

# Get QR code
curl -o qrcode.png http://localhost:5000/api/qr/abc123
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
1. Check existing issues on GitHub
2. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - System information

## 🔄 Changelog

### v1.0.0 (2025-12-07)
- ✅ Initial release
- ✅ Azure SQL Database integration
- ✅ URL shortening with duplicate detection
- ✅ Click tracking and analytics
- ✅ QR code generation
- ✅ URL expiration support
- ✅ RESTful API with documentation
- ✅ Separation of Concerns architecture
- ✅ Comprehensive error handling

## 👤 Author


- GitHub: https://github.com/shreyavreddy/short-url
- Email: shreya.reddy110504@gmail.com

---

**Made for URL shortening**
