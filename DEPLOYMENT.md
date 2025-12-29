# Deployment & Auto-Rebuild Setup

This site uses **Google Calendar as the database**. When you add/edit events in Google Calendar, the site needs to rebuild to show the changes.

## 1. Deploy to Netlify

### Option A: Via Netlify UI
1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Netlify auto-detects settings from `netlify.toml`
5. Click "Deploy site"

### Option B: Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 2. Create a Build Hook

1. In Netlify: **Site settings** → **Build & deploy** → **Build hooks**
2. Click "Add build hook"
3. Name it: `google-calendar-update`
4. Branch: `main`
5. Click "Save" and copy the URL (looks like `https://api.netlify.com/build_hooks/xxxxx`)

## 3. Set Up Zapier Webhook

1. Go to [zapier.com](https://zapier.com) and sign up/login
2. Click "Create Zap"

### Trigger (When this happens...)
- Search for **Google Calendar**
- Choose **"New Event"** (or "Event Start" / "Updated Event" for more triggers)
- Connect your Google account
- Select your DigiEd@VT calendar

### Action (Do this...)
- Search for **Webhooks by Zapier**
- Choose **"POST"**
- URL: Paste your Netlify build hook URL
- Payload Type: `form`
- Leave data empty
- Click "Test" then "Publish"

## 4. Test It

1. Add a test event to Google Calendar:
   - Title: `[Seminar] Test Event`
   - Description: `Speaker: Test Person`
2. Wait 1-2 minutes for Zapier to trigger
3. Check Netlify deploys - you should see a new build
4. Delete the test event when done

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

#### Feedback Session
**Title:** `[Feedback] Work-in-Progress Feedback Session`

**Description:**
```
Speaker: John Doe
Affiliation: Virginia Tech
Abstract: Overview of the work to be discussed.
```

### Working Sessions (show on /reading-group/)

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

#### Writing Session
**Title:** `[Writing] Joint Writing Session Title`

**Description:**
```
Facilitator: Jane Doe
Summary: Focus and goals for this session...
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

## Multiple Zapier Triggers (Optional)

For faster updates, create additional Zaps for:
- **"Updated Event in Google Calendar"** - catches edits
- **"Event Cancelled"** - catches deletions

Each Zap uses the same Netlify webhook URL.

---

## Troubleshooting

**Events not showing?**
- Check event title has `[Seminar]` or `[Reading]` prefix
- Wait for Zapier trigger (can take 1-15 min on free plan)
- Check Netlify deploy logs for errors

**Build failing?**
- Check Google Calendar API key is valid
- Ensure calendar is set to public

**Zapier not triggering?**
- Check Zap is turned ON
- Verify Google Calendar connection
- Free Zapier checks every 15 minutes; paid plans are faster
