# Copilot Instructions

## Project Overview

**Nothing But Shiva** is a static GitHub Pages website dedicated to sacred literature inspired by Lord Shiva. It serves books (PDF), articles (Markdown → HTML), and informational pages — all free to read online.

**Live site:** https://nothingbutshiva.github.io/

## Tech Stack

- **Plain HTML, CSS, and vanilla JavaScript** — no frameworks, no bundlers, no package manager.
- **Pico CSS v2** (CDN) — classless CSS framework used for base styling.
- **PDF.js v4** (CDN) — renders PDFs in the browser-based reader.
- **Pandoc** — converts Markdown files in `markdown/` to HTML pages in `pages/` during CI (see `build.yml`).
- **GitHub Pages** — hosting via GitHub Actions deploy.

## Project Structure

```
index.html              # Homepage (books, articles, about)
assets/
  css/style.css         # All custom styles (single file)
  js/main.js            # All custom JS (single file, IIFE, 'use strict')
  images/               # Static images
books/
  catalog.json          # Book metadata (JSON array)
  covers/               # Book cover images
  *.pdf                 # PDF book files
reader/
  index.html            # PDF reader page
  reader.js             # PDF.js rendering logic
articles/
  index.html            # Articles listing page
pages/                  # Generated HTML pages (from markdown/, do not edit)
markdown/
  *.md                  # Article source files (Pandoc markdown)
  template.html         # Pandoc HTML template for articles
html/
  index.html            # Additional static pages
.github/workflows/
  build.yml             # CI: Pandoc conversion, sitemap generation, Pages deploy
```

## Coding Conventions

### HTML
- Use semantic HTML5 elements.
- Include Open Graph and Twitter Card meta tags on all pages.
- Use emoji-based favicon (`🕉️`).
- Load Pico CSS from CDN before custom styles.

### CSS
- All custom styles go in `assets/css/style.css` (single file).
- Use CSS custom properties for theming (light/dark via `data-theme` attribute on `<html>`).
- Pico CSS handles base typography and form styles — custom CSS extends it.

### JavaScript
- All custom JS goes in `assets/js/main.js` (single file, wrapped in an IIFE with `'use strict'`).
- Use ES5-compatible syntax (`var`, `function`, no arrow functions, no template literals) for broad browser support.
- Expose shared utilities via `window.NBS` namespace.
- Always escape user/dynamic content with `escapeHtml()` before inserting into DOM.

### Content
- Book metadata lives in `books/catalog.json`. Each entry has: `id`, `title`, `author`, `description`, `cover`, `pdf`.
- Articles are written in Markdown (`markdown/*.md`) and converted to HTML by Pandoc using `markdown/template.html`.
- Do **not** edit files in `pages/` directly — they are generated from `markdown/` during CI.

### General
- No build tools or package manager — the site runs as plain static files.
- Keep dependencies minimal; prefer CDN-hosted libraries.
- Maintain dark/light theme support for all new UI components.
- Use accessible markup (ARIA labels, semantic elements, keyboard navigation).
