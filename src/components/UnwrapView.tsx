"use client";

import { useMemo } from "react";
import type { IntersectionResult, JointParams } from "@/lib/geometry";
import { printScale } from "@/lib/export";

export function UnwrapView({
  result,
  params,
  which = "branch",
}: {
  result: IntersectionResult;
  params: JointParams;
  which?: "branch" | "main";
}) {
  const points =
    which === "main" ? result.mainHoleUnwrap : result.branchUnwrap;

  const { path, width, height, circ, rawH, s, pad } = useMemo(() => {
    const pad = 8;
    const s = printScale(params.units);
    if (!points?.length) {
      return { path: "", width: 200, height: 80, circ: 0, rawH: 0, s, pad };
    }
    const circ =
      which === "main"
        ? result.mainCircumference
        : result.branchCircumference;
    const rawH = Math.max(...points.map((p) => p.v), 1e-6);
    const width = circ * s + pad * 2;
    const height = rawH * s + pad * 2;
    const d = points
      .map((p, i) => {
        const x = pad + p.u * s;
        const y = pad + p.v * s;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    return { path: d, width, height, circ, rawH, s, pad };
  }, [points, params.units, result, which]);

  if (!result.ok || !points?.length) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-500">
        {result.error ?? "No unwrap available"}
      </div>
    );
  }

  const label =
    which === "main"
      ? "Main hole pattern"
      : params.jointType === "miter"
        ? "Miter wrap template"
        : "Branch wrap (fishmouth)";

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-200">{label}</h3>
        <span className="font-mono text-[10px] text-slate-500">
          {circ.toFixed(2)} × {rawH.toFixed(2)} {params.units} · print 100%
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-950 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto h-auto w-full max-w-full"
          style={{ maxHeight: 220 }}
          role="img"
          aria-label={label}
        >
          <rect width={width} height={height} fill="#020617" />
          <rect
            x={pad}
            y={pad}
            width={circ * s}
            height={rawH * s}
            fill="none"
            stroke="#334155"
            strokeWidth={0.6}
          />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={pad + t * circ * s}
              y1={pad}
              x2={pad + t * circ * s}
              y2={pad + rawH * s}
              stroke="#1e293b"
              strokeWidth={0.4}
              strokeDasharray="2 3"
            />
          ))}
          <path
            d={path}
            fill="none"
            stroke="#fb7185"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <line
            x1={pad}
            y1={pad}
            x2={pad + circ * s}
            y2={pad}
            stroke="#94a3b8"
            strokeWidth={0.7}
          />
        </svg>
      </div>
    </div>
  );
}
