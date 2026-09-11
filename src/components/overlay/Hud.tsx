import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Cloud,
  Globe2,
  Grid3x3,
  LocateFixed,
  MapPinned,
  Moon,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sun,
  X,
} from "lucide-react";
import { CITIES, CITY_BY_ID, capitalForIso, citiesForIso } from "@/data/cities";
import {
  formatCoord,
  formatPopThousands,
  formatUtc,
  isDaylight,
  localSolarTime,
} from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Country } from "@/lib/world-data";
import { SPEED_PRESETS, useGlobeStore } from "@/store/globe-store";

function useSimClock() {
  const [t, setT] = useState(() => useGlobeStore.getState().simTime);
  useEffect(() => {
    const id = window.setInterval(() => setT(useGlobeStore.getState().simTime), 200);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function Hud({
  countries,
  error,
}: {
  countries: Country[] | null;
  error: string | null;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useGlobeStore.getState().setSelected(null);
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        useGlobeStore.getState().togglePaused();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-5">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <BrandBlock />
          <SearchBox countries={countries} />
        </div>
        {error ? (
          <p className="panel pointer-events-auto self-start px-3 py-2 text-sm text-fg">{error}</p>
        ) : null}
        <div className="flex flex-1 items-end justify-between gap-3">
          <LayerPanel />
          <div className="flex min-w-0 flex-col items-end gap-2">
            <InfoPanel countries={countries} />
            <ScaleCard />
          </div>
        </div>
        <TimeBar />
      </div>
    </div>
  );
}

function BrandBlock() {
  const simTime = useSimClock();
  const sunLat = useGlobeStore((s) => s.sunLat);
  const sunLon = useGlobeStore((s) => s.sunLon);
  const viewMode = useGlobeStore((s) => s.viewMode);
  const requestView = useGlobeStore((s) => s.requestView);
  const date = new Date(simTime);
  const { date: d, time } = formatUtc(date);

  return (
    <section className="panel pointer-events-auto w-full px-4 py-3 sm:max-w-80">
      <p className="text-2xs font-medium uppercase tracking-widest text-muted">Live globe</p>
      <h1 className="font-display mt-1 text-xl font-medium tracking-tight text-fg sm:text-2xl">
        昼夜地球
      </h1>
      <p className="mt-1 hidden text-sm text-muted sm:block">
        {viewMode === "system" ? "地球绕太阳公转 · 月亮绕地球公转" : "拖动旋转 · 滚轮拉近看城市"}
      </p>
      <div className="mt-3 flex gap-1">
        <button
          type="button"
          onClick={() => requestView("globe")}
          className={cn(
            "h-9 flex-1 rounded-md px-2 text-xs",
            viewMode === "globe" ? "bg-fg text-bg" : "bg-fg/8 text-muted hover:text-fg",
          )}
        >
          地球
        </button>
        <button
          type="button"
          onClick={() => requestView("system")}
          className={cn(
            "h-9 flex-1 rounded-md px-2 text-xs",
            viewMode === "system" ? "bg-fg text-bg" : "bg-fg/8 text-muted hover:text-fg",
          )}
        >
          地月日
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="UTC" value={`${d}  ${time}`} />
        <Stat label="直射点" value={formatCoord(sunLat, sunLon)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-fg/5 px-2.5 py-2">
      <p className="text-2xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums text-fg">{value}</p>
    </div>
  );
}

function SearchBox({ countries }: { countries: Country[] | null }) {
  const query = useGlobeStore((s) => s.query);
  const setQuery = useGlobeStore((s) => s.setQuery);
  const setSelected = useGlobeStore((s) => s.setSelected);
  const requestFlyTo = useGlobeStore((s) => s.requestFlyTo);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { countries: [] as Country[], cities: [] as typeof CITIES };
    const cs = (countries ?? [])
      .filter((c) => c.nameZh.includes(query.trim()) || c.nameEn.toLowerCase().includes(q) || c.iso2.toLowerCase() === q)
      .slice(0, 6);
    const ps = CITIES.filter(
      (c) => c.nameZh.includes(query.trim()) || c.name.toLowerCase().includes(q),
    ).slice(0, 8);
    return { countries: cs, cities: ps };
  }, [query, countries]);

  const show = open && query.trim().length > 0;

  return (
    <div className="pointer-events-auto w-full max-w-80">
      <label className="panel flex items-center gap-2 px-3 py-2.5">
        <Search className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
          placeholder="搜索国家或城市"
          className="min-h-7 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
        />
        {query && (
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:text-fg"
            onClick={() => setQuery("")}
            aria-label="清除"
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>
      {show && (
        <ul className="panel mt-2 max-h-72 overflow-auto py-1">
          {results.countries.length === 0 && results.cities.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">没有匹配</li>
          )}
          {results.countries.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-fg/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelected({ kind: "country", id: c.id });
                  requestFlyTo(c.lat, c.lon, 2.2);
                  setQuery("");
                }}
              >
                <span>{c.nameZh}</span>
                <span className="text-xs text-muted">{c.nameEn}</span>
              </button>
            </li>
          ))}
          {results.cities.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-fg/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelected({ kind: "city", id: c.id });
                  requestFlyTo(c.lat, c.lon, 1.85);
                  setQuery("");
                }}
              >
                <span>
                  {c.nameZh}
                  {c.capital ? <span className="ml-2 text-2xs text-muted">首都</span> : null}
                </span>
                <span className="text-xs text-muted">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LayerPanel() {
  const showBorders = useGlobeStore((s) => s.showBorders);
  const showCountries = useGlobeStore((s) => s.showCountries);
  const showCities = useGlobeStore((s) => s.showCities);
  const showClouds = useGlobeStore((s) => s.showClouds);
  const showGraticule = useGlobeStore((s) => s.showGraticule);
  const showAtmosphere = useGlobeStore((s) => s.showAtmosphere);
  const autoRotate = useGlobeStore((s) => s.autoRotate);

  return (
    <div className="pointer-events-auto hidden flex-col gap-1 sm:flex">
      <Toggle
        icon={<Orbit className="size-3.5" />}
        label="巡航"
        on={autoRotate}
        set={useGlobeStore.getState().setAutoRotate}
      />
      <Toggle
        icon={<Globe2 className="size-3.5" />}
        label="国界"
        on={showBorders}
        set={useGlobeStore.getState().setShowBorders}
      />
      <Toggle
        icon={<LocateFixed className="size-3.5" />}
        label="国家"
        on={showCountries}
        set={useGlobeStore.getState().setShowCountries}
      />
      <Toggle
        icon={<MapPinned className="size-3.5" />}
        label="城市"
        on={showCities}
        set={useGlobeStore.getState().setShowCities}
      />
      <Toggle
        icon={<Cloud className="size-3.5" />}
        label="云层"
        on={showClouds}
        set={useGlobeStore.getState().setShowClouds}
      />
      <Toggle
        icon={<Grid3x3 className="size-3.5" />}
        label="经纬网"
        on={showGraticule}
        set={useGlobeStore.getState().setShowGraticule}
      />
      <Toggle
        icon={<Sun className="size-3.5" />}
        label="大气"
        on={showAtmosphere}
        set={useGlobeStore.getState().setShowAtmosphere}
      />
    </div>
  );
}

function Toggle({
  icon,
  label,
  on,
  set,
}: {
  icon: ReactNode;
  label: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={cn(
        "panel flex h-11 min-w-28 items-center gap-2 px-3 text-sm",
        on ? "text-fg" : "text-muted",
      )}
      aria-pressed={on}
    >
      {icon}
      <span>{label}</span>
      <span className={cn("ml-auto size-1.5 rounded-full", on ? "bg-fg" : "bg-fg/25")} />
    </button>
  );
}

function InfoPanel({ countries }: { countries: Country[] | null }) {
  const selected = useGlobeStore((s) => s.selected);
  const setSelected = useGlobeStore((s) => s.setSelected);
  const requestFlyTo = useGlobeStore((s) => s.requestFlyTo);
  const sunLat = useGlobeStore((s) => s.sunLat);
  const sunLon = useGlobeStore((s) => s.sunLon);
  const simTime = useSimClock();
  const date = new Date(simTime);

  if (!selected || !countries) return null;

  if (selected.kind === "country") {
    const c = countries.find((x) => x.id === selected.id);
    if (!c) return null;
    const capital = capitalForIso(c.iso2);
    const cities = citiesForIso(c.iso2);
    const day = isDaylight(c.lat, c.lon, sunLat, sunLon);
    const local = localSolarTime(date, c.lon);
    return (
      <aside className="panel pointer-events-auto w-full max-w-80 self-end px-4 py-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xs uppercase tracking-widest text-muted">{c.iso2}</p>
            <h2 className="font-display mt-1 text-lg font-medium tracking-tight">{c.nameZh}</h2>
            <p className="text-sm text-muted">{c.nameEn}</p>
          </div>
          <button type="button" className="rounded-md p-2 text-muted hover:text-fg" onClick={() => setSelected(null)} aria-label="关闭">
            <X className="size-4" />
          </button>
        </header>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row k="位置" v={formatCoord(c.lat, c.lon)} />
          <Row k="当地太阳时" v={local.label} />
          <Row k="日照" v={day ? "白昼" : "夜晚"} />
          {capital && <Row k="首都" v={`${capital.nameZh}  ${capital.name}`} />}
        </dl>
        {cities.length > 0 && (
          <div className="mt-3">
            <p className="text-2xs uppercase tracking-wider text-muted">主要城市</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {cities.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    className="rounded-md bg-fg/5 px-2 py-1 text-xs text-fg hover:bg-fg/10"
                    onClick={() => {
                      setSelected({ kind: "city", id: city.id });
                      requestFlyTo(city.lat, city.lon, 1.85);
                    }}
                  >
                    {city.nameZh}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    );
  }

  const city = CITY_BY_ID.get(selected.id);
  if (!city) return null;
  const country = countries.find((c) => c.iso2 === city.iso2);
  const day = isDaylight(city.lat, city.lon, sunLat, sunLon);
  const local = localSolarTime(date, city.lon);
  return (
    <aside className="panel pointer-events-auto w-full max-w-80 self-end px-4 py-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs uppercase tracking-widest text-muted">
            {city.capital ? "首都" : "城市"}
          </p>
          <h2 className="font-display mt-1 text-lg font-medium tracking-tight">{city.nameZh}</h2>
          <p className="text-sm text-muted">{city.name}</p>
        </div>
        <button type="button" className="rounded-md p-2 text-muted hover:text-fg" onClick={() => setSelected(null)} aria-label="关闭">
          <X className="size-4" />
        </button>
      </header>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row k="国家" v={country ? `${country.nameZh}  ${country.nameEn}` : city.iso2} />
        <Row k="坐标" v={formatCoord(city.lat, city.lon)} />
        <Row k="人口" v={`约 ${formatPopThousands(city.pop)}`} />
        <Row k="当地太阳时" v={local.label} />
        <Row k="日照" v={day ? "白昼" : "夜晚"} />
      </dl>
      {country && (
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-fg px-3 py-2.5 text-sm font-medium text-bg hover:bg-fg/90"
          onClick={() => {
            setSelected({ kind: "country", id: country.id });
            requestFlyTo(country.lat, country.lon, 2.2);
          }}
        >
          查看 {country.nameZh}
        </button>
      )}
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums text-fg">{v}</dd>
    </div>
  );
}

function ScaleCard() {
  const viewMode = useGlobeStore((s) => s.viewMode);
  const selected = useGlobeStore((s) => s.selected);
  const moonIllum = useGlobeStore((s) => s.moonIllum);
  if (viewMode !== "system" || selected) return null;
  return (
    <aside className="panel pointer-events-auto w-full max-w-80 px-4 py-4">
      <p className="text-2xs uppercase tracking-widest text-muted">Scale</p>
      <h2 className="font-display mt-1 flex items-center gap-2 text-lg font-medium tracking-tight">
        <Moon className="size-4 text-muted" strokeWidth={1.75} />
        日 · 地 · 月
      </h2>
      <p className="mt-1 text-sm text-muted">
        轨道关系按真实力学：地球绕太阳、月亮绕地球。日地距离与太阳大小已压缩，否则无法同框。
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row k="地球公转" v="365.25 日 · 黄道面" />
        <Row k="月球公转" v="27.3 日 · 倾角 5.1°" />
        <Row k="地球自转" v="23.93 时" />
        <Row k="地月距离" v="真实 38.4 万 km" />
        <Row k="日地距离" v="真实 1.50 亿 km" />
        <Row k="月面照明" v={`${Math.round(moonIllum * 100)}%`} />
      </dl>
      <p className="mt-3 text-2xs text-muted">拖动环视 · 点「地球」回到地表</p>
    </aside>
  );
}

function TimeBar() {
  const speed = useGlobeStore((s) => s.speed);
  const setSpeed = useGlobeStore((s) => s.setSpeed);
  const paused = useGlobeStore((s) => s.paused);
  const togglePaused = useGlobeStore((s) => s.togglePaused);
  const resetTime = useGlobeStore((s) => s.resetTime);
  const setSimTime = useGlobeStore((s) => s.setSimTime);
  const simTime = useSimClock();
  const date = new Date(simTime);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const hours = (simTime - start) / 3_600_000;
  const sunLon = useGlobeStore((s) => s.sunLon);

  const dayPct = ((sunLon + 180) / 360) * 100;

  return (
    <section className="panel pointer-events-auto w-full px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePaused}
          className="flex size-11 items-center justify-center rounded-lg bg-fg text-bg"
          aria-label={paused ? "继续" : "暂停"}
        >
          {paused ? <Play className="size-4 ml-px" /> : <Pause className="size-4" />}
        </button>
        <button
          type="button"
          onClick={resetTime}
          className="flex size-11 items-center justify-center rounded-lg bg-fg/8 text-fg"
          aria-label="回到此刻"
          title="回到此刻"
        >
          <RotateCcw className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative h-2 overflow-hidden rounded-full bg-fg/10">
            <div
              className="absolute inset-y-0 bg-fg/35"
              style={{
                left: `${((dayPct + 50) % 100) - 25}%`,
                width: "50%",
              }}
            />
            <input
              type="range"
              min={0}
              max={24}
              step={0.02}
              value={hours}
              onChange={(e) => setSimTime(start + Number(e.target.value) * 3_600_000)}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              aria-label="当日时刻"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setSpeed(p.value)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs",
                  speed === p.value ? "bg-fg text-bg" : "bg-fg/8 text-muted hover:text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto hidden text-2xs tabular-nums text-muted sm:inline">
              {speed === 1 ? "实时自转" : `${speed.toLocaleString("zh-CN")}×`}
            </span>
          </div>
        </div>
      </div>
      <MobileLayers />
    </section>
  );
}

function MobileLayers() {
  const showBorders = useGlobeStore((s) => s.showBorders);
  const showCountries = useGlobeStore((s) => s.showCountries);
  const showCities = useGlobeStore((s) => s.showCities);
  const showClouds = useGlobeStore((s) => s.showClouds);
  const showGraticule = useGlobeStore((s) => s.showGraticule);
  const showAtmosphere = useGlobeStore((s) => s.showAtmosphere);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  return (
    <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
      {(
        [
          ["巡航", autoRotate, useGlobeStore.getState().setAutoRotate],
          ["国界", showBorders, useGlobeStore.getState().setShowBorders],
          ["国家", showCountries, useGlobeStore.getState().setShowCountries],
          ["城市", showCities, useGlobeStore.getState().setShowCities],
          ["云层", showClouds, useGlobeStore.getState().setShowClouds],
          ["经纬", showGraticule, useGlobeStore.getState().setShowGraticule],
          ["大气", showAtmosphere, useGlobeStore.getState().setShowAtmosphere],
        ] as const
      ).map(([label, on, set]) => (
        <button
          key={label}
          type="button"
          onClick={() => set(!on)}
          className={cn(
            "h-9 rounded-md px-2.5 text-xs",
            on ? "bg-fg/15 text-fg" : "bg-fg/5 text-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
