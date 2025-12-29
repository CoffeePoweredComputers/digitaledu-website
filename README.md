# DigiEd@VT Website

A website for the Digital Education research group at Virginia Tech, built with Astro and Tailwind CSS. Events are pulled directly from Google Calendar.

## Running the Project

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

### Production Build

```bash
npm run build
npm run preview  # Preview the build locally
```

## Project Structure

```
src/
├── components/       # Reusable Astro components
│   └── EventCard.astro
├── layouts/          # Page layouts
│   └── BaseLayout.astro
├── lib/              # Utilities and integrations
│   └── calendar.ts   # Google Calendar integration
├── pages/            # File-based routing
│   ├── index.astro
│   ├── about.astro
│   ├── calendar.astro
│   ├── people.astro
│   ├── seminars/
│   ├── reading-group/
│   └── writing-feedback/
└── styles/           # Global styles
```

## Google Calendar Integration

The website pulls events from a public Google Calendar. Events are parsed based on their title prefix and description format.

### How It Works

1. **Fetch**: At build time (or on request in dev), the site fetches events from the Google Calendar API
2. **Parse**: Event titles are parsed to determine category and subtype based on prefix tags
3. **Extract**: Description fields are parsed as key-value pairs (e.g., `Speaker: John Doe`)
4. **Route**: Events are assigned to pages based on their category

### Configuration

The calendar settings are in `src/lib/calendar.ts`:

```typescript
const GOOGLE_CALENDAR_ID = 'your-calendar-id@group.calendar.google.com';
const GOOGLE_API_KEY = 'your-api-key';
```

## Creating Events in Google Calendar

Events must follow specific naming conventions to appear on the website.

### Event Title Format

The title must start with a **type tag** in square brackets:

| Tag | Category | Appears On |
|-----|----------|------------|
| `[Talk]` | Presentation | `/seminars/` |
| `[Seminar]` | Presentation | `/seminars/` |
| `[Reading]` | Reading Group | `/reading-group/` |
| `[Reading Group]` | Reading Group | `/reading-group/` |
| `[Writing]` | Writing Session | `/writing-feedback/` |
| `[Feedback]` | Feedback Session | `/writing-feedback/` |

**Examples:**
```
[Talk] AI in Computer Science Education
[Reading] Discussing "Learning at Scale" Paper
[Writing] SIGCSE 2025 Paper Sprint
[Feedback] Work-in-Progress Review Session
```

### Event Description Format

Use `Key: Value` pairs, one per line. Multi-line values are supported.

#### Presentation Events

```
Speaker: Dr. Jane Smith
Affiliation: Virginia Tech
Abstract: This talk explores the intersection of AI and education...

We will discuss recent findings and future directions.
Bio: Dr. Smith is an Associate Professor in the Department of Computer Science...
```

**Supported fields:**
- `Speaker` or `Presenter` - Speaker name (required for speaker display)
- `Affiliation` - Speaker's institution
- `Abstract` or `Description` - Talk description
- `Bio` - Speaker biography
- `URL` - Speaker's website
- `Photo` - URL to speaker photo

#### Reading Group Events

```
Paper: Learning How to Learn: A Case Study in Higher Education
Authors: Smith, J., Johnson, M., Williams, K.
Link: https://doi.org/10.1145/1234567.1234568
Facilitator: Alex Chen
Summary: We'll discuss the methodology and implications for our own research.
```

**Supported fields:**
- `Paper` or `Title` - Paper title
- `Authors` - Paper authors
- `Link` or `URL` - Link to paper (displays "Read Paper" button)
- `Facilitator`, `Lead`, or `Leader` - Discussion leader
- `Summary`, `Description`, or `Goal` - Session summary

#### Writing & Feedback Events

```
Facilitator: Morgan Lee
Summary: Collaborative writing session targeting SIGCSE 2025 submissions.
Bring your drafts for peer feedback and co-working time.
```

**Supported fields:**
- `Facilitator`, `Lead`, or `Leader` - Session leader
- `Summary`, `Description`, or `Goal` - Session description

### Complete Examples

#### Research Talk

**Title:**
```
[Talk] Understanding Student Debugging Strategies
```

**Description:**
```
Speaker: Dr. Maria Garcia
Affiliation: MIT CSAIL
Abstract: This research investigates how students approach debugging in introductory programming courses. We conducted a mixed-methods study with 150 students across three semesters.

Our findings reveal distinct debugging patterns that correlate with student success.
Bio: Dr. Garcia is a Research Scientist at MIT, focusing on computing education and learning analytics.
URL: https://example.com/garcia
```

**Location:**
```
Torgersen 3160
```

#### Reading Group Session

**Title:**
```
[Reading] Peer Instruction in CS1
```

**Description:**
```
Paper: Peer Instruction for Active Learning in Large Classes
Authors: Beth Simon, Sue Fitzgerald, et al.
Link: https://dl.acm.org/doi/10.1145/1953163.1953207
Facilitator: Jordan Kim
Summary: Classic paper on peer instruction techniques. We'll discuss applicability to our courses and potential adaptations for online settings.
```

#### Writing Session

**Title:**
```
[Writing] ICER 2025 Paper Sprint
```

**Description:**
```
Facilitator: Sam Taylor
Summary: Focused writing session for ICER submissions. Deadline is in 3 weeks!

Bring your outlines, drafts, or ideas. We'll have breakout groups for different paper stages.
```

#### Feedback Session

**Title:**
```
[Feedback] Draft Review: Learning Analytics Papers
```

**Description:**
```
Facilitator: Riley Chen
Summary: Peer feedback session for learning analytics paper drafts. Submit your draft 48 hours before the session for review.
```

### Event URL Generation

Events are accessible at URLs based on their category and a generated slug:

```
/seminars/2025-01-15-understanding-student-debugging/
/reading-group/2025-01-22-peer-instruction-in-cs1/
/writing-feedback/2025-02-01-icer-2025-paper-sprint/
```

The slug is generated from the date and title (lowercase, hyphens, max 50 characters).

### Cancelled Events

Events are marked as cancelled if:
- The Google Calendar event status is "cancelled"
- The title contains "cancelled" or "canceled"

Cancelled events appear in past events with a visual indicator.

## Deployment

The site can be deployed to any static hosting platform:

- **Netlify**: Push to repository with `netlify.toml` configuration
- **Vercel**: Connect repository and deploy
- **GitHub Pages**: Use `astro build` output in `dist/`

Events are fetched at build time, so redeploy to update the event list.
