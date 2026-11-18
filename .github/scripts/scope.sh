#!/usr/bin/env bash
# Decides which package jobs run and writes one true/false flag per package.
#
# Usage: scope.sh <base-ref | full>
#
# A change that touches only apps/ and packages/ selects the changed packages and
# everything that depends on them, using pnpm's own dependency graph. Anything else
# runs every package: a change outside the packages, an empty diff, a missing base
# commit, or the word "full" (a run started by hand).
#
# When adding a package, add a job for it in ci.yml and add its name to known_packages
# below. A workspace package without a job makes this script fail, so it cannot pass
# CI unchecked.
set -euo pipefail

known_packages=(core content tokens mobile)
scope="@getfreak"

base="${1:?usage: scope.sh <base-ref | full>}"
output="${GITHUB_OUTPUT:-/dev/stdout}"
root="$(git rev-parse --show-toplevel)"

# Reads `pnpm list --json` on stdin and prints the package names, leaving out the root package.
package_names() {
  jq -r --arg root "$root" '.[] | select(.path != $root) | .name'
}

fail_on_unknown_packages() {
  local names="$1" name known unknown=()
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    known=false
    for package in "${known_packages[@]}"; do
      if [ "$name" = "${scope}/${package}" ]; then known=true; fi
    done
    if [ "$known" = false ]; then unknown+=("$name"); fi
  done <<<"$names"
  if [ "${#unknown[@]}" -gt 0 ]; then
    echo "::error::No CI job for workspace package(s): ${unknown[*]}. Add a job in ci.yml and list the package in .github/scripts/scope.sh." >&2
    exit 1
  fi
}

write_flags() {
  local affected="$1" package flag
  fail_on_unknown_packages "$affected"
  for package in "${known_packages[@]}"; do
    flag=false
    if grep -qxF "${scope}/${package}" <<<"$affected"; then flag=true; fi
    echo "${package}=${flag}" >>"$output"
  done
}

run_everything() {
  echo "Full run: $1" >&2
  local all
  all="$(pnpm -r list --depth -1 --json | package_names)"
  if [ -z "$all" ]; then
    echo "::error::pnpm listed no workspace packages." >&2
    exit 1
  fi
  write_flags "$all"
  exit 0
}

[ "$base" != full ] || run_everything "started by hand"
git rev-parse --verify --quiet "${base}^{commit}" >/dev/null || run_everything "no base commit to compare with"

changed="$(git diff --name-only "$base" HEAD)"
[ -n "$changed" ] || run_everything "empty diff"
if grep -qvE '^(apps|packages)/' <<<"$changed"; then
  run_everything "change outside apps/ and packages/"
fi

affected="$(pnpm --filter "...[${base}]" list --depth -1 --json | package_names)"
[ -n "$affected" ] || run_everything "no package matched the diff"

echo "Scoped run against ${base}, affected:" >&2
echo "$affected" >&2
write_flags "$affected"
