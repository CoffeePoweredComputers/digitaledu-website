#!/bin/bash
# Calendar Watcher Cron Wrapper
# Prevents concurrent runs and sets up Node environment

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOCK_FILE="$PROJECT_DIR/.calendar-watcher.lock"

# Use flock for atomic locking (prevents race conditions)
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "Calendar watcher already running"
    exit 0
fi

# Source NVM and use Node 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 > /dev/null 2>&1

# Run the calendar watcher
cd "$PROJECT_DIR"
node scripts/calendar-watcher.cjs
