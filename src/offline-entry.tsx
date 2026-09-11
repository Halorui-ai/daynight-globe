import { createRoot } from "react-dom/client";
import { GlobeApp } from "@/components/globe/GlobeApp";
import "./styles.css";

function boot() {
  const el = document.getElementById("app");
  if (!el) throw new Error("missing #app");
  createRoot(el).render(<GlobeApp />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
