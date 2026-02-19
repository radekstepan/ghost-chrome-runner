---
name: Ghost Chrome
description: A high-stealth, headful browser automation service running in Docker. Use this SPECIFICALLY when standard headless browsers (agent-browser/Playwright) are blocked by anti-bot protections (Cloudflare, Google, etc.). It runs a real Chrome instance and simulates human input.
read_when:
  - Bypassing strong bot detection
  - Automating sites that block headless browsers
  - Performing Google searches or interactions requiring high trust
metadata: {"clawdbot":{"emoji":"👻","requires":{"bins":["docker","curl","jq"]}}}
allowed-tools: Bash(ghost-browser:*)
---

# Stealth Browser Automation with Ghost Chrome

## Core Workflow

1.  **Always Start First**: Run `ghost-browser start` at the beginning of your task. It is fast and safe to run even if already running.
2.  **Navigate & Act**: Use standard commands.
3.  **Finish**: You can explicitly run `ghost-browser stop` or let it auto-shutdown after 5 minutes of inactivity.

## Commands

### Lifecycle

```bash
ghost-browser start           # Boot the Docker container (Safe to run repeatedly)
ghost-browser stop            # Stop and remove the container
ghost-browser restart         # Restart the service (get a fresh browser session)
ghost-browser status          # Check service health
```

### Navigation & Inspection

```bash
ghost-browser open <url>      # Navigate to URL (waits for network idle)
ghost-browser snapshot        # Get page text content
ghost-browser screenshot      # Save screenshot to screenshot.png
```

### Interaction (Stealth)

All interactions use human simulation algorithms (Bezier curves, variable delays).

```bash
ghost-browser click <selector>          # Click an element (CSS selector)
ghost-browser type <selector> <text>    # Focus and type text with jitter
```

## Example: Periodic Task

If running a scheduled check:

```bash
# 1. Ensure service is up
ghost-browser start

# 2. Perform check
ghost-browser open "https://google.com"
ghost-browser type "textarea[name='q']" "weather in tokyo"
ghost-browser click "input[name='btnK']"
ghost-browser snapshot

# 3. Cleanup (Optional, saves resources immediately)
ghost-browser stop
```

## Troubleshooting

- **"Element not found"**: The selector might be wrong, or the page hasn't loaded. Use `ghost-browser screenshot` or `ghost-browser view` to check.
- **Service failed to start**: Check `docker logs ghost-browser`.
