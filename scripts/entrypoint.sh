#!/bin/bash
set -e

echo "👻 Starting Ghost Chrome Runner..."

# 1. Clean up any stale X11 lock files (common in Docker restarts)
rm -f /tmp/.X99-lock

# 2. Start Xvfb (Virtual Monitor) in the background
# Resolution 1920x1080 with 24-bit color depth
echo "🖥️  Starting virtual display (Xvfb)..."
Xvfb :99 -screen 0 1920x1080x24 &

# Wait for Xvfb to be ready
echo "⏳ Waiting for X server..."
while ! xset -q > /dev/null 2>&1; do
  sleep 0.5
done
echo "✅ Display :99 is online"

# 3. Start Google Chrome Stable in the background
# Note: We do NOT use --headless. We point it to DISPLAY=:99
echo "🚀 Launching Google Chrome..."
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
  &

# 4. Wait for Chrome CDP to be reachable
echo "⏳ Waiting for Chrome CDP on port 9222..."
until curl -s http://127.0.0.1:9222/json/version > /dev/null; do
  sleep 0.5
done
echo "✅ Chrome is ready and listening"

# 5. Start the Node.js Controller (The "Hands" of the Agent)
echo "🧠 Starting Stealth Controller..."
exec npm start
