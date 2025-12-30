# Tallman Chat - Complete Installation and Configuration Guide

## 📋 **Overview**

This guide provides complete installation instructions for deploying Tallman Chat using Docker containers.

### **🏗️ Architecture Overview**
```
Docker Compose Multi-Service Setup
├── tallman-chat (Main Container)
│   ├── Frontend: React SPA (Port 3230)
│   ├── Backend: Express.js API (Port 3231)
│   └── Granite API Bridge (Port 12435)
├── AI Models:
│   ├── Primary: Google Gemini 2.0 Flash (Cloud API)
│   └── Secondary: Docker Granite 4.0 Nano (Local)
└── Authentication: LDAP/Active Directory
```

---

## 🌐 **Network Configuration**

### **Server IPs & Ports**
- **Application Server**: `10.10.20.9`
- **Ollama AI Server**: `10.10.20.24`
- **Domain Controller**: `10.10.20.253` (DC02.tallman.com)

### **Port Mapping**
| Service | Port | Internal/External | Purpose |
|---------|------|------------------|---------|
| UI (React) | 3230 | External | Web interface |
| API (Express) | 3231 | Internal | Backend API |
| Granite Bridge | 12435 | Internal | AI model bridge |
| LDAP | 3100 | Internal | Authentication |

---

## 🔧 **Required Software Installation**

### **Prerequisites**
- **Windows 10/11 or Windows Server 2019+**
- **Docker Desktop** with WSL2 integration
- **Git** for version control
- **Google Gemini API key** (for primary AI model)

### **AI Service Setup**
```bash
# Install Docker AI models (if not already available)
docker model pull ai/granite-4.0-nano:latest

# Verify models
docker model ls
```

---

## 🚀 **Installation Steps**

### **Step 1: Clone Repository**
```bash
cd c:\Users\rober\TallmanChat
git clone https://github.com/Robertstar2000/Chat-Tallman.git TallmanChat-Sales
cd TallmanChat-Sales
```

### **Step 2: Configure Environment**
```bash
# Copy and edit environment configuration
cp .env.docker .env.docker.local

# Edit .env.docker.local with your settings:
# - Google Gemini API key
# - LDAP server details (if using authentication)
```

### **Step 3: Install AI Models**
```bash
# Ensure Docker AI models are available
docker model ls

# If Granite model not available:
docker model pull ai/granite-4.0-nano:latest
```

### **Step 4: Start Docker Services**
```bash
# Start all services
docker-compose up -d

# Verify containers are running
docker ps
```

### **Step 5: Verify Installation**
```bash
# Test UI access
curl http://localhost:3230

# Test API
curl http://localhost:3231/api/health

# Test LLM functionality
curl -X POST http://localhost:3231/api/llm-test
```

---

## 🔐 **Authentication Configuration**

### **LDAP Settings** (`server/ldap-auth.js`)
```javascript
const LDAP_CONFIG = {
    server: 'dc02.tallman.com',
    fallbackServers: ['10.10.20.253', 'DC02'],
    baseDN: 'DC=tallman,DC=com',
    bindDN: 'CN=LDAP,DC=tallman,DC=com',
    bindPassword: 'ebGGAm77kk'
};
```

### **Application Authentication**
- **Type**: Active Directory LDAP
- **Domain**: tallman.com
- **User Validation**: Automatic via LDAP bind
- **Session Management**: LocalStorage (client-side)

---

## 🤖 **AI Model Configuration**

### **Primary AI Model** (Google Gemini)
```bash
# Configure in .env.docker
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

### **Secondary AI Model** (Docker Granite)
```bash
# Configure in .env.docker
SECONDARY_LLM_BASE_URL=http://host.docker.internal:12435/v1
SECONDARY_LLM_MODEL=granite-4.0-nano
```

### **System Instructions**
The application includes Tallman Equipment specific knowledge base:
- Product catalog and pricing
- Service information (rentals, repairs, testing)
- Contact information and locations
- Company history and expertise

---

## 🗄️ **Database Configuration**

### **Storage Type**
- **Primary**: IndexedDB (Browser-based)
- **Backup**: Weekly auto-export to user Downloads folder

### **Knowledge Base**
- **Location**: `services/knowledgeBase.ts`
- **Content**: Tallman Equipment domain knowledge
- **Updates**: Admin panel + real-time additions

---

## 🌐 **DNS Configuration**

### **Required DNS Records**
Run this script on the Domain Controller (DC02.tallman.com) as Administrator:

```powershell
# On DC02.tallman.com
Import-Module DNSServer

# Create A record
Add-DnsServerResourceRecordA -Name "chat" -ZoneName "tallman.com" -IPv4Address "10.10.20.9"
```

**Resulting DNS Record:**
```
chat.tallman.com -> 10.10.20.9
```

---

## 🔥 **Windows Services Management**

### **Service Commands**
```cmd
REM Start all services
net start TallmanLDAPAuthService
net start TallmanBackendService
net start TallmanChatService

REM Stop all services
net stop TallmanChatService
net stop TallmanBackendService
net stop TallmanLDAPAuthService

REM Check status
sc query TallmanChatService
```

### **NSSM Configuration**
```cmd
REM View service logs
nssm view TallmanChatService AppStdout
nssm view TallmanChatService AppStderr
```

### **Firewall Rules**
Installed automatically during service setup:
- Port 3000-3006 (Internal)
- Port 3890 (LDAP - External)
- Port 80 (IIS - External)

---

## 📊 **Application URLs**

### **Production URLs**
- **Direct Access**: `http://localhost:3230`
- **API Access**: `http://localhost:3231/api`
- **Granite API**: `http://localhost:12435/v1/chat/completions`

### **API Endpoints**
- `GET /api/health` - Service health check
- `POST /api/chat/send` - Send chat messages
- `POST /api/chat/stream` - Streaming chat responses
- `POST /api/llm-test` - Test LLM functionality
- `GET /api/knowledge` - Get knowledge base
- `POST /api/knowledge` - Add knowledge items
- `GET /api/users` - Get approved users
- `POST /api/users` - Add approved users

---

## 🔒 **Security Configuration**

### **Environment Variables**
```bash
# Secure API keys in .env.docker (not committed to git)
GEMINI_API_KEY=your_secure_api_key_here

# LDAP credentials (if used)
LDAP_BIND_PASSWORD=your_secure_password
```

### **Access Control**
- User authentication via LDAP/Active Directory
- Role-based permissions (user/admin)
- Session management
- CORS enabled for internal services

---

## 📈 **Monitoring & Logs**

### **Container Logs**
```bash
# View container logs
docker logs tallmanchat-sales-tallman-chat-1

# View Docker Compose logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

### **Health Checks**
```bash
# Test UI
curl http://localhost:3230

# Test API health
curl http://localhost:3231/api/health

# Test LLM functionality
curl -X POST http://localhost:3231/api/llm-test
```

---

## 🛑 **Troubleshooting**

### **Common Issues**
1. **Container not starting**: Check Docker Desktop is running
2. **Port conflicts**: Check with `netstat -ano | findstr ":3230"`
3. **Gemini API key invalid**: Verify key in `.env.docker`
4. **Granite model not found**: Run `docker model pull ai/granite-4.0-nano:latest`
5. **Authentication fails**: Check LDAP server connectivity

### **Reset Procedures**
```bash
# Stop and remove containers
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Check logs
docker-compose logs
```

---

## ✅ **Installation Checklist**

- [ ] Docker Desktop installed and running
- [ ] Repository cloned to `c:\Users\rober\TallmanChat\TallmanChat-Sales`
- [ ] Environment configured in `.env.docker`
- [ ] Docker AI models available (`docker model ls`)
- [ ] Containers built and running (`docker-compose up -d`)
- [ ] UI accessible at `http://localhost:3230`
- [ ] API responding at `http://localhost:3231/api/health`
- [ ] LLM test working (`curl -X POST http://localhost:3231/api/llm-test`)

**🎉 Installation Complete!**
