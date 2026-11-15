// ============================================================
//  useCharLayers — ส่วนของ BoardStage: ชั้นวาดเฉพาะตัวละครที่ส่งให้ BoardCanvas
//    วงเพลงยูนะ · เสียงออร่ายูกิ · เกรย์ · กิลกาเมช · เฟิร์น · ลูกเหล็กไจโร · ดิเอโก้ · คริซุงุ
//    เซลิน (พุ่ม/ราชา/กำแพง) · เรียวกิ · โอโตยะ · ชิโร่ · ลอว์ — สร้างจากลายเซ็น JSON (อ็อบเจกต์ใหม่เฉพาะตอนข้อมูลเปลี่ยน)
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx)
// ============================================================
import { useEffect, useMemo, useRef } from "react";
import { playSfx } from "../../audio";
import { key, sizeOfP } from "./stageRules";

export default function useCharLayers(ctx) {
  const { celFlora, dirPick, hover, pickInfo, sameDim, spikeList, state, wallHold, wallOrient, wallPlan } = ctx;
  // วงเพลงของยูนะ (yunaFx.js drawYunaZones) — คนที่มองไม่เห็นยูนะได้ yuna = undefined (view.unseenPub) จึงไม่เห็นวง
  const songSig = state.players.map((p) => (p.alive && p.yuna && p.yuna.aura ? `${p.yuna.aura.kind}@${p.yuna.aura.x},${p.yuna.aura.y},${p.yuna.aura.r}` : "")).filter(Boolean).join("|");
  const songs = useMemo(() => (songSig ? songSig.split("|").map((t) => { const [kind, rest] = t.split("@"); const [x, y, r] = rest.split(",").map(Number); return { kind, x, y, r }; }) : null), [songSig]);
  // ยูกิเริ่มนับถอยหลังรอบใหม่ (p.yuki.at ใหม่) = เสียงออร่ารวมตัวครั้งเดียว
  const yukiAtSig = state.players.filter((p) => p.alive && p.yuki && p.yuki.left > 0).map((p) => `${p.id}@${p.yuki.at}`).join("|");
  const yukiHeard = useRef(new Set());
  useEffect(() => {
    if (!yukiAtSig) return;
    const fresh = yukiAtSig.split("|").filter((k) => !yukiHeard.current.has(k));
    for (const k of fresh) yukiHeard.current.add(k);
    if (fresh.length) playSfx("yuki_aura");
  }, [yukiAtSig]);
  // เกรย์ชาร์จรองโกมิเนียต (p.gray.charge) — ทุกคนเห็นแนวลำแสง + หอกเหนือหัว (grayFx.js drawGrayGround / drawGrayAir)
  const graySig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.gray && p.gray.charge && Array.isArray(p.gray.charge.tiles))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p), dir: p.gray.charge.dir, left: p.gray.charge.left, tiles: p.gray.charge.tiles.map((t) => ({ x: t.x, y: t.y })) })));
  const grays = useMemo(() => { const list = JSON.parse(graySig); return list.length ? list : null; }, [graySig]);
  // กิลกาเมช (p.gil): พายุ/ช่องที่สายฟ้าเล็ง/อาวุธที่ปักค้าง/แนว Enuma Elish (ทุกคนเห็น) · ถือ EA (ดาบหมุนข้างตัว) — gilFx.js
  const gilSig = JSON.stringify(state.players.filter((p) => p.gil && (p.pos || (p.gil.weapons || []).length))
    .map((p) => ({ id: p.id, x: p.pos ? p.pos.x : -9, y: p.pos ? p.pos.y : -9, size: sizeOfP(p), alive: !!p.alive && !!p.pos, ea: !!p.gil.ea, storm: !!p.gil.storm,
      warns: p.gil.warns || [], weapons: p.gil.weapons || [], charge: p.gil.charge && Array.isArray(p.gil.charge.tiles) ? { dir: p.gil.charge.dir, tiles: p.gil.charge.tiles } : null })));
  const gils = useMemo(() => { const list = JSON.parse(gilSig); return list.length ? list : null; }, [gilSig]);
  // เฟิร์น: Zoltraak ครั้งที่ 6 พร้อม (p.fern.empowered) / เพิ่มระยะรออยู่ (p.fern.boost) — แสงที่ปลายคทา (fernFx.js drawFernAir)
  //  เห็นเฉพาะตอนมีตำแหน่งบนกระดาน · ระหว่างซ่อนเร้นไม่วาด
  const fernSig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.fern && !p.fern.conceal && (p.fern.empowered || p.fern.boost))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p), empowered: !!p.fern.empowered, boost: !!p.fern.boost })));
  const ferns = useMemo(() => { const list = JSON.parse(fernSig); return list.length ? list : null; }, [fernSig]);
  // ลูกเหล็กของไจโรบนพื้น (p.gyro.balls — ข้อมูลอยู่ที่ตัวผู้เล่น · ไจโรหลายคน = วงสีตามเจ้าของ) — gyroFx.js gyroBallItems
  const ballSig = JSON.stringify(state.players.filter((p) => p.gyro && Array.isArray(p.gyro.balls) && p.gyro.balls.length)
    .flatMap((p) => p.gyro.balls.filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.y)).map((b) => ({ owner: p.id, color: p.color, x: b.x, y: b.y, seq: b.seq | 0 }))));
  const gyroBalls = useMemo(() => { const list = JSON.parse(ballSig); return list.length ? list : null; }, [ballSig]);
  // ดิเอโก้: ชั้นพื้น board.diego (น้ำมัน/ไฟ/ขี้เถ้า — ทุกคนเห็น) + ตาข่าย (server ส่ง nets ให้เจ้าของเท่านั้น · สีตามเจ้าของ)
  const dBoard = state.board && state.board.diego ? state.board.diego : null;
  const diegoSig = JSON.stringify({
    oil: dBoard && Array.isArray(dBoard.oil) ? dBoard.oil : [], fire: dBoard && Array.isArray(dBoard.fire) ? dBoard.fire : [], ash: dBoard && Array.isArray(dBoard.ash) ? dBoard.ash : [],
    nets: state.players.filter((p) => p.diego && Array.isArray(p.diego.nets)).flatMap((p) => p.diego.nets.filter((n) => n && Number.isFinite(n.x) && Number.isFinite(n.y)).map((n) => ({ x: n.x, y: n.y, color: p.color }))),
  });
  // เอมิยะ คริซุงุ: กับดักระเบิด board.kiritsugu.mines (ทุกคนเห็น · ม่านควันเป็นช่องพิเศษ "smoke" ในแผนที่อยู่แล้ว)
  const kiriSig = JSON.stringify(state.board && state.board.kiritsugu && Array.isArray(state.board.kiritsugu.mines) ? state.board.kiritsugu.mines : []);
  const kiriGround = useMemo(() => { const mines = JSON.parse(kiriSig); return mines.length ? { mines } : null; }, [kiriSig]);
  const diegoGround = useMemo(() => { const d = JSON.parse(diegoSig); return d.oil.length || d.fire.length || d.ash.length || d.nets.length ? d : null; }, [diegoSig]);
  // เซลิน (celineFx.js): พุ่มดอกไม้ · ราชาดอกไม้ (p.celine.king > 0 — มงกุฎ/กลีบโคจร) · กำแพงค้างถึงจังหวะปะทะ · พรีวิวกำแพงตอนเลือกช่อง
  const kingSig = JSON.stringify(state.players.filter((p) => p.alive && p.pos && p.celine && p.celine.king > 0 && sameDim(p))
    .map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, size: sizeOfP(p) })));
  const wallPreview = useMemo(() => {
    if (!pickInfo || !pickInfo.wall) return null;
    if (dirPick && Array.isArray(dirPick.tiles)) return { tiles: dirPick.tiles, orient: dirPick.orient, ok: true };
    if (!hover || !pickInfo.validSet.has(key(hover.x, hover.y))) return null;
    return { tiles: wallPlan(hover, wallOrient).placed, orient: wallOrient, ok: true };
  }, [pickInfo, dirPick, hover, wallPlan, wallOrient]);
  // ผู้นำแห่งตระกูลเรียวกิ (ryougiFx.js): เนตรมณะ / รากฐานจิต / ซากุระหลังดับสิ้นซะ (p.ryougi — เทิร์นที่เหลือ) · กองเลือด (board.ryougi.blood)
  const rBlood = state.board && state.board.ryougi && Array.isArray(state.board.ryougi.blood) ? state.board.ryougi.blood : [];
  const ryougiSig = JSON.stringify({
    units: state.players.filter((p) => p.alive && p.pos && p.ryougi && sameDim(p))
      .map((p) => ({ id: p.id, eyes: p.ryougi.eyes > 0, mind: p.ryougi.mind > 0, bloom: p.ryougi.bloom > 0 })).filter((r) => r.eyes || r.mind || r.bloom),
    blood: rBlood.filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.y)).map((b) => ({ x: b.x, y: b.y, size: Math.max(1, b.size | 0), id: b.id })),
  });
  // คุเรไน โอโตยะ (otoyaFx.js): กลางคืนจันทร์แดง + สายโน้ตจากผู้สีไวโอลินถึงเป้า
  const otoyaSig = JSON.stringify({
    night: !!state.bloodMoon,
    links: state.players.filter((p) => p.alive && p.pos && p.otoya && p.otoya.heartTo && sameDim(p)).map((p) => ({ from: p.id, to: p.otoya.heartTo })),
  });
  const otoyaProp = useMemo(() => { const o = JSON.parse(otoyaSig); return o.night || o.links.length ? o : null; }, [otoyaSig]);
  const ryougiProp = useMemo(() => { const r = JSON.parse(ryougiSig); return r.units.length || r.blood.length ? r : null; }, [ryougiSig]);
  // เอมิยะ ชิโร่ (emiyaFx.js): โลก Unlimited Blade Works (ชิโร่คนไหนก็ได้ที่กางอยู่) · อาวุธที่ถือลอยข้างตัว
  const emiyaSig = JSON.stringify({
    ubw: state.players.some((p) => p.alive && p.emiya && p.emiya.ubw > 0),
    units: state.players.filter((p) => p.alive && p.pos && p.emiya && p.emiya.weapon && sameDim(p)).map((p) => ({ id: p.id, weapon: p.emiya.weapon })),
  });
  const emiyaProp = useMemo(() => { const r = JSON.parse(emiyaSig); return r.ubw || r.units.length ? r : null; }, [emiyaSig]);
  // ทราฟาก้า ลอว์ (lawFx.js): Room / วัตถุลอย / มาร์ก / หัวใจ (board.law — ทุกคนเห็น) · ท่าไม้ตายที่รอตี (players[].law.armed) · หนามหิน (board.spikes[].look "lawRock")
  const lBoard = state.board && state.board.law ? state.board.law : null;
  const lArr = (k) => (lBoard && Array.isArray(lBoard[k]) ? lBoard[k] : []);
  const lawSig = JSON.stringify({
    rooms: lArr("rooms"), objects: lArr("objects"), marks: lArr("marks"), hearts: lArr("hearts"),
    armed: state.players.filter((p) => p.alive && p.pos && p.law && p.law.armed && sameDim(p)).map((p) => ({ id: p.id, kind: typeof p.law.armed === "string" ? p.law.armed : p.law.armed.kind })),
    rocks: spikeList.filter((s) => s.look === "lawRock").map((s) => `${s.x},${s.y}`),
    present: state.players.some((p) => p.character && p.character.id === "trafalgar_law"), // มีลอว์ในเกม = อุ่นเครื่องการ์ดจอไว้ก่อน (lawFx prewarm)
  });
  const lawProp = useMemo(() => { const d = JSON.parse(lawSig); return d.present || d.rooms.length || d.objects.length || d.marks.length || d.hearts.length || d.armed.length || d.rocks.length ? d : null; }, [lawSig]);
  const celineProp = useMemo(() => {
    const kings = JSON.parse(kingSig);
    if (!celFlora.length && !kings.length && !wallHold.length && !wallPreview) return null;
    return { flora: celFlora, kings, hold: wallHold, preview: wallPreview };
  }, [celFlora, kingSig, wallHold, wallPreview]);

  return { songs, grays, gils, ferns, gyroBalls, kiriGround, diegoGround, otoyaProp, ryougiProp, emiyaProp, lawProp, celineProp };
}
