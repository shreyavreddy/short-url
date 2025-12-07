# URL Shortener Frontend - React Application

This is the frontend for the URL Shortener application built with React.

## Quick Start

```powershell
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start
```

## Features

- 🔗 Shorten long URLs
- 📱 Generate QR codes for shortened URLs
- 📊 View statistics (click count, creation date, expiry date)
- ⏰ Set expiration dates for shortened URLs
- 📋 Copy shortened URLs to clipboard
- 🎨 Beautiful modern UI with gradient design

## How It Works

1. User enters a long URL in the input field
2. Click "Shorten URL" button
3. Frontend sends request to backend API
4. Backend generates unique short code and stores in database
5. Frontend receives shortened URL and displays QR code
6. User can copy the short URL or view stats

## Environment Variables

Create a `.env` file in this directory:

```
REACT_APP_API_URL=http://localhost:5000
```

## Backend Connection

This frontend communicates with the backend running on `http://localhost:5000`

Make sure backend is running before starting frontend:
```powershell
cd ../url-shortener-backend
npm start
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Create production build
- `npm test` - Run tests
- `npm eject` - Eject from create-react-app (not reversible)

## Project Structure

```
src/
├── App.js       # Main component with all logic
├── App.css      # Component styling
├── index.js     # React entry point
└── index.css    # Global styles

public/
└── index.html   # HTML template
```

## Dependencies

- `react` - UI library
- `react-dom` - React renderer for web
- `react-scripts` - Build scripts and configuration

For more details, see the main README.md in the backend folder.
