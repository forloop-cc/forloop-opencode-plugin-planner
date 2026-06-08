#!/usr/bin/env bash
set -euo pipefail

# ForLoop Plugin Updater
# https://github.com/forloop-cc/forloop-opencode-plugin-planner
#
# opencode auto-updates plugins on startup. This script verifies the plugin
# is registered and shows the latest changelog.
#
# Usage:
#   bash update.sh
#   bash update.sh --changelog

# ── Colors ───────────────────────────────────────────────────────────────────
PLATFORM="$(uname -s)"
if [[ "$PLATFORM" =~ MINGW|MSYS|CYGWIN ]] && [ -z "$WT_SESSION" ] && [ -z "$ConEmuPID" ]; then
    RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
fi

# ── Configuration ────────────────────────────────────────────────────────────
NPM_PACKAGE="@forloop-cc/forloop-opencode-plugin-planner"
GIT_URL="forloop-planner@git+https://github.com/forloop-cc/forloop-opencode-plugin-planner.git"
PLUGIN_DIRNAME="forloop-planner"

SHOW_CHANGELOG=false

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1" >&2; }

show_help() {
    cat << 'HELPEOF'
Usage: update.sh [OPTIONS]

opencode auto-updates plugins from git/npm on startup. This script:
  - Verifies the plugin is registered in opencode.json
  - Shows the latest changelog from the plugin source

Options:
  -c, --changelog  Show recent changelog after verification
  -h, --help       Show this help

Auto-detection order:
  1. ./opencode.json (project config)
  2. ~/.config/opencode/opencode.json (global config)
HELPEOF
}

# ── Dependency checks ────────────────────────────────────────────────────────

check_jq() {
    if ! command -v jq &>/dev/null; then
        print_error "jq is required but not installed"
        return 1
    fi
    return 0
}

# ── Config lookup ────────────────────────────────────────────────────────────

find_config() {
    local candidates=("./opencode.json" "$HOME/.config/opencode/opencode.json")
    for config in "${candidates[@]}"; do
        if [ -f "$config" ]; then
            echo "$config"
            return 0
        fi
    done
    return 1
}

find_plugin_entry() {
    local config_file="$1"
    jq -r '.plugin[]? // empty' "$config_file" | grep -E "forloop-opencode-plugin-planner|$NPM_PACKAGE" | head -1
}

# ── Changelog ────────────────────────────────────────────────────────────────

show_changelog_from_repo() {
    local changelog_url="https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/CHANGELOG.md"
    echo ""
    print_info "Recent changes:"
    echo "────────────────────────────────────────────"
    curl -fsSL "$changelog_url" 2>/dev/null | head -40 || {
        echo "  (could not fetch changelog — check https://github.com/forloop-cc/forloop-opencode-plugin-planner/releases)"
    }
    echo "────────────────────────────────────────────"
}

show_changelog_from_cache() {
    local cache_dir="$HOME/.cache/opencode/node_modules"
    local plugin_paths=(
        "$cache_dir/$NPM_PACKAGE/CHANGELOG.md"
        "$cache_dir/$NPM_PACKAGE/plugins/forloop-plugin.ts"
    )
    for candidate in "${plugin_paths[@]}"; do
        local changelog="$(dirname "$candidate")/CHANGELOG.md"
        if [ -f "$changelog" ]; then
            echo ""
            print_info "Recent changes:"
            echo "────────────────────────────────────────────"
            head -40 "$changelog"
            echo "────────────────────────────────────────────"
            return 0
        fi
    done
    return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--changelog) SHOW_CHANGELOG=true; shift ;;
        -h|--help)      show_help; exit 0 ;;
        *)              print_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════╗"
echo -e "║       ForLoop Plugin Updater             ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""

check_jq || exit 1

config_file="$(find_config)" || {
    print_error "No opencode.json found"
    echo ""
    echo "  Checked:"
    echo "    1. ./opencode.json"
    echo "    2. ~/.config/opencode/opencode.json"
    echo ""
    echo "  Install first: curl -fsSL .../install.sh | bash"
    exit 1
}

plugin_entry="$(find_plugin_entry "$config_file")"

if [ -z "$plugin_entry" ]; then
    print_error "ForLoop plugin not registered in $config_file"
    echo ""
    echo "  Install first: curl -fsSL .../install.sh | bash"
    exit 1
fi

print_success "Plugin registered in: $config_file"
print_info "Entry: $plugin_entry"
echo ""

# Detect source type
if echo "$plugin_entry" | grep -q "git+https://"; then
    print_info "Source: Git (opencode will pull latest on startup)"
elif echo "$plugin_entry" | grep -q "@forloop-cc/"; then
    print_info "Source: npm (opencode will check for updates on startup)"
fi

echo ""
print_success "To update: restart opencode — it auto-fetches the latest plugin version"

if [ "$SHOW_CHANGELOG" = true ]; then
    show_changelog_from_cache || show_changelog_from_repo
fi

echo ""
