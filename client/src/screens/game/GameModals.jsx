// หน้าต่างของหน้าเกม — ข้อมูลการเดินทาง ยืนยันสกิล ร้านค้า กระเป๋า + ตัวโหลดวีดีโอล่วงหน้า
//  แยกออกจาก screens/Game.jsx
import { shopInfoOf } from "../../data/shop";
import Button from "../../components/Button";
import { journeyArea } from "../../journey/areas";
import { AvModal, AvButton } from "../../components/avalon";
import { socket } from "../../socket";
import BagScreen from "../hud/BagScreen";
import StashPanel from "../../roadtrip/StashPanel"; // Road Trip: กล่องเก็บของกลางของรถ (ข้างกระเป๋า ตอนจุดพัก — ยืนติดรถตู้เท่านั้น)
import ShopScreen from "../hud/shops/ShopScreen";
import { shopName } from "../../board/shopProps";
import { clickSound, playSfx } from "../../audio";
import { forecastStatusItems } from "./statusData";
import { StatusModal, CharModal } from "./StatusViews";

// ---------- การเดินทาง (ffa/duo/trio): หน้าต่างอ่านผลสนาม (ป้ายภูมิภาครวมอยู่ในแถบซ้ายบน HudTopBar แล้ว) ----------
//  ข้อความผลสนามมาจาก server (characters/_journey.js) ทั้งหมด — client ไม่เก็บตัวเลขบาลานซ์ซ้ำ
export function JourneyInfoModal({ journey, onClose }) {
  const a = journeyArea(journey.area);
  const rows = [
    journey.passive && { k: "ตลอดภูมิภาค", v: journey.passive, on: true },
    { k: "☀️ กลางวัน", v: journey.day, on: !journey.night },
    { k: "🌙 กลางคืน", v: journey.nightDesc, on: journey.night },
  ].filter(Boolean);
  return (
    <AvModal tone="white" label={`การเดินทาง · ภูมิภาคที่ ${journey.area}`} title={journey.name} onClose={onClose} width="min(34rem, 94vw)">
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.k} className="rounded-xl px-3 py-2 border" style={{ borderColor: r.on ? `${a.color}aa` : "var(--avm-line, rgba(255,255,255,.1))", background: r.on ? `${a.color}1f` : "rgba(255,255,255,.03)", opacity: r.on ? 1 : 0.55 }}>
            <div className="av-heading text-xs avm-k" style={{ "--avm-c": a.color, color: r.on ? `var(--avm-on, ${a.glow})` : "var(--avm-dim, rgba(234,243,252,.6))" }}>{r.k}{r.on && r.k !== "ตลอดภูมิภาค" ? " (ตอนนี้)" : ""}</div>
            <div className="text-sm leading-relaxed">{r.v}</div>
          </div>
        ))}
        <div className="text-xs opacity-60 text-center mt-1">
          {journey.turnsLeft != null ? `เดินทางต่อไปยังภูมิภาคถัดไปในอีก ${journey.turnsLeft} เทิร์น` : "สุดทางแล้ว — ภูมิภาคนี้จะอยู่ไปจนจบเกม"}
        </div>
      </div>
    </AvModal>
  );
}

// modal ต่างๆ ที่ต้อง mount ร่วมกันทั้ง layout มือถือและจอใหญ่ (ลำดับเดียวกันทั้งสองที่ กัน stacking เพี้ยน)
export function ModalMounts({
  showChar, ch, me, onCloseChar,
  statusView, statusViewIsSelf, onCloseStatus,
  shop = null, onCloseShop, shopBlock,
  bagOpen, onCloseBag, players, gameState, roundNumber,
  myTurn, bagSlots, newBag = false, drawBag = null, onDrawUse, rtFree = false, rtStash = null,
  skillConfirm, onConfirmSkill, onCancelSkill, remoteShops = null, onRemoteShop, onBomb,
}) {
  return (
    <>
      {showChar && ch && <CharModal ch={ch} me={me} onClose={onCloseChar} />}
      {statusView && <StatusModal p={statusView} statusOnly={statusViewIsSelf} onClose={onCloseStatus} />}
      {shop && (newBag
        ? <ShopScreen shop={shop} me={me} block={shopBlock} bagSlots={bagSlots || 5} onClose={onCloseShop} />
        : <ShopModal shop={shop} me={me} block={shopBlock} onClose={onCloseShop} />)}
      {bagOpen && newBag && <BagScreen me={me} players={players} myTurn={myTurn} rtFree={rtFree} bagSlots={bagSlots} draw={drawBag} onDrawUse={onDrawUse} statusOf={forecastStatusItems} onClose={onCloseBag} shops={remoteShops} onShop={onRemoteShop} onBomb={onBomb}
        side={rtStash ? <StashPanel side stash={rtStash} me={me} players={players} bagSlots={bagSlots || 5} /> : null} />}
      {bagOpen && !newBag && <InventoryModal me={me} myTurn={myTurn} bagSlots={bagSlots} onClose={onCloseBag} />}
      {skillConfirm && <SkillConfirmModal confirm={skillConfirm} onConfirm={onConfirmSkill} onCancel={onCancelSkill} />}
      <CharVideoPreloader players={players} />
    </>
  );
}

// ---------- ป๊อปอัปยืนยันก่อนใช้สกิล (patch UX): กดช่องสกิลใดก็ตาม -> ถามยืนยันก่อนเสมอ ----------
//  โชว์ ภาพสกิล / ลำดับสกิล (พื้นฐาน-รอง-ท่าไม้ตาย) / ชื่อสกิล / แต้มที่ใช้จริง / รายละเอียด — ยกเลิกได้ ไม่มีผลใดๆ
function SkillConfirmModal({ confirm, onConfirm, onCancel }) {
  const { skillData, label, useCost } = confirm;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-echo-navy rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {skillData?.img ? (
            <img src={skillData.img} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0 border border-white/10" />
          ) : (
            <span className="w-20 h-14 grid place-items-center text-2xl shrink-0 bg-white/5 rounded-lg border border-white/10">✦</span>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-echo-ice">{label}</div>
            <div className="text-lg font-black truncate">{skillData?.name || "สกิล"}</div>
            <div className="text-xs font-bold opacity-80 mt-0.5">{useCost != null ? `ใช้แต้มสกิล ${useCost}` : "ฟรี"}</div>
          </div>
        </div>
        {skillData?.desc && <div className="text-sm opacity-90 leading-snug mt-3">{skillData.desc}</div>}
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>ยกเลิก</Button>
          <Button className="flex-1" onClick={() => { clickSound(); onConfirm(); }}>ใช้งาน</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- ร้านค้ามายา + คลังผู้เล่น (patch 2.2 full) ----------
// ไรโด ฮิคารุ: คลิปทุกตัว (เล่นครั้งเดียวต่อเกม — characters/_transforms.js)
const HIKARU_CLIPS = ["form_blackking", "form_thunderdarambia", "form_kemurjin", "form_kingpandon", "form_doragory", "form_tiga",
  "hikaru_skill2", "hikaru_strium", "hikaru_skill3", "hikaru_strium_ray"];
// วีดีโอท่าของตัวละครในแมตช์: โหลดล่วงหน้าไว้ในเบื้องหลัง — ไม่งั้นตอนใช้จริงวีดีโอจะขึ้นช้า
//  แล้วโดนเวลาคัตซีนฝั่ง server ตัดจบก่อนวีดีโอเล่นจบ
function CharVideoPreloader({ players }) {
  const preloadMuimi = (players || []).some((p) => p.character?.id === "muimi");
  const preloadSliver = (players || []).some((p) => p.character?.id === "sliver_bullet");
  const preloadSora = (players || []).some((p) => p.character?.id === "sora_otosumi");
  const preloadKira = (players || []).some((p) => p.character?.id === "kira");
  const preloadYuna = (players || []).some((p) => p.character?.id === "yuna");
  const preloadHikaru = (players || []).some((p) => p.character?.id === "raido_hikaru");
  const preloadGray = (players || []).some((p) => p.character?.id === "gray");
  if (!preloadMuimi && !preloadSliver && !preloadSora && !preloadHikaru && !preloadKira && !preloadYuna && !preloadGray) return null;
  return (
    <div aria-hidden className="hidden">
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3.mp4" preload="auto" muted playsInline />}
      {preloadMuimi && <video src="/characters/muimi/muimi_skill3_short.mp4" preload="auto" muted playsInline />}
      {preloadSliver && <video src="/characters/sliver_bullet/sliver_bullet_skill1.mp4" preload="auto" muted playsInline />}
      {preloadSliver && <video src="/characters/sliver_bullet/sliver_bullet_skill2.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill1.mp4" preload="auto" muted playsInline />}
      {preloadKira && <video src="/characters/kira/kira_skill1.mp4" preload="auto" muted playsInline />}
      {preloadYuna && <video src="/characters/yuna/yuna_skill3.mp4" preload="auto" muted playsInline />}
      {preloadGray && <video src="/characters/gray/gray_skill3_intro.mp4" preload="auto" muted playsInline />}
      {preloadGray && <video src="/characters/gray/gray_skill3_final.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill3_normal.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/sora_skill3_hit.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire_skill3_intro.mp4" preload="auto" muted playsInline />}
      {preloadSora && <video src="/characters/sora_otosumi/myth_fire_skill3_hit.mp4" preload="auto" muted playsInline />}
      {preloadHikaru && HIKARU_CLIPS.map((f) => <video key={f} src={`/characters/raido_hikaru/${f}.mp4`} preload="auto" muted playsInline />)}
    </div>
  );
}
// ไอคอนไอเทม: มีรูปจริงใช้รูป ไม่มีก็ใช้ emoji เดิม
function ItemIcon({ info, className = "" }) {
  if (info.img) return <img src={info.img} alt="" className={`object-contain shrink-0 ${className}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
  return <span className={`shrink-0 ${className}`}>{info.icon}</span>;
}

// ร้านค้ามายา: ร้านเดียว 15 ช่อง ตั้งบนแผนที่ — ย้ายจุด + สุ่มของใหม่ทุก 6 เทิร์น (GRID_PLAN §8.1)
//  กริดขยายออกด้านข้าง (สูงสุด 5 คอลัมน์ = 3 แถว) ไม่ให้โมดัลยืดลงจนต้อง scroll แนวตั้ง
// ป้ายร้านค้าปรากฏ (ออกแบบใหม่ — ผู้ใช้สั่ง 2026-11-10 "ห้ามทำแบบเดิม · ของกลางทุกโหมด ทำให้สวย"):
//  ป้ายร้านแขวนโซ่หย่อนลงจากขอบบน แกว่งแล้วนิ่ง · กระดิ่งร้านสั่น · ตราประทับ "ปรากฏ" กดลงบนป้าย · ฝุ่นทองร่วงตอนประทับ
//  จบ = ดึงกลับขึ้นไป (ยาว SCENE_MS.shop) · ไม่มีข้อความอื่นนอกจากชื่อร้าน + "ปรากฏ"
export function ShopHerald({ name }) {
  const dust = Array.from({ length: 12 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 4) * 0.07, s: 3 + (i % 3) * 2 }));
  return (
    <div className="shh" aria-hidden="true">
      <div className="shh-hang">
        <span className="shh-chain shh-chain-l" />
        <span className="shh-chain shh-chain-r" />
        <div className="shh-board">
          <svg className="shh-bell" width="34" height="34" viewBox="0 0 34 34">
            <path d="M17 4c1.2 0 2 .8 2 1.8v1c4.6 1 7.4 4.8 7.4 10.2v5.6l2.6 3H5l2.6-3V17c0-5.4 2.8-9.2 7.4-10.2v-1C15 4.8 15.8 4 17 4z" fill="url(#shhBellG)" stroke="#5a3a0c" strokeWidth="1.2" />
            <circle cx="17" cy="29" r="2.6" fill="#5a3a0c" />
            <defs>
              <linearGradient id="shhBellG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff2c4" />
                <stop offset="55%" stopColor="#e7b450" />
                <stop offset="100%" stopColor="#9a6a1c" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="shh-awning" viewBox="0 0 220 26" preserveAspectRatio="none">
            {Array.from({ length: 11 }, (_, i) => (
              <path key={i} d={`M${i * 20} 0h20v14q-10 12-20 0z`} fill={i % 2 ? "#f4ead2" : "#c8423a"} />
            ))}
          </svg>
          <div className="shh-name">{name || shopName("apoth")}</div>
          <div className="shh-stamp"><span>ปรากฏ</span></div>
          <div className="shh-dust">
            {dust.map((k, i) => <i key={i} style={{ left: `${k.x}%`, animationDelay: `${0.95 + k.d}s`, width: k.s, height: k.s }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopModal({ shop, me, block, onClose }) {
  const list = shop?.items || [];
  const turnsLeft = shop?.turnsLeft || 0;
  return (
    <AvModal
      tone="white"
      label="ร้านค้า"
      title={shop?.name || shopName(shop?.kind)}
      width="min(72rem, 94vw)"
      onClose={onClose}
      right={<span className="flex gap-2">
        {turnsLeft > 0 && <span className="av-chip"><span>เหลือ {turnsLeft} เทิร์น</span></span>}
        <span className="av-chip av-chip-gold"><span>🪙 {me?.gold ?? 0}</span></span>
      </span>}
    >
      <>
        {(!list || list.length === 0) ? (
          <div className="av-label py-10 text-center" style={{ opacity: 0.5 }}>ไม่มีของ</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {list.map((it) => {
              const info = shopInfoOf(it);
              const sold = !!it.sold;
              const afford = (me?.gold ?? 0) >= it.price;
              return (
                <div
                  key={it.id}
                  className={`oc-shop-card relative p-3 flex flex-col items-center text-center gap-1.5 ${sold ? "sold" : ""}`}
                >
                  <ItemIcon info={info} className="text-3xl h-12 w-12" />
                  <div className="av-heading text-xs leading-tight">{info.label(it)}</div>
                  {/* คำอธิบายย่อ (ผู้ใช้สั่ง 2026-10-09 · ฉบับเต็มชี้ค้างดูได้) */}
                  {info.short && <div className="oc-shop-short text-xs leading-snug" title={info.desc}>{info.short}</div>}
                  <div className="mt-auto w-full flex flex-col items-center gap-2 pt-2">
                    <div className="av-label oc-shop-price" style={{ fontSize: "0.7rem" }}>
                      🪙 {it.price}
                      {/* จำนวนที่ยังซื้อได้ของช่องนี้ (สุ่ม 2–5 ต่อช่อง — ผู้ใช้สั่ง 2026-11-08) */}
                      {it.stockMax > 0 && !sold && <span className="oc-shop-stock"> · เหลือ {it.stock}/{it.stockMax}</span>}
                    </div>
                    <AvButton
                      className="w-full py-1.5 text-xs px-2"
                      disabled={sold || !afford || !!block}
                      onClick={() => { playSfx("buy_something"); socket.emit("buyShopItem", { shopId: shop.id, itemId: it.id }); }}
                    >
                      {it.closed ? "ปิดขาย" : sold ? "ขายแล้ว" : !afford ? "เหรียญไม่พอ" : block || "ซื้อ"}
                    </AvButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </AvModal>
  );
}

function InventoryModal({ me, myTurn, bagSlots = 5, onClose }) {
  const items = me?.inventory || [];
  // ใช้ของได้เฉพาะตาเดินของตัวเอง (ระบบกระดาน)
  const turnBlock = !myTurn ? "ใช้ได้เฉพาะตาของคุณ" : null;
  function applyItem(uid) { clickSound(); socket.emit("useInventoryItem", { uid }); }
  // ทิ้งของ: ตาตัวเองเท่านั้น ไม่นับเป็นการใช้
  function dropItem(uid) { clickSound(); socket.emit("dropItem", { uid }); }

  return (
    <AvModal label="กระเป๋า" title={`กระเป๋าของ ${me?.name || ""}`} width="min(34rem, 94vw)" onClose={onClose}
      right={<span className="av-chip"><span>{items.length}/{bagSlots}</span></span>}>
      <>
        {items.length === 0 ? (
          <div className="av-label py-8 text-center" style={{ color: "var(--avm-dim, rgba(234,243,252,.4))" }}>ยังไม่มีของในคลัง</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((it) => {
              const info = shopInfoOf(it);
              return (
                <div key={it.uid} className="av-item flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <ItemIcon info={info} className="text-2xl h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="av-heading text-sm">{info.label(it)}</div>
                      <div className="text-xs leading-snug" style={{ color: "var(--avm-text, rgba(234,243,252,.62))" }}>{info.desc}</div>
                    </div>
                    <AvButton className="px-4 py-1.5 text-xs shrink-0" disabled={!!turnBlock} title={turnBlock || ""} onClick={() => applyItem(it.uid)}>ใช้</AvButton>
                    <AvButton className="px-3 py-1.5 text-xs shrink-0" disabled={!myTurn} onClick={() => dropItem(it.uid)}>ทิ้ง</AvButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </AvModal>
  );
}
