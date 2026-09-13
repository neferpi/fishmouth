"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { IntersectionResult, JointParams } from "@/lib/geometry";

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function PipeMesh({
  radius,
  length,
  color,
  opacity = 0.55,
  position,
  rotation,
}: {
  radius: number;
  length: number;
  color: string;
  opacity?: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 64, 1, true]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        metalness={0.35}
        roughness={0.45}
        depthWrite={false}
      />
    </mesh>
  );
}

function SceneContent({
  params,
  result,
}: {
  params: JointParams;
  result: IntersectionResult;
}) {
  const R = params.mainOd / 2;
  const r = params.branchOd / 2;
  const alpha = deg2rad(params.angleDeg);
  const scale = 1 / Math.max(params.mainOd, params.branchOd, 1);

  const curvePts = useMemo(() => {
    return result.curve3d.map(
      (p) => new THREE.Vector3(p.x * scale, p.y * scale, p.z * scale)
    );
  }, [result.curve3d, scale]);

  if (params.jointType === "miter") {
    const od = params.branchOd || params.mainOd;
    const len = od * 2.2 * scale;
    const rad = (od / 2) * scale;
    return (
      <>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <directionalLight position={[-3, -2, -4]} intensity={0.35} />
        <PipeMesh
          radius={rad}
          length={len}
          color="#38bdf8"
          position={[0, 0, len / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <group rotation={[0, Math.PI - alpha, 0]}>
          <PipeMesh
            radius={rad}
            length={len}
            color="#a78bfa"
            position={[0, 0, len / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
        {curvePts.length > 1 && (
          <Line points={curvePts} color="#fb7185" lineWidth={3} />
        )}
        <gridHelper args={[3, 12, "#334155", "#1e293b"]} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </>
    );
  }

  const mainLen = Math.max(params.mainOd * 3, params.branchOd * 3) * scale;
  const branchLen =
    Math.max(params.mainOd * 2.2, params.branchOd * 2.5) * scale;
  const mainR = R * scale;
  const branchR = r * scale;
  const offset = params.offset * scale;

  const axis = new THREE.Vector3(Math.cos(alpha), 0, Math.sin(alpha)).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    axis
  );
  const euler = new THREE.Euler().setFromQuaternion(quat);
  const branchEuler: [number, number, number] = [euler.x, euler.y, euler.z];
  const mid = branchLen * 0.35;
  const branchPos: [number, number, number] = [
    axis.x * mid,
    offset + axis.y * mid,
    axis.z * mid,
  ];

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={1.15} />
      <directionalLight position={[-4, -3, -2]} intensity={0.3} />
      <PipeMesh
        radius={mainR}
        length={mainLen}
        color="#38bdf8"
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <PipeMesh
        radius={branchR}
        length={branchLen}
        color="#c084fc"
        opacity={0.5}
        position={branchPos}
        rotation={branchEuler}
      />
      {curvePts.length > 1 && (
        <Line points={curvePts} color="#fb7185" lineWidth={3} />
      )}
      <gridHelper args={[3.5, 14, "#334155", "#1e293b"]} />
      <axesHelper args={[0.6]} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

export function PipeScene({
  params,
  result,
}: {
  params: JointParams;
  result: IntersectionResult;
}) {
  return (
    <div className="h-full min-h-[280px] w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950">
      <Canvas
        camera={{ position: [1.6, 1.1, 1.6], fov: 42, near: 0.01, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#020617"]} />
        <SceneContent params={params} result={result} />
      </Canvas>
    </div>
  );
}
