# Port Configuration

## Service Layout
- **Frontend**: Port 3200 (Vite dev server with proxy)
- **LDAP Service**: Port 3100 (Authentication service)
- **Backend Service**: Port 3210 (Main application backend)
- **Ollama**: Port 11434 (AI model service)

## Service Dependencies
```
Frontend (3200) 
├── Proxies to LDAP (3100) for /api/ldap-auth
├── Proxies to Backend (3210) for /api/backend
└── Proxies to Ollama (11434) for /api/ollama
```

## Start Services
1. `start-ldap.bat` - LDAP authentication (port 3100)
2. `start-backend.bat` - Main backend (port 3210) 
3. `start-frontend.bat` - Frontend with proxy (port 3200)

## Access URLs
- **Application**: http://localhost:3200
- **LDAP Health**: http://localhost:3100/api/health
- **Backend Health**: http://localhost:3210/api/health
- **Ollama API**: http://localhost:11434/api/tags

## Production (IIS)
- **Public URL**: https://chat.tallman.com
- **IIS Reverse Proxy**: chat.tallman.com → localhost:3200
- **Internal Services**: 3100, 3210, 11434 (not exposed)

## Firewall Rules
```
Inbound Rules:
- Port 80 (HTTP) - IIS
- Port 443 (HTTPS) - IIS
- Ports 3100, 3200, 3210 - Internal only
```