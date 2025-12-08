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
url-shortener-backend/
├── server.js           # Express server and API routes
├── database.js         # Azure SQL connection pool setup
├── urlService.js       # Data access layer (Business logic)
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (not committed)
├── .gitignore         # Git ignore rules
└── README.md          # This file

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
### Duplicate URL Handling
When the same URL is shortened multiple times:
1. ✅ Check if URL already exists in database
2. ✅ Return existing short code if found
3. ✅ Only create new entry if URL is new
4. ✅ Prevents database bloat and ensures consistency


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

# Get statistics
curl http://localhost:5000/api/stats/abc123

# Get QR code
curl -o qrcode.png http://localhost:5000/api/qr/abc123



- GitHub: https://github.com/shreyavreddy/short-url
- Email: shreya.reddy110504@gmail.com


