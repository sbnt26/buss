# Frontend Implementation (Next.js App Router)

## Routing Structure
```
app/
├─ layout.tsx (auth-aware shell, main navigation, toasts provider)
├─ page.tsx (marketing/landing or redirect to /app when authenticated)
├─ signup/
│  └─ page.tsx
├─ onboarding/
│  └─ page.tsx
└─ app/
   ├─ layout.tsx (protected area, role-based navigation)
   ├─ page.tsx (dashboard)
   ├─ invoices/
   │  ├─ page.tsx (list)
   │  ├─ export/route.ts (CSV export action)
   │  └─ [id]/
   │     └─ page.tsx (detail view)
   ├─ clients/
   │  ├─ page.tsx (list)
   │  └─ new/page.tsx (create)
   └─ settings/
      ├─ page.tsx (company profile)
      ├─ numbering/page.tsx
      ├─ taxes/page.tsx
      └─ template-preview/page.tsx
```

## Pages & Responsibilities
- `/signup` → `/onboarding`: registration flow (email/password form, confirm password strength, progress indicator). On success, auto-login and redirect.
- `/onboarding`: multi-step company wizard (company data, bank details, defaults, logo upload preview).
- `/app` (dashboard): KPIs (revenue, VAT, unpaid), sparkline charts, recent invoices table, call-to-action to create invoice.
- `/app/invoices`: data grid with server-side pagination/views, quick filters (status, period, client, amount), saved filter presets, CSV export, row-level actions (view, mark as paid, resend).
- `/app/invoices/[id]`: invoice metadata summary, timeline/audit log, PDF preview/download button, resend + status transitions, activity sidebar.
- `/app/clients`: searchable list, per-row invoice count + total revenue, detail drawer, bulk actions (assign tags, export).
- `/app/clients/new`: form for creating client (with IČO lookup integration placeholder).
- `/settings`: tabs for company profile, numbering/prefixes, tax/VAT defaults, template preview (renders PDF HTML with current branding).

## Shared Layout & Navigation
- `app/layout.tsx`: sets document theme, global Tailwind base, Next Themes for dark mode, and mounts toaster.
- `app/app/layout.tsx`: enforces authentication using Server Component guard, fetches user + organization data, renders side navigation (role-aware) and top bar (search, notifications placeholder, account menu).
- Navigation highlights current section, collapses into bottom navigation on mobile via responsive layout components.

## Data Fetching & Caching
- Prefer **Server Components** and **Server Actions** for read-heavy pages (dashboard, invoice list) to leverage automatic caching and streaming. Use `revalidateTag`/`revalidatePath` on mutations.
- Mutations live in `/app/api` route handlers or Server Actions (`app/app/invoices/actions.ts`). Each returns optimistic response payload and revalidates affected caches.
- Use `swr`-style hooks only for highly interactive client components (e.g., search-as-you-type modals). Otherwise rely on Next.js data cache.
- Loading states: skeleton components for data grid rows, KPI cards, and detail pane.

## Forms & Validation
- `React Hook Form` + `ZodResolver` for type-safe forms. Each form schema mirrors backend DTO.
- Shared form components: `TextField`, `CurrencyField`, `SelectField`, `FileUploader`, `DateRangePicker`.
- Show inline validation (below fields) and toast-level errors for submission failures. Persist unsaved progress in local storage for multi-step onboarding.

## Feedback, Errors & Empty States
- Use `useTransition` to disable submit buttons during async mutations.
- Global error boundary wraps `/app` to display support-friendly error codes (surfacing `errorId` from backend when available).
- Provide contextual empty states: invoices list shows CTA to "Connect WhatsApp" or "Import clients" depending on onboarding status.
- Toast patterns:
  - Success: green accent, auto-dismiss 4s.
  - Warning/error: red accent, require manual dismissal for critical failures.

## Tables & Detail Views
- `TanStack Table` configured with column pinning, column visibility, CSV export integration, and keyboard shortcuts (`cmd+k` to open global search).
- Row selection persists across pagination via `useSelectedRows` hook keyed by invoice ID.
- Detail views fetch additional data (timeline, audit events, payment history) via parallel `Promise.all` server loaders to minimise latency.

## Styling & Design System
- Tailwind CSS with custom config (`tailwind.config.ts`) defining theme palettes, spacing, typography.
- Component library built on `@headlessui/react` primitives for modals, dialogs, dropdowns.
- Dark mode toggled via `next-themes`; ensure color tokens accessible in both modes (minimum contrast 4.5:1).
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px (desktop layout), `xl` 1280px (wide tables).

## Accessibility & Internationalization
- All interactive controls use semantic elements (`button`, `a`, `input`) with ARIA labels where necessary.
- Keyboard navigation supported (focus rings, `Tab` order verified). Modals trap focus and return to trigger on close.
- Copy and formatting localised for CS locale (currency `Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' })`). Prepare for multi-language by storing UI strings in translation files (`@/locales/cs.json`) with fallback to English.

## Observability & Analytics
- Integrate client-side logging via `@vercel/analytics` (optional) and capture UI errors through `Sentry` browser SDK when `SENTRY_DSN` set.
- Performance metrics: use `reportWebVitals` to send LCP/FID/CLS to monitoring endpoint.
- Toast on health check failure when `/api/health` returns degraded status (poll every 5 minutes in background for admins).

## Performance Guidelines
- Lazy-load heavy client components (`PDFPreview`) using dynamic imports with suspense fallback.
- Debounce inputs hitting APIs (search, filters) at 250ms.
- Preload common routes (invoices detail) via `<Link prefetch>` attributes when rows become visible.
- Leverage Next.js image optimization for logos and avatars; restrict uploads to 512×512.

## Testing & QA Hooks
- Data attributes (`data-testid`) provided on critical controls to support Playwright selectors (`data-testid="invoice-row"`).
- Visual regression coverage via Playwright `toHaveScreenshot` for dashboards and invoice detail.
- Storybook (optional) hosts isolated components for design review; keep stories adjacent to components for easier updates.
