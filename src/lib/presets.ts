import type { JointParams } from "./geometry";

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Omit<JointParams, "samples">;
}

/** Common tube / pipe ODs — NPS approximations and round tube. */
export const PRESETS: Preset[] = [
  {
    id: "tee-2x1.5-in",
    name: "2″ × 1½″ tee (90°)",
    blurb: "Classic centered saddle — 2.375″ main, 1.900″ branch.",
    params: {
      jointType: "saddle",
      mainOd: 2.375,
      branchOd: 1.9,
      angleDeg: 90,
      offset: 0,
      units: "in",
    },
  },
  {
    id: "tee-60-42-mm",
    name: "60 × 42 mm tee",
    blurb: "Metric round tube T-joint, centered.",
    params: {
      jointType: "saddle",
      mainOd: 60,
      branchOd: 42,
      angleDeg: 90,
      offset: 0,
      units: "mm",
    },
  },
  {
    id: "angled-45",
    name: "1½″ branch @ 45°",
    blurb: "Oblique branch on 2″ main — bike / handrail style.",
    params: {
      jointType: "saddle",
      mainOd: 2.375,
      branchOd: 1.9,
      angleDeg: 45,
      offset: 0,
      units: "in",
    },
  },
  {
    id: "offset-saddle",
    name: "Offset stub (25 mm)",
    blurb: "Same-size-ish tee with lateral offset on 76 mm main.",
    params: {
      jointType: "saddle",
      mainOd: 76.1,
      branchOd: 48.3,
      angleDeg: 90,
      offset: 12,
      units: "mm",
    },
  },
  {
    id: "equal-tee",
    name: "Equal 1½″ tee",
    blurb: "Branch OD = main OD — deep fishmouth.",
    params: {
      jointType: "saddle",
      mainOd: 1.9,
      branchOd: 1.9,
      angleDeg: 90,
      offset: 0,
      units: "in",
    },
  },
  {
    id: "miter-90",
    name: "90° elbow miter",
    blurb: "Same-size end miter for a right-angle turn (2″ OD).",
    params: {
      jointType: "miter",
      mainOd: 2.0,
      branchOd: 2.0,
      angleDeg: 90,
      offset: 0,
      units: "in",
    },
  },
  {
    id: "miter-135",
    name: "45° turn miter",
    blurb: "Axes at 135° — each cut ~22.5° from square.",
    params: {
      jointType: "miter",
      mainOd: 50.8,
      branchOd: 50.8,
      angleDeg: 135,
      offset: 0,
      units: "mm",
    },
  },
  {
    id: "emt-corner",
    name: "EMT corner stub",
    blurb: "¾″ EMT-ish OD branch on 1″ main @ 60°.",
    params: {
      jointType: "saddle",
      mainOd: 1.315,
      branchOd: 0.922,
      angleDeg: 60,
      offset: 0,
      units: "in",
    },
  },
];
