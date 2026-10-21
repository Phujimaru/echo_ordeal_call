// เฉพาะ dev: หน้าดูกระดาน ?board=1&takuto=1 — ปุ่มเล่นเอฟเฟกต์ของซึนาชิ ทาคุโตะ (takutoFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นทาวเบิร์น 3×3 — ปุ่มสร้าง payload แบบเดียวกับ server (contract §5) แล้วผ่าน takutoEventFx เหมือน BoardStage
//  ตีปกติ 5 แบบ = attackStyle takuto* ไปหาศัตรูใกล้สุด (sapphire/dual = แนวทั้งด้าน 3 ช่อง) · เสียง takuto_atk_* ตรงจังหวะปะทะ
//  ของค้าง (prop takutos): ดาบเขียว/ฟ้า/พิพากษา/ออร่าพังทลาย · ?area=11 + ปุ่ม "พังทลาย N" = zero.collapse { left: N, total: 5 }
//  คอนโซล: window.__takutoFx({ kind: "blast", id: "me", at: { x, y }, size: 3, tiles }) = ส่ง payload ของ socket "takutoFx" ตรงๆ
import { useEffect } from "react";
import { TAKUTO_EVENT_SFX, takutoEventFx } from "./takutoFx";
import { STYLE_HIT } from "./boardDraw";
import { playSfx } from "../audio";

const IMG = "/characters/takuto/tauburn.webp";
const N = 3;
function takutoUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 3, y: 7, size: N, name: "ทาวเบิร์น", img: IMG, color: "#e8344e", hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: null } : u));
}
const CUR = { units: [] };
const DIR4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#ffd36a" : "rgba(255,110,140,.6)"}`, background: on ? "rgba(120,30,40,.95)" : "rgba(30,18,28,.94)" });
const inBody = (u, x, y) => x >= u.x && y >= u.y && x < u.x + (u.size || 1) && y < u.y + (u.size || 1);

export default function TakutoFxDev({ units, setUnits, pushFx, setFocus, map, swords, setSwords, collapse, setCollapse }) {
  useEffect(() => { CUR.units = units; });
  const get = (id) => CUR.units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const T = () => get("me");
  const me = () => { const d = T(); return { x: d.x, y: d.y }; };
  const cen = (u) => ({ x: u.x + ((u.size || 1) - 1) / 2, y: u.y + ((u.size || 1) - 1) / 2 });
  const dist = (a, b) => Math.abs(cen(a).x - cen(b).x) + Math.abs(cen(a).y - cen(b).y);
  const foes = () => { const d = T(); return CUR.units.filter((u) => u.id !== "me").sort((a, b) => dist(a, d) - dist(b, d)); };
  const ctx = {
    posOf: (id) => { const u = get(id); return u ? { x: u.x, y: u.y } : null; },
    sizeOf: (id) => (get(id) || {}).size || 1,
    idsOn: (tiles, owner) => CUR.units.filter((u) => u.id !== owner && tiles.some((t) => inBody(u, t.x, t.y))).map((u) => u.id),
  };
  const play = (ev, sfx) => {
    const out = takutoEventFx({ id: "me", color: "#e8344e", size: N, ...ev }, ctx);
    if (!out.fx.length) return;
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: 1.5 } : f))), ms);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 7, dur: 600 }]), ms);
    for (const [pos, ms] of out.look) setTimeout(() => setFocus(pos), ms);
    const s = sfx || TAKUTO_EVENT_SFX[ev.kind];
    if (s) playSfx(s);
  };
  useEffect(() => { window.__takutoFx = (ev) => play(ev); return () => { delete window.__takutoFx; }; });
  // ภาพนิ่งสำหรับตรวจ (headless): ?shot=ชื่อปุ่ม@ms[&pre=ปุ่ม,ปุ่ม] — กดปุ่ม pre ก่อน แล้วกดปุ่ม shot และหยุดเวลาของกระดานที่ ms หลังกด
  useEffect(() => {
    const q = new URLSearchParams(location.search), shot = q.get("shot");
    if (!shot) return undefined;
    const [label, ms] = shot.split("@");
    const orig = window.requestAnimationFrame;
    const diag = document.createElement("div");
    diag.style.cssText = "position:fixed;left:8px;top:8px;z-index:99;color:#fff;background:#000a;font:12px monospace;padding:2px 6px";
    document.body.appendChild(diag);
    let frames = 0, last = null;
    const clock = () => (window.__freezeAt != null ? Math.min(performance.now(), window.__freezeAt) : performance.now());
    const run = (cb, t) => { frames++; diag.textContent = `f${frames} t${Math.round(t - (window.__clickAt || 0))}`; cb(t); };
    window.requestAnimationFrame = (cb) => { last = cb; return orig(() => run(cb, clock())); };
    const click = (l) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === l); if (b) b.click(); };
    const t1 = setTimeout(() => { for (const l of (q.get("pre") || "").split(",").filter(Boolean)) click(l); }, 1200);
    const t2 = setTimeout(() => {
      click(label);
      const c = performance.now() + 16;
      window.__clickAt = c; window.__freezeAt = c + (Number(ms) || 0);
      // headless เรียกเฟรมน้อยมาก — เดินเฟรมเอง: ลงทะเบียน t0 ที่ c แล้ววาดที่ c + ms
      setTimeout(() => { if (last) run(last, c); setTimeout(() => { if (last) run(last, window.__freezeAt); }, 30); }, 30);
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); window.requestAnimationFrame = orig; diag.remove(); };
  }, []);

  // ทิศจากกลางตัวไปหาศัตรูใกล้สุด
  const dirTo = (f) => {
    const d = T(), c = cen(d), t = cen(f), dx = t.x - c.x, dy = t.y - c.y;
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  };
  // ช่องทั้งด้าน (3 ช่องติดตัวทางทิศ dir)
  const face = (dir) => {
    const d = T(), [vx, vy] = DIR4[dir], out = [];
    for (let i = 0; i < N; i++) {
      const x = vx > 0 ? d.x + N : vx < 0 ? d.x - 1 : d.x + i, y = vy > 0 ? d.y + N : vy < 0 ? d.y - 1 : d.y + i;
      if (inB(x, y)) out.push({ x, y });
    }
    return out;
  };
  const line = (dir, len, width) => {
    const d = T(), [vx, vy] = DIR4[dir], out = [], h = Math.floor(width / 2), c = cen(d);
    for (let k = 1; k <= len; k++) for (let w = -h; w <= h; w++) {
      const x = vx ? (vx > 0 ? d.x + N - 1 + k : d.x - k) : Math.round(c.x) + w, y = vy ? (vy > 0 ? d.y + N - 1 + k : d.y - k) : Math.round(c.y) + w;
      if (inB(x, y)) out.push({ x, y });
    }
    return out;
  };
  const attack = (style, sound, lane) => {
    const d = T(), f = foes()[0];
    if (!f) return;
    const ln = lane ? face(dirTo(f)) : null;
    pushFx([{ kind: style, x: d.x, y: d.y, size: N, to: { x: f.x, y: f.y }, toSize: f.size || 1, color: "#e8344e", lane: ln, by: "me" }]);
    setFocus({ x: f.x, y: f.y });
    setTimeout(() => {
      playSfx(sound);
      const hit = ln ? CUR.units.filter((u) => u.id !== "me" && ln.some((t) => inBody(u, t.x, t.y))) : [f];
      pushFx(hit.flatMap((u) => [{ kind: "burst", x: u.x, y: u.y, color: "#e8344e", size: u.size || 1 }, { kind: "float", x: u.x, y: u.y, text: style === "takutoJudgment" ? "-4" : "-2", size: 30, z: 1.5 }]));
    }, STYLE_HIT[style] || 400);
  };
  const sw = (k) => setSwords((s) => ({ ...s, [k]: !s[k] }));
  const summon = (kind) => { setSwords((s) => ({ ...s, [kind]: true, judgment: false })); play({ kind: "summon", at: me(), sword: kind }, `takuto_sword_${kind}`); };
  const merge = () => { setSwords((s) => ({ ...s, emerald: false, sapphire: false, judgment: true })); play({ kind: "merge", at: me() }); };
  const vanish = (kind) => { setSwords((s) => ({ ...s, [kind]: false })); play({ kind: "vanish", at: me(), sword: kind }); };
  const dash = (dir) => {
    const d = T(), [vx, vy] = DIR4[dir];
    let k = 3;
    while (k > 0 && !(inB(d.x + vx * k, d.y + vy * k) && inB(d.x + vx * k + N - 1, d.y + vy * k + N - 1))) k--;
    if (!k) return;
    const from = { x: d.x, y: d.y }, to = { x: d.x + vx * k, y: d.y + vy * k };
    setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, ...to } : u)));
    play({ kind: "dash", at: to, from, to, dir });
  };
  const flash = () => {
    const f = foes()[0];
    if (!f) return;
    const dir = dirTo(f), d = T(), from = { x: d.x, y: d.y };
    // ทาคุโตะไปยืนช่องที่ตัว 3×3 ครอบช่องเป้าเดิม (ให้กลางตัวอยู่ที่เป้า) · เป้าไปยืนกลางที่เดิมของทาคุโตะ
    const to = { x: Math.max(0, Math.min(map.cols - N, f.x - 1)), y: Math.max(0, Math.min(map.rows - N, f.y - 1)) }, tTo = { x: from.x + 1, y: from.y + 1 };
    setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, ...to } : u.id === f.id ? { ...u, ...tTo } : u)));
    play({ kind: "flash", at: from, from, to, dir, tiles: line(dir, 5, 3), targetId: f.id, targetFrom: { x: f.x, y: f.y }, targetTo: tTo });
    setTimeout(() => pushFx([{ kind: "float", x: tTo.x, y: tTo.y, text: "-4", size: 30, z: 1.5 }]), 1600);
  };
  const missile = () => {
    const f = foes()[0], dir = f ? dirTo(f) : "up", tiles = line(dir, 8, 1);
    play({ kind: "missile", at: me(), dir, tiles });
    setTimeout(() => pushFx(CUR.units.filter((u) => u.id !== "me" && tiles.some((t) => inBody(u, t.x, t.y))).map((u) => ({ kind: "float", x: u.x, y: u.y, text: "-2", size: 30, z: 1.5 }))), 1800);
  };
  const steal = () => { const f = foes()[0]; if (f) play({ kind: "steal", at: me(), targetId: f.id, from: { x: f.x, y: f.y }, amt: 2, extra: 0 }); };
  const blast = () => {
    const d = T(), R = 8, tiles = [];
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
      if (inBody(d, x, y)) continue;
      const dx = Math.max(d.x - x, 0, x - (d.x + N - 1)), dy = Math.max(d.y - y, 0, y - (d.y + N - 1));
      if (dx + dy <= R) tiles.push({ x, y });
    }
    play({ kind: "blast", at: me(), range: R, tiles });
  };
  const heal = (big) => { const f = foes()[0]; play({ kind: "heal", at: me(), amt: big ? 3 : 2, big, ...(f && !big ? { targetId: f.id } : {}) }); };
  const rows = [
    [["หมัด", () => attack("takutoPunch", "takuto_atk_punch")], ["เอเมอรูด", () => attack("takutoEmerald", "takuto_atk_emerald")], ["แซฟไฟร์", () => attack("takutoSapphire", "takuto_atk_sapphire", true)],
      ["ดาบคู่", () => attack("takutoDual", "takuto_atk_dual", true)], ["พิพากษา", () => attack("takutoJudgment", "takuto_atk_judgment")]],
    [["แปลงร่าง", () => play({ kind: "tauburn", at: me() })], ["เรียกเขียว", () => summon("emerald")], ["เรียกฟ้า", () => summon("sapphire")], ["รวมดาบ", merge],
      ["หายเขียว", () => vanish("emerald")], ["หายฟ้า", () => vanish("sapphire")], ["หายพิพากษา", () => vanish("judgment")]],
    [["ดูดพลัง", () => heal(false)], ["ฟื้นเฟส 4", () => heal(true)], ["พุ่ง ↑", () => dash("up")], ["พุ่ง ↓", () => dash("down")], ["พุ่ง ←", () => dash("left")], ["พุ่ง →", () => dash("right")]],
    [["ประกายแสง", flash], ["มิสไซล์", missile], ["ขโมย", steal], ["ฉันยังมองเห็นอยู่", blast]],
    [[`เขียว ${swords.emerald ? "✓" : "✗"}`, () => sw("emerald")], [`ฟ้า ${swords.sapphire ? "✓" : "✗"}`, () => sw("sapphire")], [`พิพากษา ${swords.judgment ? "✓" : "✗"}`, () => sw("judgment")],
      [`ออร่า ${swords.collapse ? "✓" : "✗"}`, () => sw("collapse")],
      ...[5, 4, 3, 2, 1].map((n) => [`พังทลาย ${n}`, () => setCollapse(collapse === n ? null : n), collapse === n])],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 900 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn, on]) => <button key={label} style={btn(!!on)} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
TakutoFxDev.units = takutoUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
