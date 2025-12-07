const sql = require('mssql');
require('dotenv').config();

// Azure SQL Database connection configuration
const config = {
  server: 'shorturl.database.windows.net',
  database: 'shorturldb',
  authentication: {
    type: 'default',
    options: {
      userName: 'shreya',
      password: 'myw0rld@123'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Create connection pool
const pool = new sql.ConnectionPool(config);

// Handle connection pool events
pool.on('error', err => {
  console.error('[ERROR] SQL Pool Error:', err);
});

// Connect to Azure SQL and create table if not exists
pool.connect().then(pool => {
  console.log('[INFO] Connected to Azure SQL Database');
  
  // Create table if it doesn't exist
  return pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='urls' and xtype='U')
    CREATE TABLE urls (
      short_code NVARCHAR(50) PRIMARY KEY,
      original_url NVARCHAR(MAX) NOT NULL,
      click_count INT DEFAULT 0,
      created_at DATETIME DEFAULT GETUTCDATE(),
      expires_at DATETIME NULL
    )
  `);
}).then(() => {
  console.log('[INFO] URLs table is ready');
}).catch(err => {
  console.error('[ERROR] Database initialization error:', err);
});

module.exports = pool;

