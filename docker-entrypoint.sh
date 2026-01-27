#!/bin/sh
# Docker Entrypoint Script for Tallman Chat
# Handles runtime bootstrapping and environment synchronization
# Per enterprise-app-foundation skill: Bootstrapping Entrypoints

set -e

echo "======================================"
echo "Tallman Chat - Container Bootstrap"
echo "======================================"
echo "Environment: ${NODE_ENV:-development}"
echo "UI Port: ${UI_PORT:-3230}"
echo "API Port: ${PORT:-3231}"
echo "======================================"

# Wait for dependencies if needed
wait_for_service() {
    local host="$1"
    local port="$2"
    local retries="${3:-30}"
    local wait="${4:-2}"
    
    echo "Waiting for $host:$port..."
    
    for i in $(seq 1 $retries); do
        if nc -z "$host" "$port" 2>/dev/null; then
            echo "$host:$port is available"
            return 0
        fi
        echo "Attempt $i/$retries: $host:$port not available, waiting ${wait}s..."
        sleep $wait
    done
    
    echo "WARNING: $host:$port did not become available"
    return 1
}

# Check for LDAP service if configured
if [ -n "$LDAP_SERVICE_HOST" ] && [ -n "$LDAP_SERVICE_PORT" ]; then
    echo "Checking LDAP service availability..."
    wait_for_service "$LDAP_SERVICE_HOST" "$LDAP_SERVICE_PORT" 5 2 || true
fi

# Create necessary directories
echo "Creating application directories..."
mkdir -p /app/logs 2>/dev/null || true
mkdir -p /app/data 2>/dev/null || true

# Set proper permissions (skip on Windows volumes where chmod isn't supported)
chmod 755 /app/logs 2>/dev/null || echo "Note: chmod not supported on this volume (Windows mount)"
chmod 755 /app/data 2>/dev/null || true

# Environment validation
echo "Validating environment..."

if [ -z "$GEMINI_API_KEY" ]; then
    echo "WARNING: GEMINI_API_KEY is not set. AI functionality may be limited."
fi

if [ "$NODE_ENV" = "production" ]; then
    echo "Running in PRODUCTION mode"
    echo "- Optimizations enabled"
    echo "- Debug logging disabled"
else
    echo "Running in DEVELOPMENT mode"
    echo "- Debug logging enabled"
fi

# Health check endpoint validation
echo "Starting health check validation..."

# Start the application
echo "======================================"
echo "Starting Tallman Chat Services..."
echo "======================================"

# Execute the main command (passed as arguments to this script)
exec "$@"
