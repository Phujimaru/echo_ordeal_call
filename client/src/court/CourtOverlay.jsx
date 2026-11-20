// ฉากศาลเต็มจอในเกม (นารุโฮโดะ "เริ่มการไต่สวน" — naruhodo-contract.md) · board/HUD agent mount: <CourtOverlay state={state} me={youId} emit={(ev, p) => socket.emit(ev, p)} />
//  วาดเมื่อ state.court ไม่ใช่ null · เล่น beat.steps ตาม seq · แผงกดตามบทบาทของผู้ชม · เพลงศาลเกมเล่นเอง (skillMusic) — ที่นี่ไม่เล่นเพลง
import { useEffect, useMemo, useRef, useState } from "react";
import { CourtStage, useCourtDirector } from "./CourtStage";
import { Ring, RoleChip, CrossControls, RecordButton, Builder, ObjectButton, GalleryPanel, VerdictBar, HelpButton } from "./CourtPanels";
import CourtVolume from "./CourtVolume";
import { CredBar, WaitLayer } from "./CourtHud";
import CharInfo from "./CourtCharInfo";
import "./court.css";

export function roleOf(court, me) {
  if (!court || me == null) return "spec";
  if (me === court.lawyerId) return "L";
  if ((court.coIds || []).includes(me)) return "co";
  if (me === court.defendantId) return "D";
  if ((court.counselIds || []).includes(me)) return "C";
  if ((court.galleryIds || []).includes(me)) return "G";
  return "spec";
}

export function buildCast(players, court) {
  const byId = {};
  for (const p of players || []) byId[p.id] = { id: p.id, name: p.character?.name || p.name || "?", img: p.character?.img || p.img || null, player: p.name || "", ch: p.character || null };
  const get = (id) => byId[id] || (id != null ? { id, name: "?", img: null } : null);
  // จำเลย 2 ตัว (เคท & เอมิลิโกะ) — server ส่ง defendantUnits (ตัวที่โดนเป้าก่อน) · ไม่มี = defendantId ตัวเดียว
  const units = (court.defendantUnits || []).filter(Boolean).map((u) => ({ id: u.id, name: u.name || get(u.id)?.name || "?", img: u.img || get(u.id)?.img || null, player: get(u.id)?.player || get(court.defendantId)?.player || "", ch: get(u.id)?.ch || get(court.defendantId)?.ch || null }));
  const D0 = get(court.defendantId);
  const D = units.length > 1 ? { ...D0, name: units.map((u) => u.name).join(" & "), img: units[0].img || D0?.img } : D0;
  return {
    byId, L: get(court.lawyerId), D, Dunits: units.length > 1 ? units : null,
    co: (court.coIds || []).map(get), C: (court.counselIds || []).map(get), G: (court.galleryIds || []).map(get), outIds: court.outIds || [],
  };
}

// ขนาดฉาก 16:9 พอดีจอ (--u = ความสูง/192)
function useFit(ref) {
  const [box, setBox] = useState({ w: 1280, h: 720 });
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const fit = () => { const W = el.clientWidth, H = el.clientHeight; const w = Math.min(W, (H * 16) / 9); setBox({ w, h: (w * 9) / 16 }); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [ref]);
  return box;
}

export default function CourtOverlay({ state, me, emit, embedded = false }) {
  const court = state?.court;
  if (!court) return null;
  return <CourtRoom key={court.id} court={court} players={state.players} me={me} emit={emit} embedded={embedded} />;
}

function CourtRoom({ court, players, me, emit, embedded }) {
  const role = roleOf(court, me);
  const side = role === "D" || role === "C" ? "D" : role === "L" || role === "co" ? "L" : null;
  const castKey = [court.lawyerId, court.defendantId, ...(court.defendantUnits || []).map((u) => u?.id), ...(court.coIds || []), ...(court.counselIds || []), ...(court.galleryIds || []), ...(court.outIds || [])].join("|");
  const cast = useMemo(() => buildCast(players, court), [castKey, players?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const { v, busy, onClick, endOne, onClipEnd, cred } = useCourtDirector(court, cast, side);
  const [infoId, setInfoId] = useState(null);
  const infoWho = infoId == null ? null : cast.byId[infoId] || (cast.Dunits || []).find((u) => u.id === infoId) || null;
  const wrap = useRef(null);
  const { w, h } = useFit(wrap);
  const send = (ev, p) => emit && emit(ev, p);
  const ph = court.phase;
  const out = (court.outIds || []).includes(me);
  const live = !busy || ph !== "beat";

  // หลักฐานที่ผูกกับจำเลย (รวมจำเลย 2 ตัว) — แฟ้มเรียงขึ้นก่อน
  const rel = { ids: new Set([court.defendantId, ...(court.defendantUnits || []).map((u) => u?.id)].filter((x) => x != null)), face: cast.Dunits ? cast.Dunits[0].img : cast.D?.img };
  let panel = null;
  if (ph === "testimony" && side === "D") panel = <Builder key={"b" + court.round} court={court} emit={send} />;
  else if (ph === "cross" && side === "L" && !busy) panel = <CrossControls court={court} emit={send} role={role} me={me} meImg={cast.byId[me]?.img} sightings={court.sightings || []} rel={rel} />;
  else if (ph === "objectWindow" && role === "C" && (court.counselLeft ?? 1) > 0) panel = <ObjectButton key={"o" + (court.beat?.seq || 0)} emit={send} />;
  else if (ph === "gallery" && role === "G" && !out) panel = <GalleryPanel court={court} emit={send} me={me} cast={cast} />;
  else if (ph === "verdict") panel = <VerdictBar court={court} cast={cast} />;
  else if (side === "L" && (court.evidence || []).length && live && ph !== "beat" && ph !== "verdict") panel = <RecordButton court={court} rel={rel} />;

  const showRing = court.deadline && ["testimony", "cross", "objectWindow", "gallery"].includes(ph);
  const list = court.list || [];
  return (
    <div className={`court-ov ${embedded ? "embedded" : ""}`} ref={wrap}>
      <div className="court" style={{ width: w, height: h, "--u": `${h / 192}px` }}>
        <CourtStage v={v} cast={cast} cred={cred} onClick={onClick} endOne={endOne} onClipEnd={onClipEnd} onInfo={setInfoId}>
          <div className="chud">
            <RoleChip role={role} me={cast.byId[me]} out={out} />
            {v.cam !== "title" && !v.verdict && !v.clip && <CredBar cred={cred} cast={cast} round={court.round} rounds={court.rounds} onInfo={setInfoId} />}
            {(ph === "cross" || (ph === "beat" && list.length > 0 && v.cam === "witness")) && list.length > 0 && (
              <div className="cdots">
                {list.map((x, i) => <i key={i} className={`${i === court.cx ? "cur" : ""} ${x.done ? "done" : ""} ${x.pressed ? "pressed" : ""}`} />)}
              </div>
            )}
            {showRing && <Ring deadline={court.deadline} k={ph + court.round} />}
          </div>
          {!v.clip && (!busy || ph !== "beat") && <WaitLayer phase={ph} role={out ? "spec" : role} crowd={(cast.G || []).length > 0} />}
          {panel}
          {infoWho && <CharInfo who={infoWho} onClose={() => setInfoId(null)} />}
          <div className="cui pass chelpwrap"><CourtVolume /><HelpButton role={out ? "spec" : role} /></div>
        </CourtStage>
      </div>
    </div>
  );
}
