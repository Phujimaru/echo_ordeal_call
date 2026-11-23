// ============================================================
//  useStateDiffFx — ส่วนของ BoardStage: เทียบ state ก่อน/หลังทุกครั้งที่ state เปลี่ยน
//    → แอนิเมชันเดิน/ถอย · ฉากตีบนกระดาน · ฉากพุ่ง (โซระ/คาซุมะ ฯลฯ) · เลขดาเมจ · ระเบิดตกรอบ · ผลติดหลังตี
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx) — ลำดับ hook ใน BoardStage เหมือนเดิม
// ============================================================
/* eslint-disable react-hooks/immutability -- โค้ดย้ายมาจาก BoardStage ทั้งก้อน:
   ค่าใน ctx เป็น ref / setState / ฟังก์ชันของ BoardStage (ที่นั่น lint รู้ว่าคงที่) · รายการ deps เดิมตามต้นฉบับ */
import { useEffect } from "react";
import * as Rules from "../boardRules";
import { playSfx } from "../../audio";
import { BEAM_T, dashDur, SORA_T, STYLE_HIT } from "../boardDraw";
import { HK_PUSH_MS, HK_SFX_LEAD, HK_TONE, isHikaruFx } from "../hikaruFx";
import { iceSpikeLv } from "../iceFx";
import { grayChains } from "../grayFx";
import { FERN_SFX_LEAD } from "../fernFx";
import { GIO_MS as STYLE_MS_GIO } from "../giornoFx";
import { ARJ_SFX_LEAD } from "../arjunaBoardFx";
import { ZECT_LUNGE, ZECT_FX_DUR } from "../zectFx";
import { SHINRA_T } from "../shinraFx";
import { EMIYA_REPEAT_MS } from "../emiyaFx";
import { KAZUMA_FX, kazumaFourDur, kazumaSonicDur } from "../kazumaFx";
import { ROLAND_FX } from "../rolandFx";
import { sideAlive } from "../../duo";
import { rtFxPlay } from "../roadtrip/rtTimeline";
import { rtDefOf } from "../roadtrip/theme";
import { key, samePos, sizeOfP, boxOfP, isDoubleP, BIG_ART, spikeOfId, boardSpikeLv } from "./stageRules";

export default function useStateDiffFx(ctx) {
  const { autoCam, byId, celineHitAt, dashHold, dashSkip, diegoDeferMs, eosFxSeq, finishIceRef, fxSeq, hitFx, hkPushTo, iceRun, isShadowBusy, later, lawHitAt, look, lowQ, me, phase, prevBoard, prevPlayers, prevPos, prevVit, pushFx, rtWorld, ryougiHitAt, ryougiSlain, seeded, seenAttack, seenDash, setAnimQ, setCinema, setDiegoGhosts, setFaces, setGhost, setGlides, setHold, setIceLv, setShake, setVitHold, setWallHold, state, wallClaim } = ctx;
  useEffect(() => {
    const atk = phase === "ATTACKING" ? state.attack : null;
    const freshAtk = atk && atk.id !== seenAttack.current ? atk : null;
    if (freshAtk) seenAttack.current = freshAtk.id;
    const nextPos = {}, nextVit = {};
    for (const p of state.players) { nextPos[p.id] = p.pos ? { ...p.pos } : null; nextVit[p.id] = (p.hp || 0) + (p.armor || 0); }
    const lastPlayers = prevPlayers.current;
    prevPlayers.current = Object.fromEntries(state.players.map((p) => [p.id, p]));
    const dash = state.dash && state.dash.seq != null ? state.dash : null;
    if (!seeded.current) { seeded.current = true; prevPos.current = nextPos; prevVit.current = nextVit; seenDash.current = dash ? dash.seq : null; return; }
    const freshDash = dash && dash.seq !== seenDash.current && Array.isArray(dash.path) && dash.path.length && dash.id != null ? dash : null;
    if (dash) seenDash.current = dash.seq;
    const anims = [];
    // ระบบคู่: ตัวที่ล้มแต่อีกตัวของฝ่ายยังรอด = ยังไม่ตกรอบ (ไม่ขึ้นป้าย "ตกรอบ")
    //  ยูนิตที่ถูกเรียก (วาเลนไทน์) ไม่ใช่ผู้เล่น = ไม่มีป้าย "ตกรอบ"
    const sideStays = (id) => { const t = state.players.find((p) => p.id === id) || lastPlayers[id]; return !!t && (!!t.summon || sideAlive(t, state.players)); };
    // Ice Spike: คนที่อยู่ในเหตุการณ์ iceFx ที่กำลังเล่น (หรือยังรอ state ผลสุดท้าย) — ไม่เลื่อน/ไม่ขึ้นเลข/ไม่ระเบิดซ้ำ (เล่นจากเหตุการณ์แทน)
    const ir = iceRun.current, iceIds = ir && (ir.active || !ir.gotState) ? ir.ids : null;
    const iceSkip = (id) => !!iceIds && iceIds.has(id);
    if (ir) ir.gotState = true;
    const spikeDone = new Set(); // ช่องหนามที่ฉากตีจัดการแล้ว
    // ตกรอบ = ระเบิดการ์ตูน + รูปปลิวหมุนขึ้นฟ้า (ผู้ใช้สั่ง) — ฉากตี/ฉากพุ่งระเบิดตรงจังหวะปะทะ · ทางอื่น (สกิล/ลำแสง/ช่องพิเศษ) ระเบิดทันที
    const boomed = new Set();
    const deathBoom = (t, at) => {
      if (!t || !at || isDoubleP(t)) return; // ตัวที่เหมือนกันแตกเป็นลูกบาศก์ (valentineFx doubleBreak) แทน
      if ((ryougiSlain.current[t.id] || 0) > performance.now()) return; // ถูกเรียวกิสังหาร = ร่างแยกสองซีก → กองเลือด (ryougiFx kill)
      pushFx([{ kind: "deathBoom", x: at.x, y: at.y, size: sizeOfP(t), img: t.img, color: t.color, name: t.name }]);
      playSfx("death_boom");
      if (!lowQ) setShake((n) => n + 1);
    };
    // ปล่อยตัวที่ค้างไว้ปลายทางพุ่ง: server ย้ายตัวจริงแล้ว (ไม่อยู่ช่องเริ่ม) หรือมีฉากพุ่งใหม่
    //  หรือฉากสกิลจบไปแล้วโดยไม่มีเฟสชน (เป้าตกรอบ/หายไประหว่างคลิปชน — server ไม่ส่ง dash ใหม่ โซระยังอยู่ช่องเริ่ม) · dash ถูกล้าง
    const dh = dashHold.current;
    const dashFlowOver = (phase !== "ATTACKING" && phase !== "CUTSCENE") || !dash || dash.seq !== dh?.seq;
    if (dh && !dh.done && (freshDash || dashFlowOver || !samePos(nextPos[dh.id], dh.from))) {
      dh.done = true;
      if (samePos(nextPos[dh.id], dh.from)) delete dashSkip.current[dh.id]; // ไม่ได้ย้ายจริง = ปลายทางพุ่งเดิมใช้ไม่ได้แล้ว
      setHold((h) => { if (!h[dh.id]) return h; const n = { ...h }; delete n[dh.id]; return n; });
    }
    // ท่าไม้ตายโซระ (Mouse Separade) — ตัวที่ขยับเพราะฉากพุ่ง (ทั้งเฟสวิ่ง/ชน) ไม่ต้องเลื่อนอัตโนมัติ (เลขดาเมจยังขึ้นตามปกติ)
    const dashFloat = {}; // id → { ms, at } เลื่อนเลขดาเมจไปขึ้นตอนระเบิด
    if (freshDash) {
      const d = freshDash, id = d.id, pts = d.path.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y }));
      const s0 = pts[0], end = pts[pts.length - 1], size = sizeOfP(byId[id]);
      if (s0 && (d.style === "kazumaSonic" || d.style === "kazumaFour")) {
        // คาซุมะ Lightning Sonic: พุ่งตามเส้นทาง (KAZUMA_FX.dashStep ต่อช่อง = DASH_STEP ของ server) · ภาพพุ่งสายฟ้า kazumaSonic แทนเงาฟ้า/ระเบิดของโซระ
        //  ชน/ดาเมจ/ผลักมาทาง socket "kazumaFx" sonicHit + state ตามปกติ
        const dir = d.dir && Number.isFinite(d.dir.x) && Number.isFinite(d.dir.y) ? { x: d.dir.x, y: d.dir.y } : { x: end.x - s0.x, y: end.y - s0.y };
        if (pts.length > 1) {
          dashSkip.current[id] = end;
          anims.push({ kind: "move", id, path: pts, stepMs: KAZUMA_FX.dashStep, seq: ++fxSeq.current });
        }
        pushFx([d.style === "kazumaFour"
          ? { kind: "kazumaFourDash", path: pts, step: KAZUMA_FX.dashStep, size, by: id, dur: kazumaFourDur(pts) }
          : { kind: "kazumaSonic", path: pts, step: KAZUMA_FX.dashStep, size, by: id, dur: kazumaSonicDur(pts) }]);
        if (dir.x || dir.y) setFaces((f) => ({ ...f, [id]: { x: Math.sign(dir.x), y: Math.sign(dir.y) } }));
        look(end);
        if (!lowQ && pts.length > 1) later((pts.length - 1) * KAZUMA_FX.dashStep, () => setShake((n) => n + 1));
      } else if (s0 && d.style === "roland") {
        // โรลันด์ (Crystal Atelier / Furioso): เลื่อนตัวตามเส้นทาง (ROLAND_FX.dashStep = BEAT.dashStep ของ server)
        if (pts.length > 1) {
          dashSkip.current[id] = end;
          anims.push({ kind: "move", id, path: pts, stepMs: ROLAND_FX.dashStep, seq: ++fxSeq.current });
        }
        look(end);
      } else if (s0 && d.style === "shinraLatom") {
        // คุซาคาเบะ ชินระ ลาทัม: ยืนชาร์จไอพ่น (SHINRA_T.latomCharge) → พุ่งเส้นไฟตามเส้นทาง (latomStep ต่อช่อง = T ของ server)
        //  เส้นไฟ/ไฟลุกตามแนวมาทาง socket "shinraFx" latom (pushFx shinraLatom)
        if (pts.length > 1) {
          dashSkip.current[id] = end;
          anims.push({ kind: "move", id, path: [s0, s0], stepMs: SHINRA_T.latomCharge, seq: ++fxSeq.current });
          anims.push({ kind: "move", id, path: pts, stepMs: SHINRA_T.latomStep, seq: ++fxSeq.current });
        }
        const dir = d.dir && Number.isFinite(d.dir.x) && Number.isFinite(d.dir.y) ? d.dir : { x: end.x - s0.x, y: end.y - s0.y };
        if (dir.x || dir.y) setFaces((f) => ({ ...f, [id]: { x: Math.sign(dir.x), y: Math.sign(dir.y) } }));
        look(end);
        if (!lowQ && pts.length > 1) later(SHINRA_T.latomCharge, () => setShake((n) => n + 1));
      } else if (s0 && d.wheel) {
        // เฟสวิ่ง: กรงจักรหนูที่ช่องเริ่ม (WHEEL_MS) → พุ่งตามเส้นทาง (DASH_STEP_MS ต่อช่อง) → ค้างที่ปลายทางจน server ย้ายตัวจริง
        // ทิศจาก server (ทิศที่เลือก) — เป้ายืนติดตัว = เส้นทางยาว 0 ช่อง ใช้เส้นทางเดาทิศไม่ได้
        const dir = d.dir && Number.isFinite(d.dir.x) && Number.isFinite(d.dir.y) ? { x: d.dir.x, y: d.dir.y } : { x: end.x - s0.x, y: end.y - s0.y };
        dashSkip.current[id] = end;
        dashHold.current = { seq: d.seq, id, from: s0, done: false };
        anims.push({ kind: "wheel", id, at: s0, ms: SORA_T.wheel, dir, lunge: pts.length <= 1, seq: ++fxSeq.current });
        if (pts.length > 1) anims.push({ kind: "move", id, path: pts, stepMs: SORA_T.step, holdEnd: end, dashSeq: d.seq, seq: ++fxSeq.current });
        pushFx([
          { kind: "soraWheel", x: s0.x, y: s0.y, size, dir, spin: SORA_T.wheel, path: pts, step: SORA_T.step, dur: SORA_T.wheel + Math.max(0, pts.length - 1) * SORA_T.step + 160, fire: !!d.fire, frame: d.frame || null },
          ...(pts.length > 1 ? [{ kind: "soraDash", path: pts, step: SORA_T.step, delay: SORA_T.wheel, size, dur: SORA_T.wheel + dashDur(pts, SORA_T.step), fire: !!d.fire, frame: d.frame || null }] : []),
        ]);
        if (dir.x || dir.y) setFaces((f) => ({ ...f, [id]: { x: Math.sign(dir.x), y: Math.sign(dir.y) } }));
        look(s0);
        // เสียงชาร์จ/พุ่งตามร่าง: Eagle = ลมหมุน + เหยี่ยวร้อง · Orca = น้ำวน + สาดน้ำ · อื่นๆ = หนูร้อง + ปั่นจักร
        const sfx = d.frame === "eagle" ? ["sora_eagle_wind", "sora_eagle_dash"] : d.frame === "orca" ? ["sora_orca_spin", "sora_orca_dash"] : null;
        if (sfx) playSfx(sfx[0]);
        else { playSfx("sora_squeak"); playSfx("sora_wheel"); } // ยาวเท่าช่วงปั่นจักร (SORA_T.wheel)
        later(SORA_T.wheel, () => { look(end); playSfx(sfx ? sfx[1] : "sora_dash"); if (!lowQ) setShake((n) => n + 1); });
      } else if (s0 && d.quiet) {
        // จบท่าโดยไม่มีระเบิด (Eagle/Orca หยุดหน้าเป้า · เป้าหายระหว่างคลิป · วาร์ปไปกระดอง): ปล่อยตัวที่ค้างไว้ · วาร์ป = ข้ามแอนิเมชันเลื่อน
        dashSkip.current[id] = end;
        if (d.style !== "soraWarp" && pts.length > 1) anims.push({ kind: "move", id, path: pts, stepMs: SORA_T.step, seq: ++fxSeq.current });
      } else if (s0) {
        // เฟสชน (หลังวิดีโอ): โซระเข้าช่องเป้า · เป้าถูกเหวี่ยงไปช่องเริ่ม (swap) · ระเบิดฟ้าที่ช่องเป้า
        const moveMs = pts.length > 1 ? (pts.length - 1) * SORA_T.step : 0;
        dashSkip.current[id] = end;
        if (pts.length > 1) anims.push({ kind: "move", id, path: pts, stepMs: SORA_T.step, seq: ++fxSeq.current });
        const sw = d.swap && d.swap.id != null && d.swap.from && d.swap.to ? d.swap : null;
        const boom = d.boom && Number.isFinite(d.boom.x) && Number.isFinite(d.boom.y) ? d.boom : end;
        const bSize = Math.max(1, d.boomSize | 0);
        if (sw && nextPos[sw.id]) {
          dashSkip.current[sw.id] = sw.to;
          setHold((h) => ({ ...h, [sw.id]: sw.from }));
          anims.push({ kind: "fling", id: sw.id, from: { x: sw.from.x, y: sw.from.y }, to: { x: sw.to.x, y: sw.to.y }, releaseHold: true, seq: ++fxSeq.current });
          dashFloat[sw.id] = { ms: moveMs + 60, at: boom };
        }
        // เป้าตกรอบ (server เอาออกแล้ว) = วาดค้างไว้ถึงตอนระเบิด + เลขดาเมจ/ตกรอบ
        const dead = sw ? null : Object.values(lastPlayers).find((t) => t && t.id !== id && t.pos && !nextPos[t.id] && Rules.covers(boxOfP(t), boom.x, boom.y));
        if (dead) {
          setGhost({ id: dead.id, x: dead.pos.x, y: dead.pos.y, img: dead.img, color: dead.color, name: dead.name, hp: dead.hp ?? 0, maxHp: dead.maxHp ?? 0, armor: dead.armor ?? 0, maxArmor: dead.maxArmor ?? 0, size: sizeOfP(dead) });
          later(moveMs + 40, () => setGhost(null));
          boomed.add(dead.id);
        }
        if (nextPos[id]) dashFloat[id] = { ms: moveMs + 60, at: nextPos[id] };
        const lost = dead ? (nextVit[dead.id] ?? 0) - (prevVit.current[dead.id] ?? 0) : 0;
        look(boom);
        later(moveMs, () => {
          pushFx([
            { kind: "soraBoom", x: boom.x, y: boom.y, size: bSize, fire: !!d.fire },
            ...(dead && lost < 0 ? [{ kind: "float", x: boom.x, y: boom.y, text: `${lost}`, size: 30, z: lowQ ? 2.4 : 1.5 }] : []),
            ...(dead ? [{ kind: "float", x: boom.x, y: boom.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
          ]);
          if (!lowQ) setShake((n) => n + 1);
          if (d.fire) playSfx("sora_fire"); // Fire Frame: ไฟลุกตอนระเบิด
          if (dead) deathBoom(dead, dead.pos);
        });
      }
    }
    // ตัวที่ถึงปลายทางของฉากพุ่งแล้ว (ใช้ครั้งเดียว)
    const dashMoved = new Set();
    for (const [id, to] of Object.entries(dashSkip.current)) {
      const before = prevPos.current[id], now = nextPos[id];
      if (!now) { delete dashSkip.current[id]; continue; }
      if (before && !samePos(before, now) && samePos(now, to)) { dashMoved.add(id); delete dashSkip.current[id]; }
    }

    // ย้อนการเดิน (ปุ่มย้อน / ก้าวหรือคลิกกลับจุดเริ่ม): ภาพเดินที่ยังค้างในคิวของคนนั้นทิ้งหมด — กลับที่เดิมทันที
    const act = state.action;
    if (state.actorId && act && !act.moved && act.from) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && samePos(now, act.from)) {
        setAnimQ((q) => q.filter((a) => !(a.id === id && a.kind === "move")));
        if (ir && !ir.done && ir.ids.has(id) && finishIceRef.current) finishIceRef.current(ir);
      }
    }
    // เดิน: ตำแหน่งคนที่กำลังเดินเปลี่ยนตามเส้นทางของตานี้
    //  เส้นทางเริ่มที่ช่องเดิม หรือเริ่มที่จุดเริ่มตา (เดินแล้วคลิกใหม่ = เดินใหม่จากจุดเริ่ม)
    const path = act && act.path;
    if (state.actorId && path && path.length > 1 && !dashMoved.has(state.actorId) && !iceSkip(state.actorId)) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && (samePos(path[0], before) || samePos(path[0], act.from)) && samePos(path[path.length - 1], now)) {
        // Echo เดินกระโดดดึ๋งๆ ทีละช่อง (ตัวใหญ่กระโดดช้าและหนักกว่า)
        const mover = state.players.find((q) => q.id === id);
        const hop = mover && mover.character && BIG_ART[mover.character.id] ? sizeOfP(mover) : 0;
        anims.push({ kind: "move", id, path, hop, seq: ++fxSeq.current });
        // คุซาคาเบะ ชินระ: เดินระหว่างฮีโร่/อุ่นเครื่อง = รอยเท้าเถ้า (Devil's Footprints · shinraFx.js)
        if (mover && mover.shinra && (mover.shinra.hero > 0 || mover.shinra.warm > 0)) pushFx([{ kind: "shinraPrints", x: path[0].x, y: path[0].y, path: path.map((t) => ({ x: t.x, y: t.y })), step: 120, dur: 3600 + path.length * 120 }]);
        const a = path[path.length - 2], b = path[path.length - 1];
        setFaces((f) => ({ ...f, [id]: { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } }));
        // คนอื่นเดิน = ไม่ดึงกล้องตาม (ผู้ใช้สั่ง 2026-11-10 ไม่ให้กล้องโดนดึงไปหาผู้เล่นอื่น) · คนดู = ตามเหมือนเดิม
        if (!me || id === me.id || (mover && (mover.duoOf === me.id || (mover.summon && mover.summon.ownerId === me.id)))) look(now);
      }
    }
    // ฉากตี (ดีไซน์ใหม่): กล้องซูมเข้าคู่ → หมากพุ่งชน → ปะทะ (แสงแตก + จอสั่น/แฟลช + เลขดาเมจ + เสียงตี) → (สวน) → ถอย/ชน → กล้องคืน
    //  ยิงปืน = ไม่พุ่ง (ยิงจากที่ยืน) · lowQ = ไม่ซูม/ไม่พุ่ง (ปะทะทันที)
    const involved = new Set();
    if (freshAtk) {
      const a = freshAtk;
      involved.add(a.byId); involved.add(a.targetId);
      // ตีแนวตรง (ไรโด ฮิคารุ): ศัตรูคนอื่นในแนวโดนด้วย — เลขดาเมจ/สั่นขึ้นพร้อมเป้าหลักที่จังหวะปะทะ
      const extras = (Array.isArray(a.extra) ? a.extra : []).map((e) => ({ ...e, at: nextPos[e.targetId] || prevPos.current[e.targetId] || null })).filter((e) => e.at);
      for (const e of extras) involved.add(e.targetId);
      // ตีหนามน้ำแข็ง: ตำแหน่งเป้า = ช่องหนาม · Lv ลด/แตก = วาดหนามเดิมค้างไว้ถึงจังหวะปะทะ
      const spikeT = a.spike && Number.isFinite(a.spike.x) && Number.isFinite(a.spike.y) ? { x: a.spike.x, y: a.spike.y } : spikeOfId(a.targetId);
      const spikeK = spikeT ? key(spikeT.x, spikeT.y) : null;
      const spikeWas = spikeK ? boardSpikeLv(prevBoard.current, spikeK) : 0, spikeNow = spikeK ? boardSpikeLv(state.board, spikeK) : 0;
      if (spikeK) spikeDone.add(spikeK);
      // กำแพงน้ำแข็งของเซลิน (terrain "icewall") แตกจากการตี = วาดค้างไว้ถึงจังหวะปะทะ แล้วแตกกระจาย (celineFx wallBreak ที่มาพร้อมกันถูกจองไว้)
      const pbT = prevBoard.current && prevBoard.current.terrain, nbT = state.board && state.board.terrain;
      const wallHit = !!spikeK && !!pbT && pbT[spikeK] === "icewall" && !(nbT && nbT[spikeK] === "icewall");
      //  หนามหิน Takt ของลอว์ (look "lawRock") = ฉาก lawRockBreak วาดหินค้างถึงจังหวะปะทะแล้วพัง (แทนกำแพงน้ำแข็ง)
      const rockHit = wallHit && ((prevBoard.current && prevBoard.current.spikes) || []).some((sp) => sp && sp.look === "lawRock" && key(sp.x, sp.y) === spikeK);
      if (wallHit) {
        wallClaim.current[spikeK] = performance.now() + 2500;
        if (!rockHit) setWallHold((h) => [...h.filter((t) => !samePos(t, spikeT)), { x: spikeT.x, y: spikeT.y }]);
      }
      if (spikeK && spikeWas > 0 && spikeNow !== spikeWas) setIceLv((m) => ({ ...(m || {}), [spikeK]: spikeWas }));
      const tPos = spikeT || nextPos[a.targetId] || prevPos.current[a.targetId];
      const fromPos = a.push ? a.push.from : (nextPos[a.byId] || prevPos.current[a.byId]);
      if (a.push) setHold((h) => ({ ...h, [a.byId]: a.push.from }));
      // คนตีหันหน้าเข้าหาเป้า (ตัวใหญ่ใช้รูปหน้า/ข้าง/หลังตามทิศ) · มีสวนกลับ = เป้าหันกลับมาด้วย
      if (fromPos && tPos) {
        const faceTo = (p, q, sp, sq) => {
          const dx = (q.x + sq / 2) - (p.x + sp / 2), dy = (q.y + sq / 2) - (p.y + sp / 2);
          return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) };
        };
        const sa = sizeOfP(byId[a.byId]), st = sizeOfP(byId[a.targetId]);
        setFaces((f) => ({
          ...f,
          [a.byId]: faceTo(fromPos, tPos, sa, st),
          ...(a.counter ? { [a.targetId]: faceTo(tPos, fromPos, st, sa) } : {}),
        }));
      }
      // ตีปกติเป็นลำแสง (นักบินปริศนา · byBeam = ความยาวช่อง): ยิงจากที่ยืน ลำแสงพุ่งไปหาเป้า ปลายลำแสงถึง = จังหวะปะทะ
      const beam = a.byBeam > 0 && fromPos && tPos;
      // ท่าตีเฉพาะตัว (Echo: คลื่นเสียง / ผมฟาด / ปาหิน) — ตีจากที่ยืน เอฟเฟกต์วิ่งจากตัวไปหาเป้า
      // โจรุโน่ (giornoFx.js): ตีปกติ = หมัดหนัก · ติดคริ = หมัดรัว
      const styleKey = a.byStyle === "gioPunch" && a.crit ? "gioRush" : a.byStyle;
      const style = !beam && styleKey && STYLE_HIT[styleKey] && fromPos && tPos ? styleKey : null;
      // ไจโรตีด้วยลูกเหล็กที่ขว้าง (gyroFx "throw") — ไม่พุ่งชนแม้อยู่ใกล้
      const melee = !beam && !style && fromPos && tPos && !(byId[a.byId] && byId[a.byId].gyro) && Math.abs(fromPos.x - tPos.x) + Math.abs(fromPos.y - tPos.y) <= 2;
      // คาซุมะ ฟันดาบ/หมัด: ท่าเฉพาะตัวที่พุ่งเข้าด้วย anim "lunge" (ห่าง ≤ 2) — STYLE_HIT ของสองท่านี้ = จังหวะชนของ lunge (~385 ms) · ฉากปะทะของ kazumaFx แทนแสงแตกเดิม
      //  ลอว์ (law* — lawFx.js): ฉากปะทะ (รอยตัด/ใบมีดเขียว/มือ) อยู่ในท่าตีแล้วเช่นกัน · lawSlash ไม่พุ่ง (ตัดจากที่ยืน)
      const kz = !!style && (style.startsWith("kazuma") || style.startsWith("law") || style.startsWith("faiz") || style.startsWith("kiri") || style in ZECT_FX_DUR); // ไรเดอร์ ZECT (zectFx.js): ฉากปะทะอยู่ในท่าตี
      //  ฮาคุโนะชาย (hakunoM — moonFx.js): หมัดโค้ดช็อกพุ่งเข้าด้วย lunge แบบเดียวกัน
      const kzLunge = (ZECT_LUNGE.has(style) || style === "faizFist" || style === "faizKnuckle" || style === "kazumaBlade" || style === "kazumaPunch" || style === "kazumaKing" || style === "kazumaStraight" || style === "hakunoM") && Math.abs(fromPos.x - tPos.x) + Math.abs(fromPos.y - tPos.y) <= 2;
      const ZOOM_IN = lowQ ? 0 : 480;
      const HIT = ZOOM_IN + (beam ? BEAM_T.charge + BEAM_T.extend : style ? STYLE_HIT[style] : melee && !lowQ ? 385 : 120);
      if (beam) later(ZOOM_IN, () => pushFx([{ kind: "beam", x: fromPos.x, y: fromPos.y, to: tPos, len: a.byBeam, hitId: a.targetId, tone: a.byBeamTone || null }]));
      // มีดโซระ (byHitFx "mythSlash"): พุ่งชนแบบเดิม · เสียงเริ่มก่อนปะทะ (ฟันแรกในเสียงตรงจังหวะปะทะ) · ฟันฟ้า 2 ครั้งแทนแสงแตก
      //  ดาบ BeamSaber ของบานาจ (byHitFx "saberRed"): ฟันไขว้แบบเดียวกันแต่สีแดง · เสียงตีตรงจังหวะปะทะ
      const saber = a.byHitFx === "saberRed" || a.byHitFx === "saberGold"; // saberGold = ดาบของโจชัว รอสฟิลด์ (ฟันไขว้ทอง)
      const myth = a.byHitFx === "mythSlash" || saber;
      if (myth && !saber && tPos) later(Math.max(0, HIT - SORA_T.lead), () => playSfx(a.byAttackSound || "attack"));
      // โจรุโน่: หมัดหนักปะทะ = จอสั่น · หมัดรัว = สั่นตอนหมัดสุดท้าย (giornoFx.js RUSH_END + 0.08)
      // อรชุน: เสียงตีเริ่มพร้อมท่า (จังหวะระเบิด/ธนูในเสียงตรงจังหวะปะทะ)
      const arjS = style === "arjunaBomb" || style === "arjunaArrow";
      if (arjS) later(Math.max(ZOOM_IN, HIT - ARJ_SFX_LEAD[style]), () => playSfx(a.byAttackSound || "attack"));
      if (Array.isArray(a.hitFx) && a.hitFx.length) later(HIT, () => a.hitFx.forEach((h) => hitFx.current[h.event] && hitFx.current[h.event](h.payload)));
      if ((style === "dioPunch" || style === "faizKnuckle" || style === "faizPoint" || style === "zKick" || style === "zDrakeUlt") && !lowQ) later(HIT, () => setShake((n) => n + 1));
      if ((style === "gioPunch" || style === "gioRush") && !lowQ) later(style === "gioRush" ? ZOOM_IN + 0.8 * STYLE_MS_GIO.gioRush : HIT, () => setShake((n) => n + 1));
      if (style && style.startsWith("celine")) celineHitAt.current = performance.now() + HIT;
      if (style && style.startsWith("ryougi")) ryougiHitAt.current = performance.now() + HIT;
      if (style && style.startsWith("law")) lawHitAt.current = performance.now() + HIT;
      if (rockHit) pushFx([{ kind: "lawRockBreak", tiles: [{ x: spikeT.x, y: spikeT.y }], hold: HIT, dur: HIT + 800, why: "hit" }]);
      if (style) later(ZOOM_IN, () => pushFx([{ kind: style, x: fromPos.x, y: fromPos.y, size: a.bySize || 1, to: { x: tPos.x, y: tPos.y }, toSize: sizeOfP(byId[a.targetId]), color: a.byColor, lane: Array.isArray(a.byLane) ? a.byLane : null, by: a.byId, tid: a.targetId, dodge: !!a.dodge }]));
      // ท่าตีของฮิคารุ (hk*): ปะทะเป็นแสงตามสีร่าง + ทุกคนที่โดนสั่นพร้อมกัน (แทนแสงแตกกลาง)
      const hk = !!style && isHikaruFx(style);
      // เสียงของท่าฮิคารุเริ่มก่อนปะทะ (ช่วงดังสุดของไฟล์ตรงจังหวะปะทะ)
      if (hk && tPos) later(Math.max(ZOOM_IN, HIT - (HK_SFX_LEAD[style] || 0)), () => playSfx(a.byAttackSound || "attack"));
      // Zoltraak ของเฟิร์น: เสียงร่าย/ชาร์จเริ่มพร้อมวงเวท · เสียงระเบิดในไฟล์ (1.5 วิ) ตรงจังหวะปะทะ
      const fernZ = style === "fernZoltraak" || style === "fernZoltraakMax";
      if (fernZ && tPos) later(Math.max(ZOOM_IN, HIT - FERN_SFX_LEAD), () => playSfx(a.byAttackSound || "attack"));
      // ตีซ้ำเป้าเดิมในการตีครั้งเดียว (card.repeat — ชิโร่ Kanshou & Bakuya): ฮิตละ EMIYA_REPEAT_MS หลังฮิตแรก · ตายที่ฮิตไหน = ตกรอบตอนนั้น
      const reps = Array.isArray(a.repeat) ? a.repeat : [];
      const repKill = reps.findIndex((r) => r.kill);
      const tKill = !!a.kill || repKill >= 0;
      const tKillAt = a.kill ? HIT : HIT + EMIYA_REPEAT_MS * (repKill + 1);
      // เป้าตกรอบ (server เอาออกจากกระดานแล้ว) = วาดค้างไว้ถึงจังหวะปะทะ
      if (tKill && tPos && !nextPos[a.targetId] && lastPlayers[a.targetId]) {
        const t = lastPlayers[a.targetId];
        setGhost({ id: t.id, x: tPos.x, y: tPos.y, img: t.img, color: t.color, name: t.name, hp: t.hp ?? 0, maxHp: t.maxHp ?? 0, armor: t.armor ?? 0, maxArmor: t.maxArmor ?? 0 });
        later(tKillAt + 40, () => setGhost(null));
      }
      // ตกรอบในฉากตี (เป้าหลัก + คนอื่นในแนว) = ระเบิดตอนปะทะ
      const mainDead = tKill && tPos && lastPlayers[a.targetId] ? { t: lastPlayers[a.targetId], at: tPos } : null;
      const deadInAtk = extras.filter((e) => e.kill && lastPlayers[e.targetId]).map((e) => ({ t: lastPlayers[e.targetId], at: e.at }));
      if (mainDead) boomed.add(mainDead.t.id);
      for (const d of deadInAtk) boomed.add(d.t.id);
      if (mainDead) later(tKillAt, () => deathBoom(mainDead.t, mainDead.at));
      if (deadInAtk.length) later(HIT, () => deadInAtk.forEach((d) => deathBoom(d.t, d.at)));
      if (tPos) {
        look(tPos);
        if (!lowQ && fromPos && autoCam.current) setCinema({ a: fromPos, b: tPos, z: 2 }); // Eos: ไม่ซูมเข้าฉากตี
        if ((melee || kzLunge) && !lowQ) later(ZOOM_IN, () => setAnimQ((q) => [...q, { kind: "lunge", id: a.byId, from: fromPos, to: tPos, hitId: a.targetId, seq: ++fxSeq.current }]));
        later(HIT, () => {
          if ((!myth || saber) && !hk && !fernZ && !arjS) playSfx(a.byAttackSound || "attack");
          // เสียงต่อท้ายเสียงตี (โซระ Fire Frame: ไฟลุก) · หลบพ้น = ไม่เล่น
          if (a.byTailSound && a.byTailSound.key && !a.dodge) later(Math.max(0, +a.byTailSound.after || 0), () => playSfx(a.byTailSound.key));
          if (style && grayChains(style) && !a.dodge) playSfx("gray_chains"); // เกรย์จงบ้าคลั่ง: โซ่ตรึงซ้อนเสียงอาวุธ
          // เซลินติดคริ: ดอกทอง + มงกุฎเล็กเหนือเป้า + เสียงประกาย (ซ้อนเสียงอาวุธ)
          if (style && style.startsWith("celine") && a.crit && !a.dodge) { playSfx("celine_crit"); pushFx([{ kind: "celineCrit", x: tPos.x, y: tPos.y, size: sizeOfP(byId[a.targetId]) }]); }
          if (wallHit && !rockHit) {
            setWallHold((h) => h.filter((t) => !samePos(t, spikeT)));
            pushFx([{ kind: "celineWallBreak", x: spikeT.x, y: spikeT.y, tiles: [{ x: spikeT.x, y: spikeT.y }], why: "hit" }]);
          }
          setShake((n) => n + 1);
          if (myth && !a.dodge && !lowQ) later(SORA_T.slash2, () => setShake((n) => n + 1));
          const first = a.dodge ? "หลบ" : a.byDeferDmg ? null : `-${a.dmg}`;
          pushFx([
            // คาซุมะ: ฉากปะทะอยู่ใน kazumaFx แล้ว (รอยฟัน/หมัด/สายฟ้า) — ไม่ซ้อนแสงแตกเดิม
            ...(kz && !a.dodge ? [] : [hk && !a.dodge
              ? { kind: "hkHit", x: tPos.x, y: tPos.y, size: sizeOfP(byId[a.targetId]), tone: HK_TONE[style], hitIds: [a.targetId, ...extras.filter((e) => !e.dodge).map((e) => e.targetId)] }
              : { kind: a.dodge ? "slash" : myth ? "mythSlash" : "burst", x: tPos.x, y: tPos.y, color: a.byColor, size: sizeOfP(byId[a.targetId]), tone: saber ? (a.byHitFx === "saberGold" ? "gold" : "red") : null }]),
            ...extras.flatMap((e) => [
              ...(e.dodge ? [{ kind: "slash", x: e.at.x, y: e.at.y, color: a.byColor }] : hk ? [{ kind: "hkHit", x: e.at.x, y: e.at.y, size: sizeOfP(byId[e.targetId]), tone: HK_TONE[style] }] : kz ? [] : [{ kind: "burst", x: e.at.x, y: e.at.y, color: a.byColor }]),
              { kind: "float", x: e.at.x, y: e.at.y, text: e.dodge ? "หลบ" : `-${e.dmg}`, color: e.crit && !e.dodge ? "#ffd84a" : undefined, size: 28, z: lowQ ? 2.4 : 1.5 },
              ...(e.kill && !sideStays(e.targetId) ? [{ kind: "float", x: e.at.x, y: e.at.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 22, z: lowQ ? 2.4 : 1.5 }] : []),
            ]),
            ...(first == null ? [] : [{ kind: "float", x: tPos.x, y: tPos.y, text: first, color: a.crit && !a.dodge ? "#ffd84a" : undefined, size: a.crit && !a.dodge ? 38 : 30, z: lowQ ? 2.4 : 1.5 }]),
            // คริติคอลติด = ป้ายเหนือเลขดาเมจ (เดิมฉากบนกระดานไม่บอก — ดาเมจ ×2 แล้วผู้เล่นไม่รู้ตัว)
            ...(a.crit && !a.dodge ? [{ kind: "float", x: tPos.x, y: tPos.y - (a.kill ? 1.2 : 0.6), text: "คริติคอล", color: "#ffd84a", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
            ...(a.kill && !spikeT && !sideStays(a.targetId) ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
          ]);
          if (spikeK && spikeWas > 0 && spikeNow !== spikeWas) {
            setIceLv((m) => { if (!m || !(spikeK in m)) return m; const n = { ...m }; delete n[spikeK]; return Object.keys(n).length ? n : null; });
            pushFx([{ kind: "iceSpikeBreak", x: tPos.x, y: tPos.y, lv: spikeNow }]);
            playSfx("is_skill_2_broke");
          }
        });
      }
      if (tPos) reps.forEach((r, i) => later(HIT + EMIYA_REPEAT_MS * (i + 1), () => {
        setShake((n) => n + 1);
        const zz = lowQ ? 2.4 : 1.5, crit = r.crit && !r.dodge;
        pushFx([
          { kind: r.dodge ? "slash" : "burst", x: tPos.x, y: tPos.y, color: a.byColor, size: sizeOfP(byId[a.targetId]) },
          { kind: "float", x: tPos.x, y: tPos.y - 0.35, text: r.dodge ? "หลบ" : `-${r.dmg}`, color: crit ? "#ffd84a" : undefined, size: crit ? 38 : 30, z: zz },
          ...(crit ? [{ kind: "float", x: tPos.x, y: tPos.y - (r.kill ? 1.5 : 0.95), text: "คริติคอล", color: "#ffd84a", size: 24, z: zz }] : []),
          ...(r.kill && !sideStays(a.targetId) ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.95, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: zz }] : []),
        ]);
      }));
      let t = HIT + EMIYA_REPEAT_MS * reps.length;
      if (a.counter && fromPos) {
        t = HIT + 640;
        const c = a.counter;
        if (c.byBeam > 0 && tPos) later(t - BEAM_T.charge - BEAM_T.extend, () => pushFx([{ kind: "beam", x: tPos.x, y: tPos.y, to: fromPos, len: c.byBeam, hitId: c.targetId, tone: c.byBeamTone || null }]));
        const cMyth = c.byHitFx === "mythSlash";
        if (cMyth) later(Math.max(0, t - SORA_T.lead), () => playSfx(c.byAttackSound || "attack"));
        later(t, () => {
          if (!cMyth) playSfx(c.byAttackSound || "attack");
          setShake((n) => n + 1);
          if (cMyth && !c.dodge && !lowQ) later(SORA_T.slash2, () => setShake((n) => n + 1));
          pushFx([
            { kind: c.dodge ? "slash" : cMyth ? "mythSlash" : "burst", x: fromPos.x, y: fromPos.y, color: c.byColor, size: sizeOfP(byId[c.targetId]) },
            { kind: "float", x: fromPos.x, y: fromPos.y, text: c.dodge ? "หลบ" : `สวน -${c.dmg}`, color: "#ffb0a8", size: 24 },
          ]);
        });
      }
      if (a.push) {
        later(t + 420, () => {
          setHold((h) => { const n = { ...h }; delete n[a.byId]; return n; });
          setAnimQ((q) => [...q, { kind: "push", id: a.byId, from: a.push.from, to: a.push.to, collide: a.push.collide, seq: ++fxSeq.current }]);
          if (a.push.collide) pushFx([{ kind: "float", x: a.push.from.x, y: a.push.from.y, text: "ชน -1", color: "#ffc56b", size: 22 }]);
        });
      }
      const slashTail = myth || (a.counter && (a.counter.byHitFx === "mythSlash" || a.counter.byHitFx === "saberRed" || a.counter.byHitFx === "saberGold")) ? SORA_T.slash2 : 0;
      if (!lowQ) later(t + slashTail + (a.push ? 900 : 1000), () => setCinema(null));
    }
    // หนามน้ำแข็งลด Lv/หายนอกฉากตีและนอกเหตุการณ์ iceFx (สกิลพื้นที่ตีโดน / หมดเวลา) = แตกทันที
    const pb = prevBoard.current, nb = state.board;
    if (pb && nb && pb.area === nb.area && !iceIds) {
      let broke = false;
      for (const [k, kind] of Object.entries(pb.terrain || {})) {
        const was = iceSpikeLv(kind), now = boardSpikeLv(nb, k);
        if (!was || now >= was || spikeDone.has(k)) continue;
        const [x, y] = k.split(",").map(Number), old = (pb.spikes || []).find((sp) => sp.x === x && sp.y === y);
        pushFx([{ kind: "iceSpikeBreak", x, y, lv: now }]);
        if (!(now === 0 && old && old.left <= 1)) broke = true; // หมดเวลา = แตกเงียบ
      }
      if (broke) playSfx("is_skill_2_broke");
    }
    // สนาม Eos: เหตุการณ์ใหม่ที่มี delay (ฉากตีของมอนหลังเดิน) → เลขดาเมจ/หลอดเลือดขึ้นตอนตีจริง
    let eosDelay = 0;
    // ตามอนทีละตัว (server stage6 mobTimeline — รายการมี at): คนที่โดนตี → เลขดาเมจ/หลอดเลือดลดทีละครั้งตามจังหวะของมอนแต่ละตัว
    const eosHits = {}; // id → [{ at (ms ถึงจังหวะปะทะ), dmg }]
    {
      const list = (state.fodlan && state.fodlan.board && state.fodlan.board.fx) || [];
      const top = list.reduce((m, e) => Math.max(m, e.seq || 0), 0);
      const IMPACT = { mob_attack: ["attacks", 260], mob_shot: ["shots", 220], mob_pull: ["list", 420] };
      if (eosFxSeq.current != null) for (const e of list) {
        if (e.seq <= eosFxSeq.current) continue;
        if (e.seqd && IMPACT[e.kind]) {
          const [key, off] = IMPACT[e.kind];
          for (const h of e[key] || []) if (h && h.target && (h.dmg | 0) > 0) (eosHits[h.target] ||= []).push({ at: (h.at || 0) + off, dmg: h.dmg | 0 });
        } else if (e.delay > 0) eosDelay = Math.max(eosDelay, e.delay);
      }
      eosFxSeq.current = Math.max(eosFxSeq.current || 0, top);
    }
    // Road Trip (board/roadtrip/rtTimeline.js): เดินในจุดพักทีละช่อง · ตามอนเล่นทีละตัว (เดิน → พุ่งตี → เลข) · ท่าบอส — คนที่ฉากดูแลไม่ต้องเลื่อน/ขึ้นเลขซ้ำ
    if (rtWorld) {
      const unset = (setter, id, key) => setter((h) => { if (!h[id] || (key && h[id].key !== key)) return h; const n = { ...h }; delete n[id]; return n; });
      const rtIds = rtFxPlay(state.roadtrip, {
        now: () => performance.now(), later,
        glide: (id, path, stepMs, delay) => {
          const key = `rt${++fxSeq.current}`, end = path[path.length - 1], a = path[path.length - 2];
          setGlides((g) => ({ ...g, [id]: { key, path, stepMs, delay } }));
          later(delay, () => setFaces((f) => ({ ...f, [id]: { x: Math.sign(end.x - a.x), y: Math.sign(end.y - a.y) } })));
          later(delay + (path.length - 1) * stepMs + 250, () => unset(setGlides, id, key));
        },
        hold: (id, pos) => { setHold((h) => ({ ...h, [id]: pos })); later(9000, () => unset(setHold, id)); },
        knock: (id, a, b) => { unset(setHold, id); setAnimQ((q) => [...q, { kind: "push", id, from: a, to: b, collide: false, seq: ++fxSeq.current }]); },
        vitHold: (id) => { const was = lastPlayers[id]; if (!was) return; setVitHold((h) => ({ ...h, [id]: { hp: was.hp ?? 0, armor: was.armor ?? 0 } })); later(9000, () => unset(setVitHold, id)); },
        vitUnhold: (id) => unset(setVitHold, id),
        lunge: (id, from, to, hitId) => setAnimQ((q) => [...q, { kind: "lunge", id, from, to, hitId: hitId || undefined, seq: ++fxSeq.current }]),
        fx: pushFx, sfx: playSfx, shake: () => { if (!lowQ) setShake((n) => n + 1); },
        prevPos: (id) => prevPos.current[id] || null, nextPos: (id) => nextPos[id] || null,
        vanAt: () => { const d = rtDefOf(state.board && state.board.area), v = d && d.vanBlock; return v ? { x: Math.round((v.x0 + v.x1) / 2), y: Math.round((v.y0 + v.y1) / 2) } : null; },
        look: (pos, delay) => { if (pos) later(delay || 0, () => look(pos)); },
      });
      for (const id of rtIds) involved.add(id);
    }
    // เลือด/เกราะเปลี่ยนนอกฉากตี (สกิล/สถานะ/ช่องพิเศษ) → ตัวเลขลอย (กล้องตามคนแรกที่โดน)
    let hurtPos = null;
    for (const p of state.players) {
      if (involved.has(p.id) || !p.pos || iceSkip(p.id)) continue;
      const d = (nextVit[p.id] || 0) - (prevVit.current[p.id] ?? nextVit[p.id]);
      const hs = eosHits[p.id];
      if (hs && d < 0 && lastPlayers[p.id] && !dashFloat[p.id]) { // ตามอนทีละตัว: ลดทีละครั้ง (เกราะก่อน) ตามคิว · ครั้งสุดท้าย = ค่าจริง
        const was = lastPlayers[p.id], id = p.id, at = p.pos;
        hs.sort((a, b) => a.at - b.at);
        let hp = was.hp ?? 0, ar = was.armor ?? 0;
        setVitHold((h) => ({ ...h, [id]: { hp, armor: ar } }));
        hs.forEach((h, i) => {
          const take = Math.min(ar, h.dmg); ar -= take; hp = Math.max(0, hp - (h.dmg - take));
          const step = { hp, armor: ar }, last = i === hs.length - 1;
          later(h.at, () => {
            pushFx([{ kind: "float", x: at.x, y: at.y, text: `-${h.dmg}` }]);
            setVitHold((v) => { if (!v[id]) return v; if (last) { const n = { ...v }; delete n[id]; return n; } return { ...v, [id]: step }; });
          });
        });
        continue;
      }
      const df = dashFloat[p.id] || (d < 0 && diegoDeferMs(p.id) > 0 ? { ms: diegoDeferMs(p.id), at: p.pos } : null) || (d < 0 && eosDelay > 0 ? { ms: eosDelay, at: p.pos } : null), at = df ? df.at : p.pos;
      if (d < 0 && eosDelay > 0 && !dashFloat[p.id] && lastPlayers[p.id]) { // หลอดเลือดค้างค่าเดิมจนถึงจังหวะตี
        const was = lastPlayers[p.id], id = p.id;
        setVitHold((h) => ({ ...h, [id]: { hp: was.hp ?? 0, armor: was.armor ?? 0 } }));
        later(eosDelay, () => setVitHold((h) => { if (!h[id]) return h; const n = { ...h }; delete n[id]; return n; }));
      }
      const fl = d < 0 ? [{ kind: "float", x: at.x, y: at.y, text: `${d}` }] : d > 0 ? [{ kind: "float", x: at.x, y: at.y, text: `+${d}`, color: "#8ff0b0" }] : null;
      if (fl && df) later(df.ms, () => pushFx(fl));
      else if (fl) pushFx(fl);
      if (d && !hurtPos) hurtPos = p.pos;
    }
    if (hurtPos && !freshAtk) look(hurtPos);
    for (const p of state.players) {
      const was = lastPlayers[p.id];
      if (!was || !was.alive || !was.pos || p.alive || boomed.has(p.id) || iceSkip(p.id)) continue;
      // ตกรอบตอนเวลาเดินต่อ (ดิเอโก้): ระเบิดตอนของที่ค้างกลางอากาศพุ่งถึง (ร่างค้างไว้ใน diegoGhosts)
      const dms = diegoDeferMs(p.id);
      if (dms > 0) { later(dms, () => { deathBoom(was, was.pos); setDiegoGhosts((g) => { if (!g[p.id]) return g; const n = { ...g }; delete n[p.id]; return n; }); }); continue; }
      deathBoom(was, was.pos);
    }
    // ขยับเองนอกการเดิน/ฉากตี (น้ำวนดัน ฯลฯ) ระยะ 1–2 ช่อง = เลื่อนไปแทนการกระโดด
    //  ถูก Strium Ray ผลัก (server แจ้งปลายทางมาก่อนทาง hikaruPush) = เลื่อนไปไกลเท่าไรก็ได้
    for (const p of state.players) {
      const before = prevPos.current[p.id], now = nextPos[p.id];
      if (!before || !now || samePos(before, now) || involved.has(p.id) || dashMoved.has(p.id) || iceSkip(p.id) || isShadowBusy(p.id) || anims.some((a) => a.id === p.id)) continue;
      const hp = hkPushTo.current[p.id];
      if (hp && samePos(now, hp.to)) {
        delete hkPushTo.current[p.id];
        anims.push({ kind: "push", id: p.id, from: before, to: now, collide: false, ms: HK_PUSH_MS, seq: ++fxSeq.current });
        continue;
      }
      if (Math.abs(before.x - now.x) + Math.abs(before.y - now.y) > 2) continue; // ไกลกว่านั้น = วางใหม่ (เปลี่ยนภูมิภาค/ย้อนการเดิน)
      if (p.id === state.actorId && !(state.action && state.action.moved)) continue; // กดย้อน = กลับที่เดิมทันที
      anims.push({ kind: "push", id: p.id, from: before, to: now, collide: false, seq: ++fxSeq.current });
    }
    if (anims.length) setAnimQ((q) => [...q, ...anims]);
    prevPos.current = nextPos;
    prevVit.current = nextVit;
    prevBoard.current = state.board || null;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps -- เทียบกับ state ก่อนหน้าเท่านั้น
}
