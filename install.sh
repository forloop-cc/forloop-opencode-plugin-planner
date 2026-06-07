#!/usr/bin/env bash
set -euo pipefail

# ForLoop Plugin Installer
# https://github.com/forloop-cc/forloop-opencode-plugin-planner
#
# Adds the plugin to opencode.json. opencode handles downloading/caching.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/install.sh | bash
#   curl -fsSL ... | bash -s -- --global
#   bash install.sh --global --npm     # Install via npm package
#   bash install.sh --local            # Install for current project only

# ── Platform & colors ────────────────────────────────────────────────────────
PLATFORM="$(uname -s)"
case "$PLATFORM" in
    Darwin*)    PLATFORM_LABEL="macOS";;
    Linux*)     PLATFORM_LABEL="Linux";;
    CYGWIN*|MINGW*|MSYS*) PLATFORM_LABEL="Windows";;
    *)          PLATFORM_LABEL="Unknown";;
esac

if [ "$PLATFORM_LABEL" = "Windows" ] && [ -z "$WT_SESSION" ] && [ -z "$ConEmuPID" ]; then
    RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
fi

# ── Configuration ────────────────────────────────────────────────────────────
NPM_PACKAGE="@forloop-cc/forloop-opencode-plugin-planner"
GIT_URL="forloop-planner@git+https://github.com/forloop-cc/forloop-opencode-plugin-planner.git"
AGENTS_SKILLS_REPO="https://github.com/forloop-cc/forloop-agents-skills.git"
AGENTS_SKILLS_DIR="$HOME/.config/forloop/agents-skills"

INSTALL_TYPE=""      # global | local
USE_NPM=false
SKIP_AGENTS=false
NON_INTERACTIVE=false
PROJECT_ROOT="$(pwd)"

print_header() { echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════╗\n║       ForLoop Plugin Installer           ║\n╚══════════════════════════════════════════╝${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1" >&2; }
print_step()    { echo -e "\n${CYAN}${BOLD}▶${NC} $1\n"; }

show_help() {
    cat << 'HELPEOF'
Usage: install.sh [OPTIONS]

Adds the ForLoop Plugin to your opencode configuration. opencode handles
downloading and caching the plugin on next startup. Also installs agents
and skills from forloop-agents-skills.

Options:
  -g, --global       Install globally (~/.config/opencode/opencode.json)
  -l, --local        Install for current project only (./opencode.json)
  -n, --npm          Use npm package (default: git URL from GitHub)
  --skip-agents      Skip installing agents and skills
  -h, --help         Show this help

Examples:
  curl -fsSL .../install.sh | bash              # Interactive (local by default)
  curl -fsSL .../install.sh | bash -s -- -g     # Global, non-interactive
  bash install.sh --global --npm                # Global via npm package
HELPEOF
}

# ── Dependency checks ────────────────────────────────────────────────────────

check_jq() {
    if ! command -v jq &>/dev/null; then
        print_error "jq is required for config merging"
        case "$PLATFORM_LABEL" in
            macOS)   echo "  brew install jq" ;;
            Linux)   echo "  sudo apt-get install jq  (Ubuntu/Debian)"
                     echo "  sudo dnf install jq      (Fedora/RHEL)" ;;
            Windows) echo "  scoop install jq  or https://stedolan.github.io/jq/download/" ;;
        esac
        return 1
    fi
    return 0
}

check_opencode() {
    if command -v opencode &>/dev/null; then
        print_success "opencode found: $(which opencode)"
    else
        print_warning "opencode CLI not found"
        echo "  Install: curl -fsSL https://opencode.ai/install.sh | bash"
        if [ "$NON_INTERACTIVE" != true ]; then
            read -p "Continue anyway? [y/N] " -r; echo
            [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
        fi
    fi
}

check_all_deps() {
    print_step "Checking dependencies..."
    check_jq || exit 1
    check_opencode
}

# ── Install location ─────────────────────────────────────────────────────────

get_config_file() {
    if [ "$INSTALL_TYPE" = "global" ]; then
        mkdir -p "$HOME/.config/opencode"
        echo "$HOME/.config/opencode/opencode.json"
    else
        echo "$PROJECT_ROOT/opencode.json"
    fi
}

# ── Plugin entry selection ───────────────────────────────────────────────────

get_plugin_entry() {
    if [ "$USE_NPM" = true ]; then
        echo "$NPM_PACKAGE"
    else
        echo "$GIT_URL"
    fi
}

# ── Config merging ───────────────────────────────────────────────────────────

merge_plugin_into_config() {
    local config_file
    config_file="$(get_config_file)"
    local plugin_entry
    plugin_entry="$(get_plugin_entry)"

    print_step "Updating opencode configuration..."

    if [ ! -f "$config_file" ]; then
        echo "{}" > "$config_file"
    fi

    local backup="${config_file}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$config_file" "$backup"

    local tmp
    tmp="$(mktemp)"

    jq --arg p "$plugin_entry" '
        if .plugin then
            .plugin += [$p] | .plugin |= unique
        else
            . + {"plugin": [$p]}
        end
    ' "$config_file" > "$tmp"

    if [ -s "$tmp" ]; then
        mv "$tmp" "$config_file"
        print_success "Plugin registered in: $config_file"
        print_info "Backup saved: $backup"
    else
        print_error "Config merge produced empty file — restoring backup"
        mv "$backup" "$config_file"
        rm -f "$tmp"
        exit 1
    fi
}

# ── Agents & skills setup ────────────────────────────────────────────────────

setup_agents_skills() {
    print_step "Setting up agents and skills..."

    if [ ! -d "$AGENTS_SKILLS_DIR" ]; then
        print_info "Cloning forloop-agents-skills..."
        if ! git clone --depth 1 "https://github.com/forloop-cc/forloop-agents-skills.git" "$AGENTS_SKILLS_DIR" 2>&1; then
            print_warning "Could not clone agents-skills repo (may not be public yet)"
            return
        fi
    else
        print_info "Updating forloop-agents-skills..."
        cd "$AGENTS_SKILLS_DIR" && git pull origin main 2>/dev/null && cd - > /dev/null || true
    fi

    local config_dir
    if [ "$INSTALL_TYPE" = "global" ]; then
        config_dir="$HOME/.config/opencode"
    else
        config_dir="$PROJECT_ROOT/.opencode"
    fi

    local agents_dir="$config_dir/agents"
    local skills_dir="$config_dir/skills"
    mkdir -p "$agents_dir" "$skills_dir"

    for agent_file in "$AGENTS_SKILLS_DIR/agents/"*.md; do
        [ -f "$agent_file" ] || continue
        local name
        name="$(basename "$agent_file")"
        ln -sf "$agent_file" "$agents_dir/$name"
        print_success "Agent linked: $name"
    done

    for skill_dir in "$AGENTS_SKILLS_DIR/skills/"*/; do
        [ -d "$skill_dir" ] || continue
        local name
        name="$(basename "$skill_dir")"
        ln -sfn "$skill_dir" "$skills_dir/$name"
        print_success "Skill linked: $name"
    done
}

# ── Token setup ──────────────────────────────────────────────────────────────

setup_token() {
    echo ""
    print_step "Setting up API token..."
    echo "  Create a token at: https://forloop.cc/profile?tab=api-tokens"
    echo "  Scopes needed: sprint:read, sprint:write, story:read, story:write, agent:query, profile:read"
    echo ""

    if [ "$NON_INTERACTIVE" = true ]; then
        print_info "Non-interactive mode — set your token later:"
        echo "  Start opencode, switch to the ForLoop Planner agent, and say 'set my API token'"
        return
    fi

    read -p "Have you created a token? [y/N] " -r; echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Set it later: start opencode, switch to the ForLoop Planner agent, and say 'set my API token'"
        return
    fi

    local TOKEN
    read -p "Enter your token: " -s TOKEN; echo
    if [ -z "$TOKEN" ]; then
        print_info "No token entered, skipping"
        return
    fi

    local token_dir="$HOME/.config/forloop"
    mkdir -p "$token_dir"
    jq -n --arg token "$TOKEN" --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" '
      {version: "1.0", note: "ForLoop API tokens — do not share", default: $token, lastUpdated: $ts}
    ' > "$token_dir/tokens.json"
    chmod 600 "$token_dir/tokens.json"
    print_success "Token saved to: $token_dir/tokens.json"
}

# ── Summary ──────────────────────────────────────────────────────────────────

show_summary() {
    local entry
    entry="$(get_plugin_entry)"
    echo ""
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo ""
    echo "  Type:   $INSTALL_TYPE"
    echo "  Source: $entry"
    echo ""
    echo "  Next steps:"
    echo "    1. Start opencode:  opencode"
    echo "    2. Press TAB to switch to the ForLoop Planner agent"
    echo "    3. Say: \"List my sprints\" or \"Create a story for login\""
    echo ""
    echo "  Docs: https://github.com/forloop-cc/forloop-opencode-plugin-planner"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────

# Parse CLI flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        -g|--global)    INSTALL_TYPE="global"; shift ;;
        -l|--local)     INSTALL_TYPE="local"; shift ;;
        -n|--npm)         USE_NPM=true; shift ;;
        --skip-agents)    SKIP_AGENTS=true; shift ;;
        -h|--help)        show_help; exit 0 ;;
        *)              print_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Detect non-interactive mode (stdin is a pipe, not terminal)
if [ ! -t 0 ]; then
    NON_INTERACTIVE=true
    if [ -z "$INSTALL_TYPE" ]; then
        print_info "Running in non-interactive mode, defaulting to local install"
        INSTALL_TYPE="local"
    fi
fi

print_header

# Interactive: prompt for install type if not given
if [ -z "$INSTALL_TYPE" ] && [ "$NON_INTERACTIVE" != true ]; then
    echo -e "${BOLD}Choose installation type:${NC}"
    echo "  1) Global — available for all projects (~/.config/opencode/opencode.json)"
    echo "  2) Local  — only for this project (./opencode.json)"
    echo "  3) Cancel"
    read -p "Select [1-3]: " -r; echo
    case "$REPLY" in
        1) INSTALL_TYPE="global" ;;
        2) INSTALL_TYPE="local" ;;
        *) print_info "Installation cancelled"; exit 0 ;;
    esac
fi
[ -z "$INSTALL_TYPE" ] && { print_error "Installation type required"; exit 1; }

check_all_deps
merge_plugin_into_config
if [ "$SKIP_AGENTS" != true ]; then
    setup_agents_skills
fi
setup_token
show_summary
