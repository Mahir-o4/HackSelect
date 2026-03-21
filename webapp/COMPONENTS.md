# HackSelect — Component Documentation

> All components live under `components/dashboard/` unless noted otherwise.  
> Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · TanStack Table v8 · Lucide icons

---

## Table of Contents

1. [DashboardNavbar](#1-dashboardnavbar)
2. [Sidebar](#2-sidebar)
3. [HackathonHeader](#3-hackathonheader)
4. [TeamsTable](#4-teamstable)
5. [FilterModal](#5-filtermodal)
6. [AnalysisLoader](#6-analysisloader)
7. [DetailsDrawer](#7-detailsdrawer)
8. [ComparePanel](#8-comparepanel)
9. [CreateHackModal](#9-createmackmodal)
10. [DefaultPage](#10-defaultpage)
11. [TeamSummaryPanel](#11-teamsummarypanel) *(legacy, unused)*
12. [TabBar](#12-tabbar) *(legacy, unused)*
13. [App State Machine — how it all connects](#13-app-state-machine)

---

## 1. `DashboardNavbar`

**File:** `components/dashboard/DashboardNavbar.tsx`  
**Used in:** `app/(dashboard)/dashboard/layout.tsx`

A fixed floating pill navbar rendered at the top of every dashboard page. Same visual shape as the landing page navbar — `80vw` wide, rounded-2xl, backdrop blur — but dashboard-specific with only a **Logout** button.

### Props
None — fully self-contained.

### Visual structure
```
[ HackSelect ]                    [ Logout ↗ ]
```

### Notes
- `fixed top-5 left-1/2 -translate-x-1/2` — always centred on the viewport
- Logout button turns red on hover via inline `onMouseEnter/Leave` handlers
- The logout button currently has no action wired — connect it to your auth `signOut()` call

---

## 2. `Sidebar`

**File:** `components/dashboard/Sidebar.tsx`  
**Used in:** `app/(dashboard)/dashboard/layout.tsx`

Collapsible left sidebar showing the brand logo, list of hackathons, a "New Hackathon" button, and a Logout button at the bottom.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `hackathons` | `{ name: string }[]` | List of hackathon names to render as nav links |
| `onCreateHackathon` | `() => void` | Called when the "+ New Hackathon" button is clicked |

### Behaviour
- Collapses to `68px` / expands to `240px` via Framer Motion `animate={{ width }}`
- A floating circular toggle button sits on the right edge (`-right-3`) — clicking it toggles collapsed state
- Hackathon links navigate to `/dashboard/[hackathon.name]`
- Each hackathon gets a coloured dot (hue cycles through greens/yellows)
- Labels, section headers, and button text fade out on collapse using `AnimatePresence`

---

## 3. `HackathonHeader`

**File:** `components/dashboard/HackathonHeader.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

The page-level header shown inside each hackathon's dashboard view. Displays the hackathon name, participant/team counts, and a "Send Mail" button.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `hackathonName` | `string` | Displayed as the `<h1>` |
| `totalParticipants` | `number` | Shown in the subtitle line |
| `totalTeams` | `number` | Shown in the subtitle line |
| `hackathonId` | `string` | Sent to `/api/send-mail` POST body |
| `spots` | `number?` | If provided, shown as "· N spots" — used after analysis to show selected count |

### Notes
- Send Mail button is currently `disabled` (hardcoded). Remove the `disabled` prop to enable it.
- On success it fires a `toast.success`, on failure a `toast.error` via `sonner`

---

## 4. `TeamsTable`

**File:** `components/dashboard/TeamsTable.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

The main data table for the hackathon dashboard. Built on **TanStack Table v8** with a custom toolbar that includes tabs, search, and action buttons — all in one component.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `teams` | `Team[]` | The teams to render in the table (already filtered by tab in the parent) |
| `allTeams` | `Team[]` | Full unfiltered list — used for tab counts |
| `hasAnalysisRun` | `boolean` | Controls whether selected/unselected tabs and action buttons are shown |
| `activeTab` | `TabType` | `"all" \| "selected" \| "unselected"` |
| `onTabChange` | `(tab) => void` | Called when a tab button is clicked |
| `selectedCount` | `number` | Badge count on the Selected tab |
| `unselectedCount` | `number` | Badge count on the Unselected tab |
| `onDetails` | `(team) => void` | Opens `DetailsDrawer` for a team |
| `editMode` | `boolean` | Shows `−` buttons on selected tab, `+` buttons on unselected tab |
| `onEdit` | `() => void` | Enters edit mode |
| `onSave` | `() => void` | Exits edit mode |
| `onRemoveTeam` | `(teamId) => void` | Removes team from selected set |
| `onAddTeam` | `(teamId) => void` | Adds team to selected set |
| `compareMode` | `boolean` | Shows checkboxes on each row |
| `onCompare` | `() => void` | Toggles compare mode on/off |
| `checkedTeamIds` | `Set<string>` | Which teams have their compare checkbox ticked |
| `onToggleCheck` | `(teamId) => void` | Toggles a team's checkbox |
| `onModify` | `() => void` | Re-opens the FilterModal |

### Toolbar layout
```
[ Selected | Unselected | All ]          [flex-1 spacer]  [ Search… ] | [ Modify ] [ Compare ] [ Edit/Save ]
```

### Table columns
| Column | Sortable | Notes |
|--------|----------|-------|
| *(checkbox)* | No | Only visible in compare mode |
| `#` | No | Row index, 1-based |
| Team Name | Yes | Click to expand/collapse participant sub-row |
| Members | Yes | `participant.length` |
| Score | Yes | `totalScore`, shows `—` if undefined |
| Actions | No | Details button + conditional `+`/`−` |

### Search
Client-side (`useMemo`). Searches across `teamName`, member `name`, `email`, and `githubUsername` simultaneously.

### Expanded sub-row
Clicking a team name chevron toggles an animated sub-row showing all participants: avatar initial, name, email, GitHub handle, phone.

### `Team` type (exported)
```ts
interface Team {
  teamId: string
  teamName: string
  createdAt: string
  hackathonId: string
  participant: Participant[]
  totalScore?: number
}
```

### `TabType` (exported)
```ts
type TabType = "all" | "selected" | "unselected"
```

---

## 5. `FilterModal`

**File:** `components/dashboard/FilterModal.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

A configuration form for the ML analysis run. Lets the organiser pick data sources, set the total team count, and split skill quotas using a **dual-thumb slider**.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `onNext` | `(data: FieldsData) => void` | Called with the config when "Run Analysis →" is clicked |
| `onBack` | `(() => void)?` | If provided, renders a Back button bottom-left |

### `FieldsData` type (exported)
```ts
interface FieldsData {
  sources: { github: boolean; resume: boolean }
  totalTeams: number
  quotas: { beginner: number; intermediate: number; expert: number }
}
```

### Sections

**Data Sources**  
Two `CheckRow` components (GitHub, Resume). Each is a `<div role="checkbox">` — not a `<button>` — to avoid the nested button hydration error. Keyboard accessible via `onKeyDown` (Space/Enter).

**Team Limit**  
`NumberSpinner` (from `components/ui/numberspinner`) to set total teams to select.

**Skill Distribution — Dual-thumb Slider (`QuotaSlider`)**  
A custom slider with two draggable thumbs:
- **Thumb A** — splits Beginner vs Intermediate at `thumbA%`
- **Thumb B** — splits Intermediate vs Expert at `thumbB%`
- Both snap to 10% increments
- Drag is handled via `mousemove`/`touchmove` event listeners attached to `window`
- Min gap between thumbs is always 10%
- Three count cards below show the computed team counts (e.g. 30% of 20 = 6 teams)

---

## 6. `AnalysisLoader`

**File:** `components/dashboard/AnalysisLoader.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

A 10-second animated loading screen shown while the backend ML analysis "runs". Pure frontend — no real API call. Calls `onComplete` after 10 seconds.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `onComplete` | `() => void` | Called after 10 seconds + 400ms exit delay |

### Animation sequence
| Step | Duration | Label |
|------|----------|-------|
| 1 | 0 – 2.5s | Fetching GitHub profiles |
| 2 | 2.5 – 5s | Parsing resumes |
| 3 | 5 – 7s | Scanning LinkedIn data |
| 4 | 7 – 10s | Running ML scoring model |

Each step transitions from dimmed → active (with pulsing `...`) → done (green check icon) as time elapses. A pulsing accent-coloured orb sits above the progress bar.

### Notes
- Progress is driven by a `setInterval` at 50ms ticks
- Swap `TOTAL_DURATION` and `STEPS[].duration` to adjust timing
- Replace this with a real loading state once your backend is connected

---

## 7. `DetailsDrawer`

**File:** `components/dashboard/DetailsDrawer.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

A right-side slide-in drawer showing detailed info for a selected team. Per-member cards include contact info and three source score rows (GitHub, LinkedIn, Resume) each with a **circle score badge**.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `team` | `Team \| null` | The team to display. Passing `null` closes/hides the drawer |
| `onClose` | `() => void` | Called when the × button or backdrop is clicked |

### Layout
```
[ Team Name ]                    [ ★ score ]  [ × ]
──────────────────────────────────────────────────
  N members
──────────────────────────────────────────────────
  ┌─────────────────────────────────────────────┐
  │  ● Avatar   Name                            │
  │             email · phone                   │
  │  ─────────────────────────────────────────  │
  │  ⌥ @username                          ( 84) │  ← GitHub row
  │  in linkedin-handle                   ( 91) │  ← LinkedIn row  
  │  ┌──────────────────────────────────┐       │
  │  │ 📄 resume/>                ( 76) │       │  ← Resume row (contained)
  │  └──────────────────────────────────┘       │
  └─────────────────────────────────────────────┘
  [ next member card... ]
```

### Score circles
Each source has a `ScoreCircle` — a `w-9 h-9` rounded div with a coloured ring border.

| Source | Colour | Shows |
|--------|--------|-------|
| GitHub | Cool grey-white | `@username` if available, else dimmed `github/>` |
| LinkedIn | Blue | Extracted handle from URL (strips `linkedin.com/in/`) |
| Resume | Violet/purple | Always shows `resume/>` label, kept in a dark container |

When scores aren't present yet (`githubScore`, `linkedinScore`, `resumeScore` are `undefined`), the circle shows `—` with a faint ring.

### Score fields
These are optional extensions on `Participant` — your backend should add them:
```ts
participant.githubScore?: number   // 0–100
participant.linkedinScore?: number // 0–100
participant.resumeScore?: number   // 0–100
```

### Scrolling
The member list is `flex-1 overflow-y-auto` — it scrolls independently while the header and stats bar stay fixed. Works correctly with 5, 10, or 20+ members.

---

## 8. `ComparePanel`

**File:** `components/dashboard/ComparePanel.tsx`  
**Used in:** `app/(dashboard)/dashboard/[hackathonId]/page.tsx`

A right-side slide-in panel that lists the currently checked teams and generates a comparison with a winner, reasons, and ranked list. Currently uses **placeholder logic** (no AI API call).

### Props
| Prop | Type | Description |
|------|------|-------------|
| `teams` | `Team[]` | The checked teams to compare (filtered from `checkedTeamIds` in parent) |
| `onClose` | `() => void` | Closes the panel and clears checked state |

### Comparison logic (`generatePlaceholder`)
1. Sorts teams by `totalScore` descending
2. Winner = highest scoring team
3. Three hardcoded reason strings (first personalised with winner name)
4. Rankings list with summaries for 1st, last, and mid-tier positions

A 600ms artificial delay is added via `setTimeout` so the bouncing-dots loader shows briefly, making it feel like computation happened.

### States
| State | Shown when |
|-------|-----------|
| Empty state | `teams.length < 2` |
| Loading (bouncing dots) | `teams.length >= 2` and result not yet generated |
| Result | Winner card + rankings list |

### Notes
- The panel re-generates whenever the set of checked team IDs changes (tracked by a `useRef` key string)
- To swap in real AI: replace `generatePlaceholder` with an Anthropic API call in `ComparePanel.tsx`

---

## 9. `CreateHackModal`

**File:** `components/dashboard/CreateHackModal.tsx`  
**Used in:** `app/(dashboard)/dashboard/layout.tsx`

A modal dialog for creating a new hackathon. Accepts a name and a CSV file of participants.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Called on cancel or after successful creation |
| `onCreate` | `(h: { name: string; participants: string[] }) => void` | Called with the new hackathon data |

### CSV parsing
Uses `papaparse`. Reads the first column of each row as participant names. Previews up to 8 names with a "+N more" overflow indicator.

### Notes
- Drag-and-drop and click-to-upload both supported
- `onCreate` is called immediately with local state — no API call here. Wire up your `POST /api/hackathon` inside or after `onCreate` in the layout.

---

## 10. `DefaultPage`

**File:** `components/dashboard/DefaultPage.tsx`  
**Used in:** `app/(dashboard)/dashboard/page.tsx`

A full-height empty state shown when no hackathon is selected. Dashed border box with an upload icon and prompt text.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `onClick` | `() => void` | Called when the box is clicked (should open `CreateHackModal`) |

---

## 11. `TeamSummaryPanel` *(legacy)*

**File:** `components/dashboard/TeamSummaryPanel.tsx`

A chat-style slide-in panel for asking questions about a team. **No longer used** — replaced by `DetailsDrawer`. Kept in the codebase but not rendered anywhere in the current flow.

If you want to re-enable it: it accepts `team: Team | null` and `onClose: () => void`. The chat responses are placeholder strings — connect to the Anthropic API to make it functional.

---

## 12. `TabBar` *(legacy)*

**File:** `components/dashboard/TabBar.tsx`

A standalone tab bar component that was extracted before being merged into `TeamsTable`. **No longer used** — the tab + action button UI now lives inside `TeamsTable`'s toolbar. Safe to delete.

---

## 13. App State Machine

The hackathon page (`app/(dashboard)/dashboard/[hackathonId]/page.tsx`) drives everything via a single `appState` variable.

```
"loading_teams"
      │  (fetch completes)
      ▼
   "idle"  ──── (Run Analysis button) ────▶  "filter"
      ▲                                          │
      │                                   (Run Analysis →)
      │                                          ▼
      │                                    "analysing"
      │                                          │
      │                                  (10s timer fires)
      │                                          ▼
      └──────────────────────────────────────"results"
                                                 │
                                          (Modify button)
                                                 │
                                            "filter" again
```

### State descriptions
| State | What renders |
|-------|-------------|
| `loading_teams` | Pulsing "Loading teams..." text |
| `idle` | `TeamsTable` (all tab only) + "Run Analysis" CTA bar at bottom |
| `filter` | Centred `FilterModal` card |
| `analysing` | `AnalysisLoader` (10s progress screen) |
| `results` | `TeamsTable` with all 3 tabs + Modify/Compare/Edit buttons |

### Side panels (layered on top of any state)
| Panel | Triggered by |
|-------|-------------|
| `DetailsDrawer` | Clicking "Details" on any table row |
| `ComparePanel` | Clicking "Compare" in toolbar (only in `results` state) |

---

## UI Component Reference (`components/ui/`)

| File | What it is |
|------|-----------|
| `table.tsx` | shadcn-style `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>` wrappers |
| `checkbox.tsx` | Small `<button>` checkbox with accent fill + SVG checkmark. **Do not nest inside another `<button>`** |
| `numberspinner.tsx` | +/− number input used in FilterModal for team limit |
| `button.tsx` | CVA-based button with `variant` and `size` props |
| `input.tsx` | Styled text input |
| `dialog.tsx` | Radix Dialog wrapper |
| `dropdown-menu.tsx` | Radix DropdownMenu wrapper |
| `badge.tsx` | Small pill badge |
| `progress.tsx` | Progress bar |
| `sonner.tsx` | Toast provider (wrap root layout with `<Toaster />`) |

---

## Common Patterns

### Inline style vs Tailwind
All colour values use CSS variables (`hsl(var(--accent))`, `hsl(var(--border))`, etc.) via inline `style` props rather than Tailwind colour classes. This is intentional — it ties everything to your theme and makes dark/light mode switching work automatically.

### Hover states without `:hover` classes
Interactive elements that need precise hover colours use `onMouseEnter`/`onMouseLeave` handlers that mutate `e.currentTarget.style` directly. This avoids Tailwind's `hover:` prefix needing to know exact HSL values at compile time.

### Animation
All transitions use **Framer Motion**. Drawers use `x: "100%"` → `x: 0` spring animations. The `AnimatePresence` wrapper is required around any conditionally rendered motion component for exit animations to work.
