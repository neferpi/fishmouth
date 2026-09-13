# Fishmouth

**Interactive pipe–pipe intersection workspace** — unwrap printable wrap templates for cutting fishmouths / saddles / miters.

Free · MIT · by [neferpi](https://github.com/neferpi)

> Shop aid only. Thin-wall development from **outside diameter**. Always dry-fit and **verify on scrap**. Kerf, wall thickness, bevel, and code compliance are **not** modeled.

## Pitch

Two round pipes meet in 3D → you get:

1. An orbitable joint with the intersection curve highlighted  
2. A 2D wrap template for the branch (fishmouth / saddle) or miter  
3. A main-pipe hole pattern when the joint is a saddle  
4. SVG download + print-to-PDF at **100% scale**

Workspace feel over form-calculator chrome — tweak angle and offset and watch the cut update.

## Features (MVP)

| Feature | Status |
|--------|--------|
| Main OD, branch OD, angle (default 90°), lateral offset | ✅ |
| Joint types: saddle / fishmouth, miter (same-size) | ✅ |
| 3D view (Three.js) + orbit | ✅ |
| 2D unwrap, printable scale | ✅ |
| Export SVG (+ print/Save-as-PDF) | ✅ |
| Presets gallery | ✅ |
| Dark UI | ✅ |

**Out of scope:** multi-branch headers, CNC G-code, payments, auth.

## Stack

- Next.js App Router + TypeScript + Tailwind (`output: 'export'`)
- Three.js via React Three Fiber + Drei
- Static export — ready for GitHub Pages / any static host

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build   # writes static site to out/
```

## Deploy (GitHub Pages)

Repo: [neferpi/fishmouth](https://github.com/neferpi/fishmouth)

1. `npm run build` → `out/`
2. Enable Pages → Deploy from branch `gh-pages` **or** GitHub Action uploading `out/`
3. If serving from a project site (`/fishmouth/`), set `basePath` / `assetPrefix` in `next.config.ts`

Suggested one-liner after build (orphan gh-pages branch):

```bash
npx gh-pages -d out
```

Or open `out/index.html` via any static server.

## Accuracy caveats

- Geometry is **OD cylinder ∩ OD cylinder** (or a planar miter).  
- Templates assume **zero wall thickness** for development; real pipe has ID/OD — grind and fit.  
- Offset + very oblique angles can produce partial or impossible intersections; the UI will warn.  
- Print SVG/PDF at **Actual size / 100%** — disable “fit to page”.  
- Not for pressure vessel / code-stamped work without independent verification.

## License

MIT © neferpi
