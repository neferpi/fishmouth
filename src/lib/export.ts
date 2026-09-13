import type { IntersectionResult, JointParams, Unit } from "./geometry";
import { unwrapToSvgPath } from "./geometry";

const MM_PER_IN = 25.4;

/** Scale factor so 1 drawing unit = 1 real mm on paper when printed at 100%. */
export function printScale(units: Unit): number {
  // SVG user units treated as mm for print CSS.
  return units === "in" ? MM_PER_IN : 1;
}

export function buildWrapSvg(
  result: IntersectionResult,
  params: JointParams,
  which: "branch" | "main" = "branch"
): string {
  const points =
    which === "main" ? result.mainHoleUnwrap : result.branchUnwrap;
  if (!points?.length) return "";

  const s = printScale(params.units);
  const pad = 10; // mm padding
  const widthMm =
    (which === "main" ? result.mainCircumference : result.branchCircumference) *
      s +
    pad * 2;
  const rawH = Math.max(...points.map((p) => p.v), 1e-6);
  const heightMm = rawH * s + pad * 2 + 24; // room for title

  const path = unwrapToSvgPath(points, {
    scale: s,
    padX: pad,
    padY: pad + 18,
    invertV: false,
    height: rawH,
  });

  // Baseline + tick marks every 1/8 circ
  const circ =
    which === "main" ? result.mainCircumference : result.branchCircumference;
  const ticks: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = (i / 8) * circ * s + pad;
    ticks.push(
      `<line x1="${u.toFixed(2)}" y1="${(pad + 18).toFixed(2)}" x2="${u.toFixed(2)}" y2="${(pad + 18 + rawH * s).toFixed(2)}" stroke="#94a3b8" stroke-width="0.2" stroke-dasharray="1 2"/>`
    );
  }

  const title =
    which === "main"
      ? `Fishmouth — main hole pattern`
      : params.jointType === "miter"
        ? `Fishmouth — miter wrap`
        : `Fishmouth — branch wrap (fishmouth)`;

  const meta = [
    `joint=${params.jointType}`,
    `mainOD=${params.mainOd}${params.units}`,
    `branchOD=${params.branchOd}${params.units}`,
    `angle=${params.angleDeg}°`,
    `offset=${params.offset}${params.units}`,
    `scale=100% (1 SVG mm = 1 mm)`,
  ].join(" · ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm.toFixed(2)}mm" height="${heightMm.toFixed(2)}mm" viewBox="0 0 ${widthMm.toFixed(2)} ${heightMm.toFixed(2)}">
  <title>${title}</title>
  <desc>${meta}</desc>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad}" y="12" font-family="ui-sans-serif,system-ui,sans-serif" font-size="4" fill="#0f172a">${title}</text>
  <text x="${pad}" y="${(heightMm - 4).toFixed(2)}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="2.8" fill="#64748b">${meta} — shop aid; verify on scrap</text>
  <rect x="${pad}" y="${pad + 18}" width="${(circ * s).toFixed(2)}" height="${(rawH * s).toFixed(2)}" fill="none" stroke="#cbd5e1" stroke-width="0.3"/>
  ${ticks.join("\n  ")}
  <path d="${path}" fill="none" stroke="#e11d48" stroke-width="0.5" stroke-linejoin="round"/>
  <line x1="${pad}" y1="${(pad + 18).toFixed(2)}" x2="${(pad + circ * s).toFixed(2)}" y2="${(pad + 18).toFixed(2)}" stroke="#0f172a" stroke-width="0.35"/>
</svg>`;
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a print window sized to the SVG for Save-as-PDF at 100% scale. */
export function printSvgAsPdf(svg: string, title = "fishmouth-wrap") {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  @page { margin: 10mm; size: auto; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .hint { font: 12px system-ui; color: #64748b; margin: 8px; }
  svg { display: block; max-width: 100%; }
</style></head><body>
<p class="hint">Print → Destination: Save as PDF · Scale: 100% / Actual size · Disable “Fit to page”.</p>
${svg}
<script>window.onload=()=>{setTimeout(()=>window.print(),200)}<\/script>
</body></html>`);
  w.document.close();
}
