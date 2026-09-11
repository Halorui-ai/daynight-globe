import { createRoot } from "react-dom/client";
import { GlobeApp } from "@/components/globe/GlobeApp";
import "./styles.css";

const el = document.getElementById("app");
if (!el) throw new Error("missing #app");
createRoot(el).render(<GlobeApp />);
