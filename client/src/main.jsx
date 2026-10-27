import React from "react";
import { createRoot } from "react-dom/client";
// ธีมกลาง ORDEAL CALL ต้องโหลดก่อน App — CSS ของแต่ละหน้า (import ในคอมโพเนนต์) จะได้ทับค่าพื้นฐานอย่าง
//  .oc-panel { position: relative } ได้ (เคยโหลดทีหลัง ทำให้แผงเลือกโหมดหลุดไปมุมซ้ายบนในเกมจริง)
import "./oc/theme.css";
import App from "./App.jsx";
import "./index.css";

// ?moon = หน้าดูฉากบินจากโลกไปดวงจันทร์ (เฉพาะ dev · เก็บไว้ให้โหมดในอนาคต) — ดู oc/intro/MoonFlightPreview.jsx
// ?colony = หน้าดูฉากเข้าด่าน Colony (หมุนรอบโลกแล้วพุ่งเข้าโคโลนี · ใช้หน้าเดียวกัน)
const MoonPreview = import.meta.env.DEV && (new URLSearchParams(location.search).has("moon") || new URLSearchParams(location.search).has("colony"))
  ? React.lazy(() => import("./oc/intro/MoonFlightPreview.jsx"))
  : null;
// ?arena=1..3 = หน้าดูสนาม 2.5D (เฉพาะ dev) — ดู journey/arena/ArenaPreview.jsx
const ArenaPreview = import.meta.env.DEV && new URLSearchParams(location.search).has("arena")
  ? React.lazy(() => import("./journey/arena/ArenaPreview.jsx"))
  : null;
// ?hud=1 = หน้าดูแผงตัวเรา (เฉพาะ dev) — ดู screens/hud/HudPreview.jsx · ?hud=1&game=1 = กระดานจริงด้วย state จำลอง
const hudQ = new URLSearchParams(location.search);
const HudPreview = import.meta.env.DEV && hudQ.has("hud")
  ? React.lazy(() => (hudQ.get("game") === "1" ? import("./screens/hud/GamePreview.jsx") : import("./screens/hud/HudPreview.jsx")))
  : null;

// ?board=1 = หน้าดูกระดานเดินได้แบบ Fire Emblem (เฉพาะ dev) — ดู board/BoardPreview.jsx
const BoardPreview = import.meta.env.DEV && hudQ.has("board")
  ? React.lazy(() => import("./board/BoardPreview.jsx"))
  : null;

// ?victory=1|team|draw = หน้าดูหน้าจบเกม (เฉพาะ dev) — ดู components/VictoryPreview.jsx
const VictoryPreview = import.meta.env.DEV && hudQ.has("victory")
  ? React.lazy(() => import("./components/VictoryPreview.jsx"))
  : null;

// ?travel=3-5 = หน้าดูฉากเปลี่ยนภูมิภาค (เฉพาะ dev) — ดู oc/intro/TravelPreview.jsx
const TravelPreview = import.meta.env.DEV && hudQ.has("travel")
  ? React.lazy(() => import("./oc/intro/TravelPreview.jsx"))
  : null;

// ?fodlan / ?fodlan=3&wx=1 / ?fodlan=travel&from=1&to=4 = หน้าดูฉากเข้าโหมด Fodlan (เฉพาะ dev) — ดู fodlan/FodlanPreview.jsx
const FodlanPreview = import.meta.env.DEV && hudQ.has("fodlan")
  ? React.lazy(() => import("./fodlan/FodlanPreview.jsx"))
  : null;

// ?rebirth=1..7 = หน้าดูฉากท่าไม้ตาย Echo "ก่อกำเนิดใหม่" (เฉพาะ dev) — ดู oc/intro/EchoRebirthPreview.jsx
const RebirthPreview = import.meta.env.DEV && hudQ.has("rebirth")
  ? React.lazy(() => import("./oc/intro/EchoRebirthPreview.jsx"))
  : null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {FodlanPreview ? <React.Suspense fallback={null}><FodlanPreview /></React.Suspense> : RebirthPreview ? <React.Suspense fallback={null}><RebirthPreview /></React.Suspense> : TravelPreview ? <React.Suspense fallback={null}><TravelPreview /></React.Suspense> : VictoryPreview ?<React.Suspense fallback={null}><VictoryPreview /></React.Suspense> : BoardPreview ? <React.Suspense fallback={null}><BoardPreview /></React.Suspense> : HudPreview ? <React.Suspense fallback={null}><HudPreview /></React.Suspense> : ArenaPreview ? <React.Suspense fallback={null}><ArenaPreview /></React.Suspense> : MoonPreview ? <React.Suspense fallback={null}><MoonPreview /></React.Suspense> : <App />}
  </React.StrictMode>
);
