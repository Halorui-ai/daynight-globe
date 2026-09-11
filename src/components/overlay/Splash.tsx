export function Splash({ error }: { error: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-bg/55">
      <div className="flex flex-col items-center gap-4">
        <span className="earth-spinner size-14 rounded-full" aria-hidden />
        <div className="text-center">
          <p className="font-display text-lg font-medium tracking-tight text-fg">昼夜地球</p>
          <p className="mt-1 text-sm text-muted">{error ?? "正在进入地球轨道"}</p>
        </div>
      </div>
    </div>
  );
}
