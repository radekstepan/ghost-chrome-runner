# Ghost Chrome Runner 👻

A high-stealth browser automation environment designed to bypass sophisticated bot detection (like Cloudflare, Google, etc.).

Unlike standard headless automation (Puppeteer/Playwright), this project runs **real Google Chrome Stable** in a "headful" state inside a virtual display (Xvfb). It includes a Stealth Controller API that simulates human-like mouse movements and typing patterns.

## Features

- **True Headful Mode**: Runs Chrome without the `--headless` flag using Xvfb.
- **Real Binary**: Uses official `google-chrome-stable`, not open-source Chromium.
- **Stealth Injection**: Overwrites `navigator.webdriver`, mocks plugins, and masks permission prompts.
- **Human Input**: Bezier curve mouse movements and variable typing delays.
- **Persistent Profile**: Cookies and sessions survive container restarts via Docker volumes.

## Quick Start

### 1. Build and Run

```bash
docker-compose up --build
```

The service will start on **port 3000**. The browser may take a few seconds to initialize.

### 2. Check Status

```bash
curl http://localhost:3000/health
# {"status":"ok","chrome":true}
```

## API Reference

The Controller exposes a simple JSON HTTP API for agents.

### Navigate
```bash
curl -X POST http://localhost:3000/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'
```

### Get Snapshot (Text)
Returns the readable text content of the page.
```bash
curl http://localhost:3000/snapshot
```

### Human-Like Click
Moves the mouse in a curve to the element center, waits slightly, then clicks.
```bash
curl -X POST http://localhost:3000/click \
  -H "Content-Type: application/json" \
  -d '{"selector": "textarea[name=\"q\"]"}'
```

### Human-Like Typing
Clicks the element to focus, then types with random jitter between keystrokes.
```bash
curl -X POST http://localhost:3000/type \
  -H "Content-Type: application/json" \
  -d '{"selector": "textarea[name=\"q\"]", "text": "stealth browser automation"}'
```

## Architecture

1.  **Infrastructure**: Docker container based on Node.js/Debian.
2.  **Display**: Xvfb creates a virtual frame buffer (`:99`) at 1920x1080.
3.  **Browser**: Google Chrome launches pointing to `DISPLAY=:99` with debugging port `9222` open.
4.  **Controller**: Node.js script connects to `localhost:9222` via Puppeteer to translate API requests into CDP commands.

## Debugging

To see what the browser is seeing, you can connect to the exposed CDP port (9222) using your local Chrome:

1. Open `chrome://inspect` in your local browser.
2. Configure "Network targets" to include `localhost:9222`.
3. Click "Inspect" on the remote target.
```
