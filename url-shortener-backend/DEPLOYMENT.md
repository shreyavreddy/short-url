# Deployment Guide

Comprehensive guide to deploying URL Shortener Backend to production environments.

## Table of Contents
1. [Azure App Service](#azure-app-service)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes](#kubernetes)
4. [Configuration Management](#configuration-management)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

## Azure App Service

### Prerequisites
- Azure subscription
- Azure CLI installed (`az` command)
- Git repository set up

### Step 1: Create Resource Group
```bash
az group create \
  --name url-shortener-rg \
  --location eastus
```

### Step 2: Create App Service Plan
```bash
az appservice plan create \
  --name url-shortener-plan \
  --resource-group url-shortener-rg \
  --sku B2 \
  --is-linux
```

**SKU Options:**
- `B1` - Basic (low traffic)
- `B2` - Basic (medium traffic)
- `S1` - Standard (production)
- `P1` - Premium (high performance)

### Step 3: Create Web App
```bash
az webapp create \
  --resource-group url-shortener-rg \
  --plan url-shortener-plan \
  --name url-shortener-api \
  --runtime "node|18-lts"
```

### Step 4: Configure Environment Variables
```bash
# Set configuration
az webapp config appsettings set \
  --resource-group url-shortener-rg \
  --name url-shortener-api \
  --settings \
    PORT=8080 \
    BASE_URL=https://url-shortener-api.azurewebsites.net \
    WEBSITE_NODE_DEFAULT_VERSION=18.17.0
```

### Step 5: Enable Continuous Deployment (Git)

**Option A: Local Git Deployment**
```bash
# Get deployment credentials
az webapp deployment source config-local-git \
  --resource-group url-shortener-rg \
  --name url-shortener-api

# Output:
# Local git deployment url: https://[username]@url-shortener-api.scm.azurewebsites.net/url-shortener-api.git

# Set git remote
git remote add azure https://[username]@url-shortener-api.scm.azurewebsites.net/url-shortener-api.git

# Deploy
git push azure main
```

**Option B: GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build (if needed)
        run: npm run build || true
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: url-shortener-api
          package: .
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### Step 6: Verify Deployment
```bash
# Test API
curl https://url-shortener-api.azurewebsites.net/api/debug/urls

# Check logs
az webapp log tail \
  --resource-group url-shortener-rg \
  --name url-shortener-api
```

## Docker Deployment

### Create Dockerfile

```dockerfile
# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/debug/urls', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      PORT: 5000
      BASE_URL: http://localhost:5000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/debug/urls"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build and Run

```bash
# Build image
docker build -t url-shortener:latest .

# Run locally
docker run -p 5000:5000 \
  -e PORT=5000 \
  -e BASE_URL=http://localhost:5000 \
  url-shortener:latest

# With docker-compose
docker-compose up -d
```

### Push to Docker Registry

```bash
# Login to Docker Hub
docker login

# Tag image
docker tag url-shortener:latest yourname/url-shortener:latest

# Push
docker push yourname/url-shortener:latest

# Or use Azure Container Registry
az acr build --registry myregistry --image url-shortener:latest .
```

## Kubernetes

### Create Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: url-shortener
  labels:
    app: url-shortener
spec:
  replicas: 3
  selector:
    matchLabels:
      app: url-shortener
  template:
    metadata:
      labels:
        app: url-shortener
    spec:
      containers:
      - name: url-shortener
        image: yourregistry.azurecr.io/url-shortener:latest
        ports:
        - containerPort: 5000
        env:
        - name: PORT
          value: "5000"
        - name: BASE_URL
          value: "https://api.example.com"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/debug/urls
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/debug/urls
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Create Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: url-shortener-service
spec:
  type: LoadBalancer
  selector:
    app: url-shortener
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
```

### Deploy to AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group url-shortener-rg \
  --name url-shortener-aks \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets

# Get credentials
az aks get-credentials \
  --resource-group url-shortener-rg \
  --name url-shortener-aks

# Deploy
kubectl apply -f k8s/

# Check status
kubectl get pods
kubectl get services
```

## Configuration Management

### Environment Variables

```env
# .env (production)
PORT=80
BASE_URL=https://api.example.com

# Database credentials are hardcoded in database.js
# In production, use Azure Key Vault instead
```

### Azure Key Vault Integration

```javascript
// database.js
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const vaultUrl = "https://mykeyvault.vault.azure.net/";
const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

async function getDbConfig() {
  const user = await client.getSecret("db-user");
  const password = await client.getSecret("db-password");
  
  return {
    server: 'shorturl.database.windows.net',
    database: 'shorturldb',
    authentication: {
      type: 'default',
      options: {
        userName: user.value,
        password: password.value
      }
    }
  };
}
```

### Configuration by Environment

```javascript
// database.js
const config = {
  development: {
    server: 'localhost',
    database: 'shorturldb_dev'
  },
  production: {
    server: 'shorturl.database.windows.net',
    database: 'shorturldb'
  }
};

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];
```

## Monitoring & Logging

### Application Insights Setup

```bash
# Enable Application Insights
az webapp config set \
  --resource-group url-shortener-rg \
  --name url-shortener-api \
  --web-sockets-enabled true

# Add instrumentation key
az monitor app-insights component create \
  --resource-group url-shortener-rg \
  --app url-shortener-insights \
  --location eastus
```

### Application Insights Integration

```javascript
// server.js
const appInsights = require("applicationinsights");

appInsights
  .setup(process.env.APPINSIGHTS_INSTRUMENTATION_KEY)
  .setAutoCollectConsole(true, true)
  .start();

const client = appInsights.defaultClient;

// Track custom events
app.post('/api/shorten', async (req, res) => {
  try {
    const shortCode = await urlService.createShortUrl(url, expires_at);
    
    client.trackEvent({
      name: "URL_SHORTENED",
      properties: {
        shortCode: shortCode,
        hasExpiration: !!expires_at
      }
    });
    
    res.json({ short_code: shortCode });
  } catch (err) {
    client.trackException({ exception: err });
    res.status(500).json({ error: 'Failed to shorten' });
  }
});
```

### Log Aggregation

```bash
# View logs
az webapp log tail \
  --resource-group url-shortener-rg \
  --name url-shortener-api

# Stream logs in real-time
az webapp log tail \
  --resource-group url-shortener-rg \
  --name url-shortener-api \
  --provider "application"
```

### Alerts Configuration

```bash
# Create alert for high error rate
az monitor metrics alert create \
  --name url-shortener-error-alert \
  --resource-group url-shortener-rg \
  --scopes "/subscriptions/{subscription-id}/resourceGroups/url-shortener-rg/providers/Microsoft.Web/sites/url-shortener-api" \
  --condition "avg Http5xx > 5" \
  --description "Alert when 5xx errors exceed 5 in 1 minute"
```

## Troubleshooting

### Check Deployment Status

```bash
# Get deployment details
az webapp show \
  --resource-group url-shortener-rg \
  --name url-shortener-api

# View logs
az webapp log show \
  --resource-group url-shortener-rg \
  --name url-shortener-api
```

### Common Issues

#### Application won't start
```bash
# Check logs for errors
az webapp log tail --resource-group url-shortener-rg --name url-shortener-api

# Restart app
az webapp restart --resource-group url-shortener-rg --name url-shortener-api
```

#### Database connection fails
```bash
# Verify Azure SQL firewall rules
az sql server firewall-rule list \
  --resource-group url-shortener-rg \
  --server shorturl

# Add App Service IP to firewall
az sql server firewall-rule create \
  --resource-group url-shortener-rg \
  --server shorturl \
  --name AllowAppService \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

#### High latency
```bash
# Scale up app service
az appservice plan update \
  --name url-shortener-plan \
  --resource-group url-shortener-rg \
  --sku S1

# Check database performance
az sql db show-connection-string \
  --client sqlcmd \
  --auth-type sqlpassword \
  --server shorturl \
  --name shorturldb
```

## Performance Optimization

### Caching Strategy

```javascript
// Add Redis caching (optional)
const redis = require('redis');
const client = redis.createClient();

app.get('/api/stats/:shortCode', async (req, res) => {
  // Check cache first
  const cached = await client.get(`stats:${req.params.shortCode}`);
  if (cached) return res.json(JSON.parse(cached));
  
  // If not in cache, fetch from DB
  const stats = await urlService.getUrlStats(req.params.shortCode);
  
  // Cache for 1 hour
  await client.setex(`stats:${req.params.shortCode}`, 3600, JSON.stringify(stats));
  
  res.json(stats);
});
```

### Database Optimization

```javascript
// Add query timeouts
const pool = new sql.ConnectionPool({
  ...config,
  requestTimeout: 30000,
  connectionTimeout: 15000
});

// Connection pool size
pool.min = 5;
pool.max = 20;
```

## Cost Optimization

### Azure Cost Management

```bash
# Set spending alerts
az billing account list

# View current spending
az consumption usage list \
  --start-date 2025-01-01 \
  --end-date 2025-12-31
```

### Reduce Costs

1. **Use B1 tier** for low-traffic apps
2. **Stop app during off-hours** with Azure Automation
3. **Use reserved instances** for long-term deployments
4. **Optimize database queries** to reduce execution time
5. **Use CDN** for static assets (if any)

## Rollback Strategy

### Deployment Slots

```bash
# Create staging slot
az webapp deployment slot create \
  --resource-group url-shortener-rg \
  --name url-shortener-api \
  --slot staging

# Deploy to staging
git push azure main:refs/heads/staging

# Test in staging
curl https://url-shortener-api-staging.azurewebsites.net/api/debug/urls

# Swap to production
az webapp deployment slot swap \
  --resource-group url-shortener-rg \
  --name url-shortener-api \
  --slot staging
```

## Backup & Recovery

```bash
# Backup Azure SQL database
az sql db copy \
  --resource-group url-shortener-rg \
  --server shorturl \
  --name shorturldb \
  --dest-name shorturldb-backup

# Enable automated backups
az sql db update \
  --resource-group url-shortener-rg \
  --server shorturl \
  --name shorturldb \
  --retention-days 35
```

---

**Last Updated:** 2025-12-07
**Version:** 1.0
