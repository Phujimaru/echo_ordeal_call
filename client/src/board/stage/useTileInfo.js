// ============================================================
//  useTileInfo — ส่วนของ BoardStage: ช่องที่ของสูงยื่นบัง (tallTiles — Eos / จุดพัก Road Trip) + ป้ายข้อมูลช่องที่ชี้ (tileInfo)
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx)
// ============================================================
import { eosTileInfo, eosTerrainInfo, EOS_NAME_DESC } from "../../eos/eosTileInfo";
import { rtMobTileInfo } from "../../roadtrip/RtMobInfo";
import { useMemo } from "react";
import { shopCovers, shopName } from "../shopProps";
import * as Rules from "../boardRules";
import { rtPropAt, rtPropInfo } from "../roadtrip/props";
import { rtDefOf } from "../roadtrip/theme";
import { samePos } from "./stageRules";

export default function useTileInfo(ctx) {
  const { board, celFlora, hover, map, rtWorld, shops, spikeList, state } = ctx;
  // สนาม Eos: ของที่ตัวสูงยื่นบังช่องหลัง → ชี้ที่ตัวของก็ขึ้นป้ายของชิ้นนั้น (ผู้ใช้ 2026-11-10 "บางมุมรถพัง ชี้แล้วไม่บอก")
  const rtStopArea = rtWorld && state.roadtrip && state.roadtrip.phase === "stop" && state.board ? state.board.area : null;
  const tallTiles = useMemo(() => {
    // Road Trip จุดพัก: กดที่ตัวตู้/อาคารที่สูงยื่นบังช่องหลัง = กดวัตถุนั้น (QA 2026-11-14 — กดตู้คีบตุ๊กตาแล้วเดินไปช่องหลังตู้แทน)
    if (rtStopArea != null) {
      const d = rtDefOf(rtStopArea), out = [];
      for (const p of (d && d.props) || []) if (p.spot && !p.walk) for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) out.push({ x, y, h: Math.min(3, p.h || 1) });
      const vb = d && d.vanBlock; // รถตู้จอด = กล่องรถ (กดได้)
      if (vb) for (let y = vb.y0; y <= vb.y1; y++) for (let x = vb.x0; x <= vb.x1; x++) out.push({ x, y, h: 2 });
      return out;
    }
    if (state.world !== "eos" || !map) return null;
    const out = [], seen = new Set();
    const add = (x, y, h) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); out.push({ x, y, h }); } };
    const fd = state.fodlan && state.fodlan.board;
    if (fd) {
      for (const p of fd.pillars || []) add(p.x, p.y, 3.2);
      for (const q of fd.quests || []) if (q.type === "scout") add(q.x, q.y, 2.2);
      for (const c of fd.cars || []) add(c.x, c.y, 1);
      for (const w of fd.wrecks || []) add(w.x, w.y, 1);
      for (const w of fd.walls || []) add(w.x, w.y, 1);
      for (const c of fd.chests || []) add(c.x, c.y, 0.9);
      for (const c of fd.barrels || []) add(c.x, c.y, 1);
      for (const c of fd.crystals || []) add(c.x, c.y, 1.3);
      for (const c of fd.tombs || []) add(c.x, c.y, 1.4);
      if (fd.convoy) add(fd.convoy.x, fd.convoy.y, 1.2);
    }
    const TALL = { fd_eos_turret: 1.6, fd_eos_switch: 1.4, fd_eos_domecore: 1.6, fd_eos_lever: 1.2, fd_eos_camp: 1, fd_eos_station: 1.6, fd_eos_tomb: 1.4 };
    for (const src of [map.special, map.terrain]) for (const [k, kind] of Object.entries(src || {})) {
      if (!TALL[kind]) continue;
      const [x, y] = k.split(",").map(Number);
      add(x, y, TALL[kind]);
    }
    return out;
  }, [state.world, state.fodlan, map, rtStopArea]);

  // ---------- ป้ายข้อมูลช่อง ----------
  const tileInfo = useMemo(() => {
    if (!hover || !map) return null;
    if (rtStopArea != null) { const ri = rtPropInfo(rtPropAt(rtStopArea, hover.x, hover.y), state.roadtrip); if (ri) return ri; } // Road Trip จุดพัก: ชี้วัตถุ = ชื่อ/ราคา/ผล
    if (rtStopArea != null) { // รถตู้จอด = กล่องรถ (จำนวนของ/ความจุ)
      const vb = (rtDefOf(rtStopArea) || {}).vanBlock, st = state.roadtrip.van && state.roadtrip.van.stash;
      if (vb && st && hover.x >= vb.x0 && hover.x <= vb.x1 && hover.y >= vb.y0 && hover.y <= vb.y1) return { icon: "📦", name: "กล่องรถ", desc: `${(st.items || []).length}/${st.cap}` };
    }
    if (rtWorld) { const mi = rtMobTileInfo(state.players, hover.x, hover.y); if (mi) return mi; } // Road Trip: ชี้มอน = ตัวเลข + ความสามารถ (แบบมอนสนาม Eos)
    const shopHit = shops.find((sh) => shopCovers(sh, hover.x, hover.y));
    if (shopHit) return { icon: "🏪", name: shopHit.name || shopName(shopHit.kind), desc: shopHit.turnsLeft > 0 ? `เหลือ ${shopHit.turnsLeft} เทิร์น` : "" };
    // Ice Spike: หนามน้ำแข็ง · ธารน้ำแข็ง (น้ำแข็งที่สร้างระหว่างเกม)
    const sp = spikeList.find((t) => samePos(t, hover));
    if (sp && sp.wall) return { icon: "🧊", name: "กำแพงน้ำแข็ง", desc: "" };
    if (sp) return { icon: "❄️", name: `หนามน้ำแข็ง Lv.${sp.lv}`, desc: `เกราะ ${sp.armor ?? 0}/${sp.maxArmor ?? 0} · เหลือ ${sp.left ?? 0} เทิร์น` };
    // เซลิน: พุ่มดอกไม้
    const fl = celFlora.find((t) => samePos(t, hover));
    if (fl) return { icon: "🌸", name: "พุ่มดอกไม้", desc: `เหลือ ${fl.left ?? 0} เทิร์น` };
    const ic = board && Array.isArray(board.ice) ? board.ice.find((t) => samePos(t, hover)) : null;
    if (ic) return { icon: "🧊", name: "ธารน้ำแข็ง", desc: `เหลือ ${ic.left ?? 0} เทิร์น` };
    // สนาม Eos: ของบนแผนที่ทุกชนิดมีคำอธิบายตอนชี้ (ผู้ใช้สั่ง 2026-11-10)
    if (state.world === "eos") {
      const ei = eosTileInfo(state.fodlan && state.fodlan.board, state.players, hover.x, hover.y, state.roundNumber);
      if (ei) return ei;
      const ri = Rules.tileInfo(map, hover.x, hover.y);
      if (!ri) {
        const fdb = state.fodlan && state.fodlan.board;
        if (fdb && fdb.cityWalls && (fdb.cityWalls.broken || []).some((w) => w.x === hover.x && w.y === hover.y)) return { icon: "🧱", name: "ซากกำแพง", desc: EOS_NAME_DESC["ซากกำแพง"] };
        return eosTerrainInfo(map, hover.x, hover.y, fdb, state.roundNumber);
      }
      return !ri.desc && EOS_NAME_DESC[ri.name] ? { ...ri, desc: EOS_NAME_DESC[ri.name] } : ri;
    }
    return Rules.tileInfo(map, hover.x, hover.y); // ช่องพิเศษ / จุดฟื้นฟู (ชื่อตามภูมิภาค) · พื้นธรรมดา = null
  }, [hover, map, shops, spikeList, board, celFlora, state.world, state.fodlan, state.players, state.roundNumber, rtStopArea, state.roadtrip, rtWorld]);
  return { tallTiles, tileInfo };
}
