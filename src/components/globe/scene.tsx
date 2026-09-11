import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CITIES, CITY_BY_ID } from "@/data/cities";
import { pickHoverCity } from "@/components/overlay/HoverCard";
import {
  forEachRing,
  getSubsolarPoint,
  latLonToVec3,
  vec3ToLatLon,
} from "@/lib/geo";
import { findCountryAt, type Country } from "@/lib/world-data";
import { useGlobeStore } from "@/store/globe-store";
import {
  earthHeliocentricDir,
  moonEclipticDir,
  getMoonState,
  EARTH_ORBIT_SYS,
  EARTH_SCALE_SYS,
  EARTH_WORLD,
  GLOBE_DIST,
  GLOBE_MAX,
  GLOBE_MIN,
  MOON_DIST_SYS,
  MOON_WORLD,
  SUN_WORLD,
} from "@/lib/astro";
import { applyColorMap, afterPaint, loadColorMap } from "@/lib/load-texture";
import { CelestialSystem, ViewController } from "./system";
import {
  atmosFragment,
  atmosVertex,
  cloudFragment,
  cloudVertex,
  earthFragment,
  earthVertex,
} from "./shaders";

const SUN = new THREE.Vector3(1, 0, 0);
const TMP = new THREE.Vector3();
const HIT = new THREE.Vector3();
const NDC = new THREE.Vector2();
const RAY = new THREE.Raycaster();
const SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
const FLY_TARGET = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const SUN_N = new THREE.Vector3();
const INIT_SIDE = new THREE.Vector3();
const INIT_DIR = new THREE.Vector3();
const LOCAL_SUN = new THREE.Vector3();
const ORBIT_POS = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

type NodesRef = MutableRefObject<Map<string, HTMLElement>>;

export function GlobeScene({
  countries,
  nodesRef,
  onReady,
}: {
  countries: Country[] | null;
  nodesRef: NodesRef;
  onReady: () => void;
}) {
  const sunDir = useRef(SUN);
  const earthBary = useRef<THREE.Group>(null);
  const earthSpin = useRef<THREE.Group>(null);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  return (
    <>
      <color attach="background" args={["#05070c"]} />
      <Stars radius={420} depth={70} count={2400} factor={3.2} saturation={0} fade speed={0.2} />
      <TimeDriver sunDir={sunDir.current} earthBary={earthBary} earthSpin={earthSpin} />
      <InitialView sunDir={sunDir.current} />
      <group ref={earthBary}>
        <group ref={earthSpin}>
          <Earth sunDir={sunDir.current} countries={countries} onReady={onReady} />
          <Suspense fallback={null}>
            <Clouds sunDir={sunDir.current} />
          </Suspense>
          <Atmosphere sunDir={sunDir.current} />
          {countries && <Borders countries={countries} />}
          {countries && <SelectedBorder countries={countries} />}
          <Graticule />
          <Terminator sunDir={sunDir.current} />
          <CityPoints sunDir={sunDir.current} />
          <SelectedMarker />
        </group>
      </group>
      <Suspense fallback={null}>
        <CelestialSystem sunDir={sunDir.current} />
      </Suspense>
      <ViewController />
      <LabelProjector countries={countries} nodesRef={nodesRef} />
      <FlyToController />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={GLOBE_MIN}
        maxDistance={GLOBE_MAX}
        rotateSpeed={0.48}
        zoomSpeed={0.92}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI - 0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.28}
      />
    </>
  );
}

function TimeDriver({
  sunDir,
  earthBary,
  earthSpin,
}: {
  sunDir: THREE.Vector3;
  earthBary: MutableRefObject<THREE.Group | null>;
  earthSpin: MutableRefObject<THREE.Group | null>;
}) {
  const hudAcc = useRef(0);
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const flying = useRef(false);
  const lastKey = useRef(0);
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const state = useGlobeStore.getState();
    if (!state.paused) {
      state.advance(d * 1000 * state.speed);
    }
    const now = new Date(useGlobeStore.getState().simTime);
    const { lat, lon } = getSubsolarPoint(now);
    const earth = earthHeliocentricDir(now);
    const moon = moonEclipticDir(now);
    hudAcc.current += d;
    if (hudAcc.current > 0.12) {
      hudAcc.current = 0;
      const sublunar = getMoonState(now);
      state.setSun(lat, lon);
      state.setMoon(sublunar.lat, sublunar.lon, moon.illum);
    }

    if (state.viewMode === "system") {
      ORBIT_POS.set(earth.x * EARTH_ORBIT_SYS, earth.y * EARTH_ORBIT_SYS, earth.z * EARTH_ORBIT_SYS);
      if (earthBary.current) {
        earthBary.current.position.copy(ORBIT_POS);
        EARTH_WORLD.copy(ORBIT_POS);
      } else {
        EARTH_WORLD.copy(ORBIT_POS);
      }
      MOON_WORLD.set(
        EARTH_WORLD.x + moon.x * MOON_DIST_SYS,
        EARTH_WORLD.y + moon.y * MOON_DIST_SYS,
        EARTH_WORLD.z + moon.z * MOON_DIST_SYS,
      );
      SUN_WORLD.set(0, 0, 0);
      sunDir.set(-earth.x, -earth.y, -earth.z).normalize();
      if (earthSpin.current) {
        latLonToVec3(lat, lon, 1, LOCAL_SUN).normalize();
        earthSpin.current.quaternion.setFromUnitVectors(LOCAL_SUN, sunDir);
        earthSpin.current.scale.setScalar(EARTH_SCALE_SYS);
      }
    } else {
      if (earthBary.current) earthBary.current.position.set(0, 0, 0);
      if (earthSpin.current) {
        earthSpin.current.quaternion.identity();
        earthSpin.current.scale.setScalar(1);
      }
      EARTH_WORLD.set(0, 0, 0);
      latLonToVec3(lat, lon, 1, sunDir);
      const sublunar = getMoonState(now);
      latLonToVec3(sublunar.lat, sublunar.lon, sublunar.dist, MOON_WORLD);
      SUN_WORLD.set(0, 0, 0);
    }

    const req = state.viewRequest;
    if (req && req.key !== lastKey.current) {
      lastKey.current = req.key;
      if (req.kind === "system") {
        FLY_TARGET.set(0, EARTH_ORBIT_SYS * 1.58, EARTH_ORBIT_SYS * 2.22);
      } else {
        SUN_N.copy(sunDir).normalize();
        INIT_SIDE.crossVectors(WORLD_UP, SUN_N);
        if (INIT_SIDE.lengthSq() < 0.01) INIT_SIDE.set(0, 0, 1);
        INIT_SIDE.normalize();
        INIT_DIR.copy(INIT_SIDE)
          .multiplyScalar(0.94)
          .addScaledVector(SUN_N, 0.12)
          .addScaledVector(WORLD_UP, 0.22)
          .normalize();
        FLY_TARGET.copy(INIT_DIR).multiplyScalar(GLOBE_DIST);
      }
      flying.current = true;
      if (controls) {
        controls.enabled = false;
        controls.enableDamping = false;
      }
    }
    if (flying.current) {
      camera.position.lerp(FLY_TARGET, 1 - Math.exp(-d * 4.4));
      camera.up.copy(WORLD_UP);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(FLY_TARGET) < 1.4) {
        camera.position.copy(FLY_TARGET);
        camera.lookAt(0, 0, 0);
        flying.current = false;
        if (controls) {
          controls.target.set(0, 0, 0);
          controls.enableDamping = true;
          controls.enabled = true;
          controls.update();
        }
        useGlobeStore.getState().clearViewRequest();
      }
    }
  });
  return null;
}

function InitialView({ sunDir }: { sunDir: THREE.Vector3 }) {
  const { camera } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    if (sunDir.lengthSq() < 0.25) return;
    SUN_N.copy(sunDir).normalize();
    INIT_SIDE.crossVectors(WORLD_UP, SUN_N);
    if (INIT_SIDE.lengthSq() < 0.01) INIT_SIDE.set(0, 0, 1);
    INIT_SIDE.normalize();
    INIT_DIR.copy(INIT_SIDE)
      .multiplyScalar(0.94)
      .addScaledVector(SUN_N, 0.12)
      .addScaledVector(WORLD_UP, 0.22)
      .normalize();
    camera.position.copy(INIT_DIR).multiplyScalar(2.62);
    camera.lookAt(0, 0, 0);
    done.current = true;
  });
  return null;
}

function Earth({
  sunDir,
  countries,
  onReady,
}: {
  sunDir: THREE.Vector3;
  countries: Country[] | null;
  onReady: () => void;
}) {
  const [dayMap, nightMap, bumpMap] = useTexture([
    "/textures/earth-day-2k.jpg",
    "/textures/earth-night-2k.jpg",
    "/textures/earth-topology.png",
  ]);
  const { gl, camera } = useThree();
  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      bumpMap: { value: bumpMap },
      sunDirection: { value: sunDir },
    }),
    [dayMap, nightMap, bumpMap, sunDir],
  );

  useEffect(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    applyColorMap(dayMap, aniso);
    applyColorMap(nightMap, aniso);
    bumpMap.colorSpace = THREE.NoColorSpace;
    bumpMap.anisotropy = aniso;
    bumpMap.needsUpdate = true;
    onReady();

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hi =
      !coarse && gl.capabilities.maxTextureSize >= 8192
        ? { day: "/textures/earth-day-8k.jpg", night: "/textures/earth-night-8k.jpg" }
        : { day: "/textures/earth-day-4k.jpg", night: "/textures/earth-night-4k.jpg" };

    let cancelled = false;
    const extra: THREE.Texture[] = [];
    const stop = afterPaint(() => {
      void Promise.all([loadColorMap(hi.day, aniso), loadColorMap(hi.night, aniso)]).then(
        ([dayHi, nightHi]) => {
          if (cancelled) {
            dayHi.dispose();
            nightHi.dispose();
            return;
          }
          extra.push(dayHi, nightHi);
          uniforms.dayMap.value = dayHi;
          uniforms.nightMap.value = nightHi;
        },
      );
    }, 700);
    return () => {
      cancelled = true;
      stop();
      for (const t of extra) t.dispose();
    };
  }, [dayMap, nightMap, bumpMap, gl, onReady, uniforms]);

  const drag = useRef({ x: 0, y: 0, moved: false, down: false });
  const hoverAcc = useRef(0);
  const coarse = useRef(false);
  useEffect(() => {
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const pickAt = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    NDC.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    RAY.setFromCamera(NDC, camera);
    if (!RAY.ray.intersectSphere(SPHERE, HIT)) return null;
    const { lat, lon } = vec3ToLatLon(HIT);
    const country = countries ? findCountryAt(countries, lon, lat) : null;
    const dist = camera.position.length();
    const cityMax = dist < 2.1 ? 90 : dist < 3 ? 200 : 340;
    const city = pickHoverCity(lat, lon, cityMax);
    return { lat, lon, country, city };
  };

  const onPointerDown = (e: { clientX: number; clientY: number }) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false, down: true };
    useGlobeStore.getState().setHover(null);
  };
  const onPointerMove = (e: { clientX: number; clientY: number }) => {
    if (drag.current.down) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      if (dx * dx + dy * dy > 25) drag.current.moved = true;
      return;
    }
    if (coarse.current) return;
    if (camera.position.length() > 10) {
      useGlobeStore.getState().setHover(null);
      return;
    }
    hoverAcc.current += 1;
    if (hoverAcc.current < 2) return;
    hoverAcc.current = 0;
    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) {
      useGlobeStore.getState().setHover(null);
      return;
    }
    useGlobeStore.getState().setHover({
      lat: hit.lat,
      lon: hit.lon,
      countryId: hit.country?.id ?? null,
      cityId: hit.city?.id ?? null,
      x: e.clientX,
      y: e.clientY,
    });
  };
  const onPointerUp = (e: { clientX: number; clientY: number }) => {
    const wasClick = drag.current.down && !drag.current.moved;
    drag.current.down = false;
    if (!wasClick || !countries) return;
    if (camera.position.length() > 10) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) {
      useGlobeStore.getState().setSelected(null);
      return;
    }
    if (hit.city) {
      useGlobeStore.getState().setSelected({ kind: "city", id: hit.city.id });
      return;
    }
    if (hit.country) {
      useGlobeStore.getState().setSelected({ kind: "country", id: hit.country.id });
      return;
    }
    useGlobeStore.getState().setSelected(null);
  };
  const onPointerOut = () => {
    if (!drag.current.down) useGlobeStore.getState().setHover(null);
  };

  return (
    <mesh
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[1, 128, 96]} />
      <shaderMaterial
        vertexShader={earthVertex}
        fragmentShader={earthFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function Clouds({ sunDir }: { sunDir: THREE.Vector3 }) {
  const map = useTexture("/textures/earth-clouds.jpg");
  const ref = useRef<THREE.Mesh>(null);
  const visible = useGlobeStore((s) => s.showClouds);
  const uniforms = useMemo(
    () => ({
      cloudMap: { value: map },
      sunDirection: { value: sunDir },
    }),
    [map, sunDir],
  );
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
  }, [map]);
  useFrame(() => {
    if (!ref.current) return;
    const t = useGlobeStore.getState().simTime;
    ref.current.rotation.y = (t / 86_400_000) * Math.PI * 0.35;
  });
  if (!visible) return null;
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.008, 96, 64]} />
      <shaderMaterial
        vertexShader={cloudVertex}
        fragmentShader={cloudFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Atmosphere({ sunDir }: { sunDir: THREE.Vector3 }) {
  const visible = useGlobeStore((s) => s.showAtmosphere);
  const uniforms = useMemo(
    () => ({ sunDirection: { value: sunDir } }),
    [sunDir],
  );
  if (!visible) return null;
  return (
    <mesh scale={1.08}>
      <sphereGeometry args={[1, 64, 48]} />
      <shaderMaterial
        vertexShader={atmosVertex}
        fragmentShader={atmosFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function buildRingGeometry(countries: Country[], radius: number, onlyId?: string) {
  const positions: number[] = [];
  const push = (lat: number, lon: number) => {
    latLonToVec3(lat, lon, radius, TMP);
    positions.push(TMP.x, TMP.y, TMP.z);
  };
  for (const c of countries) {
    if (onlyId && c.id !== onlyId) continue;
    forEachRing(c.geometry, (ring, isHole) => {
      if (isHole) return;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i]!;
        const b = ring[i + 1]!;
        const dLon = Math.abs(a[0]! - b[0]!);
        if (dLon > 180) continue;
        push(a[1]!, a[0]!);
        push(b[1]!, b[0]!);
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return g;
}

function Borders({ countries }: { countries: Country[] }) {
  const visible = useGlobeStore((s) => s.showBorders);
  const geom = useMemo(() => buildRingGeometry(countries, 1.004), [countries]);
  useEffect(() => () => geom.dispose(), [geom]);
  if (!visible) return null;
  return (
    <lineSegments geometry={geom} renderOrder={1}>
      <lineBasicMaterial color="#d7dee6" transparent opacity={0.5} depthWrite={false} />
    </lineSegments>
  );
}

function SelectedBorder({ countries }: { countries: Country[] }) {
  const selected = useGlobeStore((s) => s.selected);
  const countryId = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === "country") return selected.id;
    const city = CITY_BY_ID.get(selected.id);
    if (!city) return null;
    return countries.find((c) => c.iso2 === city.iso2)?.id ?? null;
  }, [selected, countries]);

  const geom = useMemo(() => {
    if (!countryId) return null;
    return buildRingGeometry(countries, 1.007, countryId);
  }, [countries, countryId]);

  useEffect(() => () => geom?.dispose(), [geom]);
  if (!geom) return null;
  return (
    <lineSegments geometry={geom} renderOrder={2}>
      <lineBasicMaterial color="#f4f6f8" transparent opacity={0.95} depthWrite={false} />
    </lineSegments>
  );
}

function Graticule() {
  const visible = useGlobeStore((s) => s.showGraticule);
  const geom = useMemo(() => {
    const positions: number[] = [];
    const pushLine = (points: Array<[number, number]>) => {
      for (let i = 0; i < points.length - 1; i++) {
        latLonToVec3(points[i]![0], points[i]![1], 1.003, TMP);
        positions.push(TMP.x, TMP.y, TMP.z);
        latLonToVec3(points[i + 1]![0], points[i + 1]![1], 1.003, TMP);
        positions.push(TMP.x, TMP.y, TMP.z);
      }
    };
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: Array<[number, number]> = [];
      for (let lon = -180; lon <= 180; lon += 5) pts.push([lat, lon]);
      pushLine(pts);
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const pts: Array<[number, number]> = [];
      for (let lat = -80; lat <= 80; lat += 5) pts.push([lat, lon]);
      pushLine(pts);
    }
    const extras = [0, 23.44, -23.44, 66.56, -66.56];
    for (const lat of extras) {
      const pts: Array<[number, number]> = [];
      for (let lon = -180; lon <= 180; lon += 4) pts.push([lat, lon]);
      pushLine(pts);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);
  if (!visible) return null;
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#8b96a4" transparent opacity={0.22} depthWrite={false} />
    </lineSegments>
  );
}

function Terminator({ sunDir }: { sunDir: THREE.Vector3 }) {
  const ref = useRef<THREE.LineLoop>(null);
  const geom = useMemo(() => {
    const pts: number[] = [];
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(Math.cos(a) * 1.006, Math.sin(a) * 1.006, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);
  useFrame(() => {
    if (!ref.current) return;
    SUN_N.copy(sunDir).normalize();
    ref.current.quaternion.setFromUnitVectors(Z_AXIS, SUN_N);
    ref.current.visible = useGlobeStore.getState().cameraDist < 14;
  });
  return (
    <lineLoop ref={ref} geometry={geom} renderOrder={3}>
      <lineBasicMaterial color="#d9b396" transparent opacity={0.42} depthWrite={false} />
    </lineLoop>
  );
}

function CityPoints({ sunDir }: { sunDir: THREE.Vector3 }) {
  const visible = useGlobeStore((s) => s.showCities);
  const ref = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const pos = new Float32Array(CITIES.length * 3);
    const v = new THREE.Vector3();
    CITIES.forEach((c, i) => {
      latLonToVec3(c.lat, c.lon, 1.006, v);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: sunDir },
          uScale: { value: 1 },
          uPulse: { value: 1 },
        },
        vertexShader: `
          uniform vec3 sunDirection;
          uniform float uScale;
          varying float vNight;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float ndl = dot(normalize(position), normalize(sunDirection));
            vNight = smoothstep(0.12, -0.08, ndl);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (2.6 + vNight * 1.1) * uScale;
          }
        `,
        fragmentShader: `
          varying float vNight;
          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float d = length(p);
            if (d > 0.48) discard;
            float core = smoothstep(0.48, 0.16, d);
            vec3 c = mix(vec3(0.82, 0.86, 0.90), vec3(1.0, 0.90, 0.68), vNight);
            gl_FragColor = vec4(c, core * mix(0.28, 0.62, vNight));
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false,
      }),
    [sunDir],
  );
  useEffect(
    () => () => {
      geom.dispose();
      mat.dispose();
    },
    [geom, mat],
  );
  useFrame(({ size, camera }) => {
    mat.uniforms.uScale!.value = Math.min(size.height / 700, 1.35);
    if (ref.current) ref.current.visible = visible && camera.position.length() < 5.2;
  });
  if (!visible) return null;
  return <points ref={ref} geometry={geom} material={mat} renderOrder={4} />;
}

function SelectedMarker() {
  const selected = useGlobeStore((s) => s.selected);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock, camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!selected || camera.position.length() > 8) {
      mesh.visible = false;
      return;
    }
    const city = selected.kind === "city" ? CITY_BY_ID.get(selected.id) : null;
    if (!city) {
      mesh.visible = false;
      return;
    }
    latLonToVec3(city.lat, city.lon, 1.018, mesh.position);
    mesh.lookAt(0, 0, 0);
    mesh.scale.setScalar(0.028 + 0.008 * Math.sin(clock.elapsedTime * 3.2));
    mesh.visible = true;
  });
  return (
    <mesh ref={ref} visible={false} renderOrder={5}>
      <ringGeometry args={[0.85, 1, 32]} />
      <meshBasicMaterial color="#f4f6f8" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function FlyToController() {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const flyTo = useGlobeStore((s) => s.flyTo);
  const active = useRef(false);
  const resumeAuto = useRef(false);

  useEffect(() => {
    if (!flyTo) return;
    latLonToVec3(flyTo.lat, flyTo.lon, flyTo.distance, FLY_TARGET);
    active.current = true;
    const state = useGlobeStore.getState();
    resumeAuto.current = state.autoRotate;
    if (state.autoRotate) state.setAutoRotate(false);
    if (controls) controls.enabled = false;
  }, [flyTo, controls]);

  useFrame((_, delta) => {
    if (useGlobeStore.getState().viewMode === "system") {
      active.current = false;
      return;
    }
    if (!active.current) return;
    const d = Math.min(delta, 0.1);
    camera.position.lerp(FLY_TARGET, 1 - Math.exp(-d * 3.4));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(FLY_TARGET) < 0.04) {
      camera.position.copy(FLY_TARGET);
      camera.lookAt(0, 0, 0);
      active.current = false;
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.enabled = true;
        controls.update();
      }
      useGlobeStore.getState().clearFlyTo();
      if (resumeAuto.current) useGlobeStore.getState().setAutoRotate(true);
    }
  });
  return null;
}

const NORMAL = new THREE.Vector3();
const TO_CAM = new THREE.Vector3();
const PROJ = new THREE.Vector3();

function LabelProjector({
  countries,
  nodesRef,
}: {
  countries: Country[] | null;
  nodesRef: NodesRef;
}) {
  const { camera, size } = useThree();
  useFrame(() => {
    const map = nodesRef.current;
    if (map.size === 0) return;
    const state = useGlobeStore.getState();
    const dist = camera.position.length();
    const occupied: number[] = [];

    const hideEl = (el?: HTMLElement) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    };

    const tryPlaceWorld = (el: HTMLElement, pos: THREE.Vector3, padX: number, padY: number) => {
      PROJ.copy(pos);
      PROJ.project(camera);
      if (PROJ.z > 1) {
        hideEl(el);
        return false;
      }
      const x = (PROJ.x * 0.5 + 0.5) * size.width;
      const y = (-PROJ.y * 0.5 + 0.5) * size.height;
      if (x < -48 || y < -48 || x > size.width + 48 || y > size.height + 48) {
        hideEl(el);
        return false;
      }
      for (let i = 0; i < occupied.length; i += 2) {
        if (Math.abs(occupied[i]! - x) < padX && Math.abs(occupied[i + 1]! - y) < padY) {
          hideEl(el);
          return false;
        }
      }
      occupied.push(x, y);
      el.style.opacity = "1";
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.pointerEvents = "auto";
      return true;
    };

    const tryPlace = (el: HTMLElement, lat: number, lon: number, padX: number, padY: number) => {
      latLonToVec3(lat, lon, 1.03, PROJ);
      NORMAL.copy(PROJ).normalize();
      TO_CAM.copy(camera.position).sub(PROJ).normalize();
      const facing = NORMAL.dot(TO_CAM);
      if (facing < 0.2) {
        hideEl(el);
        return false;
      }
      PROJ.project(camera);
      if (PROJ.z > 1) {
        hideEl(el);
        return false;
      }
      const x = (PROJ.x * 0.5 + 0.5) * size.width;
      const y = (-PROJ.y * 0.5 + 0.5) * size.height;
      for (let i = 0; i < occupied.length; i += 2) {
        if (Math.abs(occupied[i]! - x) < padX && Math.abs(occupied[i + 1]! - y) < padY) {
          hideEl(el);
          return false;
        }
      }
      occupied.push(x, y);
      el.style.opacity = String(Math.min(1, (facing - 0.2) / 0.32));
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.pointerEvents = "auto";
      return true;
    };

    if (state.viewMode === "system") {
      const earthEl = map.get("b:earth");
      if (earthEl) tryPlaceWorld(earthEl, EARTH_WORLD, 56, 24);
      const moonEl = map.get("b:moon");
      if (moonEl) tryPlaceWorld(moonEl, MOON_WORLD, 56, 24);
      const sunEl = map.get("b:sun");
      if (sunEl) tryPlaceWorld(sunEl, SUN_WORLD, 56, 24);
    } else {
      hideEl(map.get("b:earth"));
      hideEl(map.get("b:moon"));
      hideEl(map.get("b:sun"));
    }

    let focusIso: string | null = null;
    if (state.selected?.kind === "city") {
      focusIso = CITY_BY_ID.get(state.selected.id)?.iso2 ?? null;
    } else if (state.selected?.kind === "country" && countries) {
      focusIso = countries.find((c) => c.id === state.selected!.id)?.iso2 ?? null;
    }

    if (state.showCountries && countries && dist < 8.8 && state.viewMode !== "system") {
      for (const c of countries) {
        const el = map.get(`c:${c.id}`);
        if (!el) continue;
        const selected = state.selected?.kind === "country" && state.selected.id === c.id;
        const minDist = c.areaHint > 200 ? 1.42 : 1.55;
        const maxDist = c.areaHint > 800 ? 6.5 : c.areaHint > 80 ? 4.6 : 3.2;
        if (!selected && (dist < minDist || dist > maxDist)) {
          hideEl(el);
          continue;
        }
        tryPlace(el, c.lat, c.lon, 52, 18);
      }
    } else {
      for (const [key, el] of map) {
        if (key.startsWith("c:")) hideEl(el);
      }
    }

    if (state.showCities && dist < 5.5 && state.viewMode !== "system") {
      for (const city of CITIES) {
        const el = map.get(`p:${city.id}`);
        if (!el) continue;
        const selected = state.selected?.kind === "city" && state.selected.id === city.id;
        const inFocus = focusIso !== null && city.iso2 === focusIso;
        const isMega = city.pop >= 8000;
        const isCapital = city.capital;
        const maxDist = inFocus ? 6.2 : isMega ? 4.4 : isCapital ? 3.15 : 2.45;
        const minDist = 1.36;
        if (!selected && !inFocus && (dist > maxDist || dist < minDist)) {
          hideEl(el);
          continue;
        }
        if (!selected && inFocus && dist < minDist) {
          hideEl(el);
          continue;
        }
        tryPlace(el, city.lat, city.lon, 44, 16);
      }
    } else {
      for (const [key, el] of map) {
        if (key.startsWith("p:")) hideEl(el);
      }
    }
  });
  return null;
}
