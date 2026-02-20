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
ghost-browser snapshot -i     # Get interactive elements with refs (@e1, @e2)
ghost-browser screenshot      # Save screenshot to screenshot.png
ghost-browser highlight <sel> # Draw outline around element (visual check)
ghost-browser tabs            # List open tabs/windows
ghost-browser switch <index>  # Switch focus to a specific tab
ghost-browser frame <sel>     # Focus an iframe ('main' to return to top)
ghost-browser cookies         # View or set (ghost-browser cookies set name val)
```

### Interaction (Stealth)

All interactions use human simulation algorithms (Bezier curves, variable delays). You can use CSS selectors OR references from `snapshot -i` (e.g., `@e1`).

```bash
ghost-browser click <selector>          # Click an element
ghost-browser dblclick <selector>       # Double-click an element
ghost-browser drag <src> <dest>         # Drag one element to another
ghost-browser hover <selector>          # Move mouse to element
ghost-browser type <selector> <text>    # Focus and type text with jitter
ghost-browser fill <selector> <text>    # Clear field and type text
ghost-browser scroll <y_offset>         # Humanized scroll (positive = down)
ghost-browser press <key>               # Press key (Enter, Escape, Tab, etc.)
ghost-browser upload <sel> <path>       # Upload a file
ghost-browser wait <selector>           # Wait for element to appear
```

## Example: Form Submission with Refs

```bash
# 1. Open and find elements
ghost-browser start
ghost-browser open "https://example.com/login"
ghost-browser snapshot -i
# Output: [{"id": "@e1", "tagName": "input", "text": "Email"}, {"id": "@e2", "tagName": "button", "text": "Submit"}]

# 2. Interact using refs
ghost-browser fill @e1 "user@test.com"
ghost-browser click @e2
ghost-browser wait ".dashboard"
```

## Troubleshooting

- **"Element not found"**: The selector might be wrong, or the page hasn't loaded. Use `ghost-browser screenshot` or `ghost-browser view` to check.
- **Service failed to start**: Check `docker logs ghost-browser`.
