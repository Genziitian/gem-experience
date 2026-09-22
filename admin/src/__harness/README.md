# Harness

Opens the content pages without a database or a login, against an in-memory
stand-in for the Supabase client.

    npm run harness
    open http://localhost:5173/admin/src/__harness/harness.html?page=navigation

`?page=` takes `navigation`, `offices`, `contact`, `media` or `audit`.

The swap is a resolver plugin in `vite.config.js` scoped to `--mode harness`,
so nothing here reaches the production bundle — `src/main.jsx` never imports
it, and `npm run build` was checked for the stub's fixtures.

It exists because the content pages are the only screens whose whole job is
reading and writing rows, and the alternative to a stand-in is pointing a
developer's browser at live data to find out whether a reorder button works.
