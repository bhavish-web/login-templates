# LoginKit

50 free login form templates — 10 layout concepts × 5 color/type systems —
browsable in a live gallery with search, filters, and instant code copy.

## Structure

- `index.html`, `styles.css`, `app.js` — the gallery site
- `forms/` — 50 standalone HTML templates (one file each, zero dependencies
  beyond a Google Fonts link)
- `app-data.js` — generated manifest + embedded source of every template,
  so the gallery works opening `index.html` directly with no server
- `generate.py` — the generator; edit `PALETTES` or `LAYOUTS` and re-run
  to add more templates

## Run locally

Just open `index.html` in a browser. To regenerate templates after editing
`generate.py`:

```bash
python3 generate.py
```

## License

MIT — see `LICENSE`.
