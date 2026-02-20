/**
 * Calendar Watcher - Polls Google Calendar and rebuilds on changes
 *
 * Uses sync tokens for efficient incremental syncs.
 * Run via cron every 5 minutes.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration - load from .env file
const envPath = path.join(path.dirname(__dirname), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PROJECT_DIR = path.dirname(__dirname);
const STATE_FILE = path.join(PROJECT_DIR, '.calendar-sync-state.json');
const LOG_FILE = path.join(PROJECT_DIR, 'logs', 'calendar-watcher.log');

/**
 * Log message to file and console
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);

  // Ensure logs directory exists
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(LOG_FILE, line + '\n');
}

/**
 * Load sync state from file
 */
function loadSyncState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (error) {
    log(`Error loading sync state: ${error.message}`);
  }
  return { syncToken: null };
}

/**
 * Save sync state to file
 */
function saveSyncState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Fetch events from Google Calendar with sync token support
 * Handles pagination for large calendars
 */
async function fetchCalendarChanges(syncToken) {
  let allItems = [];
  let pageToken = null;
  let nextSyncToken = null;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`);
    url.searchParams.set('key', GOOGLE_API_KEY);

    if (syncToken) {
      // Incremental sync - only get changes
      url.searchParams.set('syncToken', syncToken);
    } else {
      // Full sync - get all events in time range
      url.searchParams.set('timeMin', new Date('2024-01-01').toISOString());
      url.searchParams.set('timeMax', new Date('2028-12-31').toISOString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('maxResults', '250');
    }

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (response.status === 410) {
      // Sync token expired, need full resync
      return { expired: true };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allItems = allItems.concat(data.items || []);
    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken;

  } while (pageToken);

  return { items: allItems, nextSyncToken };
}

/**
 * Run npm build
 */
function runBuild() {
  return new Promise((resolve, reject) => {
    log('Starting build...');

    const buildCmd = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm run build`;

    exec(buildCmd, { cwd: PROJECT_DIR, shell: '/bin/bash' }, (error, stdout, stderr) => {
      if (error) {
        log(`Build failed: ${error.message}`);
        if (stderr) log(`stderr: ${stderr}`);
        reject(error);
      } else {
        log('Build completed successfully');
        resolve(stdout);
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  log('Calendar watcher started');

  let state = loadSyncState();
  let isFullSync = !state.syncToken;

  try {
    let data = await fetchCalendarChanges(state.syncToken);

    // Handle expired sync token
    if (data.expired) {
      log('Sync token expired, performing full resync');
      state.syncToken = null;
      isFullSync = true;
      data = await fetchCalendarChanges(null);
    }

    const items = data.items || [];
    const newSyncToken = data.nextSyncToken;

    if (isFullSync) {
      log(`Full sync completed: ${items.length} events`);
      // Save the sync token but don't rebuild on first run
      state.syncToken = newSyncToken;
      state.lastSync = new Date().toISOString();
      saveSyncState(state);
      log('Initial sync state saved');
    } else if (items.length > 0) {
      // Changes detected
      log(`Changes detected: ${items.length} event(s) modified`);

      // Log what changed
      for (const item of items) {
        const status = item.status === 'cancelled' ? 'DELETED' : 'UPDATED';
        log(`  ${status}: ${item.summary || item.id}`);
      }

      // Save new sync token before building
      state.syncToken = newSyncToken;
      state.lastSync = new Date().toISOString();
      saveSyncState(state);

      // Trigger rebuild
      await runBuild();
    } else {
      log('No changes detected');
      // Update sync token even if no changes
      if (newSyncToken) {
        state.syncToken = newSyncToken;
        state.lastSync = new Date().toISOString();
        saveSyncState(state);
      }
    }

  } catch (error) {
    log(`Error: ${error.message}`);
    process.exit(1);
  }

  log('Calendar watcher finished');
}

main();
