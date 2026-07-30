# Architecture

## Platform

- **Type:** Web application — runs in a desktop/laptop browser, no installation required
- **Mobile:** Not required at this stage
- **Deployment target:** Public URL, accessible to students via a link shared by their tutor

## Recommended Stack

Given the no-accounts, link-based persistence model and the need for a rich interactive canvas, the following stack is appropriate:

- **Frontend:** React (or similar) with a canvas/drag-and-drop library for the multi-track and paradigm views
- **Backend:** Lightweight API server (Node.js or similar) to handle map persistence and link generation
- **Database:** Simple key-value or document store (e.g. PostgreSQL with JSON columns, or a document DB like Firestore/Supabase) — maps are stored against a unique ID
- **Hosting:** Vercel, Railway, or similar — simple, low-ops deployment suitable for an institutional tool at small scale
- **Export:** Server-side or client-side PDF/image generation (e.g. html2canvas, Puppeteer, or react-pdf)

All decisions above are **recommendations** and should be confirmed with the development team.

## Data Model

### Map
The central entity. One map = one performance analysis project.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Used to generate the share link |
| title | string | Performance title |
| date | string (optional) | Performance date |
| venue | string (optional) | |
| created_at | timestamp | |
| updated_at | timestamp | |

### Track
A single horizontal row in the multi-track view.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| map_id | UUID | Foreign key to Map |
| label | string | e.g. "Decor, Set & Lighting" |
| schema_category | enum / null | One of McAuley's 5 default categories, or null for custom |
| order | integer | Display order |
| visible | boolean | Allows hiding tracks |

### TimeMarker
A user-defined point on the horizontal axis.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| map_id | UUID | |
| label | string | e.g. "Act 1 Scene 2", "Climax" |
| position | integer | Ordinal position (not clock time) |

### Observation
A text note placed at a track/time-marker intersection.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| track_id | UUID | |
| time_marker_id | UUID | |
| content | text | Free text observation |

### Paradigm (Stage 2)
A named interpretive cluster created in the paradigm sorting view.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| map_id | UUID | |
| label | string | e.g. "Puppetry / mechanisation" |
| colour | string | For visual differentiation |

### ParadigmObservation
Join table linking observations to paradigms (many-to-many — one observation can belong to multiple paradigms).

| Field | Type | Notes |
|---|---|---|
| paradigm_id | UUID | |
| observation_id | UUID | |

## Sharing & Persistence

- No user accounts. Maps are identified and accessed via a **unique UUID-based URL** (e.g. `tool.example.com/map/a3f9b2c1`)
- The link is both the access key and the edit key — anyone with the link can edit the map
- A separate **read-only share link** may be generated for tutor sharing (e.g. appending `/view` to the URL)
- Link persistence duration: **TBD** — needs a decision on whether maps expire or persist indefinitely

## Export

- Export as **PDF** or **PNG image** of the current view (map or paradigm view)
- Export should capture the full canvas, not just the visible viewport
- Format and layout TBD — may require server-side rendering for fidelity

## Security & Compliance

- No personal data is collected (no accounts, no names stored against maps unless the student types them in a title)
- No payment data
- Standard HTTPS in transit
- No specific compliance framework required at this stage
- If the institution has data residency requirements, hosting location may need to be confirmed

## Scale & Performance

- Expected users: tens to low hundreds (a single course cohort)
- No significant concurrent load expected
- No SLA requirements defined
- Auto-save should be near-instant (optimistic UI with debounced server writes)

## Infrastructure

- **Environments:** Production only to start; staging environment recommended before any course rollout
- **CI/CD:** TBD — basic deployment pipeline recommended
- **Monitoring:** Basic error logging (e.g. Sentry) recommended; no complex observability stack needed at this scale
