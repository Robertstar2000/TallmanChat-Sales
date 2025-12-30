# Tallman Chat Production Deployment & Updates Guide

## 📋 **Overview**

This guide covers the production deployment architecture, code update procedures, and system management for the Tallman Chat application running on Windows Server 2022 with IIS frontend and Windows service backend.

## 🏗️ **Current Production Architecture**

### **System Components**
- **Containerization**: Docker Compose multi-service setup
- **Frontend**: React SPA served by Node.js (port 3230)
- **Backend**: Express.js API server (port 3231)
- **AI Models**:
  - **Primary**: Google Gemini 2.0 Flash (experimental) - Cloud API
  - **Secondary**: Docker Granite 4.0 Nano - Local container model
  - **Fallback**: Automatic switching between models
- **Database**: In-memory storage with persistent knowledge base
- **Authentication**: LDAP/Active Directory (`host.docker.internal:3100`)
- **API Bridge**: Granite API bridge on port 12435

### **URLs & Access**
- **Production UI**: `http://localhost:3230`
- **Backend API**: `http://localhost:3231/api`
- **Granite API Bridge**: `http://localhost:12435/v1/chat/completions`
- **Admin Panel**: Via UI login → "Admin" role access
- **Health Check**: `/api/health` endpoint

---

## 🔄 **Update Process Overview**

### **Normal Code Updates**
1. **Pull latest code** from repository
2. **Test changes** in development
3. **Build production assets**
4. **Redeploy services** with zero downtime
5. **Verify functionality**

### **Knowledge Base Updates**
- **Static updates** - Deploy with code changes
- **Dynamic updates** - Via admin panel (no redeploy needed)

### **Configuration Updates**
- **LDAP settings** - Require service restart
- **AI models** - May require service restart
- **Firewall rules** - Manual updates

---

## 🚀 **Code Update Procedure**

### **Step 1: Prepare Update**

```bash
# Navigate to application directory
cd c:\Users\rober\TallmanChat\TallmanChat-Sales

# Create backup branch (optional)
git branch backup-$(date +%Y%m%d-%H%M%S)

# Pull latest changes
git pull origin main

# Check what changed
git log --oneline -10
```

### **Step 2: Install Dependencies (if needed)**

```bash
# Install any new dependencies
npm install

# Check for security vulnerabilities
npm audit
```

### **Step 3: Build Production Assets**

```bash
# Build React application
npm run build

# Verify build completed successfully
ls -la dist/
```

### **Step 4: Zero-Downtime Redeployment**

#### **Docker Container Update**

```bash
# Stop current containers
docker-compose down

# Rebuild and start containers
docker-compose up --build -d

# Verify containers are running
docker ps
```

### **Step 5: Verify Deployment**

```bash
# Test UI access
curl http://localhost:3230

# Test backend API
curl http://localhost:3231/api/health

# Test LLM functionality
curl -X POST http://localhost:3231/api/llm-test

# Check container logs
docker logs tallmanchat-sales-tallman-chat-1
```

### **Step 6: Rollback Plan**

If issues occur:

```bash
# Immediate rollback
git reset --hard HEAD~1
npm run build
net stop TallmanChatService
net start TallmanChatService
```

---

## 🛠️ **Specific Update Types**

### **Frontend UI Updates**

#### **React Component Changes**
```bash
# Update component
edit components/ChatInput.tsx

# Build and deploy
npm run build
net stop TallmanChatService
net start TallmanChatService
```

#### **CSS/Style Updates**
```bash
# Update styles
edit src/main.css

# Build and deploy
npm run build
# Services auto-reload on file changes
```

### **Backend API Updates**

#### **Chat Logic Changes**
```typescript
// services/ollamaService.ts
// Update AI model or parameters
export const OLLAMA_CONFIG = {
    host: 'http://10.10.20.24:11434',
    model: 'llama3.1:8b', // or new model
    maxTokens: 2000
};
```

#### **API Endpoint Changes**
```javascript
// server/main-server.js or backend-server.js
app.post('/api/new-endpoint', (req, res) => {
    // New endpoint logic
});
```

### **Knowledge Base Updates**

#### **Static Knowledge Updates**
```typescript
// services/knowledgeBase.ts
const DEFAULT_KNOWLEDGE_BASE: KnowledgeItem[] = [
    // Add new knowledge items
    {
        content: "New Tallman Equipment information...",
        timestamp: Date.now()
    }
];
```

#### **Dynamic Knowledge Addition**
```bash
# Via admin panel (no redeploy needed)
# Access: http://10.10.20.9:3005
# Admin Panel → Knowledge Base → Add Item
```

### **LDAP Configuration Updates**

```javascript
// server/ldap-auth.js
const LDAP_CONFIG = {
    server: 'new-dc.example.com',     // New domain controller
    baseDN: 'DC=newdomain,DC=com',    // New domain
    bindDN: 'CN=NewService,DC=newdomain,DC=com',
    bindPassword: 'newPassword123'
};
```

**Requires service restart after changes.**

### **AI Model Updates**

#### **Change Model**
```bash
# Pull new Ollama model
ollama pull llama3.2:8b  # New model

# Update configuration
edit services/ollamaService.ts
const CONFIG = { model: 'llama3.2:8b' };
```

#### **Change Ollama Server**
```typescript
// services/ollamaService.ts
const OLLAMA_HOST = 'http://new-server:11434';
```

---

## 🔧 **Configuration Management**

### **Environment Variables**

```bash
# .env.local (for local development)
OLLAMA_HOST=http://10.10.20.24:11434
AI_MODEL=llama3.1:8b
LDAP_SERVER=dc02.tallman.com

# Production config in service environment
nssm set TallmanChatService AppEnvironmentExtra OLLAMA_HOST=http://10.10.20.24:11434
```

### **Service Configuration**

```bash
# View current NSSM settings
nssm get TallmanChatService AppDirectory

# Update service settings
nssm set TallmanChatService AppRestartDelay 10000
nssm set TallmanChatService AppExit Default Restart

# Edit service GUI
nssm edit TallmanChatService
```

### **Firewall Updates**

If you add new ports:

```bash
# Add new firewall rule
netsh advfirewall firewall add rule name="Tallman New Service" dir=in action=allow protocol=TCP localport=3006

# List current rules
netsh advfirewall firewall show rule name=all | findstr Tallman
```

---

## 📊 **Monitoring & Logging**

### **Service Logs**

```bash
# NSSM stdout logs
nssm view TallmanChatService AppStdout

# NSSM stderr logs
nssm view TallmanChatService AppStderr

# Rotate logs
nssm rotate TallmanChatService
```

### **Application Health Checks**

```bash
# API health
curl http://10.10.20.9:3005/api/health

# LDAP health
curl http://10.10.20.9:3890/health

# System resource check
tasklist | findstr node
netstat -ano | findstr :3005
```

### **Performance Monitoring**

```powershell
# Windows Performance Monitor
perfmon

# Event Viewer
eventvwr.msc

# Check service CPU/memory usage
Get-Process | Where-Object { $_.ProcessName -like "*node*" }
```

---

## 🔄 **Automated Deployment (Advanced)**

### **GitHub Actions Setup**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Tallman Chat
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Build production
      run: npm run build
    - name: Deploy to server
      run: |
        # SSH/SCP to deployment server
        scp -r dist/* user@server:/path/to/app
        # Remote commands to restart services
```

### **Automated Testing**

```bash
# Run tests before deployment
npm test

# Integration tests
node test-integration.js

# Manually test critical paths:
# 1. Login → 2. Chat → 3. Admin Panel → 4. Knowledge Base
```

---

## 🛡️ **Security Updates**

### **Dependency Updates**

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Major version updates (test carefully)
npm install package@latest

# Security audit
npm audit fix
```

### **SSL Certificate Renewal**

```bash
# Every 30 days or before expiration
.\setup-ssl-renewal.ps1

# Restart HTTPS services if using them
uninstall-https-services.bat
https-service.bat
```

### **Access Control**

```bash
# Update approved users (via admin panel)
# Or modify code:
edit services/db.ts

# Update firewall rules
edit install-service.bat
```

---

## 🚨 **Emergency Procedures**

### **Application Down**

```batch
# Check services
sc query TallmanChatService

# Check logs
nssm view TallmanChatService AppStderr

# Quick restart
net stop TallmanChatService
net start TallmanChatService

# If issues persist, rollback
git reset --hard HEAD~1
npm run build
net start TallmanChatService
```

### **High CPU/Memory Usage**

```batch
# Check processes
tasklist | findstr node

# Kill specific process
taskkill /pid <PID> /f

# Restart service
net start TallmanChatService
```

### **Network Issues**

```bash
# Check ports
netstat -ano | findstr :3005

# Test Ollama connectivity
curl http://10.10.20.24:11434/api/tags

# Test LDAP
node server/ldap-auth.js
```

---

## 📈 **Scaling & Optimization**

### **Performance Tuning**

```javascript
// server/main-server.js
const server = app.listen(PORT, () => {
    // Add performance monitoring
    console.log(`Memory: ${process.memoryUsage().rss / 1024 / 1024}MB`);
});
```

### **Load Balancing (Future)**

```nginx
# nginx.conf for load balancing
upstream tallman_chat {
    server 10.10.20.9:3005;
    server 10.10.20.10:3005;
    server 10.10.20.11:3005;
}
```

### **Database Optimization**

```typescript
// services/db.ts - Add connection pooling
const dbConfig = {
    maxConnections: 20,
    connectionTimeoutMillis: 10000,
};
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

**Container not starting:**
- Check Docker Desktop is running
- Verify Docker socket permissions
- Check `docker-compose logs`

**Gemini API failing:**
- Verify API key is valid in `.env.docker`
- Check internet connectivity
- Test API key manually

**Granite model failing:**
- Check Docker AI models: `docker model ls`
- Verify Granite model is installed
- Check container logs for Docker command errors

**LDAP authentication failing:**
- Test LDAP connectivity
- Verify service account
- Check domain membership

**Chat not working:**
- Test LLM endpoints: `curl -X POST http://localhost:3231/api/llm-test`
- Check API logs for errors
- Verify model fallback is working

**Performance issues:**
- Monitor container resource usage
- Check Docker resource limits
- Review application logs

### **Getting Help**

1. **Check logs first:**
   ```bash
   # Container logs
   docker logs tallmanchat-sales-tallman-chat-1

   # Docker Compose logs
   docker-compose logs
   ```

2. **Test individual components:**
   ```bash
   # Test UI
   curl http://localhost:3230

   # Test API
   curl http://localhost:3231/api/health

   # Test LLM
   curl -X POST http://localhost:3231/api/llm-test

   # Test Granite API
   curl http://localhost:12435/v1/chat/completions -X POST -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"test"}]}'

   # Test LDAP
   curl http://host.docker.internal:3100/health
   ```

3. **Configuration verification:**
   - Check `.env.docker` for correct API keys and settings
   - Verify `docker-compose.yml` port mappings
   - Confirm Docker networks are properly configured

---

## ✅ **Redeployment Checklist**

- [ ] Code changes committed and tested
- [ ] Dependencies updated (`npm install`)
- [ ] Production build successful (`npm run build`)
- [ ] Services stopped gracefully
- [ ] Files deployed to production
- [ ] Services restarted
- [ ] Application health verified
- [ ] User acceptance testing completed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

**Update deployment complete! 🚀**
