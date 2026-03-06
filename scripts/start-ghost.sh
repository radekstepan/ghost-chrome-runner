#!/bin/bash
set -e

echo "👻 Starting Ghost Chrome Runner..."

# 0. Create required directories
mkdir -p /var/log /data/chrome-profile

# 1. Clean up any stale X11 lock files (common in Docker restarts)
rm -f /tmp/.X99-lock

# 2. Start Xvfb (Virtual Monitor) in the background
# Resolution 1920x1080 with 24-bit color depth
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

# 3. Start Google Chrome Stable
# Redirect output to file to suppress DBus errors in docker logs
CHROME_DEBUG_PORT="${CHROME_DEBUG_PORT:-9222}"
echo "🚀 Launching Google Chrome on CDP port $CHROME_DEBUG_PORT (logs -> /var/log/chrome.log)..."
google-chrome-stable \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-port="$CHROME_DEBUG_PORT" \
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
echo "⏳ Waiting for Chrome CDP on port $CHROME_DEBUG_PORT..."
for i in {1..30}; do
  if curl -s "http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version" > /dev/null; then
    echo "✅ Chrome is ready and listening"
    break
  fi
  sleep 1
done

# 5. Start the Node.js Controller
echo "🧠 Starting Stealth Controller..."
exec node dist/index.js
