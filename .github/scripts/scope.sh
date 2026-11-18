#!/usr/bin/env bash
# Decides which package jobs run and writes one true/false flag per package.
#
# Usage: scope.sh <base-ref | full>
#
# A change that touches only apps/ and packages/ selects the changed packages and
# everything that depends on them, using pnpm's own dependency graph. Anything else
# runs every package: a change outside the packages, an empty diff, a missing base
# commit, or the word "full" (a run started by hand).
set -euo pipefail

base="${1:?usage: scope.sh <base-ref | full>}"
output="${GITHUB_OUTPUT:-/dev/stdout}"

write_flags() {
  local affected="$1" name flag
  for name in core content mobile; do
    flag=false
    if grep -qxF "@partnerpower/${name}" <<<"$affected"; then flag=true; fi
    echo "${name}=${flag}" >>"$output"
  done
}

run_everything() {
  echo "Full run: $1" >&2
  write_flags $'@partnerpower/core\n@partnerpower/content\n@partnerpower/mobile'
  exit 0
}

[ "$base" != full ] || run_everything "started by hand"
git rev-parse --verify --quiet "${base}^{commit}" >/dev/null || run_everything "no base commit to compare with"

changed="$(git diff --name-only "$base" HEAD)"
[ -n "$changed" ] || run_everything "empty diff"
if grep -qvE '^(apps|packages)/' <<<"$changed"; then
  run_everything "change outside apps/ and packages/"
fi

affected="$(pnpm --filter "...[${base}]" list --depth -1 --json | jq -r '.[].name')"
[ -n "$affected" ] || run_everything "no package matched the diff"

echo "Scoped run against ${base}, affected:" >&2
echo "$affected" >&2
write_flags "$affected"
