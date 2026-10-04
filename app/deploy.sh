#!/bin/sh
# Deploy app/ to Cloudflare Pages from a clean copy. Never deploy app/ itself:
# a stray dotfile (.dev.vars holds Pages secrets for local dev) would be served
# publicly. This copies everything except dotfiles, then deploys the copy.
set -e
cd "$(dirname "$0")/.."
set -a; . ./.env.shared; set +a
OUT="$(mktemp -d)"
rsync -a --exclude='.*' app/ "$OUT"/
if find "$OUT" -name '.*' | grep -q .; then echo "dotfile in deploy copy, stopping"; exit 1; fi
cd "$OUT" && npx wrangler pages deploy . --project-name baari --branch main --commit-dirty=true
rm -rf "$OUT"
