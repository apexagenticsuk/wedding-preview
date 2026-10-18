#!/usr/bin/env bash
# Local Pages dev server WITH the enquiry settings, against a stub sender and Cloudflare's official Turnstile TEST keys (always pass / always fail).
# Usage: serve-enquiry.sh <port> <stub-port> <pass|fail>   (throwaway values only; no real key, no real email)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8801}"; STUB="${2:-9871}"; KIND="${3:-pass}"
D=/tmp/cftest-$PORT
rm -rf "$D" "/tmp/cftest-persist-$PORT"; "$HERE/../build.sh" "$D" >/dev/null
SECRET=1x0000000000000000000000000000000AA; [ "$KIND" = fail ] && SECRET=2x0000000000000000000000000000000AA
cd /workspace/cf-tools
exec ./node_modules/.bin/wrangler pages dev "$D" --port "$PORT" --inspector-port $((PORT+1000)) --compatibility-date=2026-05-01 --kv CONTENT --binding EDITOR_PASSCODE=local-test-passcode-0001 --binding RESEND_API_KEY=re_local_stub_key_000000 --binding TURNSTILE_SECRET=$SECRET --binding TURNSTILE_SITEKEY=1x00000000000000000000AA --binding ENQUIRY_FROM=enquiries@send.example.test --binding RESEND_API_URL=http://127.0.0.1:$STUB/emails --persist-to "/tmp/cftest-persist-$PORT" --show-interactive-dev-session=false
