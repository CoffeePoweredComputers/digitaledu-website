# Deployment & Auto-Rebuild Setup

This site uses **Google Calendar as the database**. When you add/edit events in Google Calendar, the site needs to rebuild to show the changes.

## Self-Hosted Deployment

The site runs on a self-hosted server with nginx serving the static build output.

### Initial Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url> /home/dhsmith4/digitaledu-website
   cd /home/dhsmith4/digitaledu-website
   npm install
   npm run build
   ```

2. Configure nginx to serve the `dist/` directory.

3. Start the webhook server (optional, for manual rebuilds):
   ```bash
   pm2 start webhook-server.cjs --name webhook-server
   ```

## Calendar Watcher (Auto-Rebuild on Calendar Changes)

The calendar watcher polls Google Calendar every 5 minutes and rebuilds the site only when changes are detected. It uses sync tokens for efficient incremental syncs.

### Setup

1. Make the script executable:
   ```bash
   chmod +x scripts/run-calendar-watcher.sh
   ```

2. Add cron job (runs every 5 minutes):
   ```bash
   crontab -e
   ```
   Add this line:
   ```
   */5 * * * * /home/dhsmith4/digitaledu-website/scripts/run-calendar-watcher.sh >> /home/dhsmith4/digitaledu-website/logs/cron.log 2>&1
   ```

3. Test manually:
   ```bash
   node scripts/calendar-watcher.cjs
   ```
   First run does a full sync and creates `.calendar-sync-state.json`. Subsequent runs only rebuild if calendar changes are detected.

### How It Works

- Uses Google Calendar sync tokens for efficient change detection
- Only triggers a rebuild when events are added, modified, or deleted
- Handles token expiration (410 GONE) by doing a full resync
- Logs activity to `logs/calendar-watcher.log`
- Uses a lock file to prevent concurrent runs

### Manual Rebuild

Trigger a manual rebuild via webhook:
```bash
curl -X POST https://digitaled.cs.vt.edu/webhook/rebuild
```

Or run the build directly:
```bash
npm run build
```

---

## Google Calendar Event Format

### Presentations (show on /seminars/)

#### Research Talk
**Title:** `[Talk] Your Research Talk Title` or `[Seminar] Your Talk Title`

**Description:**
```
Speaker: John Doe
Affiliation: MIT
Abstract: Your abstract text here.
Can be multiple lines.
Bio: Speaker biography here.
URL: https://speaker-website.com
```

### Reading Group (show on /reading-group/)

#### Paper Discussion
**Title:** `[Reading] Paper Discussion Title` or `[Reading Group] Paper Title`

**Description:**
```
Paper: The Paper Title
Authors: Smith, Jones, et al.
Link: https://arxiv.org/abs/xxxx
Facilitator: Jane Doe
Summary: What we'll discuss...
```

### Writing & Feedback (show on /writing-feedback/)

#### Writing Session
**Title:** `[Writing] Joint Writing Session Title`

**Description:**
```
Facilitator: Jane Doe
Summary: Focus and goals for this session...
```

#### Feedback Session
**Title:** `[Feedback] Work-in-Progress Feedback Session`

**Description:**
```
Speaker: John Doe
Affiliation: Virginia Tech
Abstract: Overview of the work to be discussed.
```

### Field Reference

| Event Type | Required Fields | Optional Fields |
|------------|-----------------|-----------------|
| Research Talk | Speaker | Affiliation, Abstract, Bio, URL |
| Feedback | Speaker | Affiliation, Abstract |
| Paper Discussion | Paper, **Link** | Authors, Facilitator, Summary |
| Writing | - | Facilitator, Summary/Goal |

### Tips
- **Location field**: Use for room number or Zoom link
- **Cancelled events**: Add "cancelled" to the title or delete the event
- **Valid prefixes**: `[Talk]`, `[Seminar]`, `[Feedback]`, `[Reading]`, `[Reading Group]`, `[Writing]`
- **Paper discussions**: Always include a `Link` field! A warning will show if missing.
- Events without one of the above prefixes are ignored

---

## Troubleshooting

**Events not showing?**
- Check event title has correct prefix (e.g., `[Seminar]`, `[Reading]`)
- Wait for calendar watcher to run (every 5 minutes)
- Check `logs/calendar-watcher.log` for errors
- Try running `node scripts/calendar-watcher.cjs` manually

**Build failing?**
- Check Google Calendar API key is valid
- Ensure calendar is set to public
- Check `logs/calendar-watcher.log` for build errors

**Calendar watcher not running?**
- Verify cron job is set up: `crontab -l`
- Check `logs/cron.log` for errors
- Ensure Node.js 20 is available via nvm
