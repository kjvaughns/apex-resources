# Handoff: APEX Agent Hub (Internal Resource Portal)

## Overview
An internal, password-gated web portal for APEX Financial Empire (a life‑insurance agency) where agents access company resources. It has three "pages" reached from a home hub:

1. **Home hub** — landing page with cards linking to the sections.
2. **Recorded Trainings** — recorded calls/trainings organized by presenter, each opening in a media player **with a built‑in transcript panel**.
3. **Resource Library** — searchable, filterable grid of documents (PDFs, scripts/guides, and — when added — videos & trainings).

Brand: dark (`#0A0A0A`), gold accent (`#C9A84C`), off‑white text. Headings in **Bebas Neue**, body in **DM Sans**.

## About the Design Files
The files in this bundle are **design references built in HTML/React‑via‑Babel** — a working prototype that demonstrates the intended look, layout, and behavior. **They are not meant to be shipped as‑is.** The task is to **recreate these designs in the target codebase's environment** (e.g., a real React/Next app, Vue, etc.) using its established patterns, build tooling, routing, and component library. If no codebase exists yet, pick an appropriate modern stack (React + Vite or Next.js is a natural fit since the prototype is already React) and implement there.

The prototype loads React + Babel from a CDN and transpiles JSX in the browser — fine for a mock, **not** for production. Move to a real build pipeline.

## Fidelity
**High‑fidelity.** Colors, typography, spacing, radii, hover/active states, and interactions are final and intentional. Recreate the UI pixel‑accurately, then swap the prototype plumbing (CDN React/Babel, client‑side password, hash router) for production equivalents.

---

## Files in this bundle
- `APEX Resources.html` — entry point. Contains all CSS (in one `<style>`), the Google Fonts link, the viewport meta, and the script includes. **All design tokens and component styles live here.**
- `app.jsx` — all React components and the router.
- `data.js` — the content model (resources, presenters, recordings, quick links) as plain globals on `window`.
- `tweaks-panel.jsx` — a prototype‑only "Tweaks" panel (live accent/layout toggles). **Not part of the product** — ignore/drop for production.
- `assets/apex-logo-trans.png` — the APEX logo, background removed (transparent), for use on dark surfaces.

---

## Architecture (prototype)
- **Routing:** hash‑based. `#home` (default), `#presentations`, `#library`. `useRoute()` reads `window.location.hash` and listens to `hashchange`; nav uses `<a href="#…">`. → Replace with the codebase's real router (React Router / Next routes). Suggested real paths: `/`, `/trainings`, `/library`.
- **Auth gate:** `<Gate>` checks a hardcoded password (`"Sales"`) and stores `sessionStorage.apex_auth = "1"`. **This is NOT security** — the password is in the client bundle and anyone can read it or set the flag. **MUST be replaced** with real server‑side auth (SSO / email+password / Workspace login). See "Production TODOs".
- **Content:** static arrays on `window` in `data.js`. → Replace with an API/CMS so non‑developers can add resources (see TODOs).

---

## Screens / Views

### 1. Gate (password screen)
- **Purpose:** block access until authenticated.
- **Layout:** full‑viewport, centered card on a subtle radial‑gradient dark background. Card `max-width: 420px`, `border-radius: 18px`, padding `44px 40px 34px`, `background: #131313`, `border: 1px solid rgba(255,255,255,0.09)`, shadow `0 30px 80px rgba(0,0,0,0.5)`.
- **Components (top→bottom, centered):** logo (`height: 52px`); gold kicker pill text "● INTERNAL USE ONLY" (11px, 600, `letter-spacing: 0.14em`, uppercase, color gold); title "Resource Library" (Bebas Neue, 34px); subtitle (14px, `--muted`); password input inside a field (`height: 48px`, `border-radius: 10px`, `background: #1A1A1A`; focus ring `0 0 0 3px rgba(201,168,76,0.13)`, border gold; error state border `#E5484D`); submit button (full‑width, gold bg `#C9A84C`, text `#0A0A0A`, 700, `border-radius: 10px`, padding 14px); footer note (12px, `--muted-2`).
- **Behavior:** correct password → set session flag → render app. Wrong → show inline error "Incorrect password. Try again." and clear the field. Enter submits.

### 2. Home hub
- **Purpose:** entry point; route to the two sections.
- **Layout:** centered container `max-width: 1240px`, side padding 32px (16px mobile). Hero block (kicker + Bebas title `clamp(44px,6vw,78px)` + subtitle), then a hub grid, then Quick Links, then footer.
- **Hub grid:** `display:grid; gap:18px; grid-template-columns: repeat(auto-fit, minmax(320px,1fr))` (single column under 760px). Two cards.
- **Hub card** (`<a>`): `min-height:230px`, padding `30px 30px 26px`, `background:#131313`, `border:1px solid var(--line)`, `border-radius:16px`. Contents: large outlined numeral ("01"/"02") rendered with `-webkit-text-stroke: 1.5px` gold and transparent fill, `font: Bebas 44px`; title (Bebas 34px); description (15px, `--muted`); a footer row (border‑top) with a meta count (e.g. "5 presenters · 3 recordings") and "Open →". **Hover:** `translateY(-4px)`, border → gold, arrow nudges right 3px.
- **Cards:** (01) "Recorded Trainings" → `#presentations`; (02) "Resource Library" → `#library`. Meta counts are derived from data.

### 3. Recorded Trainings (`#presentations`)
- **Purpose:** browse recordings by presenter.
- **Section head:** gold kicker "Recorded Presentations", Bebas title `clamp(30px,4vw,46px)`, subtitle.
- **Presenter selector:** horizontal row, `display:flex; flex-wrap:wrap; gap:12px`. Each presenter is a button: column layout, centered, `min-width:130px`, padding `22px 16px 18px`, `border-radius:14px`. Contains a circular **avatar** (54px, initials in Bebas, gold border `1.5px`, `background:#1A1A1A`), name (15px, 600), role (12px, `--muted-2`). **Selected state:** border gold, `background: color-mix(gold 7%, surface)`, avatar fills gold with dark text, role turns gold. (Two‑per‑row under 760px.)
- **List head:** presenter name (Bebas 22px) + "N recordings".
- **Recording rows:** `display:grid; gap:10px`. Each row is a button: `display:flex; align-items:center; gap:16px`, padding `14px 18px`, `border-radius:12px`, `background:#131313`, `border:1px solid var(--line)`. Left: circular **play affordance** (42px, gold‑tinted bg + border; on hover fills gold). Middle: title (16px, 600) + meta line (topic chip + date + a "♪ Audio" / "▶ Video" tag in gold). Right: duration (hidden on mobile). **Hover:** border gold, `background:#1A1A1A`, `translateX(2px)`.
- **Empty state:** when a presenter has no recordings, show a dashed‑border panel: "No recordings yet" (Bebas 26px) + "{Name}'s recordings will appear here once they're added." (Only KJ has recordings currently; the other four presenters use this state.)

### 4. Resource Library (`#library`)
- **Purpose:** find documents.
- **Page head:** flex row (wraps on mobile) with a text block (gold kicker "Resource Library" + Bebas title "Scripts, guides & trainings.") and a **search** input on the right (`width:320px`, full‑width on mobile; same field styling as the gate). Search filters live across title + description + tags (case‑insensitive substring).
- **Filter tabs:** All / Videos / PDFs / Trainings / Guides. Underline‑style active tab (2px gold bar). Each tab shows a count pill. **A type tab is hidden when its count is 0** ("All" always shows). Tabs scroll horizontally on mobile.
- **Card grid:** `grid-template-columns: repeat(auto-fill, minmax(312px,1fr)); gap:18px` (single column on mobile). 
- **Resource card** (button): `background:#131313`, `border:1px solid var(--line)`, `border-radius:14px`, padding 22px, column flex `gap:12px`. A left color accent bar (3px, the type color) fades in on hover. Contents: top row (type **badge** + date), title (Bebas 25px), description (14px, `--muted`), footer row (border‑top) with meta (e.g. "PDF") and a gold CTA ("Open PDF →", "Open Script →"). **Hover:** `translateY(-3px)`, border lightens, accent bar shows, arrow nudges.
- **Type badge:** pill, uppercase 10.5px 600, colored text on a `color-mix(color 13%, transparent)` fill with a `color-mix(color 28%)` border and a 5px dot. **Type colors:** Video `#E5484D`, PDF `#4C7DF0`, Training = gold `#C9A84C`, Guide `#46A758`.
- **Empty state:** "No resources found" / "Try a different search or filter."

### 5. Resource detail modal
- Opens on card click. Overlay `rgba(5,5,5,0.74)` + blur; centered card `max-width:560px`, `border-radius:18px`, padding 34px, shadow `0 32px 80px`. Contents: close button (top‑right), type badge + date, title (Bebas 38px), long description (15px, `--muted`), tag chips, footer with meta and a **primary action button** (gold) that opens `item.url` in a new tab (PDF file or Google Doc). Esc / overlay click / close button dismiss. Body scroll locks while open.

### 6. Media player modal (the important one — has the transcript) 
Opens when a recording row is clicked. Same modal shell, `max-width:620px`, `max-height:90vh`, `display:flex; flex-direction:column; overflow-y:auto`. Top→bottom:
- **Header:** presenter avatar (42px) + name/role + topic chip.
- **Title:** Bebas 38px.
- **Media surface** (`.media-stage`, `flex-shrink:0`):
  - If the recording has a **video**: a 16:9 frame (`aspect-ratio:16/9; max-height:300px`) containing an `<iframe>` of the source.
  - If **audio** (`audio:true`): a shorter frame (`height:172px`) with the audio `<iframe>`.
  - If **neither** (placeholder/demo only): a striped dark 16:9 placeholder with a large gold play button that drives a **simulated** scrubber. *(This branch exists only for demo content and can be removed in production — see below.)*
- **Scrubber** (`.player`): only rendered for the placeholder/simulated case. Real embedded media uses the embed's own controls.
- **Transcript panel** (`.ts`, flexible/scrolling region):
  - **Header:** "TRANSCRIPT" + a sublabel.
  - For real media right now: a **"transcript pending"** message (no transcript data exists yet).
  - For the simulated demo case: a scrollable list of timestamped lines. The **active line highlights in gold** and the list **auto‑scrolls** to keep it centered (computed via `getBoundingClientRect`, never `scrollIntoView`); **clicking a line seeks** the (simulated) playhead. **This synced‑transcript UI is the target experience** — see "Wiring real transcripts".

---

## Interactions & Behavior
- **Navigation:** hash routes; changing route scrolls to top. Logo → home. "← Hub" link in the top bar on inner pages.
- **Search:** live, debouncing not required at this scale; substring match over title + desc + tags.
- **Filters:** instant; empty type tabs hidden.
- **Modals:** open on click, close on Esc / overlay / ✕; `document.body.overflow` locked while open (effect must be guarded so it only runs when a modal is actually open — an early bug locked scroll permanently).
- **Hover/transition tokens:** most transitions `0.16–0.18s`; card lifts `translateY(-3px/-4px)`; arrows translate `3px`.
- **Simulated player:** `setInterval` 1s advancing a counter to a parsed duration; pure prototype.

## State Management
- `authed` (session), `route` (hash), per‑view local state: library `filter`/`query`/`active(modal item)`; presentations `selectedPresenter`/`active(recording)`; player `playing`/`currentTime`.
- Production: auth from real provider; content from API; player time from the actual `<video>`/`<audio>` element's `timeupdate` event (replacing the simulated counter).

## Data model (`data.js`)
```js
APEX_RESOURCES: [{
  id, type: 'video'|'pdf'|'training'|'guide',
  title, desc, long, date, meta,
  cta,                 // button label, e.g. "Open PDF"
  url,                 // file or Google Doc link, opened in new tab
  tags: []
}]
APEX_PRESENTERS: [{ id, name, role, initials }]
APEX_RECORDINGS: [{
  id, presenter,       // presenter id
  title, topic, date, desc,
  audio: true,         // present for audio-only items
  video,               // embed URL (Drive /preview iframe in the prototype)
  duration             // "MM:SS" — only used by the simulated player; optional
  // transcript        // ← NOT present yet; see "Wiring real transcripts"
}]
APEX_QUICKLINKS: [{ label, sub, href }]   // hrefs are placeholder "#"
```
Current real content: 4 resources (APEX Agent Playbook PDF, Needs Analysis Quiz PDF, "Apex Script 3.0" Google Doc, "Apex Script — Veterans" Google Doc) and 3 KJ audio recordings (Google Drive). Everything else is empty by design.

---

## Wiring real transcripts (the "built‑in transcriber")
The **UI is already built**; it just needs data. To make it live:

1. **Transcribe the audio/video.** Run each recording's source file through a speech‑to‑text service (e.g. OpenAI Whisper, AssemblyAI, Deepgram, Google Speech‑to‑Text). Claude/Claude Code can orchestrate this, clean the output, and even segment it sensibly — but the actual audio→text step is the STT service's job.
2. **Store a timestamped transcript** per recording in this exact shape:
   ```js
   transcript: [ { t: 0, text: "…" }, { t: 12, text: "…" }, … ]   // t = seconds
   ```
3. **Feed it to the player.** Replace the "transcript pending" branch with the existing synced list rendering (it already does active‑line highlight, auto‑scroll, and click‑to‑seek). 
4. **Drive seeking from real playback.** Swap the simulated counter for the media element's real `currentTime` (`timeupdate` for highlight; set `el.currentTime` on line click). For embedded Google Drive iframes you can't read playback time — so for production, **host the media yourself** (S3/Mux/Cloudflare Stream/etc.) and use a native `<video>`/`<audio>` element, which exposes `currentTime` and enables true sync.

---

## Production TODOs (must‑do before launch)
1. **Real authentication.** The client‑side password is not security. Use SSO / Workspace login / a real auth provider; gate content server‑side.
2. **Real media hosting** for recordings (so the player controls + transcript sync work and access is access‑controlled). Google Drive `/preview` embeds are fine for a demo but can't be controlled programmatically and depend on each file's share setting.
3. **Content management.** Move `data.js` to an API/CMS/DB so non‑developers can add resources, presenters, and recordings.
4. **Transcription pipeline** (above).
5. **Real Quick Link URLs** (InsuraCloud, Readymode, AgentLink, Website are placeholders).
6. **Build pipeline** — replace CDN React + in‑browser Babel with a bundled app; drop `tweaks-panel.jsx`.

---

## Design Tokens
**Colors**
- Background `#0A0A0A`; Surface `#131313`; Surface‑2 `#1A1A1A`
- Text `#F4F2ED`; Muted `#8C8A84`; Muted‑2 `#6A6862`
- Hairline borders `rgba(255,255,255,0.09)` and `rgba(255,255,255,0.06)`
- Accent gold `#C9A84C` (brand). Type colors: red `#E5484D`, blue `#4C7DF0`, green `#46A758`.

**Typography**
- Headings: **Bebas Neue** (400). Body/UI: **DM Sans** (400/500/600/700). Both from Google Fonts.
- Notable sizes: hero `clamp(44px,6vw,78px)`; section titles `clamp(30px,4vw,46px)`; hub/library card titles 34px/25px (Bebas); body 14–17px; labels/kickers 11–12px uppercase with `0.1–0.22em` letter‑spacing.

**Radii:** pills `999px`; cards `12–16px`; modals `18px`; inputs/buttons `9–10px`.
**Shadows:** modal `0 32px 80px rgba(0,0,0,0.6)`; gate `0 30px 80px rgba(0,0,0,0.5)`.
**Spacing:** container `max-width:1240px`, side padding 32px desktop / 16px mobile; card gaps 18px; grid min track 312px (library) / 320px (hub).
**Breakpoint:** single mobile breakpoint at `760px` (hub & grid collapse to one column, search full‑width, tabs scroll, presenters 2‑up, duration hidden, modal full‑width).

## Assets
- `assets/apex-logo-trans.png` — APEX logo (gold triangle mark + white "APEX / FINANCIAL EMPIRE" wordmark) with the original dark background removed for use on dark surfaces. Derived from a user‑supplied logo. Use the brand's official vector logo if available.
- Resource files referenced by `url`: the two PDFs live in `assets/` in the prototype; the two scripts point to Google Docs; recordings point to Google Drive. Re‑host these appropriately in production.

## Fonts/icons note
Icons in the prototype are Unicode glyphs (▶, ✕, ⌕, ♪, ●). Replace with the codebase's icon set (e.g. Lucide/Heroicons) for crispness and consistency.
