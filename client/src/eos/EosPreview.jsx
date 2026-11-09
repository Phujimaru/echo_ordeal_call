// ============================================================
//  หน้าดูฉากของสนาม Eos (เฉพาะ dev)
//   ?eos             = ฉากเปิดแมตช์ → ฉากเข้าสนาม Eos (EosCine) · &d=20000 ยืดฉาก · &lowq=1 · ดับเบิลคลิก = เล่นใหม่
//   ?eos=zone        = ป้ายเข้าพื้นที่ทุกโซนวนไป · &z=insomnia = โซนเดียว · &lite=1 = ป้ายเล็ก
//  window.__eosU = 0..1 หยุดฉากเข้าสนามไว้ที่จุดนั้น
// ============================================================
import { useEffect, useState } from "react";
import MatchIntro from "../oc/intro/MatchIntro";
import { EOS_INTRO_MS, EOS_ZONE_INFO } from "./eosMeta";
import { ZoneCard } from "./EosZoneCard";

const Q = new URLSearchParams(location.search);
const ZONE = Q.get("eos") === "zone";
const LOWQ = Q.get("lowq") === "1";
const D = Number(Q.get("d")) || EOS_INTRO_MS;

const mk = (id, name, color, img, position) => ({ id, name, color, position, connected: true, alive: true, img, character: { id: "muimi", img, name: "มุยมิ" } });
const MUIMI = "/characters/muimi/muimi.webp";
const PLAYERS = [mk("p1", "คุณ", "#3d8bd9", MUIMI, 1), mk("p2", "Rin", "#d2455b", MUIMI, 2)];

export default function EosPreview() {
  return ZONE ? <Zones /> : <Intro />;
}

function Intro() {
  const [run, setRun] = useState(0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 42%, #fff 0%, var(--oc-snow) 46%, #e2ecf7 100%)" }} onDoubleClick={() => setRun((r) => r + 1)}>
      <MatchIntro key={run} players={PLAYERS} area={1} lowQ={LOWQ} onOutro={() => ({ eos: true, durationMs: D })} onHandoff={() => {}} onDone={() => {}} />
    </div>
  );
}

// &all=1 = ทุกโซนพร้อมกันแบบภาพนิ่ง (ตรวจภาพ)
const STILL_CSS = ".eosprev .ezc{position:relative;left:auto;top:auto;transform:none;animation:none!important;width:46vw}.eosprev .ezc *{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important}";
function Zones() {
  if (Q.get("all") === "1") {
    return (
      <div className="eosprev" style={{ position: "fixed", inset: 0, overflow: "auto", background: "linear-gradient(#20324a, #0d1624)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 12 }}>
        <style>{STILL_CSS}</style>
        {Object.keys(EOS_ZONE_INFO).map((z) => <ZoneCard key={z} zone={z} />)}
      </div>
    );
  }
  return <Cycle />;
}
function Cycle() {
  const ids = Q.get("z") ? [Q.get("z")] : Object.keys(EOS_ZONE_INFO);
  const lite = Q.get("lite") === "1";
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), lite ? 2600 : 4600);
    return () => clearInterval(id);
  }, [lite]);
  const zone = ids[i % ids.length];
  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(#20324a, #0d1624)" }}>
      <ZoneCard key={`${zone}-${i}`} zone={zone} lite={lite} />
    </div>
  );
}
