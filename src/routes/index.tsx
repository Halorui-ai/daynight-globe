import { createFileRoute } from "@tanstack/react-router";
import { type ComponentType, useEffect, useState } from "react";
import { Splash } from "@/components/overlay/Splash";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/components/globe/GlobeApp")
      .then((mod) => {
        if (!cancelled) setApp(() => mod.GlobeApp);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "无法启动地球仪");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!App) {
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
        <h1 className="sr-only">昼夜地球</h1>
        <Splash error={error} />
      </div>
    );
  }

  return <App />;
}
