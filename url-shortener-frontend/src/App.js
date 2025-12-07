import React, { useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [url, setUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleShorten = async () => {
    setError('');
    setResult(null);
    setQrCode(null);
    setShowStats(false);
    setStats(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to shorten URL');
      }

      const data = await response.json();
      setResult(data);
      setUrl('');
      setExpiresAt('');

      // Fetch QR code
      try {
        setQrCode(`${API_URL}/api/qr/${data.short_code}`);
      } catch (err) {
        console.log('QR Code loading...');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Make sure the backend is running!');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    if (!result) return;

    try {
      const response = await fetch(
        `${API_URL}/api/stats/${result.short_code}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setShowStats(true);
    } catch (err) {
      setError('Failed to fetch stats');
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.short_url);
      alert('Copied to clipboard!');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleShorten();
    }
  };

  const isExpired = () => {
    if (!result || !result.expires_at) return false;
    return new Date() > new Date(result.expires_at);
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">URL Shortener</h1>
        <p className="subtitle">
          Paste a long link and get a short one with a QR code.
        </p>

        <div className="form-group">
          <label className="label">Long URL</label>
          <input
            className="input"
            type="text"
            placeholder="https://example.com/very/long/link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div className="form-group">
          <label className="label">Expiry (optional)</label>
          <input
            className="input"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <button
          className="button"
          onClick={handleShorten}
          disabled={loading}
        >
          {loading ? 'Shortening...' : 'Shorten URL'}
        </button>

        {error && <div className={`error ${error ? 'show' : ''}`}>{error}</div>}

        {result && (
          <div className="result show">
            <div className="result-title">Your Short URL</div>
            {isExpired() ? (
              <div className="error show">This link has expired and is no longer active.</div>
            ) : (
              <>
                <a href={result.short_url} target="_blank" rel="noopener noreferrer" className="result-link">{result.short_url}</a>
                <div className="copy-button-container">
                  <button className="copy-button" onClick={copyToClipboard}>
                    Copy to Clipboard
                  </button>
                </div>
              </>
            )}

            <div className="stats-section">
              <button className="stats-button" onClick={() => showStats ? setShowStats(false) : handleGetStats()}>
                {showStats ? 'Hide Stats' : 'View Stats'}
              </button>
            </div>

            {showStats && stats && (
              <div className="stats-info show">
                <div className="stats-row">
                  <span className="stats-label">Short Code:</span>
                  <span className="stats-value">{stats.short_code}</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Click Count:</span>
                  <span className="stats-value">{stats.click_count}</span>
                </div>
                <div className="stats-row">
                  <span className="stats-label">Created:</span>
                  <span className="stats-value">
                    {new Date(stats.created_at).toLocaleString()}
                  </span>
                </div>
                {stats.expires_at && (
                  <div className="stats-row">
                    <span className="stats-label">Expires:</span>
                    <span className="stats-value">
                      {new Date(stats.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {qrCode && (
          <div className="qr-container show">
            <p className="qr-label">Scan QR to open:</p>
            <img
              className="qr-image"
              src={qrCode}
              alt="QR code for short URL"
            />
          </div>
        )}

        <p className="footer">
          Built for the URL Shortener assignment.
        </p>
      </div>
    </div>
  );
}

export default App;
