# Tallman Chat - Deployment Guide

## 📋 Overview

This document provides comprehensive deployment instructions for the Tallman Chat application, supporting both **Docker Desktop** (local development) and **Docker Swarm** (production cluster) environments.

---

## 🏛️ Verified Deployment Paths

| Environment | Target | Configuration File | Command |
|-------------|--------|-------------------|---------|
| **Local Developer** | Docker Desktop | `docker-compose.yml` | `docker-compose up --build` |
| **Industrial Swarm** | Production Cluster | `docker-compose.swarm.yml` | `make deploy STACK=tallmanchat` |

---

## 📦 Master Registry

**Repository URL**: `https://github.com/Robertstar2000/TallmanChat-Sales.git`

---

## 🌐 Network Access Points

### Docker Desktop (Development)
| Service | URL | Port |
|---------|-----|------|
| **UI Server** | `http://localhost:3230` | 3230 |
| **Backend API** | `http://localhost:3231/api` | 3231 |
| **Granite API Bridge** | `http://localhost:12435` | 12435 |
| **Health Check** | `http://localhost:3231/api/health` | 3231 |

### Docker Swarm (Production)
| Service | URL | Port |
|---------|-----|------|
| **UI Server** | `https://tallmanchat.swarm.tallmanequipment.com` | 443 (Traefik) |
| **Backend API** | `https://tallmanchat.swarm.tallmanequipment.com/api` | 443 (Traefik) |
| **Health Check** | Internal via Swarm health checks | - |

### Swarm Infrastructure
| Component | IP Address | Role |
|-----------|------------|------|
| **Manager Node 1** | 10.10.20.36 | Primary Manager |
| **Manager Node 2** | 10.10.20.61 | Manager |
| **Manager Node 3** | 10.10.20.63 | Manager |
| **NFS Storage** | 10.10.20.64 | Shared Persistence |
| **Virtual IP** | 10.10.20.65 | Keepalived Failover |

---

## 🗄️ Persistence Compliance

### Data Storage Standards

| Data Type | Container Path | Docker Desktop Mount | Docker Swarm Mount |
|-----------|----------------|---------------------|-------------------|
| **Logs** | `/app/logs` | `./logs` | `/var/data/tallmanchat/logs` |
| **Database** | `/app/data` | `./data` | `/var/data/tallmanchat/data` |

### Database Files (Persisted in `/app/data`)
- `users.json` - Email/password user accounts
- `admins.json` - Admin user list and roles
- `knowledge.json` - Knowledge base entries

### Docker Desktop Local Storage
```
project-root/
├── logs/           # Application logs (persistent)
└── data/           # Database files (persistent)
    ├── users.json
    ├── admins.json
    └── knowledge.json
```

### Swarm NFS Requirements
All persistent data must reside on the NFS share (`/var/data`) for cross-node portability:
```
/var/data/tallmanchat/
├── logs/           # Application logs
└── data/           # Database files
    ├── users.json
    ├── admins.json
    └── knowledge.json
```

---

## 🔧 Prerequisites

### Docker Desktop (Development)
- **OS**: Windows 10/11 or Windows Server 2019+
- **Software**: Docker Desktop with WSL2 integration
- **Resources**: 8GB RAM minimum (16GB recommended)
- **Network**: Internet access for Gemini API

### Docker Swarm (Production)
- **Access**: SSH access to Swarm manager nodes
- **Permissions**: Deployment rights via Makefile
- **Storage**: NFS mount configured at `/var/data`

---

## 🚀 Docker Desktop Deployment

### Step 1: Configure Environment

```bash
# Copy environment template
cp .env.example .env.docker

# Edit with your configuration
# Required: GEMINI_API_KEY
# Optional: LDAP settings, Ollama configuration
```

### Step 2: Build and Start

```bash
# Using docker-compose directly
docker-compose up --build -d

# Or using Make
make build
make up
```

### Step 3: Verify Deployment

```bash
# Check container status
docker ps

# Test endpoints
make test

# View logs
make logs
```

### Quick Commands Reference

| Command | Description |
|---------|-------------|
| `make up` | Start containers |
| `make down` | Stop containers |
| `make restart` | Restart containers |
| `make logs` | View container logs |
| `make shell` | Open shell in container |
| `make test` | Run health checks |
| `make clean` | Remove containers and images |

---

## 🌐 Docker Swarm Deployment

### Step 1: Prepare Image

```bash
# Build and tag for registry
docker build -t tallman-chat:latest .

# If using private registry
docker tag tallman-chat:latest registry.example.com/tallman-chat:latest
docker push registry.example.com/tallman-chat:latest
```

### Step 2: Configure Swarm Stack

```bash
# SSH to Swarm manager
ssh 10.10.20.36

# Navigate to config directory
cd /var/data/config

# Copy compose file
# (Use scp or paste docker-compose.swarm.yml content)
cp /path/to/docker-compose.swarm.yml docker-compose-tallmanchat.yaml
```

### Step 3: Create Required Directories

```bash
# On NFS server or any Swarm node
mkdir -p /var/data/tallmanchat/logs
mkdir -p /var/data/tallmanchat/data
chmod 755 /var/data/tallmanchat
```

### Step 4: Configure Environment Variables

Create `/var/data/config/.env.tallmanchat`:
```bash
GEMINI_API_KEY=your_production_api_key
LDAP_SERVICE_HOST=10.10.20.X
LDAP_SERVICE_PORT=3100
REGISTRY=
TAG=latest
```

### Step 5: Deploy Stack

```bash
# Using Makefile
make deploy STACK=tallmanchat

# Or directly with Docker
docker stack deploy -c docker-compose-tallmanchat.yaml tallmanchat
```

### Step 6: Verify Deployment

```bash
# Check stack status
docker stack ls

# View services
docker stack services tallmanchat

# Check service health
docker service ps tallmanchat_tallman-chat

# View logs
docker service logs tallmanchat_tallman-chat
```

### Step 7: Configure DNS

Add DNS record pointing to Virtual IP:
```
tallmanchat.swarm.tallmanequipment.com → 10.10.20.65
```

---

## 🔗 Network Architecture

### Docker Desktop

```
┌─────────────────────────────────────────┐
│           Host Machine                  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │     tallman-internal (bridge)    │   │
│  │                                  │   │
│  │  ┌────────────────────────────┐  │   │
│  │  │   tallman-chat container   │  │   │
│  │  │   - UI: 3230               │  │   │
│  │  │   - API: 3231              │  │   │
│  │  │   - Granite: 12435         │  │   │
│  │  └────────────────────────────┘  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Ports exposed to localhost             │
└─────────────────────────────────────────┘
```

### Docker Swarm (Network Isolation Protocol)

```
┌───────────────────────────────────────────────────────────────┐
│                    Docker Swarm Cluster                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 infra_traefik (overlay)                 │  │
│  │      [External Traefik Ingress - Shared Network]        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           tallmanchat_traefik (overlay)                 │  │
│  │    [Dedicated Traefik network for this stack]           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               tallman-chat service                      │  │
│  │           (replicas distributed across nodes)           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │          tallmanchat_internal (overlay)                 │  │
│  │   [Isolated network for inter-container communication]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 Update Procedures

### Docker Desktop Update

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
make down
make build
make up

# Verify
make test
```

### Docker Swarm Update

```bash
# SSH to manager
ssh 10.10.20.36
cd /var/data/config

# Update image (if using registry)
docker pull registry.example.com/tallman-chat:latest

# Force service update with rolling restart
make update STACK=tallmanchat

# Or manually
docker service update --force tallmanchat_tallman-chat
```

---

## 🛠️ Troubleshooting

### Common Issues

| Issue | Docker Desktop Solution | Docker Swarm Solution |
|-------|------------------------|----------------------|
| Container won't start | `docker-compose logs` | `docker service logs tallmanchat_tallman-chat` |
| Port already in use | Check `netstat -ano | findstr :3230` | Check service placement |
| Health check failing | Verify API is responding | Check `docker service ps --no-trunc` |
| Can't connect to LDAP | Verify `host.docker.internal` works | Check LDAP_SERVICE_HOST IP |
| Gemini API errors | Verify API key in `.env.docker` | Check environment in stack |

### Debug Commands

```bash
# Docker Desktop
docker-compose exec tallman-chat /bin/sh
docker-compose logs -f --tail=100

# Docker Swarm
docker service ps tallmanchat_tallman-chat --no-trunc
docker service logs -f tallmanchat_tallman-chat
docker node ls
```

### Rollback Procedure

```bash
# Docker Desktop
git checkout HEAD~1
make down
make build
make up

# Docker Swarm
docker service rollback tallmanchat_tallman-chat
```

---

## 📊 Health Monitoring

### Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/health` | Basic health | `{"status":"ok"}` |
| `/api/status` | Detailed status | Full system info |
| `/api/llm-test` | LLM connectivity | Model response |

### Swarm Health Commands

```bash
# Check all nodes
docker node ls

# Check service health
docker service inspect tallmanchat_tallman-chat --format='{{.Spec.TaskTemplate.ContainerSpec.Healthcheck}}'

# View unhealthy tasks
docker service ps tallmanchat_tallman-chat --filter="desired-state=running"
```

---

## 📁 File Structure

```
TallmanChat-Sales/
├── docker-compose.yml          # Docker Desktop configuration
├── docker-compose.swarm.yml    # Docker Swarm configuration
├── Dockerfile                  # Multi-stage build definition
├── docker-entrypoint.sh        # Container bootstrap script
├── .env.example                # Environment template
├── .env.docker                 # Local environment (git-ignored)
├── Makefile                    # Development commands
├── server/                     # Backend application
├── dist/                       # Built frontend (generated)
├── logs/                       # Application logs
└── skills/
    ├── SKILL.md               # Enterprise App Foundation
    └── swarm.md               # Swarm Platform Documentation
```

---

## ✅ Deployment Checklist

### Docker Desktop
- [ ] `.env.docker` configured from `.env.example`
- [ ] `GEMINI_API_KEY` set
- [ ] Docker Desktop running
- [ ] `make build` successful
- [ ] `make up` successful
- [ ] `make test` passing
- [ ] UI accessible at http://localhost:3230

### Docker Swarm
- [ ] Image built and pushed to registry (if applicable)
- [ ] NFS directories created on `/var/data/tallmanchat/`
- [ ] Stack compose file copied to `/var/data/config/`
- [ ] Environment variables configured
- [ ] DNS record created for domain
- [ ] `make deploy STACK=tallmanchat` successful
- [ ] Service replicas healthy
- [ ] HTTPS accessible via Traefik

---

**Deployment Complete! 🚀**
