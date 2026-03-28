#!/usr/bin/env bash
# Build chart-eval (Vite), then commit any repo changes and push to origin.
# Usage:
#   ./build-and-push.sh
#   ./build-and-push.sh "docs: refresh chart demo"
#   ./build-and-push.sh --help
#
# Requires: git, npm. Run from anywhere; script resolves the repo root automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Build always uses chart-eval/ next to this script.
CHART_EVAL="$SCRIPT_DIR/chart-eval"

usage() {
  cat <<'EOF'
Usage: ./build-and-push.sh [OPTIONS] [COMMIT_MESSAGE]

  Runs npm install + npm run build in chart-eval/, then stages all changes,
  commits if the working tree is dirty, and git push.

Arguments:
  COMMIT_MESSAGE   Optional one-line commit message (quote if it contains spaces).

Options:
  -h, --help       Show this help.
  -n, --dry-run    Print commands only; do not install, build, commit, or push.
  --skip-install   Run build only (skip npm install; use when deps are already installed).

Environment:
  GIT_PUSH_EXTRA_ARGS   Extra args for the final git push (e.g. --force-with-lease).

EOF
}

DRY_RUN=0
SKIP_INSTALL=0
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    -n | --dry-run)
      DRY_RUN=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      COMMIT_MSG="$1"
      shift
      ;;
  esac
done

if [[ -z "$COMMIT_MSG" ]]; then
  COMMIT_MSG="chore: chart-eval build $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

if [[ ! -d "$CHART_EVAL" ]]; then
  echo "error: chart-eval directory not found at $CHART_EVAL" >&2
  exit 1
fi

if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  echo "error: not a git work tree containing $SCRIPT_DIR" >&2
  exit 1
fi

GIT_TOPLEVEL="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

cd "$CHART_EVAL"
if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  run npm install
fi
run npm run build

cd "$GIT_TOPLEVEL"
run git add -A

if [[ "$DRY_RUN" -eq 1 ]]; then
  run git status --short
  run git commit -m "$COMMIT_MSG"
  # shellcheck disable=SC2086
  run git push ${GIT_PUSH_EXTRA_ARGS:-}
  echo "Dry run finished."
  exit 0
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No local changes to commit (dist/ is gitignored; only source/lock updates are committed)."
else
  git commit -m "$COMMIT_MSG"
fi

# shellcheck disable=SC2086
git push ${GIT_PUSH_EXTRA_ARGS:-}

echo "Done: build OK, push sent to origin."
