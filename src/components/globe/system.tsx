import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  EARTH_ORBIT_SYS,
  EARTH_WORLD,
  MOON_DIST_SYS,
  MOON_R,
  MOON_SCALE_SYS,
  MOON_WORLD,
  SUN_R_SYS,
  GLOBE_MAX,
  GLOBE_MIN,
  SYSTEM_MAX,
  SYSTEM_MIN,
} from "@/lib/astro";
import { useGlobeStore } from "@/store/globe-store";
import { assetUrl } from "@/lib/asset-url";
import { moonFragment, moonVertex, sunFragment, sunVertex } from "./shaders";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export function CelestialSystem({ sunDir }: { sunDir: THREE.Vector3 }) {
  const sys = useGlobeStore((s) => s.viewMode === "system");
  return (
    <>
      {sys ? (
        <Suspense fallback={null}>
          <Moon sunDir={sunDir} />
        </Suspense>
      ) : null}
      <EarthOrbit />
      <MoonOrbit />
      <SunBody />
      <GuideLines />
    </>
  );
}

function Moon({ sunDir }: { sunDir: THREE.Vector3 }) {
  const map = useTexture(assetUrl("textures/moon.jpg"));
  const group = useRef<THREE.Group>(null);
  const uniforms = useMemo(
    () => ({
      moonMap: { value: map },
      sunDirection: { value: sunDir },
    }),
    [map, sunDir],
  );
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    map.needsUpdate = true;
  }, [map]);
  useFrame(() => {
    if (!group.current) return;
    const sys = useGlobeStore.getState().viewMode === "system";
    group.current.visible = sys;
    if (!sys) return;
    group.current.position.copy(MOON_WORLD);
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[MOON_R * MOON_SCALE_SYS, 64, 48]} />
        <shaderMaterial
          vertexShader={moonVertex}
          fragmentShader={moonFragment}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

function EarthOrbit() {
  const geom = useMemo(() => makeRing(256), []);
  const ref = useRef<THREE.LineLoop>(null);
  useEffect(() => () => geom.dispose(), [geom]);
  useFrame(() => {
    const line = ref.current;
    if (!line) return;
    const sys = useGlobeStore.getState().viewMode === "system";
    line.visible = sys;
    line.scale.setScalar(EARTH_ORBIT_SYS);
  });
  return (
    <lineLoop ref={ref} geometry={geom} visible={false}>
      <lineBasicMaterial color="#d7b07a" transparent opacity={0.42} depthWrite={false} />
    </lineLoop>
  );
}

function MoonOrbit() {
  const geom = useMemo(() => makeRing(192), []);
  const ref = useRef<THREE.LineLoop>(null);
  useEffect(() => () => geom.dispose(), [geom]);
  useFrame(() => {
    const line = ref.current;
    if (!line) return;
    const sys = useGlobeStore.getState().viewMode === "system";
    line.visible = sys;
    if (!sys) return;
    line.position.copy(EARTH_WORLD);
    line.scale.setScalar(MOON_DIST_SYS);
    // 5.14° lunar inclination toward the ecliptic
    line.rotation.x = 5.14 * (Math.PI / 180);
  });
  return (
    <lineLoop ref={ref} geometry={geom} visible={false}>
      <lineBasicMaterial color="#9aa3ae" transparent opacity={0.5} depthWrite={false} />
    </lineLoop>
  );
}

function SunBody() {
  const group = useRef<THREE.Group>(null);
  const corona = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const sys = useGlobeStore.getState().viewMode === "system";
    group.current.visible = sys;
    group.current.position.set(0, 0, 0);
    if (corona.current) corona.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[SUN_R_SYS, 48, 32]} />
        <shaderMaterial vertexShader={sunVertex} fragmentShader={sunFragment} toneMapped={false} />
      </mesh>
      <mesh ref={corona} scale={SUN_R_SYS * 2.35}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              vec2 p = vUv * 2.0 - 1.0;
              float d = length(p);
              float core = smoothstep(0.55, 0.0, d);
              float halo = exp(-d * 2.8) * 0.55;
              vec3 c = vec3(1.0, 0.82, 0.45) * (core * 0.9 + halo);
              gl_FragColor = vec4(c, clamp(core + halo, 0.0, 0.85));
            }
          `}
        />
      </mesh>
    </group>
  );
}

function GuideLines() {
  const sunLine = useRef<THREE.LineSegments>(null);
  const moonLine = useRef<THREE.LineSegments>(null);
  const sunGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const moonGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  useEffect(
    () => () => {
      sunGeom.dispose();
      moonGeom.dispose();
    },
    [sunGeom, moonGeom],
  );
  useFrame(() => {
    const sys = useGlobeStore.getState().viewMode === "system";
    const sunArr = sunGeom.attributes.position as THREE.BufferAttribute;
    sunArr.setXYZ(0, 0, 0, 0);
    sunArr.setXYZ(1, EARTH_WORLD.x, EARTH_WORLD.y, EARTH_WORLD.z);
    sunArr.needsUpdate = true;

    const moonArr = moonGeom.attributes.position as THREE.BufferAttribute;
    moonArr.setXYZ(0, EARTH_WORLD.x, EARTH_WORLD.y, EARTH_WORLD.z);
    moonArr.setXYZ(1, MOON_WORLD.x, MOON_WORLD.y, MOON_WORLD.z);
    moonArr.needsUpdate = true;

    if (sunLine.current) {
      sunLine.current.visible = sys;
      (sunLine.current.material as THREE.LineBasicMaterial).opacity = 0.28;
    }
    if (moonLine.current) {
      moonLine.current.visible = sys;
      (moonLine.current.material as THREE.LineBasicMaterial).opacity = 0.4;
    }
  });
  return (
    <>
      <lineSegments ref={sunLine} geometry={sunGeom} visible={false}>
        <lineBasicMaterial color="#e8c48a" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
      <lineSegments ref={moonLine} geometry={moonGeom} visible={false}>
        <lineBasicMaterial color="#c5ccd4" transparent opacity={0.4} depthWrite={false} />
      </lineSegments>
    </>
  );
}

export function ViewController() {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const acc = useRef(0);
  const lastMode = useRef<"globe" | "system">("globe");

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    acc.current += d;
    const state = useGlobeStore.getState();
    if (controls && lastMode.current !== state.viewMode) {
      lastMode.current = state.viewMode;
      if (state.viewMode === "system") {
        controls.minDistance = SYSTEM_MIN;
        controls.maxDistance = SYSTEM_MAX;
        controls.target.set(0, 0, 0);
      } else {
        controls.minDistance = GLOBE_MIN;
        controls.maxDistance = GLOBE_MAX;
        controls.target.set(0, 0, 0);
      }
    }
    if (acc.current < 0.15) return;
    acc.current = 0;
    const dist = camera.position.length();
    if (Math.abs(state.cameraDist - dist) > 0.04) state.setCameraDist(dist);
  });
  return null;
}

function makeRing(n: number) {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(Math.cos(a), 0, Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
