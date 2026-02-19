# AGENTS.md

Instructions for AI agents and coding assistants working with Ghost Chrome Runner.

## System Overview

**Ghost Chrome Runner** is a "Headful-on-Headless" solution. It is designed specifically to solve the problem where standard `agent-browser` or Playwright scripts get blocked by anti-bot systems (403 Forbidden, Captchas).

## The Philosophy: "Be the User"

Standard automation tools are detected because they are too perfect. They have no monitor, they type instantly, and they move the mouse in straight lines.

This system simulates a messy, real user:
1.  **The Environment:** It runs a full desktop environment (X11/Xvfb) inside Docker so Chrome believes it has a screen.
2.  **The Input:** It never teleports the mouse. It generates Bezier curves with noise for movement.
3.  **The Identity:** It uses a persistent user profile. If you log into Google once, the cookies are saved to disk (`chrome_data` volume) and reused next time, increasing trust score.

## How to Interact

Do not try to spawn new browser processes. The browser is **always running** inside the container. You interact solely via the HTTP API on port 3000.

### Workflow Example

To perform a Google Search without getting flagged:

1.  **Navigate:** POST `/navigate` -> `{"url": "https://google.com"}`
2.  **Wait:** The API waits for `networkidle2` automatically.
3.  **Type:** POST `/type` -> `{"selector": "textarea[name='q']", "text": "latest news"}`
    *   *Note:* This endpoint handles focusing the input and typing with human jitter automatically.
4.  **Search:** POST `/click` -> `{"selector": "input[name='btnK']"}`
    *   *Note:* If the button isn't visible (overlapped), the API will throw an error. You may need to press "Enter" (simulated via `\n` in type) instead.
5.  **Read:** GET `/snapshot` to read the results.

## Stealth Mechanics (Internal)

If you are modifying the source code (`src/`), adhere to these rules:

1.  **Never use `--headless`**: This flag is the primary bot signal. Always run against Xvfb.
2.  **Patch `navigator`**: See `src/stealth.ts`. We strip `webdriver` properties and mock `plugins`/`languages`.
3.  **Randomization**: Never use fixed delays. `src/input.ts` implements random jitter for typing (30ms-130ms) and mouse movement steps.
