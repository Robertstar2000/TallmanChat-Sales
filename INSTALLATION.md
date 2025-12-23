# Tallman Chat - Complete Installation and Configuration Guide

## 📋 **Overview**

This guide provides complete installation instructions for deploying Tallman Chat in a production IIS environment.

### **🏗️ Architecture Overview**
```
IIS Reverse Proxy (Port 80)
    ↓ (Proxy to localhost:3003)
Node.js Production Server (Port 3003)
    ↙ API Calls → Ollama Service (Port 11434)
    ↘ UI Assets → React Application
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
| IIS | 80 | External | Web access |
| TallmanChatService | 3003 | Internal | Node.js server |
| TallmanBackendService | 3006 | Internal | Database operations |
| TallmanLDAPAuthService | 3890 | External | LDAP authentication |
| Ollama | 11434 | Internal | AI model service |

---

## 🔧 **Required Software Installation**

### **Prerequisites**
- **Windows Server 2019+**
- **IIS 10.0+** with Application Request Routing
- **Node.js 18.0+**
- **NSSM (Non-Sucking Service Manager)**
- **Git**

### **AI Service Setup**
```bash
# Install Ollama on 10.10.20.24
ollama pull llama3.2:latest
ollama serve  # Should start on port 11434
```

---

## 🚀 **Installation Steps**

### **Step 1: Clone Repository**
```bash
cd C:\inetpub
git clone https://github.com/Robertstar2000/Tallman-Chat.git TallmanChat
cd TallmanChat
```

### **Step 2: Install Dependencies**
```bash
npm install
```

### **Step 3: Configure IIS Reverse Proxy**
```powershell
# Run as Administrator
.\setup-iis-reverse-proxy.ps1
```

**IIS Site Configuration:**
- **Site Name**: TallmanChat
- **Physical Path**: `C:\inetpub\TallmanChat`
- **Binding**: Port 80, Host Header: chat.tallman.com
- **Application Pool**: TallmanChatPool

### **Step 4: Configure web.config**
The `web.config` in `C:\inetpub\TallmanChat` should contain:
```xml
<configuration>
  <system.webServer>
    <proxy enabled="true" />
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll" trackAllCaptures="false">
            <add input="{HTTPS}" pattern="off" />
          </conditions>
          <action type="Rewrite" url="http://localhost:3003/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### **Step 5: Build Production Application**
```bash
npm run build
```

### **Step 6: Install Windows Services**
```cmd
REM Run as Administrator
install-service.bat
```

**Installed Services:**
- **TallmanChatService** - Main Node.js application server
- **TallmanBackendService** - Database and backend operations
- **TallmanLDAPAuthService** - LDAP authentication service

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

### **Ollama Host** (`hooks/useChat.ts`)
```typescript
const ollamaHost = 'http://10.10.20.24:11434';  // Ollama server IP
const ollamaModel = 'llama3.2:latest';          // Available model
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
- **IIS Access**: `http://chat.tallman.com` (after DNS)
- **Direct Access**: `http://10.10.20.9:3003`
- **Local Test**: `http://localhost:3003`

### **API Endpoints**
- `GET /api/health` - Service health check
- `POST /api/ollama/chat` - AI chat with streaming
- `GET /*` - React SPA routing

---

## 🔒 **Security Configuration**

### **SSL Configuration** (Optional)
```powershell
.\setup-ssl.ps1
https-service.bat
```

### **Access Control**
- User authentication via LDAP
- Role-based permissions (user/admin)
- Session management
- CORS enabled for internal services

---

## 📈 **Monitoring & Logs**

### **Service Logs**
```cmd
nssm view TallmanChatService AppStdout
nssm view TallmanChatService AppStderr
nssm view TallmanBackendService AppStdout
nssm view TallmanLDAPAuthService AppStdout
```

### **Health Checks**
```bash
curl http://localhost:3003/api/health
curl http://localhost:3006/api/health
curl http://10.10.20.24:11434/api/tags
```

---

## 🛑 **Troubleshooting**

### **Common Issues**
1. **Port conflicts**: Check with `netstat -ano | findstr ":3003"`
2. **IIS not serving**: Ensure web.config in `C:\inetpub\TallmanChat`
3. **Model not found**: Verify Ollama has `llama3.2:latest`
4. **Authentication fails**: Check LDAP server connectivity

### **Reset Procedures**
```cmd
REM Stop all services
uninstall-services.bat

REM Clear cache and rebuild
npm run build
install-service.bat
```

---

## ✅ **Installation Checklist**

- [ ] Node.js 18+ installed
- [ ] IIS with ARR enabled
- [ ] Repository cloned to `C:\inetpub\TallmanChat`
- [ ] Dependencies installed (`npm install`)
- [ ] Ollama running on 10.10.20.24 with llama3.2:latest
- [ ] IIS reverse proxy configured
- [ ] Production build completed (`npm run build`)
- [ ] Windows services installed and running
- [ ] DNS record `chat.tallman.com` → `10.10.20.9` added
- [ ] Application accessible at `http://chat.tallman.com`

**🎉 Installation Complete!**
