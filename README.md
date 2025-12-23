# Tallman Chat - AI Assistant for Tallman Equipment Company

An advanced AI-powered chat application designed specifically for Tallman Equipment Company, utilizing Ollama local AI models with RAG (Retrieval-Augmented Generation) for accurate responses about company products, services, and industry knowledge.

## 🏗️ **Architecture Overview**

### **Current Production Setup (Recommended)**
- **Frontend**: IIS 10.0 serving React SPA (`C:\inetpub\TallmanChatProd\`)
- **Backend**: Windows service `TallmanChatBackend` (Node.js on port 3215)
- **AI Model**: Ollama llama3.3:latest (39.6GB) on remote server `10.10.20.24:11434`
- **Database**: SQLite embedded
- **Authentication**: LDAP/Active Directory (`127.0.0.1:3100`)
- **Reverse Proxy**: IIS ARR routes `/api/*` requests to backend

### **URLs & Access**
- **Production UI**: `http://localhost` or `http://chat.tallman.com` (requires DNS)
- **Backend API**: `http://localhost:3215` (internal only)
- **Health Check**: `/api/health` endpoint

### **Key Features**
- 🔐 Active Directory authentication
- 🧠 Local AI model (llama3.3:latest)
- 📚 RAG-powered knowledge base
- 👥 Multi-user chat storage
- 🎯 Industry-specific responses
- 🔍 Intelligent knowledge retrieval

---

## 🚀 **Quick Production Deployment**

### **Prerequisites**
- Windows Server 2022
- IIS 10.0 with Application Request Routing (ARR)
- Node.js 18.17.0+
- NSSM (Non-Sucking Service Manager)
- **Ollama server running on `http://10.10.20.24:11434`** (external server)
- **LDAP/Active Directory server on `127.0.0.1:3100`** (local)

### **Production Installation Steps**

1. **Clone Repository**
   ```bash
   git clone https://github.com/Robertstar2000/Chat-Tallman.git
   cd Chat-Tallman
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npm run build
   ```

3. **Install Backend Service** (Run as Administrator)
   ```batch
   .\install-production-backend.bat
   ```

4. **Setup IIS Frontend** (Run as Administrator)
   ```powershell
   .\setup-production-iis.ps1
   ```

5. **Start Services**
   ```batch
   net start TallmanChatBackend
   ```

### **Verify Installation**
```bash
# Test UI access
# Open browser to: http://localhost

# Test backend health
curl http://localhost:3215/api/health

# Check service status
sc query TallmanChatBackend
```

---

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js 18.17.0+
- npm
- Ollama server running

### **Local Development Configuration (.env.local)**
```bash
# Ollama Configuration
OLLAMA_HOST=10.10.20.24:11434
OLLAMA_MODEL=llama3.3:latest

# LDAP Configuration
LDAP_SERVICE_HOST=127.0.0.1
LDAP_SERVICE_PORT=3100

# Ports
PORT=3200
```

### **Start Development Server**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at: http://localhost:3200
```

---

## 📋 **API Endpoints**

### **Authentication**
- `POST /api/ldap-auth` - User authentication via LDAP

### **Chat & AI**
- `POST /api/ollama/chat` - Send chat messages to AI

### **Knowledge Base**
- `GET /api/knowledge` - Retrieve knowledge base items
- `POST /api/knowledge` - Add new knowledge items

### **System**
- `GET /api/health` - Application health check

---

## 🛠️ **Service Management**

### **Windows Services**
```batch
# Check backend service status
sc query TallmanChatBackend

# Start/Stop service
net start TallmanChatBackend
net stop TallmanChatBackend

# View service logs
nssm view TallmanChatBackend AppStdout
nssm view TallmanChatBackend AppStderr
```

### **Troubleshooting**
```bash
# Check if ports are listening
netstat -ano | findstr :3215

# Test Ollama connectivity
curl http://10.10.20.24:11434/api/tags

# Test LDAP connectivity
curl http://127.0.0.1:3100/health
```

---

## 📊 **System Requirements**

### **Production Server**
- **OS**: Windows Server 2022
- **RAM**: 16GB minimum (32GB recommended for optimal AI performance)
- **Disk**: 100GB SSD (model storage requires ~40GB)
- **Network**: 1Gbps connection to Ollama server

### **AI Models Available**
- **llama3.3:latest**: 39.6GB (Current production model - most capable)
- **llama3.1:8b**: 4.6GB (Legacy model - smaller but faster)

---

## 🔄 **Updates & Maintenance**

### **Code Updates**
1. Pull latest changes: `git pull origin main`
2. Build frontend: `npm run build`
3. Restart backend service: `net stop TallmanChatBackend && net start TallmanChatBackend`
4. IIS automatically serves updated frontend files

### **Model Updates**
```bash
# On Ollama server (10.10.20.24)
ollama pull llama3.3:latest  # Update to latest model
```

### **Knowledge Base Updates**
- **Dynamic**: Use admin panel in UI (no restart required)
- **Static**: Update code and redeploy

---

## 🛡️ **Security & Access**

### **Authentication**
- LDAP/Active Directory integration
- Role-based access (Admin/User)
- Session management with SQLite storage

### **Network Security**
- IIS reverse proxy for frontend security
- Backend service runs on internal port only
- Firewall rules configured automatically

### **Data Protection**
- Local database storage (SQLite)
- No external API calls except to internal services
- LDAP integration for user management

---

## 📈 **Performance & Scaling**

### **Current Performance**
- **Response Time**: ~2-5 seconds for typical queries
- **Memory Usage**: ~2-4GB per service instance
- **Concurrent Users**: Supports multiple simultaneous users

### **Scaling Options**
- Load balancing multiple backend services
- Redis for session management (future)
- Additional Ollama servers for redundancy

---

## 📞 **Support & Documentation**

### **Documentation Files**
- `DEPLOYMENT.md` - Detailed deployment and update procedures
- `INSTALLATION.md` - Step-by-step installation guide
- `WindowsServiceREADME.md` - Service management documentation

### **Common Issues**

**"AI not responding"**
- Check Ollama server: `curl http://10.10.20.24:11434/api/tags`
- Verify backend service is running

**"Login failing"**
- Test LDAP connectivity
- Check service account credentials

**"UI not loading"**
- Test IIS: `http://localhost`
- Check reverse proxy configuration

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create Pull Request

---

## 📄 **License**

Proprietary - Tallman Equipment Company Internal Use Only

---

## 🎯 **Tallman Chat is Ready! 🚀**

Your AI-powered assistant for Tallman Equipment Company is now deployed and ready to help with:
- **Product Information**: Detailed equipment specifications and availability
- **Service Support**: Repair, rental, and testing services
- **Industry Knowledge**: Utility line work expertise and best practices
- **Customer Support**: Fast, accurate responses to customer inquiries

**Access your production system at: `http://localhost`**
