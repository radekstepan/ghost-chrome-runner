# Ghost Chrome Runner 👻

A high-stealth browser automation environment designed to bypass sophisticated bot detection. Runs real Google Chrome in a Dockerized Xvfb environment with a human-input simulation API.

## Features

- **True Headful Mode**: Real Google Chrome Stable (not Chromium) on Xvfb.
- **Stealth Injection**: Overwrites `webdriver` properties and mocks plugins.
- **Human Input**: Bezier curve mouse movements and jitter typing.
- **API Controlled**: Simple REST API for agents.
- **CLI Wrapper**: `ghost-browser` script for easy skill integration.

## Installation

```bash
git clone <repo>
yarn install
```

## Usage (CLI Wrapper)

Use the `bin/ghost-browser` script to control the lifecycle and actions.

```bash
# 1. Start the service
./bin/ghost-browser start

# 2. Use commands
./bin/ghost-browser open "https://google.com"
./bin/ghost-browser type "textarea[name='q']" "hello world"
./bin/ghost-browser click "input[name='btnK']"
./bin/ghost-browser snapshot

# 3. Stop
./bin/ghost-browser stop
```

## Usage (Direct API)

If you prefer direct HTTP calls:

```bash
# Start
docker-compose up -d

# Call API
curl -X POST http://localhost:3000/navigate -d '{"url": "https://google.com"}' -H "Content-Type: application/json"
```

## Architecture

See `AGENTS.md` for detailed agent interaction patterns.
