#!/bin/bash
# ghost-cli.sh — agent-facing CLI for Ghost Chrome Runner
#
# Auto-starts Ghost Chrome if not already running, then dispatches commands
# to the REST API. Agents never need to know the port or manage startup.
#
# Usage: ghost <command> [args]
# Install on PATH: ln -sf /opt/ghost-chrome-runner/scripts/ghost-cli.sh /usr/local/bin/ghost

GHOST_ROOT="/opt/ghost-chrome-runner"
PORT_FILE="/tmp/ghost-port"

# Resolve the right start script: prefer a custom start-ghost.sh at the root
# (written by SKILL.md Step 2 for NanoClaw embedded mode), fall back to the
# repo's start-service.sh for standalone / development use.
if [ -f "$GHOST_ROOT/start-ghost.sh" ]; then
  START_SCRIPT="$GHOST_ROOT/start-ghost.sh"
else
  START_SCRIPT="$GHOST_ROOT/scripts/start-service.sh"
fi

# --- Internal helpers --------------------------------------------------------

_port() {
  cat "$PORT_FILE" 2>/dev/null || true
}

_is_running() {
  local port
  port=$(_port)
  [ -n "$port" ] && curl -sf "http://localhost:${port}/health" >/dev/null 2>&1
}

_ensure_running() {
  if ! _is_running; then
    echo "Ghost: not running — starting (this takes ~30s)..." >&2
    bash "$START_SCRIPT" >&2
  fi
}

_api_url() {
  echo "http://localhost:$(_port)"
}

_get() {
  _ensure_running
  curl -sf "$(_api_url)$1"
}

_post() {
  _ensure_running
  local path="$1"; shift
  curl -sf -X POST "$(_api_url)${path}" -H 'Content-Type: application/json' -d "$1"
}

# --- Commands ----------------------------------------------------------------

cmd_health() {
  _ensure_running
  curl -sf "$(_api_url)/health" | jq .
}

cmd_start() {
  if _is_running; then
    echo "Ghost: already running on port $(_port)" >&2
  else
    bash "$START_SCRIPT"
  fi
}

cmd_navigate() {
  [ -z "${1:-}" ] && { echo "Usage: ghost navigate <url>" >&2; exit 1; }
  _post /navigate "{\"url\":\"$1\"}" | jq .
}

cmd_snapshot() {
  if [ "${1:-}" = "interactive" ]; then
    _get /snapshot/interactive | jq .
  else
    _get /snapshot
  fi
}

cmd_screenshot() {
  local out="${1:-screenshot.png}"
  _ensure_running
  curl -sf "$(_api_url)/screenshot" --output "$out"
  echo "Ghost: screenshot saved to $out" >&2
}

cmd_click() {
  [ -z "${1:-}" ] && { echo "Usage: ghost click <selector> [double]" >&2; exit 1; }
  local double="false"
  [ "${2:-}" = "double" ] && double="true"
  _post /click "{\"selector\":\"$1\",\"double\":$double}" | jq .
}

cmd_type() {
  [ -z "${2:-}" ] && { echo "Usage: ghost type <selector> <text>" >&2; exit 1; }
  _post /type "{\"selector\":\"$1\",\"text\":\"$2\"}" | jq .
}

cmd_fill() {
  [ -z "${2:-}" ] && { echo "Usage: ghost fill <selector> <text>" >&2; exit 1; }
  _post /fill "{\"selector\":\"$1\",\"text\":\"$2\"}" | jq .
}

cmd_hover() {
  [ -z "${1:-}" ] && { echo "Usage: ghost hover <selector>" >&2; exit 1; }
  _post /hover "{\"selector\":\"$1\"}" | jq .
}

cmd_scroll() {
  [ -z "${1:-}" ] && { echo "Usage: ghost scroll <y>" >&2; exit 1; }
  _post /scroll "{\"y\":$1}" | jq .
}

cmd_press() {
  [ -z "${1:-}" ] && { echo "Usage: ghost press <key>" >&2; exit 1; }
  _post /press "{\"key\":\"$1\"}" | jq .
}

cmd_wait() {
  [ -z "${1:-}" ] && { echo "Usage: ghost wait <selector> [timeout_ms]" >&2; exit 1; }
  local timeout="${2:-30000}"
  _post /wait "{\"selector\":\"$1\",\"timeout\":$timeout}" | jq .
}

cmd_highlight() {
  [ -z "${1:-}" ] && { echo "Usage: ghost highlight <selector>" >&2; exit 1; }
  _post /highlight "{\"selector\":\"$1\"}" | jq .
}

cmd_drag() {
  [ -z "${2:-}" ] && { echo "Usage: ghost drag <source> <target>" >&2; exit 1; }
  _post /drag "{\"source\":\"$1\",\"target\":\"$2\"}" | jq .
}

cmd_upload() {
  [ -z "${2:-}" ] && { echo "Usage: ghost upload <selector> <filePath>" >&2; exit 1; }
  _post /upload "{\"selector\":\"$1\",\"filePath\":\"$2\"}" | jq .
}

cmd_frame() {
  local sel="${1:-main}"
  _post /frame "{\"selector\":\"$sel\"}" | jq .
}

cmd_tabs() {
  _get /tabs | jq .
}

cmd_switch() {
  [ -z "${1:-}" ] && { echo "Usage: ghost switch <index>" >&2; exit 1; }
  _post /switch "{\"index\":$1}" | jq .
}

cmd_cookies() {
  _get /cookies | jq .
}

cmd_logs() {
  _get /logs
}

cmd_help() {
  cat >&2 <<'EOF'
Usage: ghost <command> [args]

Ghost Chrome auto-starts on first use. Port is managed automatically.

Commands:
  ghost health                         Check Ghost Chrome status
  ghost start                          Explicitly start Ghost Chrome

  ghost navigate <url>                 Navigate to URL (waits for network idle)
  ghost snapshot [interactive]         Page text, or interactive elements with @ref labels
  ghost screenshot [file.png]          Save screenshot (default: screenshot.png)

  ghost click <selector> [double]      Click (add 'double' for double-click)
  ghost type <selector> <text>         Type with human keystroke jitter
  ghost fill <selector> <text>         Clear field, then type
  ghost hover <selector>               Hover over element
  ghost scroll <y>                     Scroll by y pixels (negative = up)
  ghost press <key>                    Keyboard key press (e.g. Enter, Tab, Escape)
  ghost wait <selector> [timeout_ms]   Wait for element (default timeout: 30000ms)
  ghost highlight <selector>           Visually highlight an element
  ghost drag <source> <target>         Drag and drop between elements
  ghost upload <selector> <file>       Upload a file via input[type=file]
  ghost frame [selector|main]          Switch to iframe (or back to main frame)

  ghost tabs                           List open tabs
  ghost switch <index>                 Switch to tab by index
  ghost cookies                        List cookies
  ghost logs                           Show recent Chrome/Ghost logs

Selectors: CSS selectors or @ref labels from 'ghost snapshot interactive'.
EOF
}

# --- Dispatch ----------------------------------------------------------------

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  health)     cmd_health     "$@" ;;
  start)      cmd_start      "$@" ;;
  navigate)   cmd_navigate   "$@" ;;
  snapshot)   cmd_snapshot   "$@" ;;
  screenshot) cmd_screenshot "$@" ;;
  click)      cmd_click      "$@" ;;
  type)       cmd_type       "$@" ;;
  fill)       cmd_fill       "$@" ;;
  hover)      cmd_hover      "$@" ;;
  scroll)     cmd_scroll     "$@" ;;
  press)      cmd_press      "$@" ;;
  wait)       cmd_wait       "$@" ;;
  highlight)  cmd_highlight  "$@" ;;
  drag)       cmd_drag       "$@" ;;
  upload)     cmd_upload     "$@" ;;
  frame)      cmd_frame      "$@" ;;
  tabs)       cmd_tabs       "$@" ;;
  switch)     cmd_switch     "$@" ;;
  cookies)    cmd_cookies    "$@" ;;
  logs)       cmd_logs       "$@" ;;
  help|--help|-h) cmd_help  "$@" ;;
  *) echo "ghost: unknown command '$COMMAND'. Run 'ghost help'." >&2; exit 1 ;;
esac
