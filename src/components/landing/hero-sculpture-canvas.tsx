"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const points = [
  new THREE.Vector3(-2.9, -1.8, 0),
  new THREE.Vector3(-1.95, -0.85, 0.24),
  new THREE.Vector3(-1.15, -0.6, -0.05),
  new THREE.Vector3(-0.75, 0.55, 0.3),
  new THREE.Vector3(0.35, 0.65, 0.08),
  new THREE.Vector3(0.8, 1.6, -0.15),
  new THREE.Vector3(2.05, 1.85, 0.12),
];

function Branch({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const curve = useMemo(() => new THREE.LineCurve3(start, end), [start, end]);
  return <mesh><tubeGeometry args={[curve, 12, 0.025, 6, false]} /><meshStandardMaterial color="#6f6f6f" metalness={0.9} roughness={0.28} /></mesh>;
}

function PathSculpture() {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.18), []);
  const samples = useMemo(() => curve.getPoints(32), [curve]);
  useFrame((state, delta) => {
    if (!group.current) return;
    target.current.x = reduceMotion ? 0.14 : (state.pointer.y * -0.08);
    target.current.y = reduceMotion ? -0.2 : state.pointer.x * 0.12;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, target.current.x, 3, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target.current.y + (reduceMotion ? 0 : state.clock.elapsedTime * 0.055), 3, delta);
  });
  return <group ref={group} rotation={[0.14, -0.2, -0.08]} position={[0, 0.1, 0]} scale={1.15}>
    <mesh><tubeGeometry args={[curve, 128, 0.14, 16, false]} /><meshPhysicalMaterial color="#b7b7b7" metalness={0.96} roughness={0.2} clearcoat={1} clearcoatRoughness={0.16} /></mesh>
    <mesh><tubeGeometry args={[curve, 128, 0.19, 16, false]} /><meshBasicMaterial color="#000" side={THREE.BackSide} /></mesh>
    {samples.filter((_, index) => index % 8 === 0).map((point, index) => <mesh key={`node-${index}`} position={point}><icosahedronGeometry args={[index === 0 || index === 4 ? 0.22 : 0.13, 2]} /><meshPhysicalMaterial color={index === 8 ? "#f6f6f6" : "#9b9b9b"} metalness={1} roughness={0.16} clearcoat={1} /></mesh>)}
    <Branch start={points[1]} end={new THREE.Vector3(-2.5, 0.35, 0.15)} /><Branch start={points[3]} end={new THREE.Vector3(-1.8, 1.4, -0.2)} /><Branch start={points[4]} end={new THREE.Vector3(1.25, -0.75, 0.25)} /><Branch start={points[5]} end={new THREE.Vector3(1.65, 2.65, -0.15)} />
    <mesh position={[-2.5, 0.35, 0.15]}><sphereGeometry args={[0.09, 16, 16]} /><meshStandardMaterial color="#cfcfcf" metalness={1} roughness={0.2} /></mesh><mesh position={[-1.8, 1.4, -0.2]}><sphereGeometry args={[0.09, 16, 16]} /><meshStandardMaterial color="#cfcfcf" metalness={1} roughness={0.2} /></mesh><mesh position={[1.25, -0.75, 0.25]}><sphereGeometry args={[0.09, 16, 16]} /><meshStandardMaterial color="#cfcfcf" metalness={1} roughness={0.2} /></mesh><mesh position={[1.65, 2.65, -0.15]}><sphereGeometry args={[0.12, 16, 16]} /><meshStandardMaterial color="#fff" metalness={1} roughness={0.16} /></mesh>
  </group>;
}

function Fallback() { return <div className="grid h-full place-items-center text-xs text-white/40">WebGL preview unavailable</div>; }

export default function HeroSculptureCanvas() {
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 7], fov: 33 }} gl={{ antialias: true, powerPreference: "high-performance" }} fallback={<Fallback />}><color attach="background" args={["#050505"]} /><fog attach="fog" args={["#050505", 5, 14]} /><ambientLight intensity={0.5} /><directionalLight position={[-4, 4, 5]} intensity={3.5} color="#ffffff" /><directionalLight position={[4, -1, 2]} intensity={2.2} color="#87909b" /><pointLight position={[0, 0, 3]} intensity={6} distance={8} color="#ffffff" /><PathSculpture /></Canvas>;
}
