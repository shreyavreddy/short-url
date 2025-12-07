const pool = require('./database');
const shortid = require('shortid');
const sql = require('mssql');

/**
 * Data Access Layer for URL operations
 * Handles all database interactions with Azure SQL
 */

/**
 * Create a new shortened URL (or return existing if already exists)
 * @param {string} originalUrl - The original URL to shorten
 * @param {string} expiresAt - Expiration timestamp (optional)
 * @returns {Promise} Resolves with short code, rejects on error
 */
const createShortUrl = async (originalUrl, expiresAt = null) => {
  try {
    // Trim the URL to avoid whitespace issues
    const trimmedUrl = originalUrl.trim();
    
    console.log(`[DEBUG] Checking for existing URL: ${trimmedUrl}`);
    
    // First, check if URL already exists
    const checkResult = await pool
      .request()
      .input('original_url', sql.NVarChar(sql.MAX), trimmedUrl)
      .query('SELECT TOP 1 short_code FROM urls WHERE original_url = @original_url');
    
    if (checkResult.recordset && checkResult.recordset.length > 0) {
      // URL already exists, return existing short code
      const existingShortCode = checkResult.recordset[0].short_code;
      console.log(`[INFO] ✓ URL already exists, returning existing short code: ${existingShortCode}`);
      return existingShortCode;
    }

    // URL doesn't exist, create a new one
    console.log(`[INFO] Creating new short code for: ${trimmedUrl}`);
    const shortCode = shortid.generate();

    await pool
      .request()
      .input('short_code', sql.NVarChar(50), shortCode)
      .input('original_url', sql.NVarChar(sql.MAX), trimmedUrl)
      .input('created_at', sql.DateTime, new Date())
      .input('expires_at', sql.DateTime, expiresAt ? new Date(expiresAt) : null)
      .query('INSERT INTO urls (short_code, original_url, created_at, expires_at) VALUES (@short_code, @original_url, @created_at, @expires_at)');
    
    console.log(`[INFO] ✓ New short code created: ${shortCode}`);
    return shortCode;
  } catch (err) {
    console.error(`[ERROR] Database error while creating short URL: ${err}`);
    throw err;
  }
};

/**
 * Get URL by short code (checks if not expired)
 * @param {string} shortCode - The short code
 * @returns {Promise} Resolves with URL data, rejects if not found or expired
 */
const getUrlByShortCode = async (shortCode) => {
  try {
    const result = await pool
      .request()
      .input('short_code', sql.NVarChar(50), shortCode)
      .query('SELECT * FROM urls WHERE short_code = @short_code');
    
    if (!result.recordset || result.recordset.length === 0) {
      throw { status: 'not_found', message: 'Not found' };
    }

    const row = result.recordset[0];

    if (row.expires_at) {
      // Parse the expires_at timestamp and compare with current time
      const expiryTime = new Date(row.expires_at).getTime();
      const currentTime = new Date().getTime();
      
      console.log(`[DEBUG] Short Code: ${shortCode}`);
      console.log(`[DEBUG] Expiry Time: ${row.expires_at} (${expiryTime})`);
      console.log(`[DEBUG] Current Time: ${new Date().toISOString()} (${currentTime})`);
      console.log(`[DEBUG] Is Expired: ${currentTime > expiryTime}`);
      
      if (currentTime > expiryTime) {
        throw { status: 'expired', message: 'This link has expired', expires_at: row.expires_at };
      }
    }

    return row;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    console.error(`[ERROR] Database error while retrieving URL: ${err}`);
    throw err;
  }
};

/**
 * Increment click count for a short code
 * @param {string} shortCode - The short code
 * @returns {Promise} Resolves when update is complete
 */
const incrementClickCount = async (shortCode) => {
  try {
    await pool
      .request()
      .input('short_code', sql.NVarChar(50), shortCode)
      .query('UPDATE urls SET click_count = click_count + 1 WHERE short_code = @short_code');
  } catch (err) {
    console.error(`[ERROR] Database error while incrementing click count: ${err}`);
    throw err;
  }
};

/**
 * Get URL statistics by short code
 * @param {string} shortCode - The short code
 * @returns {Promise} Resolves with URL stats, rejects if not found
 */
const getUrlStats = async (shortCode) => {
  try {
    const result = await pool
      .request()
      .input('short_code', sql.NVarChar(50), shortCode)
      .query('SELECT * FROM urls WHERE short_code = @short_code');
    
    if (!result.recordset || result.recordset.length === 0) {
      throw new Error('Not found');
    }

    return result.recordset[0];
  } catch (err) {
    console.error(`[ERROR] Database error while retrieving stats: ${err}`);
    throw err;
  }
};

module.exports = {
  createShortUrl,
  getUrlByShortCode,
  incrementClickCount,
  getUrlStats
};
