#!/usr/bin/env bash
# Local Pages dev server with a fake KV and a THROWAWAY test passcode (not the real one). Usage: serve.sh <port>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8788}"; D=/tmp/cftest-$PORT
rm -rf "$D" "/tmp/cftest-persist-$PORT"; "$HERE/../build.sh" "$D" >/dev/null
cd /workspace/cf-tools
exec ./node_modules/.bin/wrangler pages dev "$D" --port "$PORT" --compatibility-date=2026-05-01 --kv CONTENT --binding EDITOR_PASSCODE=local-test-passcode-0001 --persist-to "/tmp/cftest-persist-$PORT" --show-interactive-dev-session=false
