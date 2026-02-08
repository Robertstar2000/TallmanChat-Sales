# Tallman Chat - Docker Deployment

This guide explains how to run the Tallman Chat application using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- **OpenAI API Key** (for primary AI model)
- Access to LDAP service (if using authentication)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Robertstar2000/TallmanChat-Sales
   cd TallmanChat-Sales
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env.docker
   # Edit .env.docker and add OPENAI_API_KEY
   ```

3. **Build and run:**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application:**
   - **UI**: http://localhost:3230
   - **Backend API**: http://localhost:3231/api
   - **Health Check**: http://localhost:3231/api/health

## Configuration

### Environment Variables (.env.docker)

- `OPENAI_API_KEY`: Required for ChatGPT integration.
- `OPENAI_MODEL`: Defaults to `gpt-5.2`.
- `LDAP_SERVICE_HOST`: Points to LDAP/AD server.
- `PORT`: Backend port inside container (default 3231).
- `UI_PORT`: Frontend port inside container (default 3230).

## Services Architecture

```
┌─────────────────┐
│   tallman-chat  │
│    (Container)  │
│                 │
│  ┌────────────┐ │      ┌───────────────┐
│  │   UI       │ │      │   OpenAI API  │
│  │  (port     │◄┼──────►   (Cloud)     │
│  │  3230)     │ │      └───────────────┘
│  └────────────┘ │
│                 │
│  ┌────────────┐ │
│  │   Backend  │ │      ┌───────────────┐
│  │   API      │◄┼──────►  LDAP Service │
│  │  (port     │ │      │ (Host/Network)│
│  │  3231)     │ │      └───────────────┘
│  └────────────┘ │
└─────────────────┘
```

## Troubleshooting

### API Connection Issues
- Verify `OPENAI_API_KEY` is correct in `.env.docker`.
- Check logs: `docker-compose logs app`.
- Ensure internet connectivity for OpenAI API access.

### Port Conflicts
- Default ports: 3230 (UI), 3231 (API).
- Modify `docker-compose.yml` if conflicts arise.

## Development vs Production
- **Docker Desktop**: Uses `docker-compose.yml` (Development build with volume mount for live edits).
- **Production Swarm**: Uses `docker-compose.swarm.yml` (Optimized production build).
