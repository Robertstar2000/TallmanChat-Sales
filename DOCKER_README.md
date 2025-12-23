# Tallman Chat - Docker Deployment

This guide explains how to run the Tallman Chat application using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 4GB of available RAM
- Access to LDAP service (if using authentication)
- Ollama will be automatically included in the Docker setup

## Quick Start

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone <repository-url>
   cd tallman-chat
   ```

2. **Build and run the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - UI: http://localhost:3220
   - Backend API: http://localhost:3210

## Configuration

### Environment Variables

The Docker setup uses `.env.docker` for container-specific configuration. Key variables:

- `OLLAMA_HOST=ollama` - Points to the Ollama container within Docker network
- `LDAP_SERVICE_HOST=host.docker.internal` - Points to LDAP on host machine
- `BACKEND_SERVICE_HOST=localhost` - Internal container communication

### LDAP Configuration

If you're using LDAP authentication:
- Ensure your LDAP service is accessible from the Docker network
- Update `LDAP_SERVICE_HOST` in `.env.docker` if needed
- Default configuration assumes LDAP runs on host machine at `10.10.20.253:3100`

### Ollama Configuration

Ollama is included as a service in docker-compose.yml:
- Runs on port 11434 (exposed to host)
- Models are persisted in a Docker volume
- Default model: `llama3.1:8b`

To pull a specific model on startup, uncomment and modify the command in docker-compose.yml:
```yaml
command: ["sh", "-c", "ollama serve & sleep 5 && ollama pull llama3.1:8b && wait"]
```

## Services Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   tallman-chat  │    │     ollama      │
│                 │    │                 │
│  ┌────────────┐ │    │  ┌────────────┐ │
│  │   UI       │ │    │  │   Models   │ │
│  │  (port     │◄┼────┼─►│  (port     │ │
│  │  3220)     │ │    │  │  11434)    │ │
│  └────────────┘ │    │  └────────────┘ │
│                 │    │                 │
│  ┌────────────┐ │    │                 │
│  │   Backend  │ │    │                 │
│  │   API      │ │    │                 │
│  │  (port     │ │    │                 │
│  │  3210)     │ │    │                 │
│  └────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘
         │
         │ API calls
         ▼
┌─────────────────┐
│   LDAP Service  │
│  (host machine) │
│                 │
│  ┌────────────┐ │
│  │   Auth     │ │
│  │  (port     │ │
│  │  3100)     │ │
│  └────────────┘ │
└─────────────────┘
```

## Troubleshooting

### Admin Functions Not Working

The admin panel operations (user management, knowledge base) use browser-based IndexedDB and should work independently of the backend. However, the LLM testing feature requires the backend API to be running.

**Symptoms:**
- Cannot save user changes
- Cannot add knowledge items
- LLM test button fails

**Solutions:**
1. Ensure both backend (3210) and UI (3220) containers are running
2. Check container logs: `docker-compose logs tallman-chat`
3. Verify Ollama is accessible: `docker-compose logs ollama`

### Backend Connection Issues

If the backend isn't connecting to external services:

1. **LDAP Connection:**
   - Ensure LDAP service is running on host
   - Check firewall settings allow Docker to access host ports
   - On Windows/Mac, `host.docker.internal` resolves to host IP

2. **Ollama Connection:**
   - Ollama runs in its own container
   - Check if model is loaded: `docker exec -it <ollama-container> ollama list`
   - Pull model if needed: `docker exec -it <ollama-container> ollama pull llama3.1:8b`

### Port Conflicts

If ports 3210 or 3220 are already in use:
- Stop conflicting services, or
- Modify port mappings in docker-compose.yml

### Memory Issues

If containers crash due to memory:
- Ensure at least 4GB RAM available
- Consider reducing Ollama model size or using CPU-only mode

## Development vs Production

- **Development:** Use `npm run dev` and run services separately
- **Production:** Use Docker Compose for containerized deployment

## Logs and Monitoring

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs tallman-chat
docker-compose logs ollama

# Follow logs in real-time
docker-compose logs -f tallman-chat
```

## Data Persistence

- Ollama models: Stored in `ollama-data` Docker volume
- Application logs: Mounted to `./logs` directory
- User data: Stored in browser IndexedDB (client-side)

## Security Notes

- LDAP credentials are transmitted (consider HTTPS in production)
- Admin operations are client-side (IndexedDB security model)
- Container exposes ports to localhost only by default
- Update CORS settings in production for specific domains
