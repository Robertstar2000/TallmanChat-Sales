# Production Setup

## Required Changes

### 1. Install Database Dependencies
```bash
cd server
npm install sqlite3
```

### 2. Update backend-server.js
Replace the mock services section with:
```javascript
const { createProductionServices } = require('./production-services');

async function loadServices() {
    const services = createProductionServices();
    dbService = services.dbService;
    knowledgeService = services.knowledgeService;
    chatService = services.chatService;
    console.log('✅ Production services loaded');
}
```

### 3. Environment Variables
Set these for production:
```
NODE_ENV=production
LDAP_SERVICE_HOST=10.10.20.253
OLLAMA_HOST=10.10.20.24
```

### 4. Database Location
- SQLite database: `server/tallman.db`
- Backup regularly in production
- Consider PostgreSQL/MySQL for high load

### 5. Security Enhancements
- Add input validation
- Implement rate limiting
- Use HTTPS certificates
- Add authentication middleware
- Sanitize database queries

## Quick Production Deploy
1. `npm install sqlite3`
2. Replace services in backend-server.js
3. Set environment variables
4. Start services with production config