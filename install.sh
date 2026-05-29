#!/usr/bin/env bash
set -euo pipefail

# ForLoop Plugin Installer
# https://github.com/forloop-cc/forloop-opencode-plugin-planner
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/install.sh | bash
#   curl -fsSL ... | bash -s -- --global
#   bash install.sh --local --force
#   bash install.sh --npm --global

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
REPO="${FORLOOP_REPO:-https://github.com/forloop-cc/forloop-opencode-plugin-planner.git}"
BRANCH="${FORLOOP_BRANCH:-main}"
PLUGIN_DIRNAME="forloop-planner"
GLOBAL_INSTALL_DIR="$HOME/.config/opencode/plugins/$PLUGIN_DIRNAME"
LOCAL_INSTALL_DIR=".opencode/plugins/$PLUGIN_DIRNAME"
ENTRY_POINT="plugins/forloop-plugin.ts"

INSTALL_TYPE=""      # global | local | custom
INSTALL_DIR=""       # resolved path
USE_NPM=false
FORCE=false
NON_INTERACTIVE=false
PROJECT_ROOT="$(pwd)"
_install_in_progress=""

print_header() { echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════╗\n║       ForLoop Plugin Installer           ║\n╚══════════════════════════════════════════╝${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1" >&2; }
print_step()    { echo -e "\n${CYAN}${BOLD}▶${NC} $1\n"; }

show_help() {
    cat << 'HELPEOF'
Usage: install.sh [OPTIONS]

Options:
  -g, --global     Install globally (~/.config/opencode/plugins/)
  -l, --local      Install locally (./.opencode/plugins/)
  -d, --dir PATH   Custom install directory
  -n, --npm        Use npm install instead of git clone
  -b, --branch NAME  Clone a specific branch (default: main)
  -f, --force      Overwrite existing installation
  -h, --help       Show this help

Examples:
  curl -fsSL .../install.sh | bash              # Interactive
  curl -fsSL .../install.sh | bash -s -- -g     # Global, non-interactive
  bash install.sh --local --force               # Local, force overwrite
  bash install.sh --npm --global                # npm install, global
HELPEOF
}

# ── Dependency checks ────────────────────────────────────────────────────────

check_git() {
    if ! command -v git &>/dev/null; then
        print_error "git is required but not installed"
        case "$PLATFORM_LABEL" in
            macOS)   echo "  brew install git" ;;
            Linux)   echo "  sudo apt-get install git  (Ubuntu/Debian)"
                     echo "  sudo dnf install git      (Fedora/RHEL)" ;;
            Windows) echo "  https://git-scm.com/download/win" ;;
        esac
        return 1
    fi
    return 0
}

check_node() {
    if ! command -v node &>/dev/null; then
        print_warning "Node.js not found (needed for npm install)"
        case "$PLATFORM_LABEL" in
            macOS)   echo "  brew install node" ;;
            Linux)   echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
                     echo "  sudo apt-get install -y nodejs" ;;
            Windows) echo "  https://nodejs.org" ;;
        esac
        if [ "$NON_INTERACTIVE" = true ]; then
            print_error "Node.js is required but not installed"
            return 1
        else
            read -p "Continue anyway? [y/N] " -r; echo
            [[ ! $REPLY =~ ^[Yy]$ ]] && return 1
        fi
    fi
    return 0
}

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
        print_success "OpenCode CLI found: $(which opencode)"
    else
        print_warning "OpenCode CLI not found"
        echo "  Install: curl -fsSL https://opencode.ai/install.sh | bash"
        if [ "$NON_INTERACTIVE" != true ]; then
            read -p "Continue anyway? [y/N] " -r; echo
            [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
        fi
    fi
}

check_all_deps() {
    print_step "Checking dependencies..."
    local missing=0
    if [ "$USE_NPM" != true ]; then
        check_git || missing=$((missing + 1))
    else
        check_node || missing=$((missing + 1))
    fi
    check_jq || missing=$((missing + 1))
    if [ "$missing" -gt 0 ]; then
        print_error "Missing $missing required dependencies. Install them and try again."
        exit 1
    fi
    print_success "All dependencies found"
}

# ── Install location ─────────────────────────────────────────────────────────

resolve_install_dir() {
    case "$INSTALL_TYPE" in
        global)  INSTALL_DIR="$GLOBAL_INSTALL_DIR" ;;
        local)   INSTALL_DIR="$LOCAL_INSTALL_DIR" ;;
        custom)  ;;  # INSTALL_DIR already set by --dir flag
    esac

    local parent_dir
    parent_dir="$(dirname "$INSTALL_DIR")"
    if [ ! -d "$parent_dir" ]; then
        print_info "Creating parent directory: $parent_dir"
        mkdir -p "$parent_dir"
    fi
}

prompt_install_type() {
    echo -e "${BOLD}Choose installation type:${NC}"
    echo "  1) Global — available for all projects (~/.config/opencode/plugins/)"
    echo "  2) Local — only for this project (./.opencode/plugins/)"
    echo "  3) Cancel"
    read -p "Select [1-3]: " -r; echo
    case "$REPLY" in
        1) INSTALL_TYPE="global" ;;
        2) INSTALL_TYPE="local" ;;
        *) print_info "Installation cancelled"; exit 0 ;;
    esac
}

# ── Installation ─────────────────────────────────────────────────────────────

install_via_git() {
    print_step "Cloning plugin repository..."
    local clone_dir="$INSTALL_DIR"

    if [ -d "$clone_dir" ] && [ "$FORCE" = true ]; then
        print_warning "Removing existing installation..."
        rm -rf "$clone_dir"
    elif [ -d "$clone_dir" ]; then
        print_warning "Plugin already installed at: $clone_dir"
        if [ "$NON_INTERACTIVE" = true ]; then
            print_error "Use --force to overwrite in non-interactive mode"
            exit 1
        fi
        read -p "Overwrite? [y/N] " -r; echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$clone_dir"
        else
            print_info "Installation cancelled"
            exit 0
        fi
    fi

    mkdir -p "$clone_dir"
    if ! git clone --depth 1 --branch "$BRANCH" "$REPO" "$clone_dir" 2>&1; then
        print_error "Failed to clone repository. Check the URL and your network connection."
        exit 1
    fi

    print_success "Repository cloned to: $clone_dir"

    print_step "Installing dependencies..."
    check_node || { print_error "Node.js is required to install dependencies"; exit 1; }
    cd "$clone_dir"
    npm install --omit=dev 2>&1
    cd - > /dev/null
    print_success "Dependencies installed"
    PLUGIN_PATH="$INSTALL_DIR"
}

install_via_npm() {
    print_step "Installing via npm..."
    local npm_package="@forloop/opencode-plugin-planner"

    if npm install "$npm_package" --prefix "$INSTALL_DIR" --silent 2>/dev/null; then
        print_success "npm package installed: $npm_package"
        PLUGIN_PATH="$INSTALL_DIR/node_modules/@forloop/opencode-plugin-planner"
    else
        print_error "npm install failed. Is the package published?"
        echo "  Try: npm install $npm_package    (manually)"
        echo "  Or run without --npm to use git clone instead"
        exit 1
    fi
}

# ── Config merging ───────────────────────────────────────────────────────────

get_config_file() {
    if [ "$INSTALL_TYPE" = "global" ]; then
        mkdir -p "$HOME/.config/opencode"
        echo "$HOME/.config/opencode/config.json"
    else
        echo "$PROJECT_ROOT/opencode.json"
    fi
}

merge_plugin_into_config() {
    local config_file
    config_file="$(get_config_file)"
    local plugin_path="file://${PLUGIN_PATH:-$INSTALL_DIR}"

    print_step "Updating OpenCode configuration..."

    if [ ! -f "$config_file" ]; then
        echo "{}" > "$config_file"
    fi

    local backup="${config_file}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$config_file" "$backup"

    local tmp
    tmp="$(mktemp)"

    jq --arg p "$plugin_path" '
        if .plugin then
            .plugin += [$p] | .plugin |= unique
        else
            . + {"plugin": [$p]}
        end
    ' "$config_file" > "$tmp"

    if [ -s "$tmp" ]; then
        mv "$tmp" "$config_file"
        print_success "Configuration updated: $config_file"
        print_info "Backup saved: $backup"
    else
        print_error "Config merge produced empty file — restoring backup"
        mv "$backup" "$config_file"
        rm -f "$tmp"
        exit 1
    fi
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
        echo "  opencode run 'forloop.token.set --token floop_YOUR_TOKEN'"
        return
    fi

    read -p "Have you created a token? [y/N] " -r; echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Set it later: opencode run 'forloop.token.set --token floop_YOUR_TOKEN'"
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

# ── Verification ─────────────────────────────────────────────────────────────

verify_installation() {
    print_step "Verifying installation..."
    local entry="${PLUGIN_PATH:-$INSTALL_DIR}/$ENTRY_POINT"

    if [ -f "$entry" ]; then
        print_success "Plugin verified: $entry"
    else
        print_error "Installation failed: entry point not found at $entry"
        echo "  Expected: $entry"
        echo "  Check the installation directory: $INSTALL_DIR"
        exit 1
    fi
}

show_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo ""
    echo "  Type:     $INSTALL_TYPE"
    echo "  Location: $INSTALL_DIR"
    echo ""
    echo "  Next steps:"
    echo "    1. Start opencode: opencode"
    echo "    2. List sprints:   forloop.sprint.list"
    echo "    3. Create a story: forloop.story.create --title 'My feature'"
    echo ""
    echo "  Docs: https://github.com/forloop-cc/forloop-opencode-plugin-planner"
    echo ""
}

cleanup() {
    if [ -n "${INSTALL_DIR:-}" ] && [ -d "$INSTALL_DIR" ] && [ -n "${_install_in_progress:-}" ]; then
        print_warning "Installation interrupted, cleaning up..."
        rm -rf "$INSTALL_DIR"
    fi
}
trap cleanup EXIT INT TERM

# ── Main ─────────────────────────────────────────────────────────────────────

# Parse CLI flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        -g|--global)    INSTALL_TYPE="global"; shift ;;
        -l|--local)     INSTALL_TYPE="local"; shift ;;
        -d|--dir)
            [ -z "${2:-}" ] && { print_error "--dir requires a path"; exit 1; }
            INSTALL_TYPE="custom"; INSTALL_DIR="$2"; shift 2 ;;
        -n|--npm)       USE_NPM=true; shift ;;
        -b|--branch)
            [ -z "${2:-}" ] && { print_error "--branch requires a name"; exit 1; }
            BRANCH="$2"; shift 2 ;;
        -f|--force)     FORCE=true; shift ;;
        -h|--help)      show_help; exit 0 ;;
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
    prompt_install_type
fi
[ -z "$INSTALL_TYPE" ] && { print_error "Installation type required"; exit 1; }

resolve_install_dir
check_all_deps
check_opencode

_install_in_progress=true
if [ "$USE_NPM" = true ]; then
    install_via_npm
else
    install_via_git
fi

merge_plugin_into_config
setup_token
verify_installation
_install_in_progress=""
show_summary
