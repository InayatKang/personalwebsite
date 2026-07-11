# Inayat Kang — Portfolio

Completely new frontend. The old Arlo template has been removed.

## Preview

```bash
python -m http.server 8765
```

Open http://127.0.0.1:8765/

## Structure

- `index.html` — full static homepage (all content visible without JS)
- `projects/*.html` — dedicated project case studies
- `css/main.css` — design system
- `js/main.js` — nav, timeline, newsletter, contact, starfield
- `data/*.json` — content reference for easy updates
- `img/` — images

## Update content

Edit `index.html` / project pages for live content, or update `data/*.json` as your source of truth and regenerate pages.
