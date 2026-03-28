#!/usr/bin/env bash
# Chart eval demo — npm wrapper. Run from repo root or from this directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
  cat <<'EOF'
Usage: ./run.sh <command>

  install   npm install
  dev       npm run dev  (listen on all interfaces — use Network URL from Vite for phone)
  build     npm run build  (output in ./dist)
  preview   npm run preview  (serve ./dist after build; open the URL printed)

In the browser, use hash routes:
  http://127.0.0.1:5173/#/
  http://127.0.0.1:5173/#/plotly
  http://127.0.0.1:5173/#/echarts

EOF
}

cmd="${1:-}"
case "$cmd" in
  install)
    npm install
    ;;
  dev)
    npm run dev
    ;;
  build)
    npm run build
    ;;
  preview)
    npm run preview
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
