// หน้าดูเกมจำลอง (GamePreview ?hud=1&game=1&oh=<id>) — ให้ตัวเรา (p0) เป็นคิงโอเจอร์ แล้วกดแกนดาบได้จริงในหน้า
//  จำลองกติกาเดียวกับ characters/_ohger.js แบบย่อ (ไม่มี server): ขั้นแรกสีตัวเอง → 2→3→4→5→1 → สวมเกราะ ·
//  ไก → ดึง 3 ครั้ง → stand by → เลือกทิศ = ปล่อยท่า (−4 แต้ม) · กดผิด = กลับขั้นแรก · คืนร่างกดได้ทันที (ในหน้าดูเท่านั้น)
import { playSfx } from "../../audio";

const SEQ = [2, 3, 4, 5, 1];
export const OHGER_PREVIEW = [
  { id: "gira_ohger", own: 1, name: "กิระ", armor: "คุวากาตะ โอเจอร์", face: "gira.jpg", armorImg: "kuwagata_ohger.jpg", area: { kind: "line", len: 4, width: 4, hostile: true } },
  { id: "yanma_ohger", own: 2, name: "ยันมะ", armor: "ทอมโบ โอเจอร์", face: "yanma.jpg", armorImg: "tombo_ohger.webp", area: { kind: "line", len: 6, width: 1, hostile: true } },
  { id: "himeno_ohger", own: 3, name: "ฮิเมโนะ", armor: "คามาคิริ โอเจอร์", face: "himeno.jpg", armorImg: "kamakiri_ohger.webp", area: { kind: "line", len: 4, width: 5, hostile: true } },
  { id: "rita_ohger", own: 4, name: "ริต้า", armor: "พาพิยอง โอเจอร์", face: "rita.jpg", armorImg: "papillon_ohger.webp", area: { kind: "line", len: 5, width: 1, hostile: true } },
  { id: "kaguragi_ohger", own: 5, name: "คากุรากิ", armor: "ฮาจิ โอเจอร์", face: "kaguragi.webp", armorImg: "hachi_ohger.webp", area: { kind: "line", len: 5, width: 1, hostile: true } },
];
const defOf = (id) => OHGER_PREVIEW.find((d) => d.id === id) || null;
const img = (d, f) => `/characters/${d.id}/${f}`;

function view(d, me, s) {
  const canTransform = !s.armored;
  const canFinish = s.armored && !s.phase && !s.finishUsed && (me.skillPoints || 0) >= 4;
  const next = s.armored ? (s.phase === "charge" ? d.own : null) : (s.phase === "loop" ? SEQ[s.step] : d.own);
  return {
    own: d.own, form: d.id, armored: s.armored, phase: s.phase, step: s.step, steps: 5, pulls: s.pulls, pullsMax: 3, next,
    canTransform, canFinish, canRevert: s.armored && !s.phase, armorImg: img(d, d.armorImg), faceImg: img(d, d.face), _s: s,
  };
}
function dress(d, me, s) {
  me.ohger = view(d, me, s);
  const name = s.armored ? d.armor : d.name, pic = img(d, s.armored ? d.armorImg : d.face);
  me.img = pic;
  me.character = {
    ...me.character, id: d.id, name, img: pic,
    passive: { name: "จอมราชัน", desc: "" },
    basic: { name: "สวมเกราะราชัน", cost: 0, img: img(d, d.armorImg), area: { kind: "self" } },
    secondary: { name: "Ohger Finish", cost: 4, img: img(d, d.armorImg), area: d.area },
    ultimate: null,
  };
  me.actions = s.armored ? [{ key: "ohger:revert", icon: "👑", name: "คืนร่าง", disabled: !!s.phase }] : [];
}

// state จาก buildMockState → ตัวเรากลายเป็นคิงโอเจอร์ (ร่างมนุษย์ · ยังไม่ได้กดอะไร)
export function applyOhger(state, id) {
  const d = defOf(id);
  if (!d) return state;
  const me = state.players.find((p) => p.id === (state.controlId || state.youId)) || state.players[0];
  dress(d, me, { armored: false, phase: null, step: 0, pulls: 0, finishUsed: false });
  return state;
}

// socket.emit ของหน้าดู → state ใหม่ (null = ไม่ใช่ของคิงโอเจอร์)
export function simOhger(prev, ev, payload) {
  const me0 = prev.players.find((p) => p.id === (prev.controlId || prev.youId)) || prev.players[0];
  const d = me0 && me0.ohger && defOf(me0.ohger.form);
  if (!d) return null;
  const key = payload && payload.key;
  const isSword = ev === "charAction" && typeof key === "string" && key.startsWith("ohger:");
  const isFire = ev === "useSkill" && payload && payload.tier === "secondary";
  if (!isSword && !isFire) return null;
  const state = { ...prev, players: prev.players.map((p) => (p === me0 ? { ...p } : p)) };
  const me = state.players.find((p) => p.id === me0.id);
  const s = { ...me0.ohger._s };
  if (isFire) {
    if (s.phase !== "standby") return { state: prev };
    s.phase = null; s.pulls = 0; s.finishUsed = true;
    me.skillPoints = Math.max(0, (me.skillPoints || 0) - 4);
    playSfx("ohger_finish_call"); playSfx(`ohger_atk_${d.own}`);
  } else {
    const k = key.slice(6);
    const btn = k === "trigger" ? "trigger" : Number(k.slice(1));
    if (k === "revert") { if (s.armored && !s.phase) { s.armored = false; s.finishUsed = false; } }
    else if (!s.armored) {
      if (!s.phase) { if (btn === d.own) { s.phase = "loop"; s.step = 0; playSfx(`ohger_call_${btn}`); } }
      else if (btn !== "trigger") {
        if (btn !== SEQ[s.step]) { s.phase = null; s.step = 0; }
        else if (++s.step >= SEQ.length) { s.phase = null; s.step = 0; s.armored = true; playSfx(`ohger_tf_done_${d.own}`); }
        else playSfx(`ohger_call_${btn}`);
      }
    } else if (!s.phase) {
      if (btn === "trigger" && !s.finishUsed && (me.skillPoints || 0) >= 4) { s.phase = "charge"; s.pulls = 0; playSfx("ohger_trigger"); }
    } else if (btn === "trigger") { s.phase = null; s.pulls = 0; }
    else if (s.phase === "charge") {
      if (btn !== d.own) { s.phase = null; s.pulls = 0; s.finishUsed = true; me.skillPoints = Math.max(0, (me.skillPoints || 0) - 4); }
      else { s.pulls++; playSfx(`ohger_pull_${d.own}_${s.pulls}`); if (s.pulls >= 3) s.phase = "standby"; }
    }
  }
  dress(d, me, s);
  return { state };
}
