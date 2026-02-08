# Port Configuration

## Service Layout

### Local Development
- **Frontend**: Port 5173 (Vite dev server)
- **Backend Service**: Port 3210 (Main application backend)
- **LDAP Service**: Port 3100 (Authentication service)

### Docker Desktop
- **Frontend**: Port 3230 (Mapped to internal)
- **Backend Service**: Port 3231 (Mapped to internal)

## Service Dependencies
```
Frontend
├── Calls Backend API (Proxy /api)
└── Calls LDAP Service (via Backend)
```
Backend
├── Calls OpenAI API (Cloud)
└── Calls LDAP Service (Internal Network/Host)
```

## Access URLs
- **Local Application**: http://localhost:5173
- **Local Backend**: http://localhost:3210
- **Docker Application**: http://localhost:3230
- **Docker Backend**: http://localhost:3231

## Firewall Rules
- Outbound: HTTPS (443) for OpenAI API.
- Inbound: 3230, 3231, 5173, 3210 (Local access).