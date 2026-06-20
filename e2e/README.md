# Health Core — UI end-to-end tests (Playwright)

Browser coverage for the redesigned "Personal Health OS" web app: shell + sidebar,
navigation across all 12 views, the Today Health OS digest/action surface,
charts/tiles, theme toggle + settings (accent/density), the Lab import/review
tab (under Gezondheid), and the Reports view (daily → yearly, incl.
quarterly/yearly). `verify.mjs` is a quick manual driver that screenshots
light/dark and reports console errors.

## Run

1. Stand up a demo Core (never the live DB) with seeded data:

   ```bash
   # build the API image if needed
   docker compose build core-api

   # seed a throwaway demo DB
   mkdir -p /tmp/demo
   docker run --rm -v "$HOME/health-core":/work -v /tmp/demo:/out -w /work \
     health-core-api:latest node scripts/seed-demo.mjs /out/core.db 60

   # serve it on :8099 with the live UI mounted (so UI edits need no rebuild)
   docker run -d --name health-core-test -p 127.0.0.1:8099:8090 \
     -v /tmp/demo:/core -v "$HOME/health-core/api/public":/app/public:ro \
     -e CORE_DB=/core/core.db health-core-api:latest
   ```

2. Install Playwright + Chromium (first time only) and run:

   ```bash
   cd e2e
   npm install
   npx playwright install chromium
   npx playwright test            # BASE_URL defaults to http://localhost:8099
   ```

   Point at another instance with `BASE_URL=http://host:port npx playwright test`.

3. Tear down: `docker rm -f health-core-test`.

## Notes

- The lab spec only **parses** (read-only); it does not commit. The Today spec
  mocks its digest/action API calls and verifies the recommendation lifecycle
  POST shape without mutating a live Core.
- `playwright.config.js` runs headless Chromium only, parallel, with traces
  retained on failure (`test-results/`).
