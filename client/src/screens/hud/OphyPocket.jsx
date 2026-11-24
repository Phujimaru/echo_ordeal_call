// ============================================================
//  กระเป๋าวิเศษของ Ophy (characters/ophy.js · GRID_PLAN §7.43) — เปิดจากช่องสกิลพื้นฐาน "ปรุงยา"
//   ภาพกระเป๋า/คู่มือ = ไฟล์เพื่อนผู้ใช้ (pocket.webp · guide1–3.webp ตัดจาก MP*.png) · ปุ่ม/ช่องวางทับตามพิกัดภาพ 712×652
//   แถวบน เรียกใช้ (1–6 = ลำดับยิง) · แถวกลาง กักตุน · แถวล่าง วัตถุดิบ
//   ลากของ: ช่อง → ช่อง = สลับ/รวมกอง (ยาอยู่แถวบน-กลาง · วัตถุดิบอยู่แถวล่าง) แล้ว ✓ ยืนยัน (คูลดาวน์ 1 เทิร์น)
//           ช่อง → หม้อ 3 ช่อง = ใส่ของ · ครบ 3 แล้ว ✓ = ปรุง · กดช่องหม้อ = เอาออก
//   กดของในกระเป๋า = ดื่ม / ให้ (เพื่อนที่ยืนติดกัน) · ? = คู่มือ 3 หน้า · 📖 = หน้าสูตรทันที
//   ✒️ = จดของในหม้อลงกระดาษ (หม้อว่าง = ลบ) · 📜 กระดาษ = ใส่ของตามสูตรที่จดจากกระเป๋าให้เอง (ของขาด = ไอคอนจาง)
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ + ตัวเลข + ไอคอน)
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { clickSound, playSfx } from "../../audio";
import { MATS, POTIONS, POT_STACK, MAT_STACK, ROW, OPHY_DIR, potImg, recipeOf } from "../../data/ophy";
import "./ophyPocket.css";

const W = 712, H = 652;
const COLS = [[29, 134], [137, 242], [246, 350], [353, 457], [460, 564], [567, 669]];
const ROWS = { c: [302, 406], s: [416, 516], m: [526, 626] };
const BOX = {
  close: [31, 28, 96, 93], help: [116, 28, 173, 93], ok: [591, 26, 671, 93], paper: [39, 100, 141, 258],
  pot0: [221, 195, 288, 261], pot1: [311, 224, 377, 290], pot2: [400, 195, 467, 261], out: [311, 61, 377, 127],
  book: [1, 588, 68, 643], pen: [621, 588, 703, 643],
};
// คู่มือ (guide1–3): ปิด / หน้าก่อน / หน้าถัดไป
const GUIDE_BOX = { close: [44, 42, 116, 112], prev: [46, 520, 130, 590], next: [584, 524, 668, 590] };
const rowKey = (r) => (r === "c" ? "call" : r === "s" ? "store" : "mats");
const parse = (ref) => ({ r: ref[0], i: Number(ref[1]) });
const boxStyle = ([x0, y0, x1, y1]) => ({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
const clone = (o) => ({ call: o.call.map((x) => (x ? { ...x } : null)), store: o.store.map((x) => (x ? { ...x } : null)), mats: o.mats.map((x) => (x ? { ...x } : null)) });
const sigOf = (o) => JSON.stringify([o.call, o.store, o.mats]);
const tokenOf = (ref, lay) => { const { r, i } = parse(ref); const x = lay[rowKey(r)][i]; return x ? (r === "m" ? x.k : `p:${x.k}`) : null; };
const encodeRow = (row) => row.map((x) => (x ? `${x.k}.${x.n}` : "")).join("|");
// เสียงใส่ของลงหม้อ (สุ่ม 1 ใน 3 — ไฟล์เพื่อนผู้ใช้ BW_PUT_01–03)
const putSfx = () => playSfx(`ophy_put${1 + Math.floor(Math.random() * 3)}`);
const itemName = (r, x) => (x ? (r === "m" ? MATS[x.k] : POTIONS[x.k] || {}).name || "" : "");

function Item({ r, x, small = false }) {
  if (!x) return null;
  if (r === "m") {
    const m = MATS[x.k] || {};
    return <span className={`op-mat${small ? " sm" : ""}`} style={{ "--rgb": m.rgb }}><span className="op-mat-ic">{m.icon}</span></span>;
  }
  return <img className={`op-pot${small ? " sm" : ""}`} src={potImg(x.k)} alt="" draggable={false} />;
}

export default function OphyPocket({ ophy, me, players, teamMode, canAct, onClose, onBrew, onSort, onDrink, onGive, onNote }) {
  const server = useMemo(() => ({ call: ophy.call || Array(ROW).fill(null), store: ophy.store || Array(ROW).fill(null), mats: ophy.mats || Array(ROW).fill(null) }), [ophy.call, ophy.store, ophy.mats]);
  const serverSig = sigOf(server);
  const [lay, setLay] = useState(() => clone(server));
  const [pot, setPot] = useState([null, null, null]);
  const [sel, setSel] = useState(null); // ref ที่กดเลือก (ดื่ม/ให้)
  const [page, setPage] = useState(0); // คู่มือ 1–3 · 0 = ปิด
  const [drag, setDrag] = useState(null); // { ref, x, y }
  const [hover, setHover] = useState(null); // { name, x, y }
  const [doneSeq, setDoneSeq] = useState(null); // ผลปรุงที่เล่นจบแล้ว
  const [scale, setScale] = useState(1);
  const pending = sigOf(lay) !== serverSig;
  const sortLocked = (ophy.sortCd || 0) > 0;
  const rootRef = useRef(null);

  // ข้อมูลจาก server เปลี่ยน (ปรุง/ดื่ม/เก็บของ) = รีเซ็ตกระเป๋าบนจอให้ตรง
  const lastSig = useRef(serverSig);
  useEffect(() => {
    if (lastSig.current === serverSig) return;
    lastSig.current = serverSig;
    setLay(clone(server)); setPot([null, null, null]); setSel(null);
  }, [serverSig, server]);
  // เปิดกระเป๋า = เสียงกระเป๋า
  useEffect(() => { playSfx("ophy_open"); }, []);
  // ย่อ/ขยายตามจอ
  useEffect(() => {
    const fit = () => setScale(Math.max(0.6, Math.min(1.3, (window.innerWidth * 0.92) / W, (window.innerHeight * 0.86) / H)));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  // ผลปรุงจาก server (ophy.fx — kind brew/fail) → แอนิเมชันที่หม้อ
  //  เหตุการณ์ที่มีอยู่แล้วตอนเปิดกระเป๋าไม่เล่นซ้ำ (openSeq)
  const fxSeq = ophy.fx && ophy.fx.seq;
  const [openSeq] = useState(fxSeq);
  const burst = ophy.fx && (ophy.fx.kind === "brew" || ophy.fx.kind === "fail") && fxSeq !== openSeq && fxSeq !== doneSeq ? ophy.fx : null;
  useEffect(() => {
    if (!burst) return undefined;
    const t = setTimeout(() => setDoneSeq(burst.seq), burst.kind === "brew" ? 1500 : 1100);
    return () => clearTimeout(t);
  }, [burst]);
  // Esc = ปิดคู่มือ/กระเป๋า
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); if (page) setPage(0); else onClose(); } };
    window.addEventListener("keydown", onKey, true); return () => window.removeEventListener("keydown", onKey, true);
  }, [page, onClose]);

  const slotAt = (ref) => { const { r, i } = parse(ref); return lay[rowKey(r)][i]; };
  // ใช้ไปในหม้อแล้วกี่ชิ้นจากช่องนี้
  const inPot = (ref) => pot.filter((p) => p === ref).length;
  const potTokens = pot.map((r) => (r ? tokenOf(r, lay) : null));
  const potFull = pot.every(Boolean);
  const recipe = potFull ? recipeOf(potTokens) : null;

  // ---------- ลากวาง ----------
  const toLocal = (e) => {
    const b = rootRef.current.getBoundingClientRect();
    return { x: (e.clientX - b.left) / scale, y: (e.clientY - b.top) / scale };
  };
  const targetAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const hit = el && el.closest("[data-drop]");
    return hit ? hit.getAttribute("data-drop") : null;
  };
  const startDrag = (e, ref) => {
    if (!canAct || e.button !== 0) return;
    const x = slotAt(ref);
    if (!x || inPot(ref) >= x.n) return;
    e.preventDefault();
    const start = toLocal(e);
    let moved = false;
    const move = (ev) => {
      const p = toLocal(ev);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 6) return;
      moved = true; setHover(null);
      setDrag({ ref, x: p.x, y: p.y, over: targetAt(ev) });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setDrag(null);
      if (!moved) { clickSound(); setHover(null); setSel((s) => (s === ref ? null : ref)); return; }
      drop(ref, targetAt(ev));
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  function drop(from, to) {
    if (!to || to === from) return;
    if (to.startsWith("pot")) {
      if (pending) return; // จัดกระเป๋าค้างอยู่ — ยืนยันก่อนค่อยปรุง
      const i = Number(to.slice(3));
      const x = slotAt(from);
      const next = pot.slice(); next[i] = from;
      if (!x || next.filter((p) => p === from).length > x.n) return;
      setPot(next); setSel(null);
      putSfx();
      return;
    }
    if (pot.some(Boolean) || sortLocked) return; // มีของในหม้อ / คูลดาวน์ = จัดกระเป๋าไม่ได้
    const a = parse(from), b = parse(to);
    const fromMat = a.r === "m", toMat = b.r === "m";
    if (fromMat !== toMat) return;
    const next = clone(lay);
    const A = next[rowKey(a.r)], B = next[rowKey(b.r)];
    const xa = A[a.i], xb = B[b.i], cap = fromMat ? MAT_STACK : POT_STACK;
    if (xb && xb.k === xa.k && xb.n < cap) { const d = Math.min(xa.n, cap - xb.n); xb.n += d; xa.n -= d; if (xa.n <= 0) A[a.i] = null; }
    else { A[a.i] = xb; B[b.i] = xa; }
    setLay(next); setSel(null);
    playSfx("ophy_sort");
  }

  // ---------- ปุ่ม ----------
  const confirm = () => {
    if (!canAct) return;
    if (potFull) { onBrew(pot); setPot([null, null, null]); return; }
    if (pending && !sortLocked) {
      onSort(`c:${encodeRow(lay.call)}/s:${encodeRow(lay.store)}/m:${encodeRow(lay.mats)}`);
      playSfx("ophy_sort");
    }
  };
  const close = () => { clickSound(); onClose(); };
  const pen = () => {
    if (!canAct) return;
    clickSound();
    onNote(potFull ? potTokens.join(",") : "");
  };
  // กระดาษ: หยิบของตามสูตรที่จดจากกระเป๋า (ช่องแรกที่มีพอ)
  const note = Array.isArray(ophy.note) ? ophy.note : null;
  const noteFill = useMemo(() => {
    if (!note) return null;
    const used = {};
    return note.map((t) => {
      const mat = !t.startsWith("p:"), k = mat ? t : t.slice(2);
      for (const r of mat ? ["m"] : ["c", "s"]) {
        const row = lay[rowKey(r)];
        for (let i = 0; i < ROW; i++) {
          const ref = `${r}${i}`, x = row[i];
          if (x && x.k === k && (used[ref] || 0) < x.n) { used[ref] = (used[ref] || 0) + 1; return ref; }
        }
      }
      return null;
    });
  }, [note, lay]);
  const paper = () => {
    if (!canAct || !noteFill || pending) return;
    if (noteFill.some((r) => !r)) { clickSound(); return; }
    setPot(noteFill.slice()); setSel(null);
    putSfx();
  };
  const potClick = (i) => { if (!pot[i]) return; clickSound(); const n = pot.slice(); n[i] = null; setPot(n); };

  // ดื่ม / ให้
  const selItem = sel ? slotAt(sel) : null;
  const mates = useMemo(() => (teamMode && me && me.pos ? (players || []).filter((p) => p.id !== me.id && p.alive && p.pos && !p.summon && p.teamId && p.teamId === me.teamId
    && Math.abs(p.pos.x - me.pos.x) + Math.abs(p.pos.y - me.pos.y) === 1) : []), [players, me, teamMode]);

  const nextIdx = useMemo(() => {
    for (let j = 0; j < ROW; j++) { const i = ((ophy.cursor || 0) + j) % ROW; if (lay.call[i]) return i; }
    return -1;
  }, [ophy.cursor, lay.call]);

  const renderSlot = (r, i) => {
    const ref = `${r}${i}`, x = lay[rowKey(r)][i], [x0, x1] = COLS[i], [y0, y1] = ROWS[r];
    const used = inPot(ref), left = x ? x.n - used : 0;
    const isDrag = drag && drag.ref === ref;
    const over = drag && drag.over === ref && drag.ref !== ref;
    return (
      <div key={ref} className="op-slot" data-drop={ref} data-row={r} data-on={sel === ref ? "true" : "false"} data-over={over ? "true" : "false"}
        data-next={r === "c" && i === nextIdx && !pending ? "true" : "false"}
        style={boxStyle([x0, y0, x1, y1])}
        onPointerDown={(e) => x && startDrag(e, ref)}
        onPointerEnter={(e) => x && !drag && setHover({ name: itemName(r, x), x: x0 + (x1 - x0) / 2, y: y0 })}
        onPointerLeave={() => setHover(null)}>
        {x && <span className="op-item" data-ghost={isDrag || left <= 0 ? "true" : "false"}><Item r={r} x={x} /></span>}
        {x && <b className="op-n" data-low={left <= 0 ? "true" : "false"}>{left}</b>}
      </div>
    );
  };

  return (
    <div className="op-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="op-stage" ref={rootRef} style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <img className="op-bg" src={`${OPHY_DIR}/pocket.webp`} alt="" draggable={false} />

        {/* หม้อ: 3 ช่องใส่ + ช่องผลลัพธ์ */}
        <div className="op-cauldron" data-brewing={burst ? burst.kind : "none"} data-ready={recipe ? "ok" : potFull ? "bad" : "none"}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="op-potslot" data-drop={`pot${i}`} data-over={drag && drag.over === `pot${i}` ? "true" : "false"} style={boxStyle(BOX[`pot${i}`])} onClick={() => potClick(i)}>
              {pot[i] && <span className="op-item in"><Item r={pot[i][0]} x={slotAt(pot[i])} /></span>}
            </div>
          ))}
          <div className="op-out" style={boxStyle(BOX.out)}>
            {burst && burst.kind === "brew" && <img key={burst.seq} className="op-pot pop" src={potImg(burst.potion)} alt="" draggable={false} />}
            {burst && burst.kind === "fail" && <span key={burst.seq} className="op-smoke" />}
          </div>
          <span className="op-bubbles" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</span>
          <span className="op-streak" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} data-on={i < (ophy.streak || 0) ? "true" : "false"} />)}</span>
        </div>

        {/* กระดาษจดสูตร */}
        <button type="button" className="op-hit op-paper" style={boxStyle(BOX.paper)} data-note={note ? "true" : "false"} onClick={paper} aria-label="สูตร">
          {note && (
            <span className="op-note">
              {note.map((t, i) => {
                const mat = !t.startsWith("p:");
                const x = { k: mat ? t : t.slice(2), n: 1 };
                return <span key={i} className="op-note-i" data-miss={noteFill && !noteFill[i] ? "true" : "false"}><Item r={mat ? "m" : "s"} x={x} small /></span>;
              })}
            </span>
          )}
        </button>

        {/* ช่องกระเป๋า 18 ช่อง */}
        {["c", "s", "m"].map((r) => COLS.map((_, i) => renderSlot(r, i)))}

        <span className="op-cap" data-full={(ophy.total || 0) >= (ophy.cap || 50) ? "true" : "false"}>{ophy.total || 0}/{ophy.cap || 50}</span>

        {/* ปุ่มบนภาพ */}
        <button type="button" className="op-hit" style={boxStyle(BOX.close)} onClick={close} aria-label="ปิด" />
        <button type="button" className="op-hit" style={boxStyle(BOX.help)} onClick={() => { clickSound(); setPage(1); }} aria-label="คู่มือ" />
        <button type="button" className="op-hit op-ok" style={boxStyle(BOX.ok)} onClick={confirm}
          data-live={canAct && (potFull || (pending && !sortLocked)) ? "true" : "false"} aria-label="ยืนยัน">
          {sortLocked && !potFull && <b className="op-cd">⏳{ophy.sortCd}</b>}
        </button>
        <button type="button" className="op-hit op-book" style={boxStyle(BOX.book)} onClick={() => { clickSound(); setPage(3); }} aria-label="สูตร" />
        <button type="button" className="op-hit op-pen" style={boxStyle(BOX.pen)} onClick={pen} aria-label="จด" />

        {/* ดื่ม / ให้ */}
        {sel && selItem && sel[0] !== "m" && canAct && (() => {
          const { r, i } = parse(sel), [x0, x1] = COLS[i], [y0] = ROWS[r];
          return (
            <div className="op-pop" style={{ left: (x0 + x1) / 2, top: y0 - 6 }}>
              <span className="op-pop-name">{POTIONS[selItem.k]?.name}</span>
              <div className="op-pop-row">
                <button type="button" className="op-pop-btn" onClick={() => { clickSound(); onDrink(sel, selItem.k); setSel(null); }}><img src={potImg(selItem.k)} alt="" />ดื่ม</button>
                {mates.map((m) => (
                  <button key={m.id} type="button" className="op-pop-btn give" onClick={() => { clickSound(); onGive(sel, m.id); setSel(null); }}>
                    <img src={m.character?.img || m.img} alt="" className="face" />ให้
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {hover && !drag && !sel && <span className="op-tip" style={{ left: hover.x, top: hover.y }}>{hover.name}</span>}
        {drag && (() => { const x = slotAt(drag.ref); return <span className="op-drag" style={{ left: drag.x, top: drag.y }}><Item r={drag.ref[0]} x={x} /></span>; })()}

        {/* คู่มือ 3 หน้า (ภาพของเพื่อนผู้ใช้) */}
        {page > 0 && (
          <div className="op-guide">
            <img key={page} className="op-bg" src={`${OPHY_DIR}/guide${page}.webp`} alt="" draggable={false} />
            <button type="button" className="op-hit" style={boxStyle(GUIDE_BOX.close)} onClick={() => { clickSound(); setPage(0); }} aria-label="ปิด" />
            {page > 1 && <button type="button" className="op-hit" style={boxStyle(GUIDE_BOX.prev)} onClick={() => { playSfx("ophy_sort"); setPage(page - 1); }} aria-label="ก่อน" />}
            {page < 3 && <button type="button" className="op-hit" style={boxStyle(GUIDE_BOX.next)} onClick={() => { playSfx("ophy_sort"); setPage(page + 1); }} aria-label="ถัดไป" />}
          </div>
        )}
      </div>
    </div>
  );
}
