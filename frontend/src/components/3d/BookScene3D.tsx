"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BookMeshProps {
  title: string;
  author: string;
  category?: string | null;
  reducedMotion?: boolean;
}

function Particles({ count = 35 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return [pos];
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#a5b4fc"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function BookMesh({ title, author, category = "General", reducedMotion = false }: BookMeshProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Generate canvas texture for front cover
  const coverTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 768);
      grad.addColorStop(0, "#4338ca"); // indigo-700
      grad.addColorStop(0.5, "#3730a3"); // indigo-800
      grad.addColorStop(1, "#312e81"); // indigo-900
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 768);

      // Border frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 14;
      ctx.strokeRect(28, 28, 456, 712);

      // Gold accent line
      ctx.strokeStyle = "rgba(251, 191, 36, 0.7)"; // amber-400
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 432, 688);

      // Category badge
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.roundRect(60, 80, 392, 44, 8);
      ctx.fill();

      ctx.fillStyle = "#e0e7ff";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText((category || "ACADEMIC LITERATURE").toUpperCase(), 256, 110);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      const words = title.split(" ");
      let line = "";
      let y = 260;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        if (ctx.measureText(testLine).width > 400 && n > 0) {
          ctx.fillText(line, 256, y);
          line = words[n] + " ";
          y += 50;
          if (y > 480) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 256, y);

      // Author
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "italic 26px sans-serif";
      ctx.fillText(`by ${author}`, 256, y + 80);

      // Emblem emblem
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(256, 620, 36, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("BN", 256, 628);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [title, author, category]);

  // Page edge texture
  const pageTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = "#e2e8f0";
      for (let y = 0; y < 256; y += 4) {
        ctx.fillRect(0, y, 64, 1);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion || !groupRef.current) return;

    // Idle floating
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(time * 1.5) * 0.08;

    // Mouse tilt targeting
    const targetY = (state.pointer.x * Math.PI) / 4 + (hovered ? 0.3 : 0);
    const targetX = (-state.pointer.y * Math.PI) / 6;

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      0.35 + targetY,
      3,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      0.1 + targetX,
      3,
      delta
    );
  });

  // Materials for Box: [right, left, top, bottom, front, back]
  // Dimensions: width 2.2, height 3.2, thickness 0.45
  const materials = useMemo(() => {
    const coverMat = new THREE.MeshStandardMaterial({
      color: "#312e81",
      roughness: 0.35,
      metalness: 0.15,
    });

    const frontCoverMat = coverTexture
      ? new THREE.MeshStandardMaterial({
          map: coverTexture,
          roughness: 0.4,
          metalness: 0.1,
        })
      : coverMat;

    const pagesMat = new THREE.MeshStandardMaterial({
      map: pageTexture || undefined,
      color: "#f1f5f9",
      roughness: 0.8,
    });

    return [
      pagesMat, // Right (pages)
      coverMat, // Left (spine)
      pagesMat, // Top (pages)
      pagesMat, // Bottom (pages)
      frontCoverMat, // Front (cover)
      coverMat, // Back
    ];
  }, [coverTexture, pageTexture]);

  return (
    <group
      ref={groupRef}
      rotation={reducedMotion ? [0.15, 0.4, 0] : [0.15, 0.4, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh material={materials} castShadow receiveShadow>
        <boxGeometry args={[2.3, 3.2, 0.45]} />
      </mesh>
    </group>
  );
}

export interface BookScene3DProps {
  title: string;
  author: string;
  category?: string | null;
  className?: string;
}

export function BookScene3D({ title, author, category, className = "h-72 w-full" }: BookScene3DProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 6, 6]} intensity={1.4} castShadow />
        <pointLight position={[-6, -4, -4]} intensity={0.4} color="#818cf8" />

        <BookMesh
          title={title}
          author={author}
          category={category}
          reducedMotion={reducedMotion}
        />

        {!reducedMotion && <Particles count={25} />}
      </Canvas>
    </div>
  );
}
