# AI Mode (Nemotron) Implementation Plan

**Goal:** Add a Google-style AI Mode panel to the Next.js frontend that streams grounded answers from the backend `/api/ai-answer` (NVIDIA Nemotron), with [n] citations, sources panel, thinking state, and an on/off toggle.

**Architecture:** New `AiModePanel` React component streams `aiAnswer()` SSE from `src/lib/api.ts`, renders answer text with clickable `[n]` citation badges linked to sources, plus an expandable sources table. Integrated into `page.tsx` above search results; gated by an AI mode toggle chip in the header. Backend already built (NVIDIA Nemotron, `/api/ai-answer`).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, lucide-react.

**Spec:** Conversation request. Backend `.env` has `NVIDIA_API_KEY=` (empty) — user must set their NVIDIA key for LLM answers; fallback snippet mode works without it.

**Global Constraints:**
- Branch `dev2`; commit all work there.
- Do not modify backend code.
- Dark mode must work via existing theme toggle.
- `aiAnswer` generator yields `{type:"text",content}` and `{type:"sources",sources}`.

**Review Focus:**
- Empty query → no AI call, panel stays idle.
- Backend unreachable / key missing → error state, falls back gracefully.
- Abort in-flight stream on new query / toggle off.
- `[n]` citations map 1:1 to sources array; missing source renders plain text.
- Dark mode: all AI panel surfaces use CSS variables (no hardcoded #fff/#000).

---

### Task 1: Create `src/components/ai-mode.tsx`

**Files:** Create `frontend/src/components/ai-mode.tsx`

**Interfaces:**
- `AiModePanel` consumes: `query: string`, `enabled: boolean`, `onToggle: (b)=>void`
- Produces: calls `aiAnswer(query)` when enabled+query; renders panel

Steps:
- [ ] Write `AiModePanel` with states: idle/thinking/answer/error
- [ ] Stream `aiAnswer()` into answer text; capture sources
- [ ] Render `[n]` citations as clickable badges → highlight source
- [ ] Thinking state: marquee of source favicons + "Generating answer…"
- [ ] Sources panel: table with favicon, title, URL; expandable
- [ ] Abort controller cleanup on unmount / new query / toggle off
- [ ] `pnpm build` passes

### Task 2: Integrate into `page.tsx`

**Files:** Modify `frontend/src/app/page.tsx`

**Interfaces:**
- Adds `aiMode` state (boolean), renders `AiModePanel` above `SearchResults` when search active

Steps:
- [ ] Add `aiMode` state + toggle chip in header
- [ ] Render `AiModePanel` above results when searching + aiMode on
- [ ] `pnpm build` passes

### Task 3: CSS + commit

**Files:** Modify `frontend/src/app/globals.css`

Steps:
- [ ] Add AI mode panel CSS (card, header, answer, citations, sources table, marquee, thinking)
- [ ] `pnpm build` + `pnpm lint` clean (my files)
- [ ] Commit on `dev2`