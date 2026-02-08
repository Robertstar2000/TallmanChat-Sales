# Tallman Chat - AI Assistant for Tallman Equipment Company

An advanced AI-powered chat application designed specifically for Tallman Equipment Company, utilizing **OpenAI GPT-5.2** as the primary intelligence engine, supported by Google Gemini for robust fallback capabilities. The system features RAG (Retrieval-Augmented Generation) for accurate responses about company products, services, and industry knowledge.

## 📍 **Project Information**

- **URLs**:
  - **Docker Desktop UI**: `http://localhost:3230`
  - **Docker Desktop API**: `http://localhost:3231`
  - **Local Dev UI**: `http://localhost:5173`
  - **Local Dev API**: `http://localhost:3210`
- **Ports**:
  - **UI**: 3230 (Docker) / 5173 (Local)
  - **API**: 3231 (Docker) / 3210 (Local)
- **Source Code**: `c:\Users\rober\TallmanChat\TallmanChat-Sales-1`
- **GitHub**: `https://github.com/Robertstar2000/TallmanChat-Sales`

## 🏗️ **Architecture Overview**

### **Current Production Setup (Docker-based)**
- **Containerization**: Docker Compose with multi-service architecture
- **Frontend**: React SPA served by Node.js/Vite (port 3230)
- **Backend**: Express.js API server (port 3231)
- **AI Models**:
  - **Primary**: **OpenAI GPT-5.2** (via API)
  - **Secondary**: Google Gemini 2.0 Flash (via API)
  - **Fallback**: Intelligent failover system
- **Database**: Native JSON Persistence (NoSQL-like) for portable/local storage
- **Authentication**: LDAP/Active Directory (`host.docker.internal:3100`)
- **Reverse Proxy**: Built-in Express proxy for API routing

### **Docker Services**
- **app**: Main application container (monolithic stack for Desktop)
  - Ports: 3230 (UI), 3231 (API)
  - Volumes: Local code mount for development
  - Environment: Development/Production hybrid for Desktop

### **URLs & Access**
- **UI Access**: `http://localhost:3230`
- **Backend API**: `http://localhost:3231/api`
- **Health Check**: `http://localhost:3231/api/health`

### **Key Features**
- 🔐 Active Directory authentication
- 🧠 **OpenAI GPT-5.2** Integration
- 📚 RAG-powered knowledge base
- 👥 Multi-user chat storage
- 🎯 Industry-specific responses
- 🔍 Intelligent knowledge retrieval (RAG)
- 🌐 Real-time Web Grounding
- 🐳 Docker containerization for easy deployment

---

## � **Verified Deployment Paths**

| Environment | Target | Configuration | Command |
|-------------|--------|---------------|---------|
| **Local Developer** | Docker Desktop | `docker-compose.yml` | `docker-compose up --build` |
| **Industrial Swarm** | Production Cluster | `docker-compose.swarm.yml` | `make deploy STACK=tallmanchat` |

---

## 📦 **Master Registry**

**Repository**: [https://github.com/Robertstar2000/TallmanChat-Sales](https://github.com/Robertstar2000/TallmanChat-Sales)

---

## 🌐 **Network Access Points**

### Docker Desktop (Development)
| Service | URL | Port |
|---------|-----|------|
| UI Server | `http://localhost:3230` | 3230 |
| Backend API | `http://localhost:3231/api` | 3231 |

| Health Check | `http://localhost:3231/api/health` | 3231 |

### Docker Swarm (Production)
| Service | URL |
|---------|-----|
| UI & API | `https://tallmanchat.swarm.tallmanequipment.com` |
| Traefik Dashboard | `https://traefik.swarm.tallmanequipment.com` |
| Portainer | `https://portainer.swarm.tallmanequipment.com` |

### Swarm Infrastructure IPs
| Component | IP |
|-----------|-----|
| Manager Nodes | 10.10.20.36, 10.10.20.61, 10.10.20.63 |
| NFS Storage | 10.10.20.64 |
| Virtual IP (Keepalived) | 10.10.20.65 |

---



## �🚀 **Quick Docker Deployment**

### **Prerequisites**
- Windows 10/11 or Windows Server 2019+
- Docker Desktop installed and running
- Git for version control
- **Google Gemini API key** (for primary AI model)
- **LDAP/Active Directory server** (optional, for authentication)

### **Docker Installation Steps**

1. **Clone Repository**
   ```bash
   git clone https://github.com/Robertstar2000/Chat-Tallman.git
   cd Chat-Tallman
   ```

2. **Configure Environment**
   ```bash
   # Copy and edit environment file
   cp .env.docker .env.docker.local
   # Edit .env.docker.local with your API keys and settings
   ```

3. **Start Docker Services**
   ```bash
   docker-compose up -d
   ```

4. **Verify Installation**
   ```bash
   # Check container status
   docker ps

   # Test UI access (port 3230)
   curl http://localhost:3230

   # Test backend API (port 3231)
   curl http://localhost:3231/api/health

   # Test LLM functionality
   curl -X POST http://localhost:3231/api/llm-test
   ```

---

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js 18.17.0+
- npm
- OpenAI API Key configured

### **Local Development Configuration (.env)**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.2

# LDAP Configuration
LDAP_SERVICE_HOST=127.0.0.1
LDAP_SERVICE_PORT=3100

# Ports
PORT=3210
UI_PORT=5173
```

### **Start Development Server**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at: http://localhost:5173
```

---

## 📋 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User authentication via LDAP/email-password
- `POST /api/auth/signup` - User registration (email-password)

### **Chat & AI**
- `POST /api/chat/send` - Send chat messages with AI responses
- `POST /api/chat/stream` - Streaming chat responses

- `POST /api/llm-test` - Test LLM connectivity and fallback

### **Knowledge Base**
- `GET /api/knowledge` - Retrieve knowledge base items
- `POST /api/knowledge` - Add new knowledge items
- `DELETE /api/knowledge` - Clear all knowledge items

### **User Management**
- `GET /api/users` - Get all approved users
- `POST /api/users` - Add new approved user
- `DELETE /api/users/:username` - Delete user

### **System**
- `GET /api/health` - Application health check
- `GET /api/status` - Detailed system status

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
# Service commands remain similar, check backend output


### **Troubleshooting**
```bash
# Check if ports are listening
netstat -ano | findstr :3215



# Test LDAP connectivity
curl http://127.0.0.1:3100/health
```

---

## 📊 **System Requirements**

### **Docker Production Server**
- **OS**: Windows 10/11 or Windows Server 2019+
- **RAM**: 8GB minimum (16GB recommended for optimal AI performance)
- **Disk**: 50GB SSD (Docker images and models)
- **Network**: Internet connection for Google Gemini API
- **Software**: Docker Desktop with WSL2 integration

### **AI Models Available**
- **Google Gemini 2.0 Flash (experimental)**: Cloud-based, fast responses

- **Automatic Fallback**: Seamless switching between models

---

## 🔄 **Updates & Maintenance**

### **Code Updates**
1. Pull latest changes: `git pull origin main`
2. Build frontend: `npm run build`
3. Restart backend service: `net stop TallmanChatBackend && net start TallmanChatBackend`
4. IIS automatically serves updated frontend files

# Model Updates
Models are managed via OpenAI API. No local update required for GPT-5.2.
Gemini models are also API-based.
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


---

## 📞 **Support & Documentation**

### **Documentation Files**
- `DEPLOYMENT.md` - Detailed deployment and update procedures
- `INSTALLATION.md` - Step-by-step installation guide
- `WindowsServiceREADME.md` - Service management documentation

### **Common Issues**

**"AI not responding"**
- Verify `OPENAI_API_KEY` in `.env` or `.env.docker`
- Check backend logs: `docker-compose logs app`
- Verify internet connectivity

**"Login failing"**
- Test LDAP connectivity
- Check service account credentials

**"UI not loading"**
- Docker: Check `http://localhost:3230`
- Local: Check `http://localhost:5173`

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
