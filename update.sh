#!/usr/bin/env bash
set -euo pipefail

# ForLoop Plugin Updater
# https://github.com/forloop-cc/forloop-opencode-plugin-planner
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/update.sh | bash
#   bash update.sh --force --changelog
#   bash update.sh --dir ~/my-custom-install

# ── Colors ───────────────────────────────────────────────────────────────────
PLATFORM="$(uname -s)"
if [[ "$PLATFORM" =~ MINGW|MSYS|CYGWIN ]] && [ -z "$WT_SESSION" ] && [ -z "$ConEmuPID" ]; then
    RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
fi

# ── Configuration ────────────────────────────────────────────────────────────
PLUGIN_DIRNAME="forloop-planner"
GLOBAL_INSTALL_DIR="$HOME/.config/opencode/plugins/$PLUGIN_DIRNAME"
LOCAL_INSTALL_DIR=".opencode/plugins/$PLUGIN_DIRNAME"

PLUGIN_DIR=""
FORCE=false
SHOW_CHANGELOG=false

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1" >&2; }
print_step()    { echo -e "\n${CYAN}${BOLD}▶${NC} $1\n"; }

show_help() {
    cat << 'HELPEOF'
Usage: update.sh [OPTIONS]

Options:
  -d, --dir PATH     Update a specific install directory
  -f, --force        Pull even if already up to date
  -c, --changelog    Show recent changelog after update
  -h, --help         Show this help

Auto-detection order:
  1. --dir flag
  2. FORLOOP_PLUGIN_DIR env var
  3. ./.opencode/plugins/forloop-planner/
  4. ~/.config/opencode/plugins/forloop-planner/
HELPEOF
}

# ── Dependency checks ────────────────────────────────────────────────────────

check_git() {
    if ! command -v git &>/dev/null; then
        print_error "git is required but not installed"
        return 1
    fi
    return 0
}

check_node() {
    if ! command -v node &>/dev/null; then
        print_error "Node.js required but not found"
        return 1
    fi
    return 0
}

# ── Auto-detection ───────────────────────────────────────────────────────────

find_installation() {
    if [ -n "${FORLOOP_PLUGIN_DIR:-}" ] && [ -f "$FORLOOP_PLUGIN_DIR/plugins/forloop-plugin.ts" ]; then
        PLUGIN_DIR="$FORLOOP_PLUGIN_DIR"
        print_info "Found via FORLOOP_PLUGIN_DIR: $PLUGIN_DIR"
        return 0
    fi

    if [ -f "$LOCAL_INSTALL_DIR/node_modules/@forloop/opencode-plugin-planner/plugins/forloop-plugin.ts" ]; then
        PLUGIN_DIR="$LOCAL_INSTALL_DIR"
        print_info "Found local npm install: $PLUGIN_DIR"
        return 0
    fi

    if [ -f "$GLOBAL_INSTALL_DIR/node_modules/@forloop/opencode-plugin-planner/plugins/forloop-plugin.ts" ]; then
        PLUGIN_DIR="$GLOBAL_INSTALL_DIR"
        print_info "Found global npm install: $PLUGIN_DIR"
        return 0
    fi

    if [ -d "$LOCAL_INSTALL_DIR/.git" ]; then
        PLUGIN_DIR="$LOCAL_INSTALL_DIR"
        print_info "Found local install: $PLUGIN_DIR"
        return 0
    fi

    if [ -d "$GLOBAL_INSTALL_DIR/.git" ]; then
        PLUGIN_DIR="$GLOBAL_INSTALL_DIR"
        print_info "Found global install: $PLUGIN_DIR"
        return 0
    fi

    print_error "No ForLoop plugin installation found"
    echo ""
    echo "  Checked:"
    echo "    1. FORLOOP_PLUGIN_DIR env var"
    echo "    2. $LOCAL_INSTALL_DIR"
    echo "    3. $GLOBAL_INSTALL_DIR"
    echo ""
    echo "  Specify location: bash update.sh --dir <path>"
    echo "  Or install first:  curl -fsSL .../install.sh | bash"
    return 1
}

# ── Update logic ─────────────────────────────────────────────────────────────

update_via_git() {
    print_step "Checking for updates..."
    cd "$PLUGIN_DIR"

    local current
    current="$(git rev-parse --short HEAD)"

    local branch
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
        print_info "Switching from '$branch' to main"
        git checkout main 2>/dev/null || git checkout master 2>/dev/null || true
    fi

    if ! git fetch origin 2>&1; then
        print_error "Failed to fetch updates. Check your network connection."
        cd - > /dev/null
        return 1
    fi

    local remote
    remote="$(git rev-parse --short origin/main 2>/dev/null || git rev-parse --short origin/master 2>/dev/null)"

    if [ "$current" = "$remote" ] && [ "$FORCE" != true ]; then
        print_success "Already up to date ($current)"
        cd - > /dev/null
        return 0
    fi

    print_info "Updating: $current → $remote"
    git pull origin main 2>&1 || git pull origin master 2>&1

    print_step "Installing dependencies..."
    check_node || { print_error "Node.js is required to install dependencies"; cd - > /dev/null; return 1; }
    npm install --omit=dev
    print_success "Dependencies updated"

    local new_ver
    new_ver="$(git rev-parse --short HEAD)"
    print_success "Updated to: $new_ver"

    PLUGIN_PATH="$PLUGIN_DIR"
    cd - > /dev/null
}

update_via_npm() {
    print_step "Updating via npm..."
    cd "$PLUGIN_DIR"

    check_node || { print_error "Node.js is required to update via npm"; cd - > /dev/null; return 1; }
    npm update @forloop/opencode-plugin-planner

    local after
    after="$(npm list @forloop/opencode-plugin-planner --depth=0 2>/dev/null || echo 'updated')"

    print_success "$after"
    PLUGIN_PATH="$PLUGIN_DIR/node_modules/@forloop/opencode-plugin-planner"
    cd - > /dev/null
}

# ── Changelog ────────────────────────────────────────────────────────────────

show_recent_changelog() {
    local changelog="$PLUGIN_DIR/CHANGELOG.md"
    if [ -f "$changelog" ]; then
        echo ""
        print_info "Recent changes:"
        echo "────────────────────────────────────────────"
        head -40 "$changelog"
        echo "────────────────────────────────────────────"
    else
        print_warning "No CHANGELOG.md found"
    fi
}

# ── Verification ─────────────────────────────────────────────────────────────

verify_update() {
    local entry="${PLUGIN_PATH:-$PLUGIN_DIR}/plugins/forloop-plugin.ts"
    if [ -f "$entry" ]; then
        print_success "Plugin verified: $entry"
    else
        print_error "Update may have failed — entry point not found: $entry"
        exit 1
    fi
}

# ── Agent & skill symlinks ───────────────────────────────────────────────────

refresh_symlinks() {
    local plugin_path="${PLUGIN_PATH:-$PLUGIN_DIR}"
    local abs_plugin_path
    abs_plugin_path="$(cd "$plugin_path" 2>/dev/null && pwd)" || abs_plugin_path="$plugin_path"

    local config_dir

    if [[ "$abs_plugin_path" == "$HOME/.config/opencode"* ]]; then
        config_dir="$HOME/.config/opencode"
    else
        config_dir="$(cd "$PLUGIN_DIR/../.." 2>/dev/null && pwd)/.opencode"
    fi

    print_step "Refreshing agent and skill links..."

    # Plugin entry
    mkdir -p "$config_dir/plugins"
    ln -sf "$abs_plugin_path/plugins/forloop-plugin.ts" "$config_dir/plugins/forloop-plugin.ts" 2>/dev/null || true

    # Agents
    local agents_dir="$config_dir/agents"
    mkdir -p "$agents_dir"
    for agent_file in "$abs_plugin_path/agents/"*.md; do
        [ -f "$agent_file" ] || continue
        local agent_name
        agent_name="$(basename "$agent_file")"
        ln -sf "$agent_file" "$agents_dir/$agent_name"
        print_success "Agent linked: $agent_name"
    done

    # Skills
    local skills_dir="$config_dir/skills"
    mkdir -p "$skills_dir"
    for skill_dir in "$abs_plugin_path/skills/"*/; do
        [ -d "$skill_dir" ] || continue
        local skill_name
        skill_name="$(basename "$skill_dir")"
        ln -sfn "$skill_dir" "$skills_dir/$skill_name"
        print_success "Skill linked: $skill_name"
    done
}

# ── Cleanup trap ─────────────────────────────────────────────────────────────

cleanup() {
    if [ -n "${PLUGIN_DIR:-}" ] && [ -d "$PLUGIN_DIR" ] && [ -n "${_update_in_progress:-}" ]; then
        print_warning "Update interrupted"
    fi
}
trap cleanup EXIT INT TERM

# ── Main ─────────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir)
            [ -z "${2:-}" ] && { print_error "--dir requires a path"; exit 1; }
            PLUGIN_DIR="$2"; shift 2 ;;
        -f|--force)     FORCE=true; shift ;;
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

if [ -z "$PLUGIN_DIR" ]; then
    find_installation || exit 1
fi

if [ ! -d "$PLUGIN_DIR" ]; then
    print_error "Plugin directory not found: $PLUGIN_DIR"
    exit 1
fi

_update_in_progress=true

if [ -d "$PLUGIN_DIR/.git" ]; then
    check_git || exit 1
    update_via_git
elif [ -f "$PLUGIN_DIR/package.json" ]; then
    update_via_npm
else
    print_error "Not a valid ForLoop plugin installation: $PLUGIN_DIR"
    exit 1
fi

if [ "$SHOW_CHANGELOG" = true ]; then
    show_recent_changelog
fi

verify_update
refresh_symlinks
_update_in_progress=""

echo ""
print_success "Update complete!"
echo "  Location: $PLUGIN_DIR"
echo ""
