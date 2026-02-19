---
name: Ghost Chrome Runner
description: A high-stealth, headful browser automation service running in Docker. Use this SPECIFICALLY when standard headless browsers (agent-browser/Playwright) are blocked by anti-bot protections (Cloudflare, Google, etc.). It runs a real Chrome instance and simulates human input.
metadata: {"clawdbot":{"emoji":"👻","requires":{"bins":["docker","curl","jq"]}}}
---

# Stealth Browser Automation with Ghost Chrome

## Installation

### Prerequisites
Requires Docker and Docker Compose.

```bash
# Clone and build
git clone <repo_url> ghost-chrome-runner
cd ghost-chrome-runner
yarn install
# The CLI wrapper is in ./bin/ghost-browser
```

## Quick Start

```bash
# 1. Start the ghost service (runs in background)
ghost-browser start

# 2. Navigate
ghost-browser open "https://www.google.com"

# 3. Snapshot (returns text content)
ghost-browser snapshot

# 4. Interact (Human-like)
ghost-browser type "textarea[name='q']" "OpenClaw AI"
ghost-browser click "input[name='btnK']"

# 5. Stop service when done
ghost-browser stop
```

## Core Workflow

1.  **Start**: `ghost-browser start` (Ensures the stealth container is running)
2.  **Navigate**: `ghost-browser open <url>`
3.  **Analyze**: `ghost-browser snapshot` (Get page text) or `ghost-browser screenshot` (Visual check)
4.  **Interact**: Use CSS selectors. Inputs are human-simulated (curved mouse paths, typing jitter).
5.  **Stop**: `ghost-browser stop` (Frees resources)

## Commands

### Lifecycle

```bash
ghost-browser start           # Boot the Docker container (idempotent)
ghost-browser stop            # Stop and remove the container
ghost-browser restart         # Restart the service (get a fresh browser session)
ghost-browser status          # Check if Chrome is healthy
```

### Navigation & Inspection

```bash
ghost-browser open <url>      # Navigate to URL (waits for network idle)
ghost-browser snapshot        # Get page text content
ghost-browser screenshot      # Get base64 screenshot (useful for debugging)
```

### Interaction (Stealth)

All interactions use human simulation algorithms (Bezier curves, variable delays).

```bash
ghost-browser click <selector>          # Click an element (CSS selector)
ghost-browser type <selector> <text>    # Focus and type text with jitter
```

## Example: Google Search

```bash
ghost-browser start
ghost-browser open "https://google.com"

# Accept cookies if needed (example selector)
# ghost-browser click "button:has-text('Accept all')"

ghost-browser type "textarea[name='q']" "latest tech news"
ghost-browser click "input[name='btnK']" # Click Google Search

ghost-browser snapshot
```

## Troubleshooting

- **"Element not found"**: The selector might be wrong, or the page hasn't loaded. Use `ghost-browser screenshot` to see what the browser sees.
- **Service failed to start**: Check `docker logs ghost-browser`.
- **Selectors**: Supports standard CSS selectors. For text matching, you may need to rely on the agent's ability to infer CSS from the snapshot context.
