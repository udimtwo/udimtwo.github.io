# UDimTwo — portfolio

Personal portfolio for **UDimTwo** (Ryan) — Roblox systems engineer.

Static site, no build step and no dependencies. Three files do everything:

| File | What's in it |
|---|---|
| `index.html` | All content and structure |
| `style.css` | Design system, layout, responsive rules |
| `main.js` | Hero canvas, treadmill simulator, systems filter, PST clock, shortcuts |

## Run it locally

Any static server works. With Python:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>.

## Deploy

Hosted on GitHub Pages. Pushing to `main` publishes automatically — there is no
build step, GitHub serves the files as-is.

```bash
git add -A && git commit -m "Update site" && git push
```

## Editing notes

- **Systems grid** — edit the `SYSTEMS` array near the top of `main.js`. Each entry is
  `['Name', 'Category']`; categories and their colours live in the `CATS` object
  directly above it. The filter pills and counts build themselves from that data.
- **Colours** — every colour is a CSS variable in the `:root` block at the top of
  `style.css`. `--trail` is the orange → violet → cyan gradient used throughout.
- **Timezone** — the clock reads `America/Los_Angeles`, so it follows PST/PDT
  automatically. The "usually reachable" window is 09:00–24:00 local, set in the
  `tick()` function in `main.js`.
- **Adding a project** — copy an `<article class="card">` block in the `#work`
  section of `index.html`.
