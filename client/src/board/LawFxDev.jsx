// เฉพาะ dev: หน้าดูกระดาน ?board=1&law=1 — ปุ่มเล่นเอฟเฟกต์ของทราฟาก้า ลอว์ (lawFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นลอว์ที่ (6, 8) · เป้าจำลอง: ประชิด (p2) / ห่าง 2 (p4) / ไกลใน 9×9 (p6, p3) / นอก Room (p5)
//  state จำลอง (prop law ของ BoardCanvas): Room 5×5 / 9×9 · วัตถุลอย · มาร์ก · หัวใจ · ท่าไม้ตายที่รอตี · หนามหิน (terrain "icewall" + rocks)
//  เหตุการณ์ = lawEventFx แบบเดียวกับ BoardStage · จังหวะลงผล = LAW_FX (พักของ server)
//  ภาพนิ่ง: ?lawshot=1 + window.__lawShot("ชื่อปุ่ม", ms) · คอนโซล: window.__lawFx({ kind: "shock", targetId: "p3", to: { x, y } })
import { useEffect } from "react";
import { LAW_FX, lawEventFx } from "./lawFx";
import { STYLE_HIT } from "./boardDraw";

const LAW = { x: 6, y: 8 };
function lawUnits(list) {
  const at = { me: [LAW.x, LAW.y], p2: [7, 8], p4: [6, 10], p6: [9, 5], p3: [3, 11], p5: [11, 8] };
  return list.map((u) => (u.id === "me" ? { ...u, x: LAW.x, y: LAW.y, name: "ทราฟาก้า ลอว์", color: "#3a7bd5", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null }
    : at[u.id] ? { ...u, x: at[u.id][0], y: at[u.id][1], corpse: false } : u));
}
const LAW_DEV0 = { rooms: [], objects: [], marks: [], hearts: [], armed: [], rocks: [], present: true };
// ค่าล่าสุดสำหรับ setTimeout/คอลแบ็ก (แก้ผ่านฟังก์ชันระดับโมดูลเท่านั้น)
const CUR = { units: [], law: LAW_DEV0, seq: 0, obj: 0 };
const setCurLaw = (l) => { CUR.law = l; };
const bump = (k) => ++CUR[k];
// ภาพนิ่งสำหรับตรวจ: ?board=1&law=1&lawshot=1 แล้ว await window.__lawShot("ชื่อปุ่ม", ms) = กดปุ่มแล้วหยุดนาฬิกาเฟรมไว้ที่ ms หลังกด
if (typeof window !== "undefined" && /[?&]lawshot=1/.test(location.search)) {
  const orig = window.requestAnimationFrame.bind(window);
  let freezeAt = null;
  const clock = (t) => (freezeAt != null ? Math.min(t, freezeAt) : t);
  window.requestAnimationFrame = (cb) => orig((t) => cb(clock(t)));
  window.__lawShot = async (label, ms) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
    if (!b) return "no button";
    freezeAt = performance.now() + (Number(ms) || 0);
    b.click();
    await new Promise((r) => setTimeout(r, (Number(ms) || 0) + 250));
    return "ok";
  };
  window.__lawUnfreeze = () => { freezeAt = null; };
}
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#9be7ff" : "rgba(150,220,255,.45)"}`, background: on ? "rgba(40,90,140,.96)" : "rgba(18,24,40,.94)" });

export default function LawFxDev({ units, setUnits, pushFx, setFocus, setAnim, law, setLaw }) {
  useEffect(() => { CUR.units = units; CUR.law = law; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const posOf = (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; };
  const me = () => posOf("me");
  const ctx = { posOf, sizeOf: (id) => (get(id) || {}).size || 1, colorOf: (id) => (get(id) || {}).color || null };
  const upd = (fn) => { const next = fn(CUR.law); setCurLaw(next); setLaw(next); };
  const play = (ev) => {
    const out = lawEventFx({ id: "me", color: "#3a7bd5", size: 1, at: me(), ...ev }, ctx);
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f));
    if (out.fx.length) pushFx(z(out.fx));
    for (const [ms, list] of out.later) setTimeout(() => pushFx(z(list)), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 6, dur: 500 }]), ms);
    for (const [pos, ms] of out.look) setTimeout(() => setFocus(pos), ms);
  };
  useEffect(() => { window.__lawFx = (ev) => play(ev); return () => { delete window.__lawFx; }; });

  // ---------- state จำลอง ----------
  const roomOf = (size) => {
    const c = me(), h = Math.floor(size / 2);
    return { owner: "me", color: "#3a7bd5", x0: Math.max(0, c.x - h), y0: Math.max(0, c.y - h), x1: Math.min(13, c.x + h), y1: Math.min(13, c.y + h), size, cx: c.x, cy: c.y, seq: bump("seq") };
  };
  const curRoom = () => CUR.law.rooms[0] || null;
  const openRoom = (size, withEvent = true) => {
    const room = roomOf(size);
    upd((l) => ({ ...l, rooms: [room] }));
    if (withEvent) play({ kind: "roomOpen", room });
  };
  const closeRoom = () => {
    const room = curRoom();
    if (!room) return;
    const objects = CUR.law.objects.map((o) => ({ id: o.id, x: o.x, y: o.y }));
    upd((l) => ({ ...l, rooms: [], objects: [] }));
    play({ kind: "roomClose", room, objects, why: "skill" });
  };
  const OBJ_TILES = [[5, 7], [8, 10], [3, 8], [9, 7]];
  const setObjects = (on) => upd((l) => ({ ...l, objects: on ? OBJ_TILES.map(([x, y]) => ({ id: bump("obj"), owner: "me", x, y, seq: CUR.obj })) : [] }));
  const setMarks = (on) => upd((l) => ({ ...l, marks: on ? [{ owner: "me", id: "p2" }, { owner: "me", id: "p6" }] : [] }));
  const setHearts = (on) => upd((l) => ({ ...l, hearts: on ? [{ owner: "me", victim: "p5", left: 2 }, { owner: "me", victim: "p3", left: 3 }] : [] }));
  const setRocks = (on) => upd((l) => ({ ...l, rocks: on ? ["8,6", "5,11"] : [] }));
  const setArmed = (kind) => upd((l) => ({ ...l, armed: kind && !(l.armed[0] && l.armed[0].kind === kind) ? [{ id: "me", kind }] : [] }));
  const full = (size) => {
    openRoom(size, false);
    setObjects(true); setMarks(true); setHearts(true); setRocks(true);
  };
  const reset = () => { setUnits((us) => lawUnits(us)); upd(() => LAW_DEV0); };

  // ---------- ตีปกติ ----------
  const strike = (style, foeId, { dodge = false } = {}) => {
    const d = me(), f = get(foeId);
    if (!f) return;
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to: { x: f.x, y: f.y }, toSize: f.size || 1, color: "#3a7bd5", by: "me", tid: f.id, dodge }]);
    setFocus({ x: f.x, y: f.y });
    const HIT = STYLE_HIT[style] || 400;
    setTimeout(() => {
      pushFx([{ kind: "float", x: f.x, y: f.y, text: dodge ? "หลบ" : "-0", size: 30, z: 1.5, hitIds: dodge ? undefined : [f.id] }]);
      if (dodge) return;
      play({ kind: "mark", targetId: f.id, to: { x: f.x, y: f.y } });
      upd((l) => ({ ...l, marks: [...l.marks.filter((m) => m.id !== f.id), { owner: "me", id: f.id }], armed: [] }));
      if (style === "lawGamma") play({ kind: "gamma", targetId: f.id, to: { x: f.x, y: f.y }, applied: ["burn", "bleed", "poison"], extra: "poison" });
      if (style === "lawMess") {
        play({ kind: "mess", targetId: f.id, to: { x: f.x, y: f.y } });
        setTimeout(() => upd((l) => ({ ...l, hearts: [...l.hearts.filter((h) => h.victim !== f.id), { owner: "me", victim: f.id, left: 3 }] })), 1000);
      }
    }, HIT);
  };

  // ---------- เหตุการณ์ ----------
  const cut = () => {
    const free = [[5, 9], [7, 9], [5, 6], [8, 7], [4, 7], [7, 10]].find(([x, y]) => !CUR.law.objects.some((o) => o.x === x && o.y === y));
    if (!free) return;
    const obj = { id: bump("obj"), owner: "me", x: free[0], y: free[1], seq: CUR.obj };
    upd((l) => ({ ...l, objects: [...l.objects, obj] }));
    play({ kind: "cut", tile: { x: obj.x, y: obj.y }, obj: { id: obj.id, x: obj.x, y: obj.y } });
  };
  const shuffle = (aId, bId) => {
    const A = aId.startsWith("obj:") ? CUR.law.objects.find((o) => `obj:${o.id}` === aId) : get(aId);
    const B = bId.startsWith("obj:") ? CUR.law.objects.find((o) => `obj:${o.id}` === bId) : get(bId);
    if (!A || !B) return;
    const pa = { x: A.x, y: A.y }, pb = { x: B.x, y: B.y };
    play({ kind: "shuffle", a: { id: aId, from: pa, to: pb, size: 1 }, b: { id: bId, from: pb, to: pa, size: 1 } });
    setTimeout(() => {
      const mv = (id, to) => {
        if (id.startsWith("obj:")) upd((l) => ({ ...l, objects: l.objects.map((o) => (`obj:${o.id}` === id ? { ...o, x: to.x, y: to.y } : o)) }));
        else setUnits((us) => us.map((u) => (u.id === id ? { ...u, x: to.x, y: to.y } : u)));
      };
      mv(aId, pb); mv(bId, pa);
    }, LAW_FX.shuffle);
  };
  const shuffleObj = () => { const o = CUR.law.objects[0]; if (o) shuffle("p2", `obj:${o.id}`); };
  const takt = () => {
    const f = get("p4"), d = me();
    if (!f) return;
    const tile = { x: f.x, y: f.y }, dy = Math.sign(f.y - d.y) || 1, dx = dy ? 0 : Math.sign(f.x - d.x) || 1;
    play({ kind: "takt", tile, hitId: "p4" });
    setTimeout(() => {
      const to = { x: tile.x + dx, y: Math.min(13, tile.y + dy) };
      setAnim({ kind: "push", id: "p4", from: tile, to, collide: false });
      setTimeout(() => setUnits((us) => us.map((u) => (u.id === "p4" ? { ...u, x: to.x, y: to.y } : u))), 260);
      pushFx([{ kind: "float", x: tile.x, y: tile.y, text: "-1", size: 30, z: 1.5 }]);
      upd((l) => ({ ...l, rocks: [...l.rocks.filter((k) => k !== `${tile.x},${tile.y}`), `${tile.x},${tile.y}`] }));
    }, LAW_FX.takt);
  };
  const rockDown = () => {
    const tiles = CUR.law.rocks.map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; });
    if (!tiles.length) return;
    upd((l) => ({ ...l, rocks: [] }));
    play({ kind: "rockDown", tiles, why: "time" });
  };
  const throwAll = () => {
    const f = get("p6"), objects = CUR.law.objects.map((o) => ({ id: o.id, x: o.x, y: o.y }));
    if (!f || !objects.length) return;
    const to = { x: f.x, y: f.y };
    upd((l) => ({ ...l, objects: [] }));
    play({ kind: "throw", to, objects });
    setTimeout(() => play({ kind: "throwHit", to, hits: [{ id: "p6", dmg: objects.length, dodge: false, kill: false }], n: objects.length }), LAW_FX.throw);
  };
  const vit = (id) => { const u = get(id); return { id, at: { x: u.x, y: u.y }, size: 1, hp: u.hp, armor: u.armor }; };
  const shamble = () => {
    const a = vit("me"), b = vit("p2");
    play({ kind: "shamble", a, b });
    setTimeout(() => {
      setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, hp: b.hp, armor: b.armor } : u.id === "p2" ? { ...u, hp: a.hp, armor: a.armor } : u)));
      play({ kind: "shambleDone", a: { ...a, hp: b.hp, armor: b.armor }, b: { ...b, hp: a.hp, armor: a.armor } });
    }, LAW_FX.shamble);
  };
  const squeeze = () => {
    const h = CUR.law.hearts.find((x) => x.victim === "p5") || CUR.law.hearts[0];
    const v = h && get(h.victim);
    if (!v) return;
    play({ kind: "squeeze", targetId: v.id, to: { x: v.x, y: v.y }, left: Math.max(0, (h.left | 0) - 1) });
    setTimeout(() => {
      play({ kind: "squeezeHit", targetId: v.id, to: { x: v.x, y: v.y }, dmg: 2, kill: false });
      upd((l) => ({ ...l, hearts: l.hearts.map((x) => (x === h ? { ...x, left: Math.max(0, x.left - 1) } : x)).filter((x) => x.left > 0) }));
    }, LAW_FX.squeeze);
  };
  const heartGone = (why) => {
    const h = CUR.law.hearts[CUR.law.hearts.length - 1];
    if (!h) return;
    const v = get(h.victim);
    upd((l) => ({ ...l, hearts: l.hearts.filter((x) => x !== h) }));
    play({ kind: "heartGone", targetId: h.victim, why, ...(v ? { to: { x: v.x, y: v.y } } : {}) });
  };
  const shock = () => {
    const t = get("p3");
    if (!t) return;
    setUnits((us) => us.map((u) => (u.id === "p3" ? { ...u, corpse: true, hp: 0, armor: 0 } : u)));
    setTimeout(() => {
      play({ kind: "shock", targetId: "p3", to: { x: t.x, y: t.y } });
      setTimeout(() => {
        setUnits((us) => us.map((u) => (u.id === "p3" ? { ...u, corpse: false, hp: 1, armor: 0 } : u)));
        play({ kind: "revived", targetId: "p3", to: { x: t.x, y: t.y } });
      }, LAW_FX.shock);
    }, 400);
  };
  // จบตาเดินของลอว์: มาร์กหมด → ชิ้นส่วนลอยกลับมาต่อกัน (เหตุการณ์ unmark)
  const unmark = () => {
    const ids = CUR.law.marks.map((m) => m.id);
    if (!ids.length) return;
    upd((l) => ({ ...l, marks: [] }));
    play({ kind: "unmark", ids });
  };
  const strike3 = () => { strike("lawSlash", "p2"); setTimeout(() => strike("lawSlash", "p4"), 1000); setTimeout(() => strike("lawSlash", "p6"), 2000); };
  const ultArm = (ult) => { play({ kind: "ultArm", ult }); setTimeout(() => upd((l) => ({ ...l, armed: [{ id: "me", kind: ult }] })), LAW_FX.ultArm); };

  const L = law || LAW_DEV0, room = L.rooms[0];
  const rows = [
    [["Room 5×5", () => full(5), room && room.size === 5], ["Room 9×9", () => full(9), room && room.size === 9], ["วัตถุ", () => setObjects(!L.objects.length), L.objects.length > 0],
      ["มาร์ก", () => setMarks(!L.marks.length), L.marks.length > 0], ["หัวใจ", () => setHearts(!L.hearts.length), L.hearts.length > 0], ["หนามหิน", () => setRocks(!L.rocks.length), L.rocks.length > 0],
      ["Gamma รอ", () => setArmed("gamma"), L.armed[0] && L.armed[0].kind === "gamma"], ["Mess รอ", () => setArmed("mess"), L.armed[0] && L.armed[0].kind === "mess"], ["กลับที่", reset]],
    [["ฟัน", () => strike("lawSlash", "p2")], ["ฟันไกล", () => strike("lawSlash", "p6")], ["ฟันหลบ", () => strike("lawSlash", "p4", { dodge: true })], ["ฟัน 3 คน", strike3], ["จบตา", unmark], ["Gamma Knife", () => strike("lawGamma", "p2")], ["Mess", () => strike("lawMess", "p2")]],
    [["กาง 5×5", () => openRoom(5)], ["กาง 9×9", () => openRoom(9)], ["ปิด Room", closeRoom], ["ตัดพื้น", cut], ["Shambles", () => shuffle("me", "p4")], ["Shambles วัตถุ", shuffleObj],
      ["Takt", takt], ["หินจม", rockDown], ["โยน", throwAll], ["Shamble", shamble]],
    [["Gamma กด", () => ultArm("gamma")], ["Mess กด", () => ultArm("mess")], ["บีบหัวใจ", squeeze], ["หัวใจคืน", () => heartGone("used")], ["หัวใจสลาย", () => heartGone("dead")], ["Counter Shock", shock],
      ["มาร์กโดน", () => { const f = get("p6"); play({ kind: "mark", targetId: "p6", to: { x: f.x, y: f.y } }); upd((l) => ({ ...l, marks: [...l.marks.filter((m) => m.id !== "p6"), { owner: "me", id: "p6" }] })); }]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 960 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn, on]) => <button key={label} style={btn(!!on)} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
LawFxDev.units = lawUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
LawFxDev.empty = LAW_DEV0; // state จำลองเริ่มต้น (prop law)
