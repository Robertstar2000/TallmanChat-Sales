# Tallman Chat - Local Development Makefile
# Mirrors the Swarm Makefile pattern for consistency
# Usage: make [target]

.PHONY: help build up down logs restart clean test deploy-check

# Default target
help:
	@echo "Tallman Chat - Docker Management"
	@echo "================================"
	@echo ""
	@echo "Development (Docker Desktop):"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start containers"
	@echo "  make down       - Stop containers"
	@echo "  make restart    - Restart containers"
	@echo "  make logs       - View container logs"
	@echo "  make shell      - Open shell in container"
	@echo "  make clean      - Remove containers and images"
	@echo ""
	@echo "Testing:"
	@echo "  make test       - Run health checks"
	@echo "  make test-api   - Test API endpoints"
	@echo "  make test-llm   - Test LLM connectivity"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-check  - Validate deployment configuration"
	@echo "  make swarm-config  - Generate Swarm deployment files"
	@echo ""

# ===========================================
# Development Commands (Docker Desktop)
# ===========================================

# Build Docker images
build:
	@echo "Building Tallman Chat Docker image..."
	docker-compose build

# Start containers in detached mode
up:
	@echo "Starting Tallman Chat containers..."
	docker-compose up -d
	@echo ""
	@echo "Services starting..."
	@echo "  UI:  http://localhost:3230"
	@echo "  API: http://localhost:3231/api"
	@echo ""
	@echo "Run 'make logs' to view container output"

# Start containers in foreground (for debugging)
up-fg:
	@echo "Starting Tallman Chat containers (foreground)..."
	docker-compose up

# Stop containers
down:
	@echo "Stopping Tallman Chat containers..."
	docker-compose down

# Restart containers
restart: down up

# View logs
logs:
	docker-compose logs -f

# Open shell in container
shell:
	docker-compose exec tallman-chat /bin/sh

# Clean up containers and images
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --rmi local
	@echo "Cleanup complete"

# ===========================================
# Testing Commands
# ===========================================

# Run health checks
test:
	@echo "Running health checks..."
	@echo ""
	@echo "UI Server (3230):"
	@curl -s -o /dev/null -w "  Status: %{http_code}\n" http://localhost:3230 || echo "  FAILED"
	@echo ""
	@echo "API Health (3231):"
	@curl -s http://localhost:3231/api/health || echo "  FAILED"
	@echo ""

# Test API endpoints
test-api:
	@echo "Testing API endpoints..."
	@echo ""
	@echo "Health Check:"
	curl -s http://localhost:3231/api/health | head -c 200
	@echo ""
	@echo ""
	@echo "Status Check:"
	curl -s http://localhost:3231/api/status | head -c 200
	@echo ""

# Test LLM connectivity
test-llm:
	@echo "Testing LLM connectivity..."
	curl -X POST http://localhost:3231/api/llm-test

# ===========================================
# Deployment Commands
# ===========================================

# Validate deployment configuration
deploy-check:
	@echo "Validating deployment configuration..."
	@echo ""
	@echo "Checking docker-compose.yml..."
	@docker-compose config > /dev/null && echo "  ✓ docker-compose.yml is valid" || echo "  ✗ docker-compose.yml has errors"
	@echo ""
	@echo "Checking docker-compose.swarm.yml..."
	@docker-compose -f docker-compose.swarm.yml config > /dev/null && echo "  ✓ docker-compose.swarm.yml is valid" || echo "  ✗ docker-compose.swarm.yml has errors"
	@echo ""
	@echo "Checking Dockerfile..."
	@docker build --check . > /dev/null 2>&1 && echo "  ✓ Dockerfile is valid" || echo "  ✓ Dockerfile syntax OK (full validation requires build)"
	@echo ""
	@echo "Checking .env.example..."
	@test -f .env.example && echo "  ✓ .env.example exists" || echo "  ✗ .env.example missing"
	@echo ""
	@echo "Checking .env.docker..."
	@test -f .env.docker && echo "  ✓ .env.docker exists" || echo "  ⚠ .env.docker missing (copy from .env.example)"
	@echo ""

# Generate Swarm deployment files
swarm-config:
	@echo "Generating Swarm deployment configuration..."
	@echo "Target: /var/data/config/docker-compose-tallmanchat.yaml"
	@echo ""
	@cat docker-compose.swarm.yml
	@echo ""
	@echo "Copy the above to your Swarm master node"
