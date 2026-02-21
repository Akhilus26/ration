import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDb } from "./lib/db";

// Trigger DB init but don't block rendering
initDb();

createRoot(document.getElementById("root")!).render(<App />);
