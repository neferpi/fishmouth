"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useCallback } from "react";
import {
  computeIntersection,
  formatLen,
  type JointParams,
  type Unit,
} from "@/lib/geometry";
import { PRESETS, type Preset } from "@/lib/presets";
import { buildWrapSvg, downloadSvg, printSvgAsPdf } from "@/lib/export";
import { UnwrapView } from "./UnwrapView";

const PipeScene = dynamic(
  () => import("./PipeScene").then((m) => m.PipeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950 text-sm text-slate-500">
        Loading 3D…
      </div>
    ),
  }
);


const DEFAULT: JointParams = {
  jointType: "saddle",
  mainOd: 60,
  branchOd: 42,
  angleDeg: 90,
  offset: 0,
  units: "mm",
};

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
        {suffix ? (
          <span className="ml-1 font-normal normal-case text-slate-600">
            ({suffix})
          </span>
        ) : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step ?? "any"}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none ring-rose-500/40 focus:ring-2 disabled:opacity-40"
      />
    </label>
  );
}

export function Workspace() {
  const [params, setParams] = useState<JointParams>(DEFAULT);
  const [activePreset, setActivePreset] = useState<string | null>(
    "tee-60-42-mm"
  );

  const result = useMemo(() => computeIntersection(params), [params]);

  const patch = useCallback((partial: Partial<JointParams>) => {
    setActivePreset(null);
    setParams((p) => ({ ...p, ...partial }));
  }, []);

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setParams({ ...preset.params });
  };

  const switchUnits = (units: Unit) => {
    if (units === params.units) return;
    const k = units === "mm" ? 25.4 : 1 / 25.4;
    setActivePreset(null);
    setParams((p) => ({
      ...p,
      units,
      mainOd: +(p.mainOd * k).toFixed(4),
      branchOd: +(p.branchOd * k).toFixed(4),
      offset: +(p.offset * k).toFixed(4),
    }));
  };

  const exportBranch = () => {
    if (!result.ok) return;
    const svg = buildWrapSvg(result, params, "branch");
    downloadSvg(
      svg,
      `fishmouth-branch-${params.branchOd}${params.units}.svg`
    );
  };

  const exportMain = () => {
    if (!result.ok || !result.mainHoleUnwrap) return;
    const svg = buildWrapSvg(result, params, "main");
    downloadSvg(svg, `fishmouth-main-hole-${params.mainOd}${params.units}.svg`);
  };

  const pdfBranch = () => {
    if (!result.ok) return;
    printSvgAsPdf(
      buildWrapSvg(result, params, "branch"),
      "fishmouth-branch-wrap"
    );
  };

  const isMiter = params.jointType === "miter";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
      {/* Header strip */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">
            neferpi · shop aid
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Fishmouth
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Pipe–pipe intersections → printable wrap templates. Orbit the joint,
            tune params, export SVG.
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
          Verify on scrap. Kerf, wall thickness &amp; fit-up not modeled.
        </div>
      </header>

      {/* Presets */}
      <section>
        <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Presets
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((preset) => {
            const on = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                title={preset.blurb}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  on
                    ? "border-rose-500/60 bg-rose-500/15 text-rose-100"
                    : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="text-xs font-medium">{preset.name}</div>
                <div className="mt-0.5 max-w-[160px] truncate text-[10px] text-slate-500">
                  {preset.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Params */}
        <aside className="flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4">
          <div className="flex gap-1 rounded-lg bg-slate-950 p-1">
            {(
              [
                ["saddle", "Saddle / fishmouth"],
                ["miter", "Miter"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "miter") {
                    patch({
                      jointType: "miter",
                      branchOd: params.mainOd,
                      offset: 0,
                    });
                  } else {
                    patch({ jointType: "saddle" });
                  }
                }}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  params.jointType === id
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-lg bg-slate-950 p-1">
            {(["mm", "in"] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => switchUnits(u)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium uppercase transition ${
                  params.units === u
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <NumField
            label={isMiter ? "Pipe OD" : "Main OD"}
            value={params.mainOd}
            onChange={(mainOd) => {
              if (isMiter) patch({ mainOd, branchOd: mainOd });
              else patch({ mainOd });
            }}
            min={0.1}
            step={params.units === "mm" ? 0.1 : 0.001}
            suffix={params.units}
          />
          {!isMiter && (
            <NumField
              label="Branch OD"
              value={params.branchOd}
              onChange={(branchOd) => patch({ branchOd })}
              min={0.1}
              step={params.units === "mm" ? 0.1 : 0.001}
              suffix={params.units}
            />
          )}
          <NumField
            label={isMiter ? "Axes angle" : "Branch angle"}
            value={params.angleDeg}
            onChange={(angleDeg) => patch({ angleDeg })}
            min={15}
            max={165}
            step={1}
            suffix="° · 90 = tee"
          />
          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <span>Angle</span>
              <span className="font-mono normal-case text-slate-500">
                {params.angleDeg.toFixed(0)}°
              </span>
            </span>
            <input
              type="range"
              min={15}
              max={165}
              step={1}
              value={params.angleDeg}
              onChange={(e) => patch({ angleDeg: parseFloat(e.target.value) })}
              className="accent-rose-500"
            />
          </label>
          {!isMiter && (
            <>
              <NumField
                label="Offset"
                value={params.offset}
                onChange={(offset) => patch({ offset })}
                step={params.units === "mm" ? 0.5 : 0.01}
                suffix={`${params.units} · 0 = centered`}
              />
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <span>Offset</span>
                  <span className="font-mono normal-case text-slate-500">
                    {params.offset.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={-Math.max(params.mainOd / 2, 1)}
                  max={Math.max(params.mainOd / 2, 1)}
                  step={params.units === "mm" ? 0.5 : 0.01}
                  value={params.offset}
                  onChange={(e) =>
                    patch({ offset: parseFloat(e.target.value) })
                  }
                  className="accent-rose-500"
                />
              </label>
            </>
          )}

          <div className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
            {result.ok ? (
              <ul className="space-y-1 font-mono">
                <li>
                  wrap W{" "}
                  <span className="text-slate-200">
                    {formatLen(result.templateWidth, params.units)}
                  </span>
                </li>
                <li>
                  cut depth{" "}
                  <span className="text-slate-200">
                    {formatLen(result.maxCutDepth, params.units)}
                  </span>
                </li>
                <li>
                  samples{" "}
                  <span className="text-slate-200">
                    {result.branchUnwrap.length}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="text-rose-300">{result.error}</p>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={!result.ok}
              onClick={exportBranch}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40"
            >
              Download SVG (branch wrap)
            </button>
            {!isMiter && (
              <button
                type="button"
                disabled={!result.ok || !result.mainHoleUnwrap}
                onClick={exportMain}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40"
              >
                Download SVG (main hole)
              </button>
            )}
            <button
              type="button"
              disabled={!result.ok}
              onClick={pdfBranch}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Print / Save PDF…
            </button>
          </div>
        </aside>

        {/* Views */}
        <div className="flex min-h-[520px] flex-col gap-3">
          <div className="relative min-h-[300px] flex-1">
            <PipeScene params={params} result={result} />
            <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
              Drag to orbit · scroll zoom
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />{" "}
                main
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />{" "}
                branch
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />{" "}
                intersection
              </span>
            </div>
          </div>
          <div
            className={`grid gap-3 ${!isMiter && result.mainHoleUnwrap ? "md:grid-cols-2" : ""}`}
          >
            <UnwrapView result={result} params={params} which="branch" />
            {!isMiter && result.mainHoleUnwrap && (
              <UnwrapView result={result} params={params} which="main" />
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        <p>
          <strong className="font-medium text-slate-400">Fishmouth</strong> is a
          free MIT shop aid by{" "}
          <a
            className="text-rose-400 hover:underline"
            href="https://github.com/neferpi"
          >
            neferpi
          </a>
          . Thin-wall cylinder development from OD — not a substitute for fit-up,
          bevel, or code compliance. Always dry-fit and verify on scrap.
        </p>
      </footer>
    </div>
  );
}
