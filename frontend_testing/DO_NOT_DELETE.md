# DEV ONLY. NEVER DELETE. NEVER SHIP.

This folder and its twin inside the app, `frontend_react/apps/web/src/frontend_testing/`, are the
frontend's test tooling. They are kept on purpose, even when nothing seems to use them.

- **Do not delete, move or "clean up"** either folder, or any file in them. Not to shrink a diff, not
  to tidy the repo, not because a search finds no importer.
- **`pnpm --filter @eventmind/web type-check` fails if they go missing**
  (`apps/web/scripts/check-frontend-testing.mjs`). Do not weaken or remove that script to make the
  check pass. Restore the folder instead (`git checkout -- frontend_testing`).
- **Never ship it.** Nothing in this root folder is imported by the app. The in-app folder is dead
  code in a production build because every flag is `NODE_ENV === "development" && …`.

Purpose, contents and how to run: [`README.md`](README.md).
