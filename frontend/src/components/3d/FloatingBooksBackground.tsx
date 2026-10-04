"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FloatingMiniBookProps {
  position: [number, number, number];
  color: string;
  speed: number;
  rotationOffset: [number, number, number];
  reducedMotion: boolean;
}

function FloatingMiniBook({
  position,
  color,
  speed,
  rotationOffset,
  reducedMotion,
}: FloatingMiniBookProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [initialPos] = useState(position);

  useFrame((state, delta) => {
    if (reducedMotion || !meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    meshRef.current.position.y = initialPos[1] + Math.sin(t) * 0.25;
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.x = rotationOffset[0] + Math.cos(t * 0.8) * 0.08;
  });

  // Materials: cover color on front/back/spine, cream for page edges
  const materials = useMemo(() => {
    const coverMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1,
    });
    const pagesMat = new THREE.MeshStandardMaterial({
      color: "#f8fafc",
      roughness: 0.9,
    });
    return [
      pagesMat, // right
      coverMat, // left (spine)
      pagesMat, // top
      pagesMat, // bottom
      coverMat, // front
      coverMat, // back
    ];
  }, [color]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotationOffset}
      material={materials}
    >
      <boxGeometry args={[1.1, 1.5, 0.22]} />
    </mesh>
  );
}

function FloatingBooksGroup({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (reducedMotion || !groupRef.current) return;
    // Mouse parallax
    const targetX = (state.pointer.x * Math.PI) / 12;
    const targetY = (-state.pointer.y * Math.PI) / 12;
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetX,
      2,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetY,
      2,
      delta
    );
  });

  const booksConfig: Array<{
    position: [number, number, number];
    color: string;
    speed: number;
    rotationOffset: [number, number, number];
  }> = [
    { position: [-3.8, 1.5, -1], color: "#4f46e5", speed: 0.9, rotationOffset: [0.2, 0.4, -0.1] },
    { position: [3.9, 1.8, -0.5], color: "#4338ca", speed: 1.1, rotationOffset: [-0.1, -0.5, 0.15] },
    { position: [-4.2, -1.6, 0.2], color: "#6366f1", speed: 0.8, rotationOffset: [0.15, 0.6, -0.2] },
    { position: [3.6, -1.8, -1.2], color: "#3730a3", speed: 1.0, rotationOffset: [-0.2, -0.3, 0.1] },
    { position: [0.5, -2.5, -2], color: "#3b82f6", speed: 0.7, rotationOffset: [0.3, 0.2, 0] },
  ];

  return (
    <group ref={groupRef}>
      {booksConfig.map((cfg, idx) => (
        <FloatingMiniBook
          key={idx}
          position={cfg.position}
          color={cfg.color}
          speed={cfg.speed}
          rotationOffset={cfg.rotationOffset}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

function AmbientParticles({ count = 40 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return [pos];
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#818cf8"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

export function FloatingBooksBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />
        <pointLight position={[-5, -4, -2]} intensity={0.5} color="#c7d2fe" />

        <FloatingBooksGroup reducedMotion={reducedMotion} />
        {!reducedMotion && <AmbientParticles count={35} />}
      </Canvas>
    </div>
  );
}
export default FloatingBooksBackground;
