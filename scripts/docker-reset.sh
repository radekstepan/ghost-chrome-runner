#!/bin/bash
DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

# Detect docker compose or docker-compose
if docker compose version &> /dev/null; then
  DC_CMD="docker compose"
else
  DC_CMD="docker-compose"
fi

echo "🧹 Resetting Ghost Chrome..."

# 1. Stop and remove the current stuck container
$DC_CMD down

# 2. Rebuild cleanly (this ensures the new packages are installed)
$DC_CMD up -d --build

# 3. Watch the logs to confirm it passes the "Waiting" stage
$DC_CMD logs -f
