#!/bin/bash
# start-service.sh — Start Ghost Chrome Runner as a background service.
#
# Use this when embedding Ghost Chrome Runner inside another container
# (e.g. NanoClaw) where the main process is NOT the Ghost Node server.
# Unlike entrypoint.sh, this script launches everything in the background
# and returns to the caller so the container can continue its own startup.
#
# Usage (from NanoClaw Dockerfile / entrypoint):
#   bash /opt/ghost-chrome-runner/scripts/start-service.sh
#   # Then start your own process (e.g. the Claude agent runner)

set -e

# Resolve the Ghost Chrome Runner project root from this script's location,
# so the script works regardless of where it is called from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GHOST_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "👻 Starting Ghost Chrome Runner (service mode)..."
echo "   Project root: $GHOST_ROOT"

# 1. Clean up any stale X11 lock files (common after container restarts)
rm -f /tmp/.X99-lock

# 2. Start Xvfb (virtual display) in the background
echo "🖥️  Starting virtual display (Xvfb)..."
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Wait for Xvfb to be ready
echo "⏳ Waiting for X server..."
for i in {1..10}; do
  if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "✅ Display :99 is online"
    break
  fi
  echo "   ...waiting ($i/10)"
  sleep 1
done

if ! xdpyinfo -display :99 >/dev/null 2>&1; then
  echo "❌ Error: Xvfb failed to start."
  exit 1
fi

# 3. Start Google Chrome with remote debugging
echo "🚀 Launching Google Chrome (logs -> /var/log/chrome.log)..."
mkdir -p /var/log
google-chrome-stable \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0 \
  --user-data-dir=/data/chrome-profile \
  --start-maximized \
  --no-first-run \
  --no-default-browser-check \
  --disable-notifications \
  --disable-infobars \
  --disable-blink-features=AutomationControlled \
  > /var/log/chrome.log 2>&1 &

# 4. Wait for Chrome CDP to be reachable
echo "⏳ Waiting for Chrome CDP on port 9222..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:9222/json/version > /dev/null 2>&1; then
    echo "✅ Chrome is ready and listening"
    break
  fi
  sleep 1
done

if ! curl -s http://127.0.0.1:9222/json/version > /dev/null 2>&1; then
  echo "❌ Error: Chrome CDP did not become ready."
  exit 1
fi

# 5. Start the Ghost Chrome Node.js controller in the background
# Uses pre-compiled dist/ (built into the image at Docker build time).
echo "🧠 Starting Stealth Controller..."
cd "$GHOST_ROOT"
node dist/index.js > /var/log/ghost-chrome.log 2>&1 &
GHOST_PID=$!

# 6. Wait for the REST API to be ready
echo "⏳ Waiting for Ghost API on port 3000..."
for i in {1..15}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Ghost Chrome Runner is up on http://localhost:3000 (PID $GHOST_PID)"
    break
  fi
  sleep 1
done

if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "❌ Error: Ghost API did not start. Check /var/log/ghost-chrome.log"
  exit 1
fi
