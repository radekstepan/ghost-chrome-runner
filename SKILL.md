---
name: Ghost Chrome
description: >
  Two-in-one skill. (1) SETUP: when asked to install or add Ghost Chrome,
  modify the NanoClaw container Dockerfile and entrypoint so every agent gets
  a real Google Chrome + Xvfb + human-input simulation on localhost:3000.
  (2) USAGE: when a task requires bypassing bot detection, use the Ghost Chrome
  REST API on localhost:3000 via curl.
read_when:
  - Adding or installing Ghost Chrome browser to NanoClaw agents
  - Bypassing strong bot detection (Cloudflare, Google reCAPTCHA, etc.)
  - Automating sites that block headless browsers or Playwright
  - Performing Google searches or interactions requiring high trust
metadata: {"clawdbot":{"emoji":"👻","requires":{"bins":["curl","jq","git","docker"]}}}
allowed-tools: Bash, Edit, Write, Read, Glob
---

# Ghost Chrome Runner — NanoClaw Integration

Ghost Chrome runs a **real Google Chrome** inside Xvfb (virtual display) in
each NanoClaw agent container. It simulates human mouse movement (Bezier curves)
and per-keystroke typing jitter to bypass anti-bot systems that detect headless
browsers. Uses a persistent Chrome profile so login cookies accumulate trust
over time.

---

## Part 1 — Setup (run once, from the NanoClaw Claude Code host)

> Read this section when the user asks you to **add**, **install**, or **set up**
> Ghost Chrome. Apply every step below, then rebuild the container.
> Skip to Part 2 if Ghost is already installed (i.e. `localhost:3000` responds).

### Step 1 — Extend `container/Dockerfile`

Open `container/Dockerfile`. Append the following block **after** the main
`WORKDIR /app` line and before any CMD / ENTRYPOINT instruction. Keep all
existing content intact.

```dockerfile
# == Ghost Chrome Runner =======================================================
# Install Xvfb (virtual display) and Chrome shared library dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget gnupg ca-certificates xvfb x11-utils \
        fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
        libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
        libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxshmfence1 \
        xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install official Google Chrome Stable from Google's APT repo.
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
        | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] \
             http://dl.google.com/linux/chrome/deb/ stable main" \
         > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Clone, install dependencies, and compile Ghost Chrome Runner.
RUN git clone --depth=1 \
        https://github.com/radekstepan/ghost-chrome-runner.git \
        /opt/ghost-chrome-runner \
    && cd /opt/ghost-chrome-runner \
    && npm install \
    && npm run build

# Copy the background-service startup script and the ghost CLI.
COPY scripts/start-ghost.sh /opt/ghost-chrome-runner/start-ghost.sh
COPY scripts/ghost-cli.sh /opt/ghost-chrome-runner/scripts/ghost-cli.sh
RUN chmod +x /opt/ghost-chrome-runner/start-ghost.sh \
        /opt/ghost-chrome-runner/scripts/ghost-cli.sh \
    && ln -sf /opt/ghost-chrome-runner/scripts/ghost-cli.sh /usr/local/bin/ghost

# Pre-create log and Chrome profile dirs with correct ownership.
# NanoClaw runs containers as the non-root 'node' user, so these
# directories must exist and be writable before the entrypoint runs.
RUN mkdir -p /var/log /data/chrome-profile && chown -R node:node /var/log /data

ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV DISPLAY=:99
# ==============================================================================
```

### Step 2 — Create `container/scripts/start-ghost.sh`

Create the file below (make the `container/scripts/` directory first if it does
not exist). This script starts Xvfb, Chrome, and the Ghost REST controller
**in the background**, then returns so the container can continue its own startup.

```bash
#!/bin/bash
# start-ghost.sh
# Starts Ghost Chrome Runner as a background service inside the NanoClaw agent
# container. Called from the container entrypoint before the Claude agent starts.
set -e

echo "Ghost: starting..."

# Auto-detect a free REST API port so multiple agent containers can run
# concurrently without competing for port 3000 on the host.
if [ -z "${PORT:-}" ]; then
  PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()")
  export PORT
fi
# Write the chosen port to a well-known file so the agent process can read it.
echo "$PORT" > /tmp/ghost-port
echo "Ghost: REST API will bind to port $PORT (written to /tmp/ghost-port)"

CHROME_DEBUG_PORT="${CHROME_DEBUG_PORT:-9222}"
export CHROME_DEBUG_PORT

# 1. Remove stale X11 lock from previous container runs.
rm -f /tmp/.X99-lock

# 2. Start virtual display.
Xvfb :99 -screen 0 1920x1080x24 >/dev/null 2>&1 &
for i in {1..10}; do
  xdpyinfo -display :99 >/dev/null 2>&1 && echo "Ghost: display ready" && break
  sleep 1
done

# 3. Start Chrome with remote-debugging so Puppeteer can connect.
mkdir -p /var/log /data/chrome-profile
google-chrome-stable \
  --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --remote-debugging-port="$CHROME_DEBUG_PORT" --remote-debugging-address=127.0.0.1 \
  --user-data-dir=/data/chrome-profile \
  --start-maximized --no-first-run --no-default-browser-check \
  --disable-notifications --disable-infobars \
  --disable-blink-features=AutomationControlled \
  >/var/log/chrome.log 2>&1 &
for i in {1..30}; do
  curl -s "http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version" >/dev/null 2>&1 \
    && echo "Ghost: Chrome CDP ready" && break
  sleep 1
done

# 4. Start the Ghost REST controller in the background.
cd /opt/ghost-chrome-runner
node dist/index.js >/var/log/ghost-chrome.log 2>&1 &

# 5. Poll until the REST API is accepting requests.
for i in {1..15}; do
  curl -s "http://localhost:${PORT}/health" >/dev/null 2>&1 \
    && echo "Ghost: REST API up on http://localhost:${PORT}" && break
  sleep 1
done
```

### Step 3 — Inject Ghost startup into the container entrypoint

NanoClaw does **not** have an `entrypoint.sh` source file. The entrypoint is
generated inline inside `container/Dockerfile` by a `RUN printf '...'` command.

Find the line in `container/Dockerfile` that looks like this (it creates
`/app/entrypoint.sh`):

```dockerfile
RUN printf '#!/bin/bash\nset -e\n...\ncat > /tmp/input.json\nnode /tmp/dist/index.js < /tmp/input.json\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh
```

Insert the following two lines into that printf string **immediately before**
`cat > /tmp/input.json\n`:

```
bash /opt/ghost-chrome-runner/start-ghost.sh\n
export PORT=$(cat /tmp/ghost-port)\n
export CHROME_DEBUG_PORT=${CHROME_DEBUG_PORT:-9222}\n
```

So the result is:

```dockerfile
RUN printf '#!/bin/bash\nset -e\ncd /app && npx tsc --outDir /tmp/dist 2>&1 >&2\nln -s /app/node_modules /tmp/dist/node_modules\nchmod -R a-w /tmp/dist\nbash /opt/ghost-chrome-runner/start-ghost.sh\nexport PORT=$(cat /tmp/ghost-port)\nexport CHROME_DEBUG_PORT=${CHROME_DEBUG_PORT:-9222}\ncat > /tmp/input.json\nnode /tmp/dist/index.js < /tmp/input.json\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh
```

> **Do NOT add `-p 3000:3000` to the `docker run` args for NanoClaw agent
> containers.** Ghost Chrome binds to a free ephemeral port chosen at startup
> and writes it to `/tmp/ghost-port`. The agent reads it via
> `export PORT=$(cat /tmp/ghost-port)`. Exposing Ghost's port to the host is
> unnecessary (the agent talks to it via localhost) and causes bind conflicts
> when multiple agent containers run concurrently.

### Step 4 — Copy this skill into the container skills directory

So that in-container agents can also invoke it as a tool-usage guide:

```bash
mkdir -p container/skills
cp SKILL.md container/skills/ghost-chrome.md
```

### Step 5 — Rebuild

```bash
cd container && ./build.sh
```

If `build.sh` does not exist, use:

```bash
docker build -t nanoclaw-agent ./container
```

Verify by starting a new agent and running:

```bash
ghost health
# Expected: {"status":"ok","chrome":true}
```

---

## Part 2 — Agent Usage (inside the container after setup)

> Use this section when **performing a browser task**. The `ghost` CLI is on
> PATH. It **auto-starts Ghost Chrome on first use** — no manual startup, no
> waiting, no port management needed. All interactions simulate human input
> and are indistinguishable from a real user to standard bot-detection systems.

### Health check

```bash
ghost health
# {"status":"ok","chrome":true}
```

### Navigation & Inspection

```bash
# Navigate to URL (waits for network idle automatically)
ghost navigate https://example.com

# Get page text content
ghost snapshot

# Get interactive elements with @ref labels (@e1, @e2, ...)
ghost snapshot interactive

# Save screenshot (default filename: screenshot.png)
ghost screenshot
ghost screenshot result.png

# Highlight element (visual debug)
ghost highlight "#main"

# List open tabs / switch tab
ghost tabs
ghost switch 0

# Focus an iframe ("main" returns to top frame)
ghost frame "#my-frame"
ghost frame main

# List cookies
ghost cookies

# View recent Chrome / Ghost logs
ghost logs
```

### Interaction (Stealth)

All interactions use Bezier mouse curves and per-keystroke jitter (30–130 ms).
Use CSS selectors **or** `@ref` labels from `ghost snapshot interactive`.

```bash
ghost click "button#submit"
ghost click "#item" double          # double-click

ghost drag "#card" "#dropzone"

ghost hover "#menu"

ghost type "input[name=q]" "latest news"   # appends to existing value
ghost fill "#email" "user@example.com"     # clears then types

ghost scroll 500    # down; negative = up

ghost press Enter
ghost press Tab

ghost upload "input[type=file]" "/tmp/doc.pdf"

ghost wait ".dashboard"            # default 30s timeout
ghost wait ".modal" 5000           # custom timeout (ms)
```

### Example: Google Search without Bot Detection

```bash
ghost navigate https://google.com
ghost type "textarea[name=q]" "latest news"
ghost press Enter
ghost snapshot
```

### Example: Login Form with @ref Labels

```bash
curl -s -X POST http://localhost:3000/navigate \
  -H 'Content-Type: application/json' -d '{"url":"https://example.com/login"}' | jq .

# Inspect interactive elements
curl -s 'http://localhost:3000/snapshot/interactive' | jq .
# Returns: [{"id":"@e1","tagName":"INPUT","type":"email"}, {"id":"@e2","tagName":"BUTTON","text":"Sign in"}]

curl -s -X POST http://localhost:3000/fill \
  -H 'Content-Type: application/json' \
  -d '{"selector":"@e1","text":"user@example.com"}' | jq .

curl -s -X POST http://localhost:3000/click \
  -H 'Content-Type: application/json' -d '{"selector":"@e2"}' | jq .

curl -s -X POST http://localhost:3000/wait \
  -H 'Content-Type: application/json' -d '{"selector":".dashboard"}' | jq .
```

### Troubleshooting

- **Service not reachable**: Ghost may still be initialising. Retry health check after a few seconds.
- **Element not found**: Wrong selector or page not fully loaded — take a screenshot to inspect.
- **Chrome logs**: `curl -s http://localhost:3000/logs`
