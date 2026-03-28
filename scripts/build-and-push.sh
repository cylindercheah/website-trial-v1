#!/usr/bin/env bash
# website-trial-v1: Vite + React + plotly.js-dist-min → GitHub Pages at /website-trial-v1/
#
# Runs npm ci|install, optional TypeScript check, production npm run build
# (generate:data from data/*.json → src/data/generatedDesignRows.ts, then vite build),
# dist verification,
# then git commit + push.
#
# Usage:
#   ./scripts/build-and-push.sh
#   ./scripts/build-and-push.sh "fix: Plotly dist bundle"
#   ./scripts/build-and-push.sh --help
#
# Requires: git, npm. Expects package.json + src/ in the repo root (parent of scripts/).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: ./scripts/build-and-push.sh [OPTIONS] [COMMIT_MESSAGE]

  Steps:
    [deps]     npm ci if package-lock.json exists, else npm install
               (unless --skip-install or --use-install)
    [typecheck] optional: npx tsc --noEmit (--typecheck)
    [build]    rm -rf dist first if --clean-dist; NODE_ENV=production npm run build
               (includes JSON→TS generate:data before Vite)
    [verify]   dist/index.html exists and has GitHub Pages asset paths (unless --no-verify)
    [git]      git add -A, commit if dirty, git push (unless --no-push)

Arguments:
  COMMIT_MESSAGE   Optional one-line commit message (quote if it contains spaces).

Options:
  -h, --help         Show this help.
  -n, --dry-run      Print commands only; do not run install, build, verify, git.
  --skip-install     Skip npm ci / npm install.
  --use-install      Always run npm install (updates lockfile); ignore npm ci even if lock exists.
  --clean-dist       Remove dist/ before build (fresh Vite output).
  --typecheck        Run npx tsc --noEmit before vite build.
  --no-verify        Skip dist/ sanity checks after build.
  --no-push          Build, verify, commit only; do not git push.
  -v, --verbose      Shell trace (set -x).

Environment:
  GIT_PUSH_EXTRA_ARGS   Extra args for git push (e.g. --dry-run, --force-with-lease).
  GH_PAGES_BASE         Subpath segment for dist check (default: website-trial-v1).
                         Must match vite.config.ts production base, without slashes.

If npm ci fails with "package.json and package-lock.json ... not in sync", run once:
  ./scripts/build-and-push.sh --use-install
(or: npm install at repo root) then commit the updated package-lock.json.

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
  COMMIT_MSG="chore: site build $(date -u +%Y-%m-%dT%H:%M:%SZ)"
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

if [[ ! -f "$REPO_ROOT/package.json" ]] || [[ ! -d "$REPO_ROOT/src" ]]; then
  die "Vite app root not found at $REPO_ROOT (expected package.json and src/)"
fi

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree &>/dev/null; then
  die "not a git work tree containing $REPO_ROOT"
fi

GIT_TOPLEVEL="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"

verify_dist() {
  local idx="$REPO_ROOT/dist/index.html"
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

echo "==> app root: $REPO_ROOT"
echo "==> git root: $GIT_TOPLEVEL"
echo "==> Pages base check: /${GH_PAGES_BASE}/"

cd "$REPO_ROOT"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> [deps] npm (ci or install)"
  if [[ "$USE_INSTALL" -eq 1 ]]; then
    run npm install
  elif [[ -f "$REPO_ROOT/package-lock.json" ]]; then
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
    echo "DRY-RUN: rm -rf $REPO_ROOT/dist"
  else
    rm -rf "$REPO_ROOT/dist"
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
