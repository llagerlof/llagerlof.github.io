# Repository Guidelines

## Project Structure & Module Organization

This is a Jekyll site published with GitHub Pages.

- Root entry: `index.html` (Jekyll home)
- Jekyll core: `_config.yml`, `_layouts/`, `_includes/`, `_posts/`, `_data/`
- Site sections: `games/`, `tools/`, `docs/`, `today-i-learned/`, `projetos/`
- Shared assets: `assets/`, `js/` (e.g., `js/jquery.min.js`)
- Self‑contained apps live under their own folders (e.g., `games/minesweeper/`, `tools/merger/`). Keep HTML, CSS, and JS together in that folder; prefer `index.html` as the entry.

## Build, Test, and Development Commands

No local build step is required for publishing. GitHub Pages builds Jekyll automatically on push.

- Local preview (optional): `bundle install` then `bundle exec jekyll serve --livereload` (open `http://127.0.0.1:4000/`)
- Static folders quick check (non-Jekyll apps): `python3 -m http.server 1234` and open `http://localhost:1234/`
- Link/asset check (manual): watch DevTools Network tab for 404s when navigating pages

## Coding Style & Naming Conventions

- Languages: HTML5, CSS3, vanilla JavaScript
- Indentation: 4 spaces; UTF‑8 encoding; Unix line endings
- Filenames/paths: lowercase with hyphens, keep app entry as `index.html`
- JavaScript: camelCase for variables/functions; constants in UPPER_SNAKE_CASE
- Keep apps self‑contained; use relative paths (e.g., `./assets/img.png`)

## Testing Guidelines

- Manual testing in latest Chrome/Firefox and a mobile viewport (DevTools)
- Verify: layout responsiveness, console free of errors, and no broken links/assets
- Game/tools pages: include minimal usage steps in the HTML (e.g., control hints)
- Optional coverage: not enforced; add lightweight unit tests only if you introduce non‑trivial logic and colocate them near the script (e.g., `component.test.js`)

## Commit & Pull Request Guidelines

- Commits: short, imperative subject (≤ 72 chars), e.g., `Add Minesweeper high scores`
- Group related changes per commit; avoid formatting‑only churn
- Branches: `feature/<slug>`, `fix/<slug>`, or `docs/<slug>`
- PRs must include:
  - Summary of changes and affected paths (e.g., `games/minesweeper/`)
  - Before/after screenshots or GIFs for UI changes
  - Local test steps (how you validated)
  - Linked issues (e.g., `Closes #123`) when applicable

## Security & Configuration Tips

- Do not commit secrets or API keys; this site is public
- Prefer first‑party/local scripts; vet any third‑party embeds
- Use relative URLs for internal links so local preview works

## Server

The current project is published in github pages. The published site is at `llagerlof.github.io` and the project is `https://github.com/llagerlof/llagerlof.github.io`.
