# Architecture & Design Document

## Overview

URL Shortener Backend is a scalable, production-ready service for creating and managing shortened URLs. This document describes the architectural decisions, design patterns, and technical implementation details.

## System Architecture

### High-Level Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTP/HTTPS
       │
┌──────▼──────────────────────────────────────┐
│         Express.js Server                    │
│  ┌────────────────────────────────────────┐  │
│  │  API Routes (server.js)                │  │
│  │  ├─ POST /api/shorten                 │  │
│  │  ├─ GET /:shortCode                   │  │
│  │  ├─ GET /api/stats/:shortCode         │  │
│  │  ├─ GET /api/qr/:shortCode            │  │
│  │  └─ GET /api/debug/urls               │  │
│  └────────────┬─────────────────────────┘  │
│               │                             │
│  ┌────────────▼─────────────────────────┐  │
│  │  Service Layer (urlService.js)       │  │
│  │  ├─ createShortUrl()                 │  │
│  │  ├─ getUrlByShortCode()              │  │
│  │  ├─ incrementClickCount()            │  │
│  │  └─ getUrlStats()                    │  │
│  └────────────┬─────────────────────────┘  │
└─────────────┬┘                             │
              │                              │
┌─────────────▼──────────────────────────┐  │
│   Azure SQL Database                   │  │
│  ┌────────────────────────────────────┐   │
│  │  Table: urls                       │   │
│  │  ├─ short_code (PK)                │   │
│  │  ├─ original_url                   │   │
│  │  ├─ click_count                    │   │
│  │  ├─ created_at                     │   │
│  │  └─ expires_at                     │   │
│  └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

## Layer Architecture

### 1. Presentation Layer (HTTP Routes)
**File:** `server.js`

Handles:
- HTTP request/response processing
- Route handling
- Input validation
- Error responses
- Status codes

Responsibilities:
- Parse incoming requests
- Validate request format
- Call service layer
- Format and return responses
- Handle HTTP errors

### 2. Business Logic Layer (Service)
**File:** `urlService.js`

Handles:
- URL deduplication logic
- Expiration checking
- Click counting
- Data transformation
- Business rule enforcement

Responsibilities:
- Check if URL already exists
- Generate short codes
- Verify URL expiration
- Transform data for storage
- Execute business rules

### 3. Data Access Layer (Database)
**File:** `database.js`

Handles:
- Database connection management
- Connection pooling
- SQL queries
- Error handling
- Table initialization

Responsibilities:
- Establish connection pool
- Create tables on startup
- Handle connection lifecycle
- Provide reusable connection

## Design Patterns Used

### 1. **Separation of Concerns (SoC)**

**Principle:** Each module has a single, well-defined responsibility.

**Implementation:**
```
server.js (Routes & HTTP)
    ↓
urlService.js (Business Logic)
    ↓
database.js (Data Access)
```

**Benefits:**
- Easy to test each layer independently
- Changes in database don't affect routes
- Reusable business logic
- Clear code organization

### 2. **Single Responsibility Principle (SRP)**

**Principle:** Each class/module should have only one reason to change.

**Example:**
```javascript
// ❌ Bad: Mixing concerns
async function createUrlAndRespond(req, res) {
  // 1. Validate input
  // 2. Query database
  // 3. Generate short code
  // 4. Insert data
  // 5. Format response
  // All in one function!
}

// ✅ Good: Separated concerns
async function createShortUrl(url, expiresAt) {
  // Only responsible for URL creation
}

app.post('/api/shorten', async (req, res) => {
  // Only responsible for HTTP handling
  const shortCode = await createShortUrl(url, expires_at);
  res.json({ short_code: shortCode });
});
```

### 3. **Promise/Async-Await Pattern**

**Principle:** All async operations return Promises for consistent handling.

**Implementation:**
```javascript
// All functions return Promises
const createShortUrl = async (url) => { /* ... */ };
const getUrlByShortCode = async (code) => { /* ... */ };
const incrementClickCount = async (code) => { /* ... */ };
```

**Benefits:**
- Consistent error handling with try-catch
- Avoids callback hell
- Better code readability
- Easier to debug

### 4. **Repository Pattern**

**Principle:** Data access is abstracted into a repository layer.

**Implementation:**
```javascript
// urlService.js acts as repository
- queryUrlByCode()
- queryUrlByOriginal()
- insertUrl()
- updateClickCount()
```

**Benefits:**
- Database agnostic
- Easy to swap databases
- Testable with mocks
- Centralized data queries

## Request Flow

### Flow 1: Create Short URL (POST /api/shorten)

```
1. Client sends POST request
   ↓
2. server.js receives request
   ├─ Validate URL format
   ├─ Trim whitespace
   ├─ Check if invalid
   ↓
3. Call urlService.createShortUrl()
   ├─ Check if URL exists (SELECT)
   ├─ If exists → return existing code
   ├─ If new → generate code
   ├─ Insert into database (INSERT)
   ↓
4. Return short URL to client
   ↓
5. Client receives response
```

### Flow 2: Access Shortened URL (GET /:shortCode)

```
1. User clicks shortened URL
   ↓
2. server.js receives GET request
   ↓
3. Call urlService.getUrlByShortCode()
   ├─ Query database
   ├─ Check if exists
   ├─ If not exists → reject with 'not_found'
   ├─ If expired → reject with 'expired'
   ├─ If valid → return URL
   ↓
4. If URL valid:
   ├─ Call incrementClickCount()
   ├─ Redirect to original URL
   ↓
5. If expired/not found:
   ├─ Return error page (HTML)
```

### Flow 3: Get Statistics (GET /api/stats/:shortCode)

```
1. Client requests statistics
   ↓
2. server.js receives request
   ↓
3. Call urlService.getUrlStats()
   ├─ Query database for all fields
   ├─ Return if exists
   ├─ Error if not found
   ↓
4. Return JSON response with:
   - short_code
   - original_url
   - click_count
   - created_at
   - expires_at
```

## Data Models

### URL Entity

```typescript
interface URL {
  short_code: string;        // Primary Key, Length: 50
  original_url: string;      // MAX length, Required
  click_count: number;       // Default: 0
  created_at: DateTime;      // UTC timestamp
  expires_at: DateTime | null; // Optional
}
```

### Request/Response Models

**Create Short URL Request:**
```typescript
{
  url: string;           // Required, must be valid URL
  expires_at?: string;   // Optional, ISO 8601 format
}
```

**Create Short URL Response:**
```typescript
{
  short_url: string;     // Full URL with base
  short_code: string;    // Just the code part
}
```

**Statistics Response:**
```typescript
{
  short_code: string;
  original_url: string;
  click_count: number;
  created_at: string;    // ISO 8601 timestamp
  expires_at: string | null;
}
```

## Key Algorithms

### 1. Duplicate Detection Algorithm

```
Function: createShortUrl(url, expiresAt)
Input: url (string), expiresAt (string?)
Output: shortCode (string)

1. Trim url whitespace
2. Query: SELECT short_code FROM urls WHERE original_url = url
3. If record exists:
   └─ Return existing short_code
4. If not found:
   ├─ Generate new short_code using shortid
   ├─ Insert INTO urls VALUES (short_code, url, 0, NOW(), expiresAt)
   └─ Return new short_code
```

**Complexity:** O(n) where n is database query time
**Space:** O(1) - constant space

### 2. Expiration Check Algorithm

```
Function: isExpired(expiresAt)
Input: expiresAt (DateTime?)
Output: isExpired (boolean)

1. If expiresAt is NULL:
   └─ Return false (never expires)
2. Get currentTime = NOW()
3. Parse expiresAt as DateTime
4. If currentTime > expiresAt:
   └─ Return true (expired)
5. Return false (still valid)
```

**Complexity:** O(1) - constant time comparison
**Edge Cases:** 
- Timezone handling (use UTC)
- Clock skew tolerance

### 3. Click Increment Algorithm

```
Function: incrementClickCount(shortCode)
Input: shortCode (string)
Output: void

1. Update urls SET click_count = click_count + 1 
   WHERE short_code = shortCode
2. Execute atomic update (prevents race conditions)
```

**Complexity:** O(1) - single index lookup
**Atomicity:** Database handles concurrent updates

## Error Handling Strategy

### Error Categories

| Category | HTTP Status | Example | Handling |
|----------|-------------|---------|----------|
| Validation Error | 400 | Invalid URL | Return error JSON |
| Not Found | 404 | URL doesn't exist | Return 404 page |
| Expired | 410 | URL past expiration | Return 410 page |
| Server Error | 500 | Database connection failed | Return error JSON |

### Error Response Format

```json
{
  "error": "Human readable error message"
}
```

### Error Logging

```javascript
// All errors logged to console
console.error('[ERROR] Description:', error);
console.log('[DEBUG] Additional context');
console.log('[INFO] Operation successful');
```

## Performance Optimization

### 1. Database Indexing

**Primary Key on short_code:**
```sql
CREATE TABLE urls (
  short_code NVARCHAR(50) PRIMARY KEY,
  ...
)
```
- O(1) lookup time
- Prevents duplicates automatically
- Fast foreign key lookups

### 2. Connection Pooling

```javascript
// Connection pool with default 10 connections
const pool = new sql.ConnectionPool(config);
pool.connect();
```
- Reuses connections
- Reduces connection overhead
- Improves throughput

### 3. Query Optimization

**SELECT with TOP 1:**
```javascript
SELECT TOP 1 short_code FROM urls WHERE original_url = @url
```
- Stops after finding first match
- Reduces data transfer

### 4. Streaming for QR Codes

```javascript
QRCode.toFileStream(res, url)
```
- Streams data instead of buffering
- Reduces memory usage
- Faster response time

## Security Considerations

### 1. Input Validation
```javascript
// URL validation
function isValidUrl(string) {
  try {
    new URL(string);  // Throws if invalid
    return true;
  } catch {
    return false;
  }
}
```

### 2. SQL Injection Prevention
```javascript
// ✅ Good: Parameterized query
await pool.request()
  .input('url', sql.NVarChar(sql.MAX), url)
  .query('SELECT * FROM urls WHERE original_url = @url');

// ❌ Bad: String concatenation
.query(`SELECT * FROM urls WHERE original_url = '${url}'`);
```

### 3. CORS Configuration
```javascript
// Allows cross-origin requests
app.use(cors());
```

### 4. Environment Secrets
```javascript
// Credentials in code (not ideal, but hardcoded for this project)
// In production: use Key Vault or environment variables
const config = {
  authentication: {
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  }
};
```

## Scalability Considerations

### Horizontal Scaling
```
Load Balancer
    ├─ Server Instance 1
    ├─ Server Instance 2
    └─ Server Instance 3
         ↓ (all connect to same)
    Azure SQL Database
```

**Stateless Design:** Instances don't store state
**Shared Database:** Central data store

### Vertical Scaling
- Increase server RAM
- Increase database performance tier
- Optimize query indexes

### Database Optimization
- Add more read replicas
- Partition data by short_code
- Archive old data

## Testing Strategy

### Unit Tests
Test individual functions:
```javascript
// urlService.js
- createShortUrl()
- getUrlByShortCode()
- incrementClickCount()
- getUrlStats()
```

### Integration Tests
Test API endpoints:
```javascript
- POST /api/shorten
- GET /:shortCode
- GET /api/stats/:shortCode
```

### End-to-End Tests
Test complete workflows:
```javascript
1. Create URL
2. Access shortened URL
3. Verify statistics
4. Check expiration
```

## Future Enhancements

### Proposed Features
1. **URL Analytics Dashboard** - Visual statistics
2. **Batch Operations** - Shorten multiple URLs
3. **API Key Authentication** - Secure API access
4. **Custom Short Codes** - User-defined aliases
5. **Link Password Protection** - Optional authentication
6. **Geographic Analytics** - Click location tracking
7. **Custom Domains** - Private short URL service
8. **API Rate Limiting** - Prevent abuse

### Database Enhancements
```sql
-- Add more tracking
ALTER TABLE urls ADD referer VARCHAR(MAX);
ALTER TABLE urls ADD user_agent VARCHAR(MAX);
ALTER TABLE urls ADD country VARCHAR(10);

-- Add user management
CREATE TABLE users (
  user_id INT PRIMARY KEY IDENTITY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT GETUTCDATE()
);

-- Associate URLs with users
ALTER TABLE urls ADD COLUMN user_id INT;
ALTER TABLE urls ADD FOREIGN KEY (user_id) REFERENCES users(user_id);
```

## Deployment Checklist

- [ ] Update `BASE_URL` in environment
- [ ] Configure Azure SQL firewall
- [ ] Test API endpoints
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Document deployment process
- [ ] Test failover procedures
- [ ] Set up logging
- [ ] Monitor error rates

## Conclusion

This architecture provides a scalable, maintainable, and secure URL shortening service. The separation of concerns makes it easy to extend and modify while maintaining code quality and performance.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-07
**Maintainer:** Your Team
