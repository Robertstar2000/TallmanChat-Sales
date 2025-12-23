# Tallman Chat Production Deployment & Updates Guide

## 📋 **Overview**

This guide covers the production deployment architecture, code update procedures, and system management for the Tallman Chat application running on Windows Server 2022 with IIS frontend and Windows service backend.

## 🏗️ **Current Production Architecture**

### **System Components**
- **Frontend**: IIS 10.0 serving React SPA from `C:\inetpub\TallmanChatProd\`
- **Backend**: Windows service `TallmanChatBackend` (Node.js) on port 3215
- **Database**: SQLite embedded database
- **AI Model**: Ollama llama3.3:latest (39.6GB) on **external server at `http://10.10.20.24:11434`**
- **Authentication**: LDAP/Active Directory on `127.0.0.1:3100`
- **Reverse Proxy**: IIS ARR routes `/api/*` to backend service

### **URLs & Access**
- **Production UI**: `http://localhost` (port 80) or `http://chat.tallman.com`
- **Backend API**: `http://localhost:3215` (internal only)
- **Admin Panel**: Via UI login → "Admin" role access
- **Health Check**: Both IIS and backend have `/api/health` endpoints

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
cd C:\Path\To\Tallman-Chat

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

#### **Option A: Service Restart (Minimal Downtime)**

```batch
REM Stop services briefly
net stop TallmanChatService
timeout /t 5 /nobreak

REM Restart services
net start TallmanChatService
net start TallmanLDAPAuth
```

#### **Option B: Rolling Update (No Downtime)**

If you have multiple server availability:

```batch
REM 1. Stop service on Server A
net stop TallmanChatService

REM 2. Deploy code to Server A
REM Copy dist/, services/, server/ directories

REM 3. Start service on Server A
net start TallmanChatService

REM 4. Test Server A functionality
curl http://serverA:3005/api/health

REM 5. Repeat for Server B, then C, etc.
```

### **Step 5: Verify Deployment**

```bash
# Test application health
curl http://10.10.20.9:3005/api/health

# Test LDAP authentication
curl http://10.10.20.9:3890/health

# Check services are running
sc query TallmanChatService
sc query TallmanLDAPAuth

# Monitor logs
nssm view TallmanChatService AppStdout
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

**Services not starting:**
- Check NSSM installation
- Verify file paths
- Check Windows Event Viewer

**LDAP authentication failing:**
- Test LDAP connectivity
- Verify service account
- Check domain membership

**Chat not working:**
- Verify Ollama is running
- Check model is downloaded
- Test API endpoints

**Performance issues:**
- Monitor resource usage
- Check database connections
- Review application logs

### **Getting Help**

1. **Check logs first:**
   ```bash
   nssm view TallmanChatService AppStdout
   nssm view TallmanChatService AppStderr
   ```

2. **Test individual components:**
   ```bash
   # Test Ollama
   curl http://10.10.20.24:11434/api/tags

   # Test LDAP
   node server/ldap-auth.js

   # Test API
   curl http://10.10.20.9:3005/api/health
   ```

3. **Configuration verification:**
   - Check `server/ldap-auth.js` LDAP settings
   - Verify `services/ollamaService.ts` Ollama config
   - Confirm firewall rules are active

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
