# Frontend Modular Revamp Plan

**Goal:** Replace the single 474-line page + 802-line CSS with small, paste-friendly modules and a cleaner UI. Keep the backend untouched and preserve search, suggestions, pagination, AI Mode, and dark/light themes.

**Architecture:** Real routes (`/` home, `/search?q=&page=&ai=1`). Server `page.tsx` files are thin wrappers; all interactive UI lives in focused client components. Data access is split by endpoint. Each hook owns one concern. Styling uses Tailwind utilities plus a small token-only `globals.css`.

**Tech:** Next.js 16.4 App Router, React 19, Tailwind CSS 4, lucide-react, cva.

## Constraints

- Do not modify `backend/`.
- Keep the existing API contract: `/search`, `/suggest`, `/api/ai-answer`, `/health`.
- Keep dark mode default and the existing `theme` localStorage key.
- Every file should stay small (roughly < 150 lines) and have one job.
- Build and lint must pass.

## File Map

```
src/app/
  layout.tsx                 root metadata + pre-paint theme script
  page.tsx                   -> HomeView
  search/page.tsx            -> Suspense + SearchView
  globals.css                tokens, base, 3 animations

src/components/
  brand/logo.tsx
  layout/app-shell.tsx
  layout/theme-toggle.tsx
  home/home-view.tsx
  search/search-view.tsx
  search/search-header.tsx
  search/search-bar.tsx
  search/suggestions-list.tsx
  results/results-section.tsx
  results/results-meta.tsx
  results/result-card.tsx
  results/favicon.tsx
  results/engine-badges.tsx
  results/results-skeleton.tsx
  results/empty-state.tsx
  results/error-state.tsx
  results/pagination.tsx
  ai/ai-panel.tsx
  ai/ai-answer.tsx
  ai/ai-sources.tsx
  ai/ai-thinking.tsx

src/hooks/
  use-search.ts
  use-suggestions.ts
  use-ai-answer.ts
  use-theme.ts

src/lib/
  api/client.ts
  api/search.ts
  api/suggest.ts
  api/ai.ts
  api/health.ts
  api/types.ts
  api/index.ts
  highlight.tsx
  search-url.ts
  url.ts
  utils.ts
```

## Tasks

- [x] 1. Replace `globals.css` with design tokens, base styles, and minimal animations.
- [x] 2. Split `lib/api.ts` into typed per-endpoint modules.
- [x] 3. Add hooks: search, suggestions, AI stream, theme.
- [x] 4. Add shared UI: logo, app shell, theme toggle, rewritten button.
- [x] 5. Build home hero with reusable search bar + suggestions.
- [x] 6. Add `/search` route with header, URL-driven state, AI toggle.
- [x] 7. Split results into card, badges, meta, skeleton, empty/error, pagination.
- [x] 8. Split AI Mode into panel, answer renderer, thinking state, sources.
- [x] 9. Delete the old monolith components and verify no stale imports.
- [x] 10. Run `pnpm build` + `pnpm lint`, fix issues, smoke-test routes.

## Review Focus

- Empty query does nothing.
- Rapid searches only apply the latest response.
- Back/forward and shared URLs restore query, page, and AI state.
- Backend down shows the error card and retry works.
- Suggestions: keyboard, click, escape, click-outside.
- AI Mode streams, cites, lists sources, closes cleanly.
- Light/dark themes cover every surface.
- Mobile layout stays usable.
