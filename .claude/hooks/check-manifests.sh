#!/usr/bin/env bash
# PostToolUse guard for the two things CI here does not catch:
#   1. A SKILL.md whose frontmatter `name` is missing or does not match its
#      directory. `claude plugin validate --strict` passes both.
#   2. Version drift between plugins/<n>/.claude-plugin/plugin.json and that
#      plugin's entry in .claude-plugin/marketplace.json. plugin.json wins at
#      install time, so drift ships the wrong version silently.
# Reads the hook payload on stdin. Uses jq only. Never blocks.
set -u

payload=$(cat)
f=$(printf '%s' "$payload" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$f" ] && [ -f "$f" ] || exit 0

msg=""

case "$f" in
  */SKILL.md)
    dir=$(basename "$(dirname "$f")")
    name=$(sed -n '/^---$/,/^---$/{s/^name:[[:space:]]*//p;}' "$f" | head -1 | tr -d '"' | xargs)
    if [ -z "$name" ]; then
      msg="$f has no frontmatter 'name'. Nothing in CI catches this."
    elif [ "$name" != "$dir" ]; then
      msg="$f declares name '$name' but its directory is '$dir'. They must be identical."
    fi
    ;;

  */.claude-plugin/plugin.json|*/.claude-plugin/marketplace.json)
    if ! jq -e . "$f" >/dev/null 2>&1; then
      msg="$f is not valid JSON."
    else
      root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null || true)
      mk="$root/.claude-plugin/marketplace.json"
      if [ -n "$root" ] && [ -f "$mk" ] && jq -e . "$mk" >/dev/null 2>&1; then
        for pj in "$root"/plugins/*/.claude-plugin/plugin.json; do
          [ -f "$pj" ] || continue
          jq -e . "$pj" >/dev/null 2>&1 || continue
          pname=$(jq -r '.name // empty' "$pj")
          pver=$(jq -r '.version // empty' "$pj")
          mver=$(jq -r --arg n "$pname" '.plugins[]? | select(.name == $n) | .version // empty' "$mk")
          if [ -n "$pname" ] && [ -n "$mver" ] && [ "$pver" != "$mver" ]; then
            msg="version drift: '$pname' is $pver in plugin.json but $mver in marketplace.json. Fix with: node scripts/version.mjs $pname <step>"
            break
          fi
        done
      fi
    fi
    ;;
esac

[ -n "$msg" ] || exit 0
jq -n --arg m "$msg" '{systemMessage: $m, hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
