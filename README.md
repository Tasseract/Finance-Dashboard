# Lumen Finance

A glassmorphic, Material-flavoured personal finance dashboard. Built with Next.js 16, React 19,
Tailwind CSS 4, Recharts, Framer Motion and Supabase. Deploys to Vercel.

There is no ingestion pipeline yet, so entries are typed in by hand: name, amount, type,
category, date and an optional note. Pressing **Send** pushes the row into the dashboard and
every tile and chart recomputes.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys the app runs in **Local mode** and keeps
data in the browser's `localStorage`. Use **Load sample data** to see it populated.

## Connect Supabase

1. Create a project at https://supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. Restart `npm run dev`. The header chip switches from *Local mode* to *Supabase*.

The phase-1 policies let the anon key read, insert and delete rows. That is fine for a
single-user prototype, but add Supabase Auth and per-user row-level security before sharing
the URL.

## Deploy to Vercel

```bash
npx vercel
```

Add the two `NEXT_PUBLIC_SUPABASE_*` variables in the Vercel project settings
(Environment Variables) and redeploy. No other configuration is required.

## Project layout

```
src/app/            layout, page, global theme tokens (light + dark)
src/components/     Dashboard, EntryForm, charts, tiles, 3D hero, UI primitives
src/lib/            types, store adapters (Supabase / local), analytics, formatting
supabase/schema.sql database schema + RLS policies
public/hero/        drop a Blender render named coin.png here to replace the CSS orb
```

## Design notes

- Theme tokens live on `:root` in `src/app/globals.css`; dark mode follows the OS and can
  be overridden with the toggle (persisted in `localStorage`).
- Chart colours use a colour-blind-validated palette: aqua for income, orange for expenses,
  blue for net. Text never wears a series colour.
- Fields follow the Material "filled" text-field pattern with floating labels; buttons have
  a ripple.
