<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rule

- Architecutre: monolith next js, frontend and backend are in the same repo, but use api for integration instead of server action
- API Pattern: use /api/v1 prefix for every API
- UI Pattern: use shadcn/ui which already installed, color, radiuse, and font only use from globals.css
- Avoid: custom hex in the code, glassmorphism
- Keep: design pattern from shadcn/ui
