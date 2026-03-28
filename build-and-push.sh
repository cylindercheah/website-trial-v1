#!/usr/bin/env bash
# chart-eval: Vite + React + plotly.js-dist-min + ECharts → GitHub Pages at /website-trial-v1/
#
# Runs npm ci|install, optional TypeScript check, production vite build, dist verification,
# then git commit + push.
#
# Usage:
#   ./build-and-push.sh
#   ./build-and-push.sh "fix: Plotly dist bundle"
#   ./build-and-push.sh --help
#
# Requires: git, npm. Script lives next to chart-eval/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_EVAL="$SCRIPT_DIR/chart-eval"

usage() {
  cat <<'EOF'
Usage: ./build-and-push.sh [OPTIONS] [COMMIT_MESSAGE]

  Steps:
    [deps]     npm ci if chart-eval/package-lock.json exists, else npm install
               (unless --skip-install or --use-install)
    [typecheck] optional: npx tsc --noEmit (--typecheck)
    [build]    rm -rf dist first if --clean-dist; NODE_ENV=production npm run build
    [verify]   dist/index.html exists and has GitHub Pages asset paths (unless --no-verify)
    [git]      git add -A, commit if dirty, git push (unless --no-push)

Arguments:
  COMMIT_MESSAGE   Optional one-line commit message (quote if it contains spaces).

Options:
  -h, --help         Show this help.
  -n, --dry-run      Print commands only; do not run install, build, verify, git.
  --skip-install     Skip npm ci / npm install.
  --use-install      Always run npm install (updates lockfile); ignore npm ci even if lock exists.
  --clean-dist       Remove chart-eval/dist before build (fresh Vite output).
  --typecheck        Run npx tsc --noEmit in chart-eval/ before vite build.
  --no-verify        Skip dist/ sanity checks after build.
  --no-push          Build, verify, commit only; do not git push.
  -v, --verbose      Shell trace (set -x).

Environment:
  GIT_PUSH_EXTRA_ARGS   Extra args for git push (e.g. --dry-run, --force-with-lease).
  GH_PAGES_BASE         Subpath segment for dist check (default: website-trial-v1).
                         Must match vite.config.ts production base, without slashes.

EOF
}

DRY_RUN=0
SKIP_INSTALL=0
USE_INSTALL=0
CLEAN_DIST=0
TYPECHECK=0
NO_VERIFY=0
NO_PUSH=0
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
    --use-install)
      USE_INSTALL=1
      shift
      ;;
    --clean-dist)
      CLEAN_DIST=1
      shift
      ;;
    --typecheck)
      TYPECHECK=1
      shift
      ;;
    --no-verify)
      NO_VERIFY=1
      shift
      ;;
    --no-push)
      NO_PUSH=1
      shift
      ;;
    -v | --verbose)
      set -x
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

GH_PAGES_BASE="${GH_PAGES_BASE:-website-trial-v1}"

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY-RUN:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

die() {
  echo "error: $*" >&2
  exit 1
}

if [[ ! -d "$CHART_EVAL" ]]; then
  die "chart-eval directory not found at $CHART_EVAL"
fi

if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  die "not a git work tree containing $SCRIPT_DIR"
fi

GIT_TOPLEVEL="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

verify_dist() {
  local idx="$CHART_EVAL/dist/index.html"
  [[ -f "$idx" ]] || die "missing $idx — build did not produce dist/"
  if grep -q 'src="/src/' "$idx" 2>/dev/null; then
    die "dist/index.html still references dev entry /src/ — production build misconfigured"
  fi
  local needle="/${GH_PAGES_BASE}/assets/"
  if ! grep -qF "$needle" "$idx" 2>/dev/null && ! grep -qE '\./assets/' "$idx" 2>/dev/null; then
    die "dist/index.html missing asset script (expected ${needle} or ./assets/) — check vite.config.ts base vs GH_PAGES_BASE=$GH_PAGES_BASE"
  fi
  echo "  dist OK: $(wc -l <"$idx" | tr -d ' ') lines in index.html, ${needle} or ./assets/ present."
}

echo "==> chart-eval: $CHART_EVAL"
echo "==> git root:   $GIT_TOPLEVEL"
echo "==> Pages base check: /${GH_PAGES_BASE}/"

cd "$CHART_EVAL"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> [deps] npm (ci or install)"
  if [[ "$USE_INSTALL" -eq 1 ]]; then
    run npm install
  elif [[ -f "$CHART_EVAL/package-lock.json" ]]; then
    run npm ci
  else
    run npm install
  fi
else
  echo "==> [deps] skipped (--skip-install)"
fi

if [[ "$TYPECHECK" -eq 1 ]]; then
  echo "==> [typecheck] npx tsc --noEmit"
  run npx tsc --noEmit
fi

if [[ "$CLEAN_DIST" -eq 1 ]]; then
  echo "==> [clean] rm -rf dist"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: rm -rf $CHART_EVAL/dist"
  else
    rm -rf "$CHART_EVAL/dist"
  fi
fi

echo "==> [build] NODE_ENV=production npm run build"
run env NODE_ENV=production npm run build

if [[ "$NO_VERIFY" -eq 0 ]]; then
  echo "==> [verify] dist/ vs GitHub Pages"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: verify_dist"
  else
    verify_dist
  fi
else
  echo "==> [verify] skipped (--no-verify)"
fi

cd "$GIT_TOPLEVEL"
echo "==> [git] add, commit, push"
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

if [[ "$NO_PUSH" -eq 1 ]]; then
  echo "Done: pipeline OK; push skipped (--no-push)."
  exit 0
fi

# shellcheck disable=SC2086
git push ${GIT_PUSH_EXTRA_ARGS:-}

echo "Done: pipeline OK, push sent to origin."
