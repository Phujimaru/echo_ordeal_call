// หน้าร้านค้าแบบเต็มจอ (ต้นแบบที่ผู้ใช้อนุมัติ .claude/plans/shop-three.html) — ธีมขาว ORDEAL CALL
//  เวที 1920 × 1080 ย่อพอดีจอ · หน้าตาแยกตาม shop.kind:
//   apoth = ร้านยาเจริญชัย (ตู้ชั้นวาง + โหลแก้ว + เคาน์เตอร์) · forge = โรงช่างลุงเริง (ผนังรูพรุน + ป้ายแขวน + โต๊ะทั่ง)
//   cara = พ่อค้าเร่ (ผ้าใบ + พรม + การ์ดพลิก) · capsule = แคปซูลเสบียง (Colony — หน้าตาแบบ apoth แบ่งชั้น ช่วงจั่ว/ตาเดิน/ถาวร)
//   kind อื่น = หน้าตาแบบ apoth
//  คีย์: ←→↑↓/WASD เลือก · Enter ซื้อ · Esc ปิด · ดับเบิลคลิกของ = ซื้อ
import { useEffect, useRef, useState } from "react";
import { shopInfoOf, DRAW_ITEM_TYPES, BATTERY_MAX } from "../../../data/shop";
import { socket } from "../../../socket";
import { clickSound, playSfx } from "../../../audio";
import "./shopScreen.css";

const LOOKS = {
  apoth: { look: "apoth", theme: "apoth", crest: "⚗️", name: "ร้านยาเจริญชัย", latin: "Charoenchai Pharmacy" },
  forge: { look: "forge", theme: "forge", crest: "⚙️", name: "โรงช่างลุงเริง", latin: "Uncle Roeng's Workshop" },
  cara: { look: "cara", theme: "cara", crest: "🐎", name: "พ่อค้าเร่", latin: "Wandering Merchant" },
  capsule: { look: "apoth", theme: "capsule", crest: "📦", name: "แคปซูลเสบียง", latin: "Supply Capsule" },
};
const KEEP_TYPES = ["lifeCrystal", "armorCrystal", "battery"]; // ของถาวร/ชาร์จเก็บ (ชั้นที่ 3 ของแคปซูล)
const SHELF_LABEL = { draw: "ช่วงจั่ว", turn: "ตาเดิน", keep: "ถาวร" };
const SHELF_ORDER = ["draw", "turn", "keep"];
const HANG_POS = [[110, 110], [520, 230]]; // ตำแหน่งป้ายแขวน 2 ชิ้นตามต้นแบบ (ผนังรูพรุน 980 × 720)
const BUY = "ซื้อ";

function useStageK() {
  const calc = () => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const [k, setK] = useState(calc);
  useEffect(() => {
    const on = () => setK(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return k;
}

function Ico({ info, className = "" }) {
  if (info.img) return <img className={`${className} shs-img`} src={info.img} alt="" draggable={false} />;
  return <span className={className}>{info.icon}</span>;
}
const Coin = ({ s }) => <span className={s ? "shs-coin s" : "shs-coin"} />;

const isOut = (it) => !!it.closed || !!it.sold || (it.stock != null && it.stock <= 0);
const stockOf = (it) => ({ n: it.stock ?? 1, max: it.stockMax ?? 1 });

// หน้าปัดของโรงช่าง — ตัวเลข + ชื่อ + เปอร์เซ็นต์วง
function dialsOf(it) {
  if (it.type === "windBoots") return [["+2", "ระยะเดิน", 40], ["1", "ตา", 20]];
  if (it.type === "battery") return [[String(BATTERY_MAX), "ความจุ", 100], ["+1", "ต่อเทิร์น", 20]];
  return [];
}

function BagBar({ items, bagSlots, hitN, left }) {
  const slots = Math.max(bagSlots, items.length);
  return (
    <div className={`shs-bagbar${left ? " left" : ""}`} data-full={items.length >= bagSlots ? "true" : "false"}>
      <span key={hitN} className={`shs-bag-ico${hitN ? " hit" : ""}`}>👜</span>
      <div className="shs-slots">
        {Array.from({ length: slots }, (_, i) => {
          const it = items[i];
          if (!it) return <span key={`e${i}`} className="shs-slot empty" />;
          const info = shopInfoOf(it);
          return <span key={it.uid ?? `i${i}`} className="shs-slot" title={info.label(it)}><Ico info={info} className="shs-slot-it" /></span>;
        })}
      </div>
      <b>{items.length}/{bagSlots}</b>
    </div>
  );
}

export default function ShopScreen({ shop, me, block = null, bagSlots = 5, onClose }) {
  const k = useStageK();
  const meta = LOOKS[shop?.kind] || LOOKS.apoth;
  const capsule = meta.theme === "capsule";
  const items = shop?.items || [];
  const gold = me?.gold ?? 0;
  const inv = me?.inventory || [];
  const bagItems = inv.filter((it) => it.type !== "kebread"); // ขนมปังเอมิลิโกะไม่กินช่อง

  // ชั้นวาง (apoth/capsule) — ลำดับรายการเลือกด้วยคีย์ = ลำดับที่เห็นบนจอ
  const groupOf = (type) => (DRAW_ITEM_TYPES.includes(type) ? "draw" : capsule && KEEP_TYPES.includes(type) ? "keep" : "turn");
  const shelves = meta.look === "apoth"
    ? SHELF_ORDER.map((g) => ({ g, list: items.filter((it) => groupOf(it.type) === g) })).filter((s) => s.list.length)
    : [];
  const list = meta.look === "apoth" ? shelves.flatMap((s) => s.list) : items;

  const [selId, setSelId] = useState(null);
  const sel = list.find((it) => it.id === selId) || list[0] || null;
  const selInfo = sel ? shopInfoOf(sel) : null;

  const [flies, setFlies] = useState([]);
  const [hitN, setHitN] = useState(0);
  const [goldN, setGoldN] = useState(0);

  // พ่อค้าเร่: การ์ดพลิกเข้าทีละใบตอนเปิดร้าน
  const [flipN, setFlipN] = useState(0);
  const cardCount = list.length;
  useEffect(() => {
    if (meta.look !== "cara") return undefined;
    const ts = Array.from({ length: cardCount }, (_, i) => setTimeout(() => setFlipN((n) => Math.max(n, i + 1)), 450 + i * 260));
    return () => ts.forEach(clearTimeout);
  }, [meta.look, cardCount]);

  const labelOf = (it) => {
    if (!it) return BUY;
    if (it.closed) return "ปิดขาย";
    if (isOut(it)) return "หมด";
    if (block) return block;
    if (gold < it.price) return "เหรียญไม่พอ";
    return BUY;
  };

  const pick = (it) => { if (sel?.id !== it.id) clickSound(); setSelId(it.id); };

  const buy = (it) => {
    if (!it || labelOf(it) !== BUY) return;
    playSfx("buy_something");
    socket.emit("buyShopItem", { shopId: shop.id, itemId: it.id });
    // ของบินเข้ากระเป๋า + ประกาย
    const st = document.querySelector(".shs-stage"), bar = st && st.querySelector(".shs-bagbar");
    if (!st || !bar) return;
    const src = st.querySelector(`[data-item="${CSS.escape(String(it.id))}"]`);
    const sr = st.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const a = (src || bar).getBoundingClientRect();
    const fx = (a.left + a.width / 2 - sr.left) / k, fy = (a.top + a.height / 3 - sr.top) / k;
    const tx = (br.left + 40 - sr.left) / k, ty = (br.top + 10 - sr.top) / k;
    const id = `${Date.now()}-${Math.random()}`;
    setFlies((f) => [...f, { id, x: fx, y: fy, dx: tx - fx, dy: ty - fy, info: shopInfoOf(it) }]);
    setTimeout(() => {
      setFlies((f) => f.filter((x) => x.id !== id));
      setHitN((n) => n + 1);
      setGoldN((n) => n + 1);
    }, 680);
  };

  // คีย์บอร์ด — จับก่อนเกม (capture) ไม่ให้ WASD/ลูกศรไปเลื่อนกล้องตอนเปิดร้าน
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const i = sel ? list.findIndex((x) => x.id === sel.id) : -1;
      let hit = true;
      if (key === "Escape") onClose?.();
      else if (["ArrowRight", "ArrowDown", "d", "s"].includes(key)) { if (list.length) pick(list[Math.min(list.length - 1, i + 1)]); }
      else if (["ArrowLeft", "ArrowUp", "a", "w"].includes(key)) { if (list.length) pick(list[Math.max(0, i - 1)]); }
      else if (key === "Enter") { if (!e.repeat) buy(sel); }
      else hit = false;
      if (hit) { e.preventDefault(); e.stopPropagation(); }
    };
  });
  useEffect(() => {
    const on = (e) => keyRef.current?.(e);
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);

  if (!shop) return null;

  const close = () => { clickSound(); onClose?.(); };
  const turnsLeft = shop.turnsLeft > 0 ? shop.turnsLeft : 0;
  const lbl = labelOf(sel);
  const buyBtn = () => (
    <button type="button" className="shs-buy" disabled={!sel || lbl !== BUY} onClick={() => buy(sel)}><span>{lbl}</span></button>
  );
  const price = (it) => (
    <span className="shs-price" data-poor={it && gold < it.price ? "true" : "false"}><Coin /><b>{it?.price ?? 0}</b></span>
  );
  const pips = (it, cls) => {
    const { n, max } = stockOf(it);
    return <span className={cls}>{Array.from({ length: max }, (_, j) => <i key={j} data-on={j < n ? "true" : "false"} />)}</span>;
  };

  // ---------- ร้านยา / แคปซูล ----------
  const renderApoth = () => {
    const { n, max } = sel ? stockOf(sel) : { n: 0, max: 0 };
    const own = sel ? inv.filter((x) => x.type === sel.type).length : 0;
    return (
      <>
        <div className="shs-cab" data-rows={shelves.length}>
          {shelves.map((s) => (
            <div key={s.g} className="shs-shelf">
              <span className="shs-plate">{SHELF_LABEL[s.g]}</span>
              {s.list.map((it) => {
                const info = shopInfoOf(it);
                const out = isOut(it);
                const st = stockOf(it);
                return (
                  <button type="button" key={it.id} data-item={it.id} className="shs-jar" title={info.desc}
                    data-sel={sel?.id === it.id ? "true" : "false"} data-out={out ? "true" : "false"}
                    onClick={() => pick(it)} onDoubleClick={() => { setSelId(it.id); buy(it); }}>
                    <span className="shs-ghosts">{Array.from({ length: out ? 0 : Math.max(0, Math.min(3, st.n - 1)) }, (_, j) => <i key={j} />)}</span>
                    <span className="shs-dome"><Ico info={info} className="shs-it" /></span>
                    <span className="shs-base" />
                    {!out && <span className="shs-tag"><span><Coin s />{it.price}</span></span>}
                    {!out && <span className="shs-cnt">×{st.n}</span>}
                    {out && <span className="shs-soldout">{it.closed ? "ปิดขาย" : "หมด"}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="shs-counter">
          <div className="shs-big">{selInfo && <Ico key={sel.id} info={selInfo} className="shs-big-it" />}</div>
          <div className="shs-info">
            <div className="shs-nm">{selInfo ? selInfo.label(sel) : ""}</div>
            {selInfo?.short ? <div className="shs-sh">{selInfo.short}</div> : null}
            <div className="shs-meta"><span>คงเหลือ<b>{n}/{max}</b></span><span>ในกระเป๋า<b>{own}</b></span></div>
          </div>
          <div className="shs-deal">
            {price(sel)}
            {buyBtn()}
          </div>
        </div>
      </>
    );
  };

  // ---------- โรงช่าง ----------
  const renderForge = () => {
    const many = list.length > 2;
    const hs = many ? Math.max(0.5, Math.min(0.75, 2.4 / list.length)) : 1;
    const posOf = (i) => (many
      ? [50 + (i % 3) * 300, 70 + Math.floor(i / 3) * 330 + (i % 2) * 60]
      : HANG_POS[i]);
    const selIdx = sel ? list.findIndex((x) => x.id === sel.id) : -1;
    const sp = selIdx >= 0 ? posOf(selIdx) : null;
    const { n, max } = sel ? stockOf(sel) : { n: 0, max: 0 };
    const dials = sel ? [...dialsOf(sel), [`${n}/${max}`, "คงเหลือ", max ? (n / max) * 100 : 0]] : [];
    return (
      <>
        <div className="shs-peg">
          <span className="shs-gear" style={{ right: 40, bottom: 30 }}>⚙</span>
          <span className="shs-gear b" style={{ right: 150, bottom: 110, fontSize: 80 }}>⚙</span>
          <span className="shs-bolt" style={{ left: 22, top: 22 }} /><span className="shs-bolt" style={{ right: 22, top: 22 }} />
          <span className="shs-bolt" style={{ left: 22, bottom: 22 }} /><span className="shs-bolt" style={{ right: 22, bottom: 22 }} />
          {sp && <div className="shs-spot" style={{ left: sp[0] - 95 * hs, top: sp[1] - 170 * hs, "--hs": hs }} />}
          {list.map((it, i) => {
            const info = shopInfoOf(it);
            const [x, y] = posOf(i);
            const out = isOut(it);
            return (
              <button type="button" key={it.id} data-item={it.id} className="shs-hang" title={info.desc}
                style={{ left: x, top: y, animationDelay: `${-i * 1.7}s`, "--hs": hs }}
                data-sel={sel?.id === it.id ? "true" : "false"} data-out={out ? "true" : "false"}
                onClick={() => pick(it)} onDoubleClick={() => { setSelId(it.id); buy(it); }}>
                <span className="shs-hang-in">
                  <span className="shs-plateT">
                    <span className="shs-bolt l" /><span className="shs-bolt r" />
                    <Ico info={info} className="shs-it" />
                    <span className="shs-nm">{info.label(it)}</span>
                    <span className="shs-row">
                      <span className="shs-pr"><Coin s />{it.price}</span>
                      {pips(it, "shs-ticks")}
                    </span>
                    {out && <span className="shs-out">{it.closed ? "ปิดขาย" : "หมด"}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="shs-anvil">
          <div className="shs-anv-art">{selInfo && <Ico key={sel.id} info={selInfo} className="shs-it" />}</div>
          <div className="shs-nm">{selInfo ? selInfo.label(sel) : ""}</div>
          {selInfo?.short ? <div className="shs-sh">{selInfo.short}</div> : null}
          <div className="shs-dials">
            {dials.map(([v, l, p]) => (
              <div key={l} className="shs-dial" style={{ "--p": p }}><div><b>{v}</b><small>{l}</small></div></div>
            ))}
          </div>
          <div className="shs-deal row">
            {price(sel)}
            {buyBtn()}
          </div>
        </div>
      </>
    );
  };

  // ---------- พ่อค้าเร่ ----------
  const renderCara = () => (
    <>
      <div className="shs-canopy" />
      <div className="shs-rug" />
      {turnsLeft > 0 && (
        <div className="shs-hourglass"><div className="shs-hg"><i /><b /><u /></div><span>เหลือ {turnsLeft} เทิร์น</span></div>
      )}
      <div className="shs-cards" data-n={list.length}>
        {list.map((it, i) => {
          const info = shopInfoOf(it);
          return (
            <button type="button" key={it.id} data-item={it.id} className="shs-card" title={info.desc}
              data-flip={i < flipN ? "true" : "false"} data-sel={sel?.id === it.id ? "true" : "false"} data-out={isOut(it) ? "true" : "false"}
              onClick={() => pick(it)} onDoubleClick={() => { setSelId(it.id); buy(it); }}>
              <span className="shs-back" />
              <span className="shs-face">
                <Ico info={info} className="shs-it" />
                <span className="shs-nm">{info.label(it)}</span>
                {info.short ? <span className="shs-sh">{info.short}</span> : null}
                <span className="shs-row">
                  <span className="shs-pr"><Coin s />{it.price}</span>
                  {pips(it, "shs-gems")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="shs-cara-deal">
        <span className="shs-nm">{selInfo ? selInfo.label(sel) : ""}</span>
        {price(sel)}
        {buyBtn()}
      </div>
    </>
  );

  return (
    <div className="shs-veil" onClick={onClose}>
      <div className="shs-stage" style={{ "--k": k }}>
        <section className={`shs-shop shs-${meta.theme} look-${meta.look}`} onClick={(e) => e.stopPropagation()}>
          <div className="shs-frame" />
          <header className="shs-top">
            <span className="shs-crest"><span>{meta.crest}</span></span>
            <div className="shs-ttl"><b>{meta.name}</b><small>{meta.latin}</small></div>
            <div className="shs-top-r">
              {turnsLeft > 0 && meta.look !== "cara" && <span className="shs-chip turns"><i>⏳</i>เหลือ {turnsLeft} เทิร์น</span>}
              <span className="shs-chip gold"><Coin /><b key={goldN} className={goldN ? "bump" : ""}>{gold}</b></span>
              <button type="button" className="shs-x" aria-label="ปิด" onClick={close}>✕</button>
            </div>
          </header>
          {meta.look === "forge" ? renderForge() : meta.look === "cara" ? renderCara() : renderApoth()}
          <BagBar items={bagItems} bagSlots={bagSlots} hitN={hitN} left={meta.look === "forge"} />
        </section>
        {flies.map((f) => (
          <span key={f.id} className="shs-fx">
            <span className="shs-fly" style={{ left: f.x - 32, top: f.y - 32, "--dx": `${f.dx}px`, "--dy": `${f.dy}px` }}><Ico info={f.info} className="shs-fly-it" /></span>
            {Array.from({ length: 12 }, (_, j) => {
              const ang = (j / 12) * Math.PI * 2;
              return <span key={j} className="shs-spark" style={{ left: f.x, top: f.y, "--sx": `${Math.cos(ang) * 90}px`, "--sy": `${Math.sin(ang) * 90}px` }} />;
            })}
          </span>
        ))}
      </div>
    </div>
  );
}
