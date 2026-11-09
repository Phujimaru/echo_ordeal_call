// เลือกโหมด (gameState TEAM_MODE) — 2 ชั้น: เลือกสนาม (โลก / Colony / ดวงจันทร์) → เลือกโหมดของสนามนั้น · โหวตจริงที่ปุ่ม "โหวต" ในแผง
//  ชั้นสนาม (world = null): โลกกลางจอ + โคโลนีโคจรรอบโลก (globe/colonyModel.js) + ดวงจันทร์มุมบนซ้าย (globe/moonModel.js) · กดวัตถุ = เข้าสนามนั้น
//  โลก: หมุดสนามย่อย 2 อัน — Origin (การเดินทาง 7 ภูมิภาคแบบเดิม) / Fodlan (ทวีป 5 ด่าน — GRID_PLAN §8.5) · กดแล้วแตกเป็นหมุดโหมด 3 อัน
//   (world ฝั่ง client: "earth" = ชั้นหมุด Origin/Fodlan · "origin" → โหวต world "earth" · "fodlan" → โหวต world "fodlan")
//  Colony: กล้องพาโคโลนีมากลางจอ โลกถอยไปมุมล่างซ้าย + หมุดโหมด 3 อันบนตัวกระบอก
//  ดวงจันทร์: ดวงจันทร์กลางจอ โลกถอยไปมุมล่างซ้าย · หมุดเดียว = ลูกบาศก์ Moon Cell เหนือดวงจันทร์ (โหมด moon — Raid Boss GRID_PLAN §8.4)
//  กดหมุด/ป้าย = เลือกดู: แผงเลื่อนเข้ามาทางขวา · กดที่ว่าง / Esc = เลิกดู · ย้อนกลับ/Esc ตอนไม่ได้เลือกดู = กลับชั้นสนาม
//  ย้อนกลับจากชั้นสนาม = กลับห้องรอ (modeBackToLobby — ทุกคนยกเลิกพร้อม) ไม่ใช่ออกจากห้อง
//  โหมดที่มีการเดินทาง (โลก) แสดงเส้นทางจากภูมิภาค I แยกไป II–VII บนโลก (ภูมิภาคถัดไปสุ่ม · ดูอย่างเดียว)
//  ป้ายชื่อโหมดแต่ละโหมดมีกรอบของตัวเอง (lobby.css .ocl-modetag[data-mode]) · หน้านี้ไม่มีอีโมต
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { socket } from "../../socket";
import { clickSound } from "../../audio";
import { dirFromLonLat, regionDir, COLORS } from "../../globe/globeCore";
import { createColonyModel } from "../../globe/colonyModel";
import { createMoonModel } from "../../globe/moonModel";
import { JOURNEY_AREAS, JOURNEY_TURNS_PER_AREA as T } from "../../journey/areas";
import { FODLAN_GEO, FODLAN_STAGES } from "../../fodlan/stages";
import { EOS_GEO } from "../../eos/eosMeta";
import { OcButton, OcPanel } from "../ui";

const MODE_TITLES = { ffa: "อิสระ", duo: "คู่หู", trio: "สหายทั้ง 3 เอ๋ย", moon: "Moon Cell" };
const MODE_SUBTITLES = { ffa: "ทุกคนสู้กันเอง", duo: "ทีมละ 2 คน", trio: "ทีมละ 3 คน", moon: "Raid Boss" };
// ไอคอนในวงหมุดโหมด (lobby.css .ocl-mt-disc)
const MODE_ICONS = {
  ffa: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l9.5 9.5M4 5l1-1M13 12l-2.5 2.5M8.5 15.5L6 18M19 4L9.5 13.5M20 5l-1-1M11 12l2.5 2.5M15.5 15.5L18 18M4.5 19.5l2-2M19.5 19.5l-2-2" /></svg>,
  duo: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>,
  trio: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="2.8" /><circle cx="6.5" cy="16" r="2.8" /><circle cx="17.5" cy="16" r="2.8" /><path d="M10.6 8.9L7.9 13.6M13.4 8.9l2.7 4.7M9.3 16h5.4" /></svg>,
  moon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5a8 8 0 1 0 4 12.6A6.5 6.5 0 0 1 15.5 4.5z" /></svg>,
};
const MODE_NEED = { ffa: "2 คนขึ้นไป", duo: "4 หรือ 6 คน", trio: "6 คน", moon: "1 คนขึ้นไป" };
const MODE_GEO = { ffa: [2, 30], duo: [26, 4], trio: [48, 30] };
// หมุดโหมดของ Fodlan กระจุกรอบหมุด Fodlan (ทะเลเปิดระหว่างภูมิภาค III–IV ของ Origin)
const FODLAN_MODE_GEO = { ffa: [FODLAN_GEO.lon - 12, FODLAN_GEO.lat + 8], duo: [FODLAN_GEO.lon + 4, FODLAN_GEO.lat - 8], trio: [FODLAN_GEO.lon + 16, FODLAN_GEO.lat + 8] };
// ชั้นหมุดสนามย่อยบนโลก: Origin = ภูมิภาค I ของการเดินทาง · Fodlan = หมุดสีทอง
// Eos (GRID_PLAN §8.6): หมุดที่ 3 บนโลก (มหาสมุทรซีกตะวันตก) — แผนที่เดียว 32×32
const EOS_MODE_GEO = { ffa: [EOS_GEO.lon - 12, EOS_GEO.lat + 8], duo: [EOS_GEO.lon + 4, EOS_GEO.lat - 8], trio: [EOS_GEO.lon + 16, EOS_GEO.lat + 8] };
const SUBS = ["origin", "fodlan", "eos"];
const SUB_GEO = { origin: [20, 22], fodlan: [FODLAN_GEO.lon, FODLAN_GEO.lat], eos: [EOS_GEO.lon, EOS_GEO.lat] };
const FODLAN_GOLD = 0xe0a63a;
const EOS_BLUE = 0x7fd4ff;
const SUB_COLORS = { fodlan: FODLAN_GOLD, eos: EOS_BLUE };
// โซนของ Eos (server/fodlan/map6.js ZONES) — แผงโหวตแสดงชื่ออย่างเดียว
const EOS_ZONES = [
  { id: "insomnia", name: "Insomnia", color: "#7fd4ff" },
  { id: "hammerhead", name: "Hammerhead", color: "#e0a63a" },
  { id: "duscae", name: "Duscae", color: "#6fbf73" },
  { id: "lake", name: "Cleigne", color: "#5a9fd6" },
  { id: "altissia", name: "Altissia", color: "#9fe0e8" },
];
const ORDER = ["ffa", "duo", "trio"];
const WORLDS = ["earth", "colony", "moon"];
const WORLD_TITLES = { earth: "โลก", origin: "Origin", fodlan: "Fodlan", eos: "Eos", colony: "Colony", moon: "ดวงจันทร์" };
const LATIN_WORLDS = new Set(["origin", "fodlan", "eos", "colony"]);
// ชื่อสนามตามที่ server เก็บ (ผลโหวต): earth = Origin
const VOTE_WORLD_TITLES = { earth: "Origin", fodlan: "Fodlan", eos: "Eos", colony: "Colony", moon: "ดวงจันทร์" };
// world ฝั่ง client → world ที่ส่งให้ server
const serverWorld = (w) => (w === "origin" || w === "earth" || !w ? "earth" : w);
const onEarth = (w) => w === "earth" || w === "origin" || w === "fodlan" || w === "eos";
const EARTH_SUBS = new Set(["fodlan", "eos"]); // สนามย่อยบนโลกที่ server เก็บเป็น world ของตัวเอง
const LATIN_MODES = new Set(["moon"]);
// บอสของ Moon Cell (server/moonCell.js) — ชื่อ + พลังชีวิต/เกราะ
const MOON_BOSSES = [
  { id: "m", name: "คิชินามิ ฮาคุโนะ", img: "/mooncell/hakuno_m.png", hp: 15, armor: 5 },
  { id: "f", name: "คิชินามิ ฮาคุโนะ", img: "/mooncell/hakuno_f.webp", hp: 15, armor: 5 },
  { id: "cell", name: "Moon Cell", img: "/mooncell/moon_cell.webp", hp: 25, armor: 5, latin: true },
];
// ปล้องของโคโลนี (GRID_PLAN §8.3 · แบบ B): ปิดผนึกตอนจบเทิร์น 5 / 9 / 13 · ระเบิดจบเทิร์น 18 (server/colony.js SEALS / BOOM)
const COLONY_SEALS = [5, 9, 13];
const COLONY_BOOM = 18;
const COLONY_SECTIONS = [
  { n: "I", name: "ย่านบ้านพัก", tt: "เทิร์น 1–5" },
  { n: "II", name: "ป่า", tt: "เทิร์น 6–9" },
  { n: "III", name: "ใจกลางเมือง", tt: "เทิร์น 10–13" },
  { n: "IV", name: "สวนชมวิว", tt: "เทิร์น 14–18" },
];

const modeTitle = (m) => MODE_TITLES[m] || m;

const DICE = <svg className="ocl-jr-dice" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.4" /><circle cx="15" cy="15" r="1.4" /><circle cx="15" cy="9" r="1.4" /><circle cx="9" cy="15" r="1.4" /><circle cx="12" cy="12" r="1.4" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>;
const BOOM_ICO = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2 5 4.5-2.5-1.5 5 4.5 2-4.5 2 1.5 5-4.5-2.5-2 5-2-5-4.5 2.5 1.5-5-4.5-2 4.5-2-1.5-5 4.5 2.5z" /></svg>;

// เส้นทางแบบ "จุดเริ่มต้นเสมอ → สุ่มจากที่เหลือทุก T เทิร์น" (Origin / Fodlan) — การ์ดจุดเริ่ม + แถบสุ่ม + ตารางสีประจำพื้นที่
function JourneyPool({ list, name = (a) => a.short || a.name, cols = 3 }) {
  const [first, ...rest] = list;
  return (
    <div className="ocl-journey">
      <div className="ocl-jr-start" style={{ "--c": first.color }}>
        <span className="ocl-jr-badge oc-latin">{first.numeral}</span>
        <b>{name(first)}</b>
        <span className="ocl-jr-turns">{turnRange(0)}</span>
      </div>
      <div className="ocl-jr-split" aria-hidden="true">
        {DICE}
        <span>สุ่ม</span>
        <span className="ocl-jr-every">ทุก {T} เทิร์น</span>
      </div>
      <ul className="ocl-jr-grid" style={{ "--cols": cols }}>
        {rest.map((a) => (
          <li key={a.id} className="ocl-jr-tile" style={{ "--c": a.color, "--g": a.glow }}>
            <span className="ocl-jr-badge oc-latin">{a.numeral}</span>
            <span className="ocl-jr-name">{name(a)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
const turnRange = (i) => (i === 0 ? `เทิร์น 1–${T}` : "สุ่ม");
const worldOf = (o) => o.world || "earth";

function useOptions(state, world) {
  const count = state.players.length;
  const list = state.modeVotes?.length ? state.modeVotes : (state.modeOptions?.length ? state.modeOptions : [
    { mode: "ffa", enabled: count >= 1, voters: [], voteCount: 0 }, // 1 คน = เล่นทดสอบ (server/lobby.js validGameMode)
    { mode: "duo", enabled: count >= 4 && count % 2 === 0, voters: [], voteCount: 0 },
    { mode: "trio", enabled: count === 6, voters: [], voteCount: 0 },
  ]);
  if (world === "earth") return []; // ชั้นหมุด Origin / Fodlan ยังไม่มีหมุดโหมด
  const w = serverWorld(world);
  return list.filter((o) => (w === "moon" ? o.mode === "moon" : MODE_GEO[o.mode]) && worldOf(o) === w)
    .sort((a, b) => ORDER.indexOf(a.mode) - ORDER.indexOf(b.mode));
}

/**
 * @param world   สนามที่เลือกดู (null = ชั้นสนาม · "earth" · "colony" · "moon") — Lobby.jsx ถือค่านี้เพราะใช้คิดตำแหน่งลูกโลกด้วย
 * @param focus   โหมดที่เลือกดูอยู่ (null = ภาพรวมของสนาม)
 */
export default function ModeVote({ state, core, interceptRef, focus, onFocus, world, onWorld }) {
  const options = useOptions(state, world);
  const me = state.players.find((p) => p.id === state.youId);
  const myVote = me?.modeVote || null;
  const myWorld = myVote ? me?.modeWorld || "earth" : null;
  const votedHere = (mode) => myVote === mode && myWorld === serverWorld(world);
  // โหมดที่แผงแสดง — ค้างไว้ระหว่างแผงเลื่อนออกตอนเลิกดู (ปรับ state ระหว่าง render ตามแนวทางของ React)
  const [shown, setShown] = useState(focus);
  if (focus && focus !== shown) setShown(focus);

  const tagRefs = useRef({});
  const worldRefs = useRef({});
  const subRefs = useRef({});
  const areaRefs = useRef([]);
  const scene = useRef(null);
  const optsRef = useRef(options);
  const worldRef = useRef(world);
  useLayoutEffect(() => { optsRef.current = options; worldRef.current = world; });

  const vote = (mode) => {
    const opt = optsRef.current.find((o) => o.mode === mode);
    if (!opt || !opt.enabled || opt.suspended) return;
    clickSound();
    socket.emit("selectGameMode", { mode, world: serverWorld(world) });
  };
  // กดหมุด/ป้าย = เลือกดูอย่างเดียว ยังไม่โหวต (ผู้ใช้สั่ง: ต้องกดยืนยันก่อน) · ป้ายเป็นปุ่ม (เสียงคลิกมาเอง) หมุดบนโลกต้องเรียกเอง
  const preview = (mode, sound) => { if (sound && mode !== focus) clickSound(); onFocus(mode); };
  const clear = () => { if (!focus) return; clickSound(); onFocus(null); };
  const enter = (w, sound) => { if (sound) clickSound(); onFocus(null); onWorld(w); };
  const back = () => {
    if (focus) { onFocus(null); return; }
    if (world === "origin" || world === "fodlan" || world === "eos") { onWorld("earth"); return; }
    if (world) { onWorld(null); return; }
    socket.emit("modeBackToLobby");
  };
  const cbRef = useRef({ preview, clear, enter, back });
  useLayoutEffect(() => { cbRef.current = { preview, clear, enter, back }; });

  useEffect(() => {
    if (!focus && !world) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { clickSound(); cbRef.current.back(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, world]);

  // ---------- ของ 3D: หมุดบนโลก + เส้นทาง + โคโลนี ----------
  useEffect(() => {
    if (!core) return undefined;
    const { THREE } = core;
    const root = new THREE.Group();
    core.spin.add(root);
    const up = new THREE.Vector3(0, 1, 0);
    // หมุดบนผิวโลก (ก้าน + หัว + วงเลือก + ทรงกลมรับคลิกล่องหน) · big = หมุดสนามย่อย (ใหญ่กว่า)
    const makePin = (geo, color, data, big = false) => {
      const dir = dirFromLonLat(...geo);
      const k = big ? 1.5 : 1;
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * k, 0.004 * k, 0.14 * k, 6), new THREE.MeshBasicMaterial({ color }));
      stem.position.y = 0.07 * k;
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.022 * k), new THREE.MeshBasicMaterial({ color }));
      head.position.y = 0.15 * k;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05 * k, 0.058 * k, 48), new THREE.MeshBasicMaterial({ color: big ? color : COLORS.echo, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.09 * k, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.y = 0.12 * k; Object.assign(hit.userData, data);
      g.add(stem, head, ring, hit);
      g.position.copy(dir);
      g.quaternion.setFromUnitVectors(up, dir);
      root.add(g);
      return { g, stem, head, ring, hit, dir, k };
    };
    // หมุดโหมดสองชุด: Origin (ตำแหน่งเดิม) / Fodlan (รอบหมุด Fodlan)
    const modeSets = { origin: {}, fodlan: {}, eos: {} };
    const hitsBy = { origin: [], fodlan: [], eos: [] };
    for (const mode of ORDER) {
      for (const [set, geo] of [["origin", MODE_GEO], ["fodlan", FODLAN_MODE_GEO], ["eos", EOS_MODE_GEO]]) {
        const m = makePin(geo[mode], COLORS.azure, { mode });
        modeSets[set][mode] = m;
        hitsBy[set].push(m.hit);
      }
    }
    const subs = {};
    const subHits = [];
    for (const sub of SUBS) {
      const m = makePin(SUB_GEO[sub], SUB_COLORS[sub] || COLORS.azure, { sub }, true);
      m.ring.material.opacity = 0.7;
      subs[sub] = m;
      subHits.push(m.hit);
    }
    const token = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: COLORS.echo }));
    token.visible = false;
    root.add(token);
    const areaDirs = JOURNEY_AREAS.map((_, i) => regionDir(i));

    // โคโลนี: อยู่ใน scene ตรง (ไม่หมุนตามโลก) — ตำแหน่ง/ขนาด/ทิศ ไหลไปหาเป้าของแต่ละชั้นทุกเฟรม
    const colony = createColonyModel(THREE);
    core.scene.add(colony.group);
    const cpins = {};
    const cHits = [];
    ORDER.forEach((mode, i) => {
      const g = new THREE.Group();
      g.position.copy(colony.anchors[i]);
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), new THREE.MeshBasicMaterial({ color: COLORS.azure }));
      head.position.y = 0.14;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), new THREE.MeshBasicMaterial({ color: COLORS.azure }));
      stem.position.y = 0.06;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.y = 0.12; hit.userData.mode = mode;
      g.add(stem, head, hit);
      colony.group.add(g);
      cpins[mode] = { g, head, stem };
      cHits.push(hit);
    });
    // ดวงจันทร์: อยู่ใน scene ตรงแบบโคโลนี · หมุดโหมดเดียว = ลูกบาศก์ Moon Cell (moon.cellHit)
    const moon = createMoonModel(THREE);
    core.scene.add(moon.group);
    moon.cellHit.userData.mode = "moon";
    const mcur = { pos: new THREE.Vector3(-2, 1, -1), scale: 0.3, op: 0, scaleT: 0.3 };
    const mTgt = new THREE.Vector3();
    const cur = { pos: new THREE.Vector3(2, 0.6, -1), scale: 0.4, quat: new THREE.Quaternion(), op: 0 };
    const tgtPos = new THREE.Vector3(), tgtQuat = new THREE.Quaternion(), e = new THREE.Euler();
    let orbit = 0.6;
    const s = { root, modeSets, hitsBy, subs, subHits, token, route: null, curve: null, areaDirs, focus: null, colony, cpins, cHits, moon };
    scene.current = s;

    const tmp = new THREE.Vector3();
    const offFrame = core.onFrame((dt, clock) => {
      const w = worldRef.current;
      const set = s.modeSets[w] || null;
      const f = set && set[s.focus];
      if (f) f.ring.scale.setScalar(1 + 0.25 * Math.sin(clock * 3));
      for (const [k, pins] of Object.entries(s.modeSets)) for (const m of Object.values(pins)) m.g.visible = w === k;
      for (const m of Object.values(s.subs)) {
        m.g.visible = w === "earth";
        m.head.rotation.y += dt * 1.2;
        m.ring.scale.setScalar(1 + 0.18 * Math.sin(clock * 2.4));
      }
      if (s.curve && token.visible) {
        token.position.copy(s.curve.getPointAt((((clock * 0.04) % 1) + 1) % 1)).multiplyScalar(1.02); // clock ติดลบได้ในเฟรมแรก
        token.rotation.y += dt * 2;
      }
      root.visible = onEarth(w);

      // ---- เป้าของโคโลนี
      const gp = core.world.position, gs = core.world.scale.x;
      const { w: W, h: H } = core.size;
      const ppu = H / (2 * 6 * Math.tan((16 * Math.PI) / 180));
      if (!w) {
        orbit += dt * 0.11;
        const ox = Math.cos(orbit) * gs * 2.05, oz = Math.sin(orbit) * gs * 2.05;
        tgtPos.set(gp.x + ox, gp.y + gs * 0.38 - Math.sin(orbit) * gs * 0.3, oz);
        e.set(0.35, -orbit + Math.PI, 0.5); // แกนกระบอกตามทิศโคจร
        tgtQuat.setFromEuler(e);
        cur.scaleT = gs * 0.3;
      } else if (w === "colony") {
        const panel = s.focus ? Math.min(400, W * 0.34) + Math.max(16, W * 0.05) + 32 : 0;
        const cx = s.focus ? (40 + (W - panel - 40) / 2 - W / 2) / ppu : 0.3;
        tgtPos.set(cx, 0.08, 0.4);
        e.set(0.5 + 0.05 * Math.sin(clock * 0.4), -1.32 + 0.1 * Math.sin(clock * 0.25), 0.12);
        tgtQuat.setFromEuler(e);
        cur.scaleT = s.focus ? 0.48 : 0.58;
      } else {
        // โลก / ดวงจันทร์: โคโลนีถอยไปหลังโลกแล้วจางหาย
        tgtPos.set(gp.x + gs * 2.2, gp.y + gs * 0.9, -3);
      }
      const k = 1 - Math.pow(0.03, dt);
      cur.pos.lerp(tgtPos, k);
      cur.quat.slerp(tgtQuat, k);
      cur.scale += ((cur.scaleT || cur.scale) - cur.scale) * k;
      cur.op += ((!w || w === "colony" ? 1 : 0) - cur.op) * k;
      colony.group.position.copy(cur.pos);
      colony.group.quaternion.copy(cur.quat);
      colony.group.scale.setScalar(Math.max(0.001, cur.scale));
      colony.setOpacity(cur.op);
      colony.update(dt, clock);
      for (const [mode, p] of Object.entries(s.cpins)) {
        p.g.visible = w === "colony";
        p.head.rotation.y += dt * 1.5;
        const on = s.focus === mode;
        p.head.scale.setScalar(on ? 1.35 + 0.15 * Math.sin(clock * 4) : 1);
      }
      colony.group.updateMatrixWorld();

      // ---- เป้าของดวงจันทร์: ชั้นสนาม = มุมบนซ้ายหลังโลก · สนามดวงจันทร์ = กลางจอ (เลื่อนซ้ายพ้นแผงตอนเลือกดู)
      if (!w) {
        mTgt.set(gp.x - gs * 2.0, gp.y + gs * 0.45, -0.8);
        mcur.scaleT = gs * 0.36;
      } else if (w === "moon") {
        const panel = s.focus ? Math.min(400, W * 0.34) + Math.max(16, W * 0.05) + 32 : 0;
        const cx = s.focus ? (40 + (W - panel - 40) / 2 - W / 2) / ppu : 0.15;
        mTgt.set(cx + (s.focus ? 0.25 : 0), s.focus ? -0.05 : -0.25, 0.3);
        mcur.scaleT = s.focus ? 0.52 : 0.74;
      } else {
        mTgt.set(gp.x - gs * 2.4, gp.y + gs * 1.4, -3);
      }
      mcur.pos.lerp(mTgt, k);
      mcur.scale += (mcur.scaleT - mcur.scale) * k;
      mcur.op += ((!w || w === "moon" ? 1 : 0) - mcur.op) * k;
      moon.group.position.copy(mcur.pos);
      moon.group.scale.setScalar(Math.max(0.001, mcur.scale));
      moon.setOpacity(mcur.op);
      moon.update(dt, clock);
      moon.cellAnchor.scale.setScalar(s.focus === "moon" ? 1.15 + 0.08 * Math.sin(clock * 4) : 1);
      moon.group.updateMatrixWorld();

      // ---- ป้าย (HTML)
      const mtag = tagRefs.current.moon;
      if (mtag) {
        const p = core.project(moon.cellAnchor.localToWorld(tmp.set(0, 0.42, 0)));
        mtag.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -130%) scale(var(--k, 1))`;
        mtag.classList.toggle("back", w !== "moon");
      }
      for (const mode of ORDER) {
        // ป้ายโหมดชุดเดียว: สนาม Origin/Fodlan = เกาะหมุดบนลูกโลก · Colony = เกาะหมุดบนตัวกระบอก
        const el = tagRefs.current[mode];
        if (el && w === "colony") {
          const p = core.project(s.cpins[mode].g.localToWorld(tmp.set(0, 0.24, 0)));
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -130%) scale(var(--k, 1))`;
          el.classList.remove("back");
        } else if (el && set) {
          const m = set[mode];
          const p = core.project(m.g.localToWorld(tmp.set(0, 0.17, 0)));
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -130%) scale(var(--k, 1))`;
          el.classList.toggle("back", core.facing(m.dir) < 0.18);
        } else if (el) el.classList.add("back");
      }
      // ป้ายสนามย่อย Origin / Fodlan (ชั้นโลก)
      for (const sub of SUBS) {
        const el = subRefs.current[sub];
        if (!el) continue;
        const m = s.subs[sub];
        const p = core.project(m.g.localToWorld(tmp.set(0, 0.27, 0)));
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -120%)`;
        el.classList.toggle("back", w !== "earth" || core.facing(m.dir) < 0.12);
      }
      const we = worldRefs.current;
      if (we.earth) {
        const p = core.project(tmp.set(gp.x, gp.y + gs * 1.08, 0));
        we.earth.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        we.earth.classList.toggle("back", !!w);
      }
      if (we.colony) {
        const p = core.project(colony.group.localToWorld(tmp.set(0, 0.5, 0)));
        we.colony.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        we.colony.classList.toggle("back", !!w || cur.pos.z < -0.3);
      }
      if (we.moon) {
        const p = core.project(moon.group.localToWorld(tmp.set(0, 2.05, 0)));
        we.moon.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        we.moon.classList.toggle("back", !!w);
      }
      const showAreas = !!s.curve && w === "origin";
      areaRefs.current.forEach((el, i) => {
        if (!el) return;
        if (!showAreas) { el.classList.add("back"); return; }
        const d = s.areaDirs[i];
        const p = core.project(core.spin.localToWorld(tmp.copy(d).multiplyScalar(1.01)));
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
        el.classList.toggle("back", core.facing(d) < 0.18);
      });
    });

    const pickMode = (ev) => {
      const w = worldRef.current;
      const h = w === "colony" ? core.raycaster(ev).intersectObjects(cHits, false)[0]
        : w === "moon" ? core.raycaster(ev).intersectObjects([moon.cellHit], false)[0]
          : hitsBy[w] ? core.pick(ev, hitsBy[w]) : null;
      return h ? h.object.userData.mode : null;
    };
    const pickSub = (ev) => { const h = core.pick(ev, subHits); return h ? h.object.userData.sub : null; };
    const pickColony = (ev) => !!core.pick(ev, colony.hits);
    const pickMoon = (ev) => !!core.raycaster(ev).intersectObjects([...moon.hits, moon.cellHit], false)[0];
    // กดบนฉาก (ไม่ใช่ลาก): ชั้นสนาม = เลือกโลก/โคโลนี · ในสนาม = หมุดเลือกดู / ที่ว่างเลิกดู — กินทุกคลิก (หน้านี้ไม่มีอีโมต)
    interceptRef.current = (ev) => {
      const w = worldRef.current;
      if (!w) {
        if (pickColony(ev)) cbRef.current.enter("colony", true);
        else if (pickMoon(ev)) cbRef.current.enter("moon", true);
        else if (core.hitGlobe(ev)) cbRef.current.enter("earth", true);
        return true;
      }
      if (w === "earth") {
        // ชั้นโลก: กดหมุด Origin / Fodlan = แตกเป็นหมุดโหมดของสนามนั้น · ที่ว่าง = ไม่ทำอะไร
        const sub = pickSub(ev);
        if (sub) cbRef.current.enter(sub, true);
        return true;
      }
      const mode = pickMode(ev);
      if (mode) cbRef.current.preview(mode, true);
      else cbRef.current.clear();
      return true;
    };
    const offHover = core.onHover((ev) => {
      const w = worldRef.current;
      const hot = ev && (w === "earth" ? !!pickSub(ev) : w ? !!pickMode(ev) : pickColony(ev) || pickMoon(ev) || !!core.hitGlobe(ev));
      if (hot) core.canvas.dataset.hot = "1"; else delete core.canvas.dataset.hot;
    });

    return () => {
      offFrame(); offHover();
      interceptRef.current = null;
      delete core.canvas.dataset.hot;
      core.spin.remove(root);
      core.scene.remove(colony.group);
      core.scene.remove(moon.group);
      root.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      for (const g of [colony.group, moon.group]) g.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) { m.map?.dispose?.(); m.dispose?.(); } });
      scene.current = null;
      core.focusDir(null);
      core.setAutoSpin(0.1); // ค่าปกติของลูกโลกร่วม (หน้าห้องรอ/จัดทีม)
    };
  }, [core, interceptRef]);

  // สีหมุดตามสถานะ (โหวต/ใช้ไม่ได้)
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    for (const opt of options) {
      const col = !opt.enabled || opt.suspended ? COLORS.mute : votedHere(opt.mode) ? COLORS.echo : COLORS.azure;
      if (opt.mode === "moon") continue; // ลูกบาศก์ Moon Cell คงสีของมันเอง (ป้ายบอกสถานะโหวต)
      const m = world === "colony" ? s.cpins[opt.mode] : (s.modeSets[world] || {})[opt.mode];
      if (!m) continue;
      m.head.material.color.setHex(col);
      m.stem.material.color.setHex(col);
    }
  });

  // สนาม/โหมดที่เลือกดูอยู่: โลก = หันโลกเข้าหาหมุด + เส้นทางการเดินทาง · ชั้นสนาม/Colony = โลกหมุนช้าๆ เอง
  useEffect(() => {
    const s = scene.current;
    if (!s || !core) return;
    const { THREE } = core;
    s.focus = focus;
    for (const [k, pins] of Object.entries(s.modeSets)) for (const [mode, m] of Object.entries(pins)) m.ring.material.opacity = mode === focus && world === k ? 0.9 : 0;
    const set = s.modeSets[world];
    if (set) { core.setAutoSpin(0); core.focusDir((set[focus] || (EARTH_SUBS.has(world) ? s.subs[world] : set.ffa)).dir); }
    else if (world === "earth") { core.setAutoSpin(0); core.focusDir(s.subs.origin.dir.clone().add(s.subs.fodlan.dir).add(s.subs.eos.dir).normalize()); } // เห็น Origin · Fodlan · Eos
    else { core.focusDir(null); core.setAutoSpin(world === "colony" || world === "moon" ? 0.04 : 0.07); }
    if (s.route) { s.root.remove(s.route); s.route.geometry.dispose(); s.route.material.dispose(); s.route = null; }
    s.curve = null;
    s.token.visible = false;
    if (world === "origin" && focus) {
      // ภูมิภาค I → แต่ละภูมิภาค → กลับ I (ดาวกระจาย) — เส้นเดียวต่อกัน ให้หมุดวิ่งวนไปทุกปลายทางที่สุ่มได้
      let pts = [];
      const hub = s.areaDirs[0];
      for (let i = 1; i < s.areaDirs.length; i++) {
        for (const [a, b] of [[hub, s.areaDirs[i]], [s.areaDirs[i], hub]]) {
          const seg = [];
          for (let t = 0; t <= 1.0001; t += 1 / 40) seg.push(a.clone().lerp(b, t).normalize().multiplyScalar(1 + 0.1 * Math.sin(Math.PI * t)));
          if (pts.length) seg.shift();
          pts = pts.concat(seg);
        }
      }
      s.curve = new THREE.CatmullRomCurve3(pts);
      s.route = new THREE.Mesh(
        new THREE.TubeGeometry(s.curve, pts.length * 2, 0.0055, 6, false),
        new THREE.MeshBasicMaterial({ color: COLORS.echo, transparent: true, opacity: 0.8 }),
      );
      s.root.add(s.route);
      s.token.visible = true;
    }
  }, [focus, world, core]);

  const panelOpt = options.find((o) => o.mode === shown) || null;
  const votedCount = state.players.filter((p) => p.modeVote).length;
  const blocked = (o) => !o.enabled || o.suspended;
  // ป้ายโลกนับรวมทั้ง Origin และ Fodlan (สองสนามอยู่บนโลก) · ป้ายสนามย่อยนับแยก
  const worldVoters = (w) => state.players.filter((p) => {
    const pw = p.modeWorld || "earth";
    return p.modeVote && (w === "earth" ? pw === "earth" || EARTH_SUBS.has(pw) : w === "origin" ? pw === "earth" : pw === w);
  });

  const modeTags = () => options.map((o) => {
    const voters = state.players.filter((p) => (o.voters || []).includes(p.id));
    return (
      <button
        key={o.mode}
        type="button"
        ref={(el) => { tagRefs.current[o.mode] = el; }}
        className={`oc-tag ocl-modetag back${votedHere(o.mode) ? " on" : ""}${focus === o.mode ? " focus" : ""}`}
        data-mode={o.mode}
        data-blocked={blocked(o) ? "true" : "false"}
        aria-disabled={blocked(o)}
        aria-pressed={focus === o.mode}
        onClick={() => preview(o.mode, false)}
      >
        <span className="ocl-mt-body">
          <span className="ocl-mt-disc" aria-hidden="true">
            <span className="ocl-mt-ring" />
            {MODE_ICONS[o.mode]}
          </span>
          <span className={`ocl-mt-name${LATIN_MODES.has(o.mode) ? " oc-latin" : ""}`}>{modeTitle(o.mode)}</span>
          {voters.length > 0 && (
            <span className="ocl-dots">{voters.map((p) => <i key={p.id} style={{ background: p.color }} />)}</span>
          )}
        </span>
        <span className="ocl-mt-tail" aria-hidden="true" />
      </button>
    );
  });

  return (
    <div className="ocl-vote oc-layer" data-world={world || "pick"}>
      <div className="ocl-tags">
        {world && modeTags()}
        {WORLDS.map((w) => {
          const voters = worldVoters(w);
          return (
            <button
              key={w}
              type="button"
              ref={(el) => { worldRefs.current[w] = el; }}
              className={`oc-tag ocl-worldtag back${myWorld === w || (w === "earth" && EARTH_SUBS.has(myWorld)) ? " on" : ""}`}
              data-world={w}
              onClick={() => enter(w, false)}
              tabIndex={world ? -1 : 0}
            >
              <span className={w === "colony" ? "oc-latin" : ""}>{WORLD_TITLES[w]}</span>
              {voters.length > 0 && <span className="ocl-dots">{voters.map((p) => <i key={p.id} style={{ background: p.color }} />)}</span>}
            </button>
          );
        })}
        {SUBS.map((sub) => {
          const voters = worldVoters(sub);
          return (
            <button
              key={sub}
              type="button"
              ref={(el) => { subRefs.current[sub] = el; }}
              className={`oc-tag ocl-worldtag ocl-subtag back${myWorld === serverWorld(sub) ? " on" : ""}`}
              data-world={sub}
              onClick={() => enter(sub, false)}
              tabIndex={world === "earth" ? 0 : -1}
            >
              <span className="oc-latin">{WORLD_TITLES[sub]}</span>
              {voters.length > 0 && <span className="ocl-dots">{voters.map((p) => <i key={p.id} style={{ background: p.color }} />)}</span>}
            </button>
          );
        })}
        {JOURNEY_AREAS.map((a, i) => (
          <span key={a.id} ref={(el) => { areaRefs.current[i] = el; }} className="ocl-areatag back" aria-hidden="true">
            <span className="ocl-at-num oc-latin">{a.numeral}</span><span className="ocl-at-name">{a.short}</span>
          </span>
        ))}
      </div>

      <header className="ocl-title oc-enter" key={world || "pick"}>
        <h1 className={`oc-h1${LATIN_WORLDS.has(world) ? " oc-latin" : ""}`}>{world ? WORLD_TITLES[world] : "เลือกสนาม"}</h1>
        <span className="oc-label">โหวตแล้ว {votedCount} / {state.players.length}</span>
      </header>

      <div className={`ocl-vote-side${focus ? " open" : ""}`} aria-hidden={!focus}>
        {panelOpt && (
          <OcPanel className="ocl-votepanel" data-mode={panelOpt.mode}>
            <div className="ocl-vp-head">
              <h2 className={`oc-h2${LATIN_MODES.has(panelOpt.mode) ? " oc-latin" : ""}`}>{modeTitle(panelOpt.mode)}</h2>
              <span className="oc-muted">{MODE_SUBTITLES[panelOpt.mode]}</span>
            </div>

            {world === "eos" ? (
              <section className="ocl-sec">
                <div className="ocl-seclabel">โซน</div>
                <ul className="ocl-jr-grid" style={{ "--cols": 2 }}>
                  {EOS_ZONES.map((z) => (
                    <li key={z.id} className="ocl-jr-tile" style={{ "--c": z.color, "--g": z.color }}>
                      <span className="ocl-jr-name">{z.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : world === "fodlan" ? (
              <section className="ocl-sec">
                <div className="ocl-seclabel">ด่าน</div>
                <JourneyPool list={FODLAN_STAGES} name={(st) => st.name} cols={2} />
              </section>
            ) : world === "origin" ? (
              <section className="ocl-sec">
                <div className="ocl-seclabel">เส้นทาง</div>
                {/* ภูมิภาค I เสมอ → จากนั้นสุ่มจาก II–VII ทุก T เทิร์น (ผู้ใช้สั่งเปลี่ยนจากรายการ 2026-11-09) */}
                <JourneyPool list={JOURNEY_AREAS} />
              </section>
            ) : world === "moon" ? (
              <section className="ocl-sec">
                <div className="ocl-seclabel">บอส</div>
                <ul className="ocl-boss-list">
                  {MOON_BOSSES.map((b) => (
                    <li key={b.id} className={`ocl-boss${b.id === "cell" ? " core" : ""}`}>
                      <span className="ocl-boss-face"><img src={b.img} alt="" draggable="false" /></span>
                      <span className="ocl-boss-info">
                        <b className={b.latin ? "oc-latin" : ""}>{b.name}</b>
                        <span className="ocl-boss-stats">
                          <span className="hp"><i>♥</i>{b.hp}<em style={{ width: `${(b.hp / 25) * 100}%` }} /></span>
                          <span className="ar"><i>⛨</i>{b.armor}<em style={{ width: `${(b.armor / 25) * 100}%` }} /></span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="ocl-sec">
                <div className="ocl-seclabel">ปล้อง</div>
                <ol className="ocl-colony">
                  {COLONY_SECTIONS.map((c, i) => (
                    <li key={c.n} className="ocl-cl-step" style={{ "--i": i }}>
                      <div className="ocl-cl-row">
                        <span className="ocl-cl-badge oc-latin">{c.n}</span>
                        <b>{c.name}</b>
                        <span className="ocl-cl-turns">{c.tt}</span>
                      </div>
                      {i < COLONY_SEALS.length ? (
                        <div className="ocl-cl-link seal"><span className="ico">{LOCK}</span><span>{COLONY_SEALS[i]}</span></div>
                      ) : (
                        <div className="ocl-cl-link boom"><span className="ico">{BOOM_ICO}</span><span>{COLONY_BOOM}</span></div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="ocl-sec">
              <div className="ocl-seclabel">ผลโหวต <span>{votedCount} / {state.players.length}</span></div>
              {/* แถบรวม: ช่องละคน · โหวตแล้ว = สีโหมดที่โหวต (เรียงตามโหมด) · ยังไม่โหวต = ช่องว่าง */}
              <div className="ocl-tl-bar" aria-hidden="true">
                {[...state.players].sort((a, b) => (a.modeVote ? 0 : 1) - (b.modeVote ? 0 : 1) || String(a.modeVote).localeCompare(String(b.modeVote))).map((p) => (
                  <i key={p.id} data-mode={p.modeVote || undefined} />
                ))}
              </div>
              <ul className="ocl-tally">
                {[...state.players].sort((a, b) => a.position - b.position).map((p) => {
                  const img = p.character?.img || p.img;
                  return (
                    <li key={p.id} className={p.modeVote ? "voted" : ""} style={{ "--pc": p.color }}>
                      <span className="ocl-tl-av">
                        {img ? <img src={img} alt="" draggable="false" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}
                        <b>{(p.name || "?").slice(0, 1)}</b>
                      </span>
                      <span className="nm">{p.name}</span>
                      {p.id === state.youId && <span className="ocl-tl-you">คุณ</span>}
                      {p.modeVote ? (
                        <span className="ocl-tl-vote" data-mode={p.modeVote}>
                          <span className="ocl-tl-ico">{MODE_ICONS[p.modeVote]}</span>
                          <span className={LATIN_MODES.has(p.modeVote) ? "oc-latin" : ""}>{modeTitle(p.modeVote)}</span>
                          <small>{VOTE_WORLD_TITLES[p.modeWorld || "earth"]}</small>
                        </span>
                      ) : (
                        <span className="ocl-tl-wait" aria-label="ยังไม่โหวต"><i /><i /><i /></span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <OcButton
              variant="primary"
              disabled={!focus || blocked(panelOpt) || votedHere(panelOpt.mode)}
              onClick={() => vote(panelOpt.mode)}
            >
              {panelOpt.suspended ? "พักใช้งาน" : !panelOpt.enabled ? MODE_NEED[panelOpt.mode] : votedHere(panelOpt.mode) ? "โหวตแล้ว" : "โหวต"}
            </OcButton>
          </OcPanel>
        )}
      </div>

      <OcButton variant="ghost" className="ocl-back oc-enter d2" onClick={back}>← ย้อนกลับ</OcButton>
    </div>
  );
}
