import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Hud } from "@/components/overlay/Hud";
import { HoverCard } from "@/components/overlay/HoverCard";
import { LabelLayer } from "@/components/overlay/LabelLayer";
import { Splash } from "@/components/overlay/Splash";
import { loadCountries, type Country } from "@/lib/world-data";
import { useGlobeStore } from "@/store/globe-store";
import { GlobeScene } from "./scene";

export function GlobeApp() {
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 10000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCountries()
      .then((list) => {
        if (!cancelled) setCountries(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "载入失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="relative h-dvh w-full cursor-grab overflow-hidden bg-bg text-fg antialiased active:cursor-grabbing"
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="sr-only">昼夜地球</h1>
      <Canvas
        className="touch-none"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        camera={{ position: [0.4, 0.38, 2.65], fov: 46, near: 0.08, far: 1400 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#05070c");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
        onPointerMissed={() => useGlobeStore.getState().setSelected(null)}
      >
        <Suspense fallback={<LoadingGlobe />}>
          <GlobeScene countries={countries} nodesRef={nodesRef} onReady={onReady} />
        </Suspense>
      </Canvas>
      <LabelLayer countries={countries ?? []} nodesRef={nodesRef} />
      <HoverCard countries={countries} />
      <Hud countries={countries} error={error} />
      {!ready && <Splash error={null} />}
    </div>
  );
}

function LoadingGlobe() {
  return (
    <mesh>
      <sphereGeometry args={[1, 48, 32]} />
      <meshBasicMaterial color="#141a24" />
    </mesh>
  );
}
