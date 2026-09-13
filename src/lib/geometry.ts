/**
 * Cylinder–cylinder intersection geometry for fishmouth / saddle / miter templates.
 * Thin-wall OD development — shop aid only; verify on scrap.
 */

export type JointType = "saddle" | "miter";
export type Unit = "mm" | "in";

export interface JointParams {
  jointType: JointType;
  mainOd: number;
  branchOd: number;
  /** Angle between axes in degrees. 90 = perpendicular tee. */
  angleDeg: number;
  /** Lateral offset of branch axis from main axis (same units as OD). 0 = centered. */
  offset: number;
  units: Unit;
  /** Sample count around circumference. */
  samples?: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface UnwrapPoint {
  /** Arc length along circumference (0 … π·OD). */
  u: number;
  /** Axial position along pipe (cut profile height). */
  v: number;
  /** Circumferential angle radians. */
  theta: number;
}

export interface IntersectionResult {
  ok: boolean;
  error?: string;
  /** 3D points of intersection curve (world space). */
  curve3d: Vec3[];
  /** Branch wrap template (u = circ, v = axial from reference). */
  branchUnwrap: UnwrapPoint[];
  /** Main hole outline unwrap when computable. */
  mainHoleUnwrap: UnwrapPoint[] | null;
  /** Circumference of branch (template width). */
  branchCircumference: number;
  /** Circumference of main. */
  mainCircumference: number;
  /** Max cut depth on branch (useful for shop notes). */
  maxCutDepth: number;
  /** Nominal printable width/height of branch template. */
  templateWidth: number;
  templateHeight: number;
}

const TAU = Math.PI * 2;

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Normalize vector */
function norm(v: Vec3): Vec3 {
  const L = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / L, y: v.y / L, z: v.z / L };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

/**
 * Saddle / fishmouth: branch cylinder intersecting main cylinder.
 * Main along +X, branch axis in XZ plane at `angleDeg` from main axis
 * (90° = classic tee along +Z), with lateral offset along Y.
 */
function computeSaddle(params: JointParams): IntersectionResult {
  const R = params.mainOd / 2;
  const r = params.branchOd / 2;
  const d = params.offset;
  const n = params.samples ?? 180;
  const alpha = deg2rad(params.angleDeg);

  if (!(params.mainOd > 0 && params.branchOd > 0)) {
    return fail("OD values must be positive.");
  }
  if (Math.abs(d) + r > R + 1e-9 && params.angleDeg > 5) {
    // Still try — partial intersection may exist at oblique angles
  }
  if (r > R + Math.abs(d) + 1e-6 && Math.abs(params.angleDeg - 90) < 1e-6) {
    return fail(
      "For a 90° tee, branch OD cannot exceed main OD (plus offset clearance)."
    );
  }

  // Branch axis direction: angle from main (X). 90° → +Z
  const û = norm({ x: Math.cos(alpha), y: 0, z: Math.sin(alpha) });
  // Origin of branch local frame (axis passes through this point)
  const O: Vec3 = { x: 0, y: d, z: 0 };

  // Orthonormal frame around branch axis
  const worldUp: Vec3 = Math.abs(û.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
  let n1 = norm(cross(û, worldUp));
  let n2 = norm(cross(û, n1));
  // Prefer n2 roughly along +Y for crown/heel convention when offset is Y
  if (Math.abs(n2.y) < Math.abs(n1.y)) {
    const tmp = n1;
    n1 = n2;
    n2 = tmp;
  }
  // Ensure right-handed and n2.y >= 0 when possible
  if (n2.y < 0) {
    n2 = scale(n2, -1);
    n1 = scale(n1, -1);
  }

  const curve3d: Vec3[] = [];
  const branchUnwrap: UnwrapPoint[] = [];
  const mainHole: UnwrapPoint[] = [];
  let minS = Infinity;
  let maxS = -Infinity;
  let failed = 0;

  for (let i = 0; i <= n; i++) {
    const theta = (i / n) * TAU;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // Radial offset on branch surface
    const radial = add(scale(n1, r * c), scale(n2, r * s));
    // Point = O + s_axis * û + radial  must lie on main: y² + z² = R²
    // (Oy + s*ûy + ry)² + (Oz + s*ûz + rz)² = R²
    const py0 = O.y + radial.y;
    const pz0 = O.z + radial.z;
    const uy = û.y;
    const uz = û.z;

    const A = uy * uy + uz * uz;
    const B = 2 * (py0 * uy + pz0 * uz);
    const C = py0 * py0 + pz0 * pz0 - R * R;

    let sAxis: number | null = null;
    if (A < 1e-12) {
      // Branch parallel to main in YZ — degenerate for saddle
      failed++;
      continue;
    }
    const disc = B * B - 4 * A * C;
    if (disc < -1e-8) {
      failed++;
      continue;
    }
    const sqrtD = Math.sqrt(Math.max(0, disc));
    const s1 = (-B - sqrtD) / (2 * A);
    const s2 = (-B + sqrtD) / (2 * A);
    // For a tee (branch approaching from +Z side), take the intersection
    // with larger z (outer / near side for typical tee), preferring the
    // root whose point has greater z, or the one closer to branch "end".
    const p1 = add(add(O, scale(û, s1)), radial);
    const p2 = add(add(O, scale(û, s2)), radial);
    // Choose the intersection on the positive branch approach (larger projection on û.z / z)
    if (p1.z >= p2.z) {
      sAxis = s1;
      curve3d.push(p1);
    } else {
      sAxis = s2;
      curve3d.push(p2);
    }

    minS = Math.min(minS, sAxis);
    maxS = Math.max(maxS, sAxis);

    const u = (theta / TAU) * (params.branchOd * Math.PI);
    branchUnwrap.push({ u, v: sAxis, theta });

    // Main hole: unwrap main along X (axial) vs circumferential about X
    const pt = curve3d[curve3d.length - 1];
    const mainTheta = Math.atan2(pt.y, pt.z); // around X, z=crown-ish
    const mainU = ((mainTheta + Math.PI) / TAU) * (params.mainOd * Math.PI);
    mainHole.push({ u: mainU, v: pt.x, theta: mainTheta });
  }

  if (curve3d.length < 8 || failed > n * 0.4) {
    return fail(
      "No full intersection — check OD, angle, and offset (branch may miss the main)."
    );
  }

  // Unwrap as cut depth from the longest generators (classic fishmouth):
  // v = 0 at the long sides, peaks at crown/saddle notches.
  const maxCutDepth = maxS - minS;
  for (const p of branchUnwrap) {
    p.v = maxS - p.v;
  }
  const templateHeight = maxCutDepth;
  const templateWidth = params.branchOd * Math.PI;

  // Sort / close main hole for a sensible polyline (by main circumferential u)
  mainHole.sort((a, b) => a.u - b.u);
  // Re-center main hole v so min is 0
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of mainHole) {
    minV = Math.min(minV, p.v);
    maxV = Math.max(maxV, p.v);
  }
  for (const p of mainHole) {
    p.v = p.v - minV;
  }

  return {
    ok: true,
    curve3d,
    branchUnwrap,
    mainHoleUnwrap: mainHole,
    branchCircumference: templateWidth,
    mainCircumference: params.mainOd * Math.PI,
    maxCutDepth,
    templateWidth,
    templateHeight: Math.max(templateHeight, maxV - minV, 1e-6),
  };
}

/**
 * Miter: same-size pipes joined end-to-end at an angle.
 * Cut angle from square = (180° − included axis angle) / 2 … we take
 * `angleDeg` as the angle between axes (90° = right-angle elbow).
 */
function computeMiter(params: JointParams): IntersectionResult {
  const od = params.branchOd || params.mainOd;
  if (!(od > 0)) return fail("OD must be positive.");
  if (Math.abs(params.mainOd - params.branchOd) > 1e-6) {
    // Force same size for miter
  }
  const R = od / 2;
  const n = params.samples ?? 180;
  // Angle between axes α. Cut plane tilt from square: β = (π - α) / 2
  // Equivalent: for elbow turn γ = 180 - α, each pipe cut at γ/2 from square.
  const alpha = deg2rad(clamp(params.angleDeg, 1, 179));
  const cutFromSquare = (Math.PI - alpha) / 2; // β
  const tanB = Math.tan(cutFromSquare);

  const curve3d: Vec3[] = [];
  const branchUnwrap: UnwrapPoint[] = [];
  let maxV = 0;

  // Visual: pipe along Z, cut plane tilted in XZ
  for (let i = 0; i <= n; i++) {
    const theta = (i / n) * TAU;
    // h(φ) = R * tan(β) * (1 - cos φ)  — classic miter unwrap
    // φ=0 at the long side (heel), or we use nose at θ=0 as short side:
    const h = R * tanB * (1 - Math.cos(theta));
    const u = (theta / TAU) * (od * Math.PI);
    branchUnwrap.push({ u, v: h, theta });
    maxV = Math.max(maxV, h);

    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    // Plane: z = x * tan(β) mapped so θ=0 (x=R) is nose (min) → z = R*tanB*(1 - cos) with cos=x/R
    const z = R * tanB * (1 - x / R);
    curve3d.push({ x, y, z });
  }

  return {
    ok: true,
    curve3d,
    branchUnwrap,
    mainHoleUnwrap: null,
    branchCircumference: od * Math.PI,
    mainCircumference: od * Math.PI,
    maxCutDepth: maxV,
    templateWidth: od * Math.PI,
    templateHeight: Math.max(maxV, 1e-6),
  };
}

function fail(error: string): IntersectionResult {
  return {
    ok: false,
    error,
    curve3d: [],
    branchUnwrap: [],
    mainHoleUnwrap: null,
    branchCircumference: 0,
    mainCircumference: 0,
    maxCutDepth: 0,
    templateWidth: 0,
    templateHeight: 0,
  };
}

export function computeIntersection(params: JointParams): IntersectionResult {
  if (params.jointType === "miter") {
    return computeMiter({
      ...params,
      mainOd: params.mainOd || params.branchOd,
      branchOd: params.branchOd || params.mainOd,
    });
  }
  return computeSaddle(params);
}

/** Build SVG path from unwrap points (u,v), with optional padding & scale. */
export function unwrapToSvgPath(
  points: UnwrapPoint[],
  opts: { scale?: number; padX?: number; padY?: number; invertV?: boolean; height?: number } = {}
): string {
  if (!points.length) return "";
  const s = opts.scale ?? 1;
  const padX = opts.padX ?? 0;
  const padY = opts.padY ?? 0;
  const h = opts.height ?? Math.max(...points.map((p) => p.v));
  const parts: string[] = [];
  points.forEach((p, i) => {
    const x = padX + p.u * s;
    const y = padY + (opts.invertV ? h - p.v : p.v) * s;
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`);
  });
  return parts.join(" ");
}

export function formatLen(v: number, units: Unit, digits = 2): string {
  return `${v.toFixed(digits)} ${units}`;
}
