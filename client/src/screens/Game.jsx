import { DRAW_ITEM_TYPES } from "../data/shop";
import EosMap from "../eos/EosMap";
import EosGuide from "../eos/EosGuide";
import EosSituation from "../eos/EosSituation";
import EosAlerts from "../eos/EosAlerts";
import { eosSituation, SIT_COUNT as sitCount } from "../eos/eosSitData";
import EosZoneCard from "../eos/EosZoneCard";
import EosScoreboard from "../eos/EosScoreboard";
import EosPerks from "../eos/EosPerks";
import { beginNotice, endNotice, noticeBusy, onNotice } from "../ui/noticeBus";
import { TickSeconds } from "../tickStore";
import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../components/Card";
import VictoryScreen from "../components/VictoryScreen";
import { journeyArea } from "../journey/areas";
import { fodlanStage } from "../fodlan/stages";
import { RoundBanner } from "../components/BattleScenes";
import { socket } from "../socket";
import { StatRow, VitalExtras } from "./hud/StatRow";
import { SkillSlot } from "./hud/SkillSlot";
import { DioGauge, DioInterrupt, LastStandDuel } from "./hud/DioHud";
import { ShinraEmber } from "./hud/ShinraHud";
import { FreddyDoors } from "./hud/FreddyDoors";
import { ClockUpButton, ClockDuel } from "./hud/ZectHud";
import { SelfHud, HudPanel, HudStatusDrawer, HudTopBar } from "./hud/SelfHud";
import { DrawDock, HudCommand, BagButton, PhaseCall } from "./hud/HudPhases";
import CampPanel from "../roadtrip/CampPanel"; // Road Trip: หน้าแคมป์ (กองไฟ — ทำอาหาร/กิจกรรมกลางคืน)
import CampSpot from "../roadtrip/CampSpot"; // Road Trip แคมป์: แผงเล็กของแต่ละจุด (ขอนเล่าเรื่อง/เรือ/ปิ้ง/กล้อง/ฟืน/ท่าเรือ/แม่แรง)
import { ELEMENTS } from "../data/elements";
import { shopName } from "../board/shopProps";
import HikaruForms from "./hud/HikaruForms";
import SkillChoices from "./hud/SkillChoices";
import DiaryBook, { DiaryCenter } from "./hud/DiaryBook";
import { BladeRouzerSlot, EvolutionScene, BladeRouzerPanel } from "./hud/BladeRouzer";
import FaizPhone, { AxelClock } from "./hud/FaizPhone";
import { rosterOf, rosterAlive, sameSide, sideAlive, unitsOfSide } from "../duo";
import { requestAttention } from "../attention";
import { clickSound, uiSound, playSfx, stopSfx, sfxPlayId, suspendMusic, startLoopSfx, stopLoopSfx, pauseLoopSfx, resumeLoopSfx } from "../audio";
import BoardStage from "../board/BoardStage";
import YukiBoom from "../board/YukiBoom";
import ArjunaUlt from "../board/ArjunaUlt";
import { preloadArjunaUlt } from "../board/arjunaFx";
import * as Rules from "../board/boardRules";
// Road Trip (GRID_PLAN §8.8): ช่วงขับ = จอ 3D (RoadtripScreen) · จุดพัก/ต่อสู้ = กระดานเดิม + แถบจุดพัก/อู่/สถานะรถ · จบ = สรุป
import RoadtripScreen, { RT_DRIVE_PHASES } from "../roadtrip/RoadtripScreen";
import { rtVanButtons, useRtVanHotkeys, turretTiles, canRear as rtCanRear } from "../roadtrip/rtVanActions";
import { rtEmit } from "../roadtrip/rtSocket";
import { rtMyPopups, rtOwnIds } from "../roadtrip/rtMine";
import { RT_DEFS } from "../board/roadtrip/maps.gen";
import RoadtripSummary from "../roadtrip/RoadtripSummary";
import { RtGuideButton } from "../roadtrip/RtGuideButton"; // คู่มือ Road Trip (ปุ่ม ? ตลอดทริป)
import RtTransitions, { useRtView } from "../roadtrip/RtTransitions"; // ฉากเปลี่ยนของโหมด (เข้าจุดพัก/ต่อสู้/บอส/ชนะ/แพ้/ภูมิภาค)
import StopBar from "../roadtrip/StopBar";
import Garage from "../roadtrip/Garage";
import "../roadtrip/roadtrip.css";
import { P_DISPLAY, teamAccent, useViewport, isTargetable, resolveAttackPick, rankTiers, useCardFlights } from "./game/gameHelpers";
import { statusEntries, forecastStatusItems } from "./game/statusData";
import { StatusChips } from "./game/StatusViews";
import { Cutscene, DrawCall, AttackCall, OverlayLayer } from "./game/GameScenes";
import { GameBackground } from "./game/GameBackground";
import { SummaryTiers } from "./game/SummaryTiers";
import { TeamBadge, Portrait, LifeBar, MobileOpponent } from "./game/PlayerBits";
import { ModalMounts, JourneyInfoModal, ShopHerald } from "./game/GameModals";
import { QtePanel, BoardTimer, DeckPile, DeckLedgerModal, FlyingCardsLayer } from "./game/BoardBits";

// ระยะเวลาของแต่ละฉากประกาศ (มิลลิวินาที) — ต้องยาวพอให้อนิเมชันใน css เล่นจบ
//  ไม่งั้นฉากจะถูกถอดออกกลางคัน แล้วฉากถัดไปในคิวจะเด้งมาทับตอนอันเก่ายังจางไม่หมด
const SCENE_MS = { cycle: 3500, draw: 2000, atk: 2200, shop: 3700 };

// Road Trip: เลือกจอตามเฟสของโหมด — ช่วงขับไม่ mount กระดาน (ไม่มีการ์ด/สกิล/ปุ่มตัวละครเลย — ผู้ใช้สั่ง 2026-11-14)
//  ภาพที่โชว์ (drive/board/over) ตามหลังเฟสจริงเล็กน้อยเพื่อเล่นฉากเปลี่ยน (roadtrip/RtTransitions.jsx useRtView) — ระหว่างค้างภาพกระดานเดิมใช้ state ชุดสุดท้ายของกระดาน
export default function GameBoard(props) {
  const { state } = props;
  const rt = state && state.gameMode === "roadtrip" ? state.roadtrip : null;
  const rtv = useRtView(state);
  if (!rt) return <GameBoardCore {...props} />;
  const view = rtv.view || (RT_DRIVE_PHASES.has(rt.phase) ? "drive" : "board");
  // ฉากขับ 3D mount ค้างไว้ตลอดทริป (ซ่อน + หยุดวาดตอนจุดพัก/ต่อสู้) — สร้างใหม่ทุกครั้งที่กลับมาขับ = ค้าง ~0.8 วิ (วัดแล้ว 2026-11-14)
  return (
    <>
      {view !== "over" && <RoadtripScreen key="rt-drive" state={state} lowQ={props.lowQ} active={view === "drive"} />}
      {view === "board" && <GameBoardCore key="rt-board" {...props} state={rtv.boardState} />}
      {view === "over" && (
        <div className="rtx-sumfade">
          <RoadtripSummary summary={rt.summary || { km: rt.km, region: rt.region, diff: rt.diff }} players={state.players || []} />
        </div>
      )}
      <RtTransitions state={state} view={view} act={rtv.act} endAct={rtv.endAct} lowQ={props.lowQ} />
      {view !== "over" && <RtGuideButton state={state} />}
    </>
  );
}

function GameBoardCore({ state, lowQ, skillConfirmOn = true }) {
  // หยุดเวลา (ดิเอโก้ — state.timeFreeze): ไม่มีเพลงพื้นหลังเลย (ผู้ใช้สั่ง · เสียงนาฬิกาวนเอาออกแล้ว — ผู้ใช้: น่ารำคาญ) · เสียงการกระทำ/เอฟเฟกต์ยังดังตามปกติ
  const frozenBy = state?.timeFreeze?.by || null;
  useEffect(() => (frozenBy ? suspendMusic() : undefined), [frozenBy]);
  const [showChar, setShowChar] = useState(false);
  const [flash, setFlash] = useState(null); // สกิลช่วงจั่วการ์ด เด้งทันทีบนกระดาน
  const [notice, setNotice] = useState(null); // แปลงร่างซ้ำ (ครั้งที่ 2 เป็นต้นไป) เด้งแจ้งเตือนทันที ไม่หยุดเกม
  const [giftSel, setGiftSel] = useState(null);              // โอเบรอน (ฤดูร้อน): { tier, anyone } ที่กำลังรอจิ้มเป้าหมาย
  const [journeyInfoOpen, setJourneyInfoOpen] = useState(false);   // การเดินทาง: หน้าต่างอ่านผลของภูมิภาคปัจจุบัน
  // จอคอม (ระบบกระดาน): โหมดเลือกเป้า/ทิศบนกระดาน — { kind: "skill", tier }
  const [pickReq, setPickReq] = useState(null);
  // ปุ่ม "โจมตี" (ดีไซน์ใหม่): ศัตรูที่ตีถึงมาจาก BoardStage · กดแล้วเพิ่มเลข = BoardStage เปิดหน้าคาดการณ์ · fcOpen = ซ่อน HUD ทั้งหมด
  const [attackables, setAttackables] = useState([]);
  const [atkSignal, setAtkSignal] = useState(0);
  const [fcOpen, setFcOpen] = useState(false);
  // ---------- คิวฉากประกาศ ----------
  //  ฉากประกาศทุกอันกินจอเต็มใบ เดิมต่างคนต่างมีตัวตั้งเวลาของตัวเอง ไม่มีใครรู้จักกัน จึงทับกันได้
  //  ที่ชนบ่อยที่สุด: วงจรกลางวัน-กลางคืนสลับทุก 3 เทิร์น แล้วเด้งพร้อม "เริ่มจั่วการ์ด" ที่ต้นเทิร์นพอดี
  //  (ฉากกลางวัน-กลางคืนยาว 3.5 วิ ส่วนฉากจั่วการ์ด 2 วิ — ทับกันเต็มๆ ทุก 3 เทิร์น)
  //  และร้านค้าที่เด้งวินาทีที่ 2.7 ก็ทับหางของฉากกลางวัน-กลางคืนอีกต่อหนึ่ง
  //  รวมมาเข้าคิวเดียว เล่นทีละอันตามลำดับที่เข้ามา — แบนเนอร์เปลี่ยนเทิร์นผูกกับเฟส TRANSITION
  //  จึงไม่เข้าคิว แต่ "กั้นคิว" ไว้แทน ไม่มีฉากไหนเล่นทับมันได้
  const prevCycle = useRef(null);
  const [statusViewId, setStatusViewId] = useState(null); // ดูสถานะผู้เล่นคนอื่น (แตะการ์ดตอนไม่ได้เลือกเป้า)
  const [bagOpen, setBagOpen] = useState(false);     // ร้านค้ามายา (patch 2.2 full): เปิดดูคลังของตัวเอง
  const [shopId, setShopId] = useState(null); // ร้านที่เปิดดูอยู่ (state.shops[i].id) — null = ปิด
  const [colorPick, setColorPick] = useState(null); // ยาเปลี่ยนสีการ์ดช่วงจั่ว: { uid, card } — card = index การ์ดที่เลือก (null = ยังไม่เลือก)
  // นับครั้งการแสดง ไม่ใช่ true/false — ค่าต้องเปลี่ยนทุกครั้งที่เข้าช่วง ไม่งั้น React ไม่ remount
  // แล้วอนิเมชันจะเล่นแค่ครั้งแรกครั้งเดียวตลอดทั้งแมตช์
  const [sceneQ, setSceneQ] = useState([]);
  const sceneSeq = useRef(0);
  const prevPhaseRef = useRef(null);
  // ประกาศช่วงละครั้งต่อเทิร์น — phase กลับมาเป็น PLAYING/ATTACK ซ้ำได้หลายรอบในเทิร์นเดียว
  //  (เช่น จบคัตซีนท่าไม้ตาย)
  //  ถ้าไม่กันไว้ ฉากจะเด้งซ้อนกันทุกครั้งที่กลับเข้า phase เดิม
  const announced = useRef({ draw: 0, atk: 0 });
  const [eosSitOpen, setEosSitOpen] = useState(false); // สนาม Eos: แผงสถานการณ์ตอนนี้ (eos/EosSituation.jsx)
  const [eosGuideOpen, setEosGuideOpen] = useState(false); // สนาม Eos: คู่มือ (eos/EosGuide.jsx — ผู้ใช้สั่ง 2026-11-10)
  const [eosMapOpen, setEosMapOpen] = useState(false); // สนาม Eos: แผนที่ภาพรวม (eos/EosMap.jsx)
  const [deckOpen, setDeckOpen] = useState(false);   // สมุดการ์ดกองกลาง: กดที่กองการ์ดกลางเพื่อดู
  const [deckTab, setDeckTab] = useState(false);     // แถบกองการ์ดกลาง (จอคอม): หุบไว้เป็นค่าเริ่ม
  // Road Trip: จุดพัก (phase stop) = ช่วงเดินทาง → ไม่มีการ์ด/สกิล/ปุ่มตัวละคร (มีเฉพาะตอนต่อสู้) · อู่เปิดจากแถบจุดพัก หรือ fx { k: "garage", pid }
  const rtOn = state.gameMode === "roadtrip" && !!state.roadtrip;
  const rtTravel = rtOn && state.roadtrip.phase !== "combat";
  const rtStop = rtOn && state.roadtrip.phase === "stop" ? state.roadtrip.stop : null;
  const [garageOpen, setGarageOpen] = useState(false);
  if (garageOpen && (!rtStop || rtStop.kind !== "gas")) setGarageOpen(false);
  const [campOpen, setCampOpen] = useState(false); // แคมป์: แผงทำอาหาร (fx camp spot cook — กองไฟ/ครัว)
  if (campOpen && (!rtStop || rtStop.kind !== "camp")) setCampOpen(false);
  const [campSpot, setCampSpot] = useState(null); // แคมป์: แผงของจุดอื่น (fx camp { spot })
  if (campSpot && (!rtStop || rtStop.kind !== "camp")) setCampSpot(null);
  // ฟ้าสาง (ทุกคนนอนเต็นท์ครบ — fx sunrise ทุกเครื่อง)
  const [sunrise, setSunrise] = useState(0);
  const sunSeen = useRef(null);
  useEffect(() => {
    const fx = rtOn && Array.isArray(state.roadtrip.fx) ? state.roadtrip.fx : [];
    const last = fx.filter((f) => f.k === "sunrise" && typeof f.key === "number").pop();
    if (sunSeen.current == null) { sunSeen.current = last ? last.key : 0; return; }
    if (last && last.key > sunSeen.current) { sunSeen.current = last.key; setSunrise(last.key); }
  }, [rtOn, state.roadtrip?.fx]); // eslint-disable-line react-hooks/exhaustive-deps
  const rtGarageSeen = useRef(new Set());
  useEffect(() => {
    const fx = rtOn && Array.isArray(state.roadtrip.fx) ? state.roadtrip.fx : [];
    // หน้าอู่/หน้าร้าน = เฉพาะเครื่องที่ตัวของตัวเองเป็นคนกด (รวมตัวที่สองของระบบคู่ — roadtrip/rtMine.js) · fx ของคนอื่นข้าม
    // จุดพัก: อาคารมินิมาร์ท/สำนักงาน = ร้าน (server ส่ง fx { k: "shop", pid, shopId } ตอนเล่นอาคาร) → เปิดหน้าร้านเดิม (server ยืนยันไปแล้ว ไม่ต้อง emit viewShop ซ้ำ)
    for (const f of rtMyPopups(fx, rtOwnIds(state.players, state.youId), rtGarageSeen.current)) {
      if (f.k === "shop") { if (f.shopId) setShopId(f.shopId); }
      else if (f.k === "stash") setBagOpen(true); // ยืนติดรถตู้แล้ว = กระเป๋า + กล่องรถ
      else if (f.k === "camp") { if (f.spot === "cook") { setCampSpot(null); setCampOpen(true); } else { setCampOpen(false); setCampSpot(f.spot); } }
      else setGarageOpen(true);
    }
  }, [rtOn, state.roadtrip?.fx, state.youId]); // eslint-disable-line react-hooks/exhaustive-deps
  // ปุ่มอู่บนแถบจุดพัก: server อัปเกรดได้เฉพาะคนที่ยืนใกล้อู่ (stop.upgrade ≤ 2 ช่อง) → เดินไปอู่ก่อน (rt:walk — ถึงแล้ว server ส่ง fx garage กลับมาเปิดหน้าอู่)
  //  เดิมเปิดหน้าอู่ทันทีจากที่ไหนก็ได้ → กดอัปเกรดแล้วเงียบ (QA 2026-11-14) · เดินไปไม่ได้ (ตาย/ไม่มีตำแหน่ง/ไม่มีอู่) = เปิดหน้าอู่ไว้แต่งรถได้อย่างเดียว
  const rtGarageOf = () => (rtStop && state.board ? ((RT_DEFS[state.board.area] || {}).props || []).find((o) => o.kind === "garage" && o.spot) || null : null);
  const rtGarageFar = () => {
    const garage = rtGarageOf(), meU = me; // ตัวที่เลือกอยู่ (ระบบคู่ — เอมิลิโกะเดินไปอู่ได้)
    return !garage || !meU || !meU.alive || !meU.pos || Math.max(garage.x0 - meU.pos.x, 0, meU.pos.x - garage.x1) + Math.max(garage.y0 - meU.pos.y, 0, meU.pos.y - garage.y1) > 2;
  };
  const rtGarageGo = () => {
    const garage = rtGarageOf(), meU = me;
    const far = !!garage && !!meU && meU.alive && !!meU.pos && rtGarageFar();
    if (far) rtEmit("rt:act", { id: garage.id, ...rtUnitArg }); // server เดินไปช่องไหนก็ได้ที่ติดอู่ แล้วส่ง fx garage (rt:act อู่ = เปิดหน้าอู่อย่างเดียวแล้ว · เดิม rt:walk ช่อง spot — มีคนยืนอยู่ = เงียบ)
    else setGarageOpen(true);
  };
  const shopSeen = useRef(new Set());                // ร้านที่ประกาศ "ปรากฏ" ไปแล้ว (id ร้าน — กันเด้งซ้ำ)
  const vp = useViewport();
  const { flights: cardFlights, removeFlight: removeCardFlight, deckRef, selfHandRef, registerOther } = useCardFlights(state);
  const phase = state.gameState;
  // ช่วงจั่วไพ่เริ่ม: หน้าต่างไม่ได้โฟกัส = ไอคอนแถบงานกระพริบ (attention.js)
  useEffect(() => { if (phase === "PLAYING") requestAttention(); }, [phase]);
  // อรชุน: ฉาก Mahapralaya (ArjunaUlt.jsx) · โหลดวีดีโอ/รูปหมากล่วงหน้าเมื่อมีอรชุนในเกม
  const arjunaRun = state.arjunaUlt ? {
    seq: state.arjunaUlt.seq, hits: state.arjunaUlt.hits, recall: state.arjunaUlt.recall || null,
    targets: (state.arjunaUlt.targets || []).slice(0, 6).map((id) => { const u = state.players.find((q) => q.id === id); return { id, img: u && !u.masked ? u.img : null, color: u ? u.color : null }; }),
  } : null;
  const arjunaInGame = state.players.some((q) => q.character && q.character.id === "arjuna");
  useEffect(() => { if (arjunaInGame) preloadArjunaUlt(state.players.map((q) => ({ img: q.img }))); }, [arjunaInGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ตัวขับคิวฉากประกาศ ----------
  //  ฉากถัดไปเริ่มนับเวลาก็ต่อเมื่อฉากก่อนหน้าเล่นจบแล้วเท่านั้น
  //  TRANSITION = ช่วงของแบนเนอร์เปลี่ยนเทิร์น · CUTSCENE = วีดีโอเต็มจอ — ทั้งคู่กั้นคิวไว้ก่อน
  const scene = sceneQ[0] || null;
  // ป้ายอื่นนอกคิว (ป้ายเข้าพื้นที่ Eos) ขึ้นอยู่ = ป้ายร้านค้ารอก่อน ไม่ขึ้นซ้อน (ui/noticeBus.js)
  const [otherNotice, setOtherNotice] = useState(() => noticeBusy("shop"));
  useEffect(() => onNotice(() => setOtherNotice(noticeBusy("shop"))), []);
  const sceneBlocked = phase === "TRANSITION" || phase === "CUTSCENE" || (scene?.kind === "shop" && otherNotice);
  const shopShowing = scene?.kind === "shop" && !sceneBlocked;
  useEffect(() => { if (shopShowing) { beginNotice("shop"); return () => endNotice("shop"); } return undefined; }, [shopShowing]);
  const pushScene = useCallback((kind, data) => {
    sceneSeq.current += 1;
    const entry = { kind, data, id: sceneSeq.current };
    // ฉากจั่วการ์ดกับฉากโจมตีเป็นประกาศของคนละช่วงในเทิร์นเดียวกัน ประกาศใหม่มาแล้วอันเก่าหมดความหมาย
    const drops = kind === "draw" ? "atk" : kind === "atk" ? "draw" : null;
    setSceneQ((q) => [...(drops ? q.filter((x, i) => i === 0 || x.kind !== drops) : q), entry]);
  }, []);
  useEffect(() => {
    if (!scene || sceneBlocked) return undefined;
    const t = setTimeout(() => setSceneQ((q) => q.slice(1)), SCENE_MS[scene.kind] || 2000);
    return () => clearTimeout(t);
  }, [scene, sceneBlocked]);
  // ระบบคู่ (เคท & เอมิลิโกะ): hand = ระเบียนผู้เล่น (ไพ่/แต้ม/จั่ว) · me = ตัวที่คุมอยู่ (controlId — แผงตัวเรา/สกิล/ระยะเดิน)
  //  ตัวละครทั่วไป controlId = youId → hand กับ me เป็นตัวเดียวกัน
  const hand = state.players.find((p) => p.id === state.youId);
  // Road Trip จุดพัก (ไม่มีตาเดิน — Duo.controlledId ไม่สลับ): ระบบคู่เลือกตัวเองที่เครื่องนี้ (กดตัวบนกระดาน/รูปเล็กเหนือรูปหลัก) แล้วส่ง unitId
  const [rtSel, setRtSel] = useState(null);
  if (rtSel && !rtStop) setRtSel(null); // ออกจากจุดพัก = กลับไปคุมตามตาเดินปกติ
  const rtSelU = rtStop && rtSel ? state.players.find((p) => p.id === rtSel && (p.id === state.youId || p.duoOf === state.youId) && p.alive && p.pos) || null : null;
  const me = rtSelU || (state.controlId && state.players.find((p) => p.id === state.controlId)) || hand;
  const rtUnitArg = rtStop && me && me.id !== state.youId ? { unitId: me.id } : {};
  // กล่องรถที่จุดพัก: ยืนติดรถตู้ที่จอดเท่านั้น (ผู้ใช้สั่ง 2026-11-14 · server/roadtrip/stash.js near)
  const rtVanB = rtStop && state.board ? (RT_DEFS[state.board.area] || {}).vanBlock : null;
  const rtAtVan = !!rtVanB && !!me && me.alive && !!me.pos && Math.max(rtVanB.x0 - me.pos.x, 0, me.pos.x - rtVanB.x1) + Math.max(rtVanB.y0 - me.pos.y, 0, me.pos.y - rtVanB.y1) === 1;
  const roster = rosterOf(state.players); // ผู้เล่นจริง (ตัดตัวที่สองของระบบคู่)
  const duoUnits = hand && hand.duoWith ? unitsOfSide(hand, state.players) : null;
  const handAlive = !!hand && sideAlive(hand, state.players);
  const others = roster.filter((p) => p.id !== state.youId);
  const arenaJourney = state.journey;
  const seatOthers = others;
  const iAmAttacker = phase === "ATTACK" && state.attackerId === state.youId;
  const attacker = state.players.find((p) => p.id === state.attackerId);
  const rankedTiers = rankTiers(rosterAlive(state.players));
  const summaryWinners = rankedTiers[0]?.players || [];
  const summaryLosers = rankedTiers.slice(1).flatMap((t) => t.players);
  const done = hand && (hand.locked || !handAlive);
  // ---------- ไอเทมช่วงจั่ว (ยาโชคลาภ · ยาเปลี่ยนสีการ์ด · กรรไกรตัดไพ่) — เปิดกระเป๋าใช้ได้ก่อนกด "พอ" (ผู้ใช้สั่ง 2026-11-08) ----------
  const drawOpen = phase === "PLAYING" && handAlive && !done;
  const handNumberCards = Array.isArray(hand?.cards) && hand.cards.some((c) => !c.special);
  const drawBag = drawOpen ? { fortuneFull: (hand.statuses?.fortune || 0) >= 3, hasNumber: handNumberCards, cardCount: (hand.cards || []).length } : null;
  // ใช้ไอเทมช่วงจั่วจากกระเป๋า: ยาเปลี่ยนสี = ปิดกระเป๋าแล้วเลือกไพ่ → สีบนมือ · อย่างอื่นส่งทันที
  const useDrawFromBag = (it) => {
    if (it.type === "cardColor") { setBagOpen(false); setColorPick({ uid: it.uid, card: null }); return; }
    setColorPick(null);
    socket.emit("useDrawItem", { uid: it.uid });
  };
  const pickLive = !!colorPick && drawOpen && (hand?.inventory || []).some((it) => it.uid === colorPick.uid);
  // ปุ่มกระเป๋า: มีของที่กดใช้ได้ตอนนี้ = แสงเต้น (ช่วงจั่ว: ไอเทมช่วงจั่ว · ตาเดิน: วงจรพลังงานที่ถอนได้ — คิดต่อด้านล่างหลังรู้ myTurn)
  const drawHot = !!drawBag && (hand?.inventory || []).some((it) => DRAW_ITEM_TYPES.includes(it.type)
    && (it.type === "fortune" ? !drawBag.fortuneFull : it.type === "cardColor" ? drawBag.hasNumber : drawBag.cardCount > 0));
  useEffect(() => { if (colorPick && !pickLive) setColorPick(null); }, [colorPick, pickLive]);
  useEffect(() => {
    if (!colorPick) return undefined;
    const on = (e) => { if (e.key === "Escape") setColorPick(null); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [colorPick]);
  const ch = me?.character;
  const meStatuses = me ? statusEntries(me) : []; // รายการสถานะของตัวเอง — ใช้ในกล่อง "สถานะ" ของแผง HUD (เรียงลงล่างเรื่อยๆ ตามลำดับที่ติด)
  // ---------- ระบบกระดาน (GRID_PLAN.md): ตาเดินของเรา · ร้านบนแผนที่ · กระเป๋า ----------
  const myTurn = !!me && me.alive && phase === "ACTION" && state.actorId === me.id && !!state.action;
  // เสียง UI จากสถานะของเรา (ผู้ใช้สั่ง 2026-11-14): เหรียญเพิ่ม = coin · ของในกระเป๋าลด (ใช้/ทิ้ง/ให้) = item
  const goldNow = me ? me.gold || 0 : 0, bagNow = me ? (me.inventory || []).length : 0;
  const lastGold = useRef(goldNow), lastBag = useRef(bagNow);
  // ด่าน Origin: เสียงเหตุการณ์ภูมิภาคตอนจบเทิร์น (ผู้ใช้สั่ง 2026-11-14 — characters/_journey.js onEndTurn ส่งเป็นบรรทัด log) · เสียงละชนิดครั้งเดียวต่อเทิร์น
  const seenLogs = useRef(new Set());
  useEffect(() => {
    const lines = state.log || [], want = new Set();
    for (const raw of lines) {
      const l = String(raw && raw.text != null ? raw.text : raw), k = `${state.roundNumber}|${l}`;
      if (seenLogs.current.has(k)) continue;
      seenLogs.current.add(k);
      if (/^🌼/.test(l)) want.add("jr_gift");
      else if (/^🌊/.test(l)) want.add("jr_toll");
      else if (/^☀️ แดดทะเลทราย/.test(l)) want.add("jr_heat");
      else if (/^🔥 เปลวไฟแห่งจุดจบ/.test(l) || /^🥀/.test(l)) want.add("jr_burn");
      else if (/^❄️ .*แช่แข็ง/.test(l)) want.add("elem_freeze");
    }
    if (seenLogs.current.size > 400) seenLogs.current = new Set();
    for (const s of want) playSfx(s, { gain: 0.8 });
  }, [state.log, state.roundNumber]);
  useEffect(() => {
    if (goldNow > lastGold.current) uiSound("coin");
    if (bagNow < lastBag.current) uiSound("item");
    lastGold.current = goldNow; lastBag.current = bagNow;
  }, [goldNow, bagNow]);
  const mashClock = useCallback(() => socket.emit("clockMash"), []); // Clock Up ชนกัน: กดรัว
  // เอมิลิโกะเดินต่อหลังจบตา: ได้แค่เดิน/ย้อน/รอ (+ กระจกเงา)
  const canto = myTurn && !!state.action.canto;
  // ปุ่มสกิลที่กดได้ระหว่างเดินต่อ (ตรงกับฮุค cantoSkill ฝั่ง server): พื้นฐาน · เอมิลิโกะ สลับอาวุธ (ตีแจกันแล้วถือไม้ถูพื้นไถลชนต่อ)
  const cantoTier = (tier) => (tier === "basic" && !me?.celine) || (tier === "secondary" && me?.character?.id === "emiliko");
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio" || state.gameMode === "eos"; // eos = PVE ทุกคนทีมเดียว
  // ยืนติดร้าน (ระยะ 1) — ตัวใหญ่ (Echo / ร่างใหญ่ของไรโด ฮิคารุ) นับจากขอบตัวทุกช่อง ตรงกับ server Board.nearShop(boxOf)
  const boxOfP = (p) => ({ x: p.pos.x, y: p.pos.y, size: p.size || 1 }); // ตัวใหญ่ = กล่อง (ระยะนับจากขอบตัว)
  //  ร้านบนกระดาน = state.shops (สูงสุด 3 ร้าน 2×2 · Colony = แคปซูล 1 ช่อง) — ติดร้านไหนก็เปิดร้านนั้น
  const shopList = Array.isArray(state.shops) ? state.shops.filter((sh) => sh && Number.isFinite(sh.x) && Number.isFinite(sh.y)) : [];
  const nearShops = me?.pos ? shopList.filter((sh) => Rules.nearShop(boxOfP(me), sh)) : [];
  const bagFull = (me?.inventory || []).filter((it) => it && it.type !== "kebread").length >= (me?.bagSlots || state.bagSlots || 5);
  const openShop = shopId ? shopList.find((sh) => sh.id === shopId) || null : null; // ข้อมูลสดของร้านที่เปิดอยู่ (ร้านหายไป = ปิดเอง)
  // Gate of Babylon (me.remoteShop — กิลกาเมช): ซื้อจากร้านไหนก็ได้บนแผนที่ ไม่ต้องยืนติด
  // Road Trip จุดพัก: ไม่มีตาเดิน — ทุกคนซื้อพร้อมกันได้ (server shop.js freeShop) · ผู้ใช้แจ้งบัค 2026-11-14
  const rtShopFree = state.gameMode === "roadtrip" && state.roadtrip && state.roadtrip.phase === "stop" && !!me?.alive;
  const shopBlock = !rtShopFree && (!myTurn || canto) ? "ไม่ใช่ตาของคุณ" : !openShop || (!nearShops.includes(openShop) && !me?.remoteShop) ? "ต้องอยู่ติดร้าน" : bagFull && !(openShop.kind === "rtfood" || openShop.kind === "rtcart") ? "กระเป๋าเต็ม" : null; // แผงวัตถุดิบ: ซ้อนกองเดิมได้แม้กระเป๋าเต็ม (server ตัดสิน)
  const viewShop = (sh) => { if (!sh) return; clickSound(); socket.emit("viewShop", { shopId: sh.id }); setShopId(sh.id); };
  // ป้ายระยะบนปุ่มสกิล (GRID_PLAN §7.2)
  //  target รูปเฉพาะ (area.cells — ไม่มี range) = ไม่มีป้ายระยะ
  const areaText = (a) => !a ? "" : a.kind === "target" ? (a.range != null ? `ระยะ ${a.range}` : "") : a.kind === "aoe" ? (a.square ? `รอบตัว ${a.range * 2 + 1}×${a.range * 2 + 1}` : `รอบตัว ${a.range}`)
    : a.kind === "line" ? (a.arc ? `ครึ่งวง ${a.arc}` : a.cone ? `กรวย ${a.len}` : `ทิศทาง ${a.len}×${a.width}`) : a.kind === "tile" ? (a.band ? `แถบ ${a.band}` : a.range >= 26 ? "ทั้งสนาม" : `ระยะ ${a.range}`) : a.kind === "field" ? "ทั้งสนาม" : "";
  // ชั้นมิติ (วาเลนไทน์ · GRID_PLAN §7.13): คนคนละชั้นกับตัวที่คุม = ไม่นับเป็นเป้า/คนในระยะ
  const sameDim = (p) => !!p && (p.dim || null) === (me?.dim || null);
  // สกิลเลือกเป้าที่ไม่มีใครอยู่ในระยะ = กดไม่ได้ (เลือกตัวเองได้ = มีเป้าเสมอ)
  //  area.cells = ช่องตามรูปนับจากช่องของเรา: ต้องมีศัตรูยืนบนช่องนั้น
  const onCells = (p, cells) => cells.some(([dx, dy]) => Rules.covers(boxOfP(p), me.pos.x + dx, me.pos.y + dy));
  const noTargetInRange = (a) => !!a && a.kind === "target" && !a.self && !!me?.pos
    && !state.players.some((p) => p.alive && p.pos && p.id !== me.id && sameDim(p)
      && (Array.isArray(a.cells) && a.cells.length ? enemyOf(p) && onCells(p, a.cells) : Rules.dist(boxOfP(p), boxOfP(me)) <= (a.range || 0)));
  // ยูนะ: มีคนที่ขี่ได้อยู่ติดกันไหม (ตัวเล็ก 1×1 · ไม่ได้ขี่/ถูกขี่อยู่) — ไม่มี = ไม่แสดงปุ่ม "ขี่" (ผู้ใช้สั่ง 2026-10-19)
  const rideNear = !!me?.yuna?.canRide && !!me.pos && (state.players || []).some((p) => p.alive && p.pos && p.id !== me.id && !p.ride && !p.summon && sameDim(p)
    && (p.size || 1) <= 1 && !(state.players || []).some((o) => o.alive && o.ride === p.id)
    && Math.abs(p.pos.x - me.pos.x) + Math.abs(p.pos.y - me.pos.y) === 1);
  // ตัวที่เหมือนกัน (summon double) = ฝ่ายกลาง: ทุกคนในชั้นเดียวกันตีได้
  const enemyOf = (p) => !!me && p.id !== me.id && sameDim(p)
    && (p.summon?.kind === "double" || (!sameSide(p, me) && !(teamMode && me.teamId && p.teamId === me.teamId)));
  // เข้าช่วงโจมตี -> ฉากประกาศ "เริ่มโจมตีได้" + เสียงเปลี่ยนช่วง (ไม่บังการกดเลือกเป้า)
  useEffect(() => {
    if (phase !== "ATTACK") return;
    if (announced.current.atk === state.roundNumber) return;
    announced.current.atk = state.roundNumber;
    playSfx("change_cutscene");
    pushScene("atk");
  }, [phase, state.roundNumber, pushScene]);
  // ฉากบอกจำนวนเทิร์น -> เสียงเปลี่ยนช่วงเดียวกัน
  useEffect(() => {
    if (phase !== "TRANSITION") return;
    playSfx("change_cutscene");
  }, [phase, state.roundNumber]);
  // เข้าช่วงจั่วการ์ด -> ฉากประกาศ "เริ่มจั่วการ์ด"
  //  ถ้าเพิ่งผ่านแบนเนอร์เปลี่ยนเทิร์นมา ไม่เล่นเสียงซ้ำ (แบนเนอร์ประกาศเสียงไปแล้ว)
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase !== "PLAYING") return;
    if (announced.current.draw === state.roundNumber) return;
    announced.current.draw = state.roundNumber;
    // แบนเนอร์เปลี่ยนเทิร์นเพิ่งประกาศเสียงไป ไม่ต้องซ้ำอีกครั้ง
    if (prev !== "TRANSITION") playSfx("change_cutscene");
    pushScene("draw");
  }, [phase, state.roundNumber, pushScene]);
  // ร้านปรากฏ: ประกาศชื่อร้านใหม่ที่เพิ่งตั้งบนกระดาน (หลายร้านพร้อมกัน = ประกาศครั้งเดียว ชื่อต่อกัน)
  const shopIdsSig = shopList.map((sh) => `${sh.id ?? `${sh.kind}@${sh.x},${sh.y}`}|${sh.kind || ""}|${sh.name || ""}`).join("~");
  useEffect(() => {
    if (!shopIdsSig) return;
    const fresh = [];
    for (const part of shopIdsSig.split("~")) {
      const [id, kind, name] = part.split("|");
      if (shopSeen.current.has(id)) continue;
      shopSeen.current.add(id);
      fresh.push(name || shopName(kind));
    }
    if (fresh.length) pushScene("shop", { name: [...new Set(fresh)].join(" · ") }); // คิวจัดลำดับให้ต่อท้ายฉากต้นเทิร์นเอง
  }, [shopIdsSig, pushScene]);
  // ผู้เล่นที่กำลังเปิดดูสถานะ (ข้อมูลสดจาก state ทุกครั้งที่ re-render)
  const statusView = statusViewId ? state.players.find((x) => x.id === statusViewId) : null;
  // กลางวัน/กลางคืน (patch 1.7): สลับทุก 3 เทิร์น — โอเบรอนสลับร่าง/ท่าไม้ตายตามช่วงเวลา
  const nightNow = state.cycle === "night";
  // ห้ามจั่วการ์ดเพิ่มเทิร์นนี้
  const noDraw = !!(me && me.statuses?.nodraw);
  // ห้ามใช้สกิลเทิร์นนี้
  const noSkill = !!(me && (me.statuses?.noskill || me.stageNoSkill)); // stageNoSkill = สนาม Eos: อยู่ในรถ
  const isMuimi = ch?.id === "muimi"; // เสบียงฉุกเฉินไม่นับเป็นการใช้สกิลหลักของเทิร์น
  const basicFree = isMuimi; // สกิลพื้นฐานที่กดได้แม้ใช้โควตาเทิร์นแล้ว (เสบียงฉุกเฉิน) — ตัวอื่นมาจาก skillLocks.basic.free
  const muimiUltCd = isMuimi ? (me?.muimiUltCd || 0) : 0;
  // โอเบรอน (ฤดูร้อน): server ส่งล็อก/คูลดาวน์รายช่องมาเป็นก้อนกลาง (skillLocks)
  const giftLocks = me?.skillLocks || {};
  const giftCd = (t) => (giftLocks[t] && giftLocks[t].cd) || 0;
  const giftLocked = (t) => !!(giftLocks[t] && (giftLocks[t].locked || giftLocks[t].cd > 0));
  // free = ช่องนี้ไม่กินโควตา 1 สกิล/เทิร์น — skillUsed แล้วยังกดได้
  const giftFree = (t) => !!(giftLocks[t] && giftLocks[t].free);
  const muimiBasicLocked = isMuimi && ((me?.muimiEmergencyUses || 0) <= 0 || !!me?.muimiEmergencyUsed);
  const muimiUltLocked = isMuimi && ((me?.statuses?.muimiRusty || 0) > 0 || (me?.statuses?.muimiTower || 0) > 0 || muimiUltCd > 0);

  // สกิลช่วงจั่วการ์ด: server แจ้งมา -> เด้งทันที (ไม่ตัดเข้าจอดำ) แล้วหายเอง
  //  บั๊กเดิม: ป้ายนี้มีช่องเดียวใช้ร่วมกันทั้งเกม ถ้ามีสกิลใหม่ (ของใครก็ได้) เด้งเข้ามาถี่กว่า 1.8 วิ
  //  ตัวจับเวลาจะรีเซ็ตใหม่ทุกครั้งไม่มีที่สิ้นสุด ทำให้ป้ายค้างอยู่นานผิดปกติทั้งที่สกิลแต่ละอันจบไปนานแล้ว
  //  แก้โดยจับเวลาเริ่มของ "ชุดป้ายที่ต่อเนื่องกัน" (flashStartRef) ไว้ครั้งเดียวตอนป้ายว่างแล้วเพิ่งมีอันใหม่ขึ้น
  //  แล้วบังคับหายภายใน FLASH_MAX_MS จากจุดนั้นเสมอ ไม่ว่าจะมีสกิลใหม่มาต่อคิวรีเฟรชเนื้อหากี่รอบก็ตาม
  const FLASH_MAX_MS = 1800;
  const flashRef = useRef(null);
  const flashStartRef = useRef(0);
  useEffect(() => { flashRef.current = flash; }, [flash]);
  const noticeRef = useRef(null);
  const noticeStartRef = useRef(0);
  useEffect(() => { noticeRef.current = notice; }, [notice]);
  useEffect(() => {
    const onFlash = (f) => {
      if (!flashRef.current) flashStartRef.current = Date.now();
      setFlash({ ...f, id: Date.now() });
      if (f.sound) playSfx(f.sound); // เสียงเฉพาะสกิล (ถ้ามี)
    };
    socket.on("skillFlash", onFlash);
    return () => socket.off("skillFlash", onFlash);
  }, []);
  useEffect(() => {
    if (!flash) return;
    const remain = Math.max(150, FLASH_MAX_MS - (Date.now() - flashStartRef.current));
    const t = setTimeout(() => setFlash(null), remain);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    const onNotice = (n) => {
      if (!noticeRef.current) noticeStartRef.current = Date.now();
      setNotice({ ...n, id: Date.now() });
    };
    socket.on("transformNotice", onNotice);
    return () => socket.off("transformNotice", onNotice);
  }, []);
  // ปุ่มลัดคีย์บอร์ด (ผู้ใช้สั่ง 2026-11-09): กดปุ่มบนจอที่มี data-hotkey ตรงกัน — กดไม่ได้ (disabled/ซ่อน) = ไม่ทำอะไร
  //  1/2/3 = สกิล · F = โจมตี / จั่ว · Enter = จบตา / พอ · Z = ย้อน · B = กระเป๋า (ใช้ตำแหน่งปุ่ม e.code — แป้นโหมดไทยก็ใช้ได้)
  //  มีหน้าต่าง/ฉากบังปุ่มอยู่ = ไม่กด · กำลังพิมพ์/โฟกัสอยู่บนปุ่ม (Enter) = ปล่อยให้เบราว์เซอร์จัดการเอง
  useEffect(() => {
    const KEY = { Digit1: "1", Numpad1: "1", Digit2: "2", Numpad2: "2", Digit3: "3", Numpad3: "3", KeyF: "F", KeyZ: "Z", KeyB: "B", Enter: "Enter", NumpadEnter: "Enter" };
    const onKey = (e) => {
      const hk = KEY[e.code];
      if (!hk || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      // Enter บนปุ่มที่โฟกัสด้วยคีย์บอร์ด (Tab) = กดปุ่มนั้นตามปกติ · โฟกัสค้างจากการคลิกเมาส์ = ใช้เป็นปุ่มลัด (ไม่กดปุ่มที่คลิกไปล่าสุดซ้ำ)
      const onCtl = hk === "Enter" && el && el.closest && el.closest("button, a[href], [role='button']");
      if (onCtl && el.matches(":focus-visible")) return;
      const modal = Array.from(document.querySelectorAll("[aria-modal='true']")).pop() || null;
      // ปุ่มต้องมองเห็นและไม่มีหน้าต่างอื่นบังอยู่ (ทดสอบจุดกลางปุ่ม — ฉากซ้อน/หน้าต่างเลือกท่า/กระเป๋า/ร้าน บัง = ไม่กด)
      const onTop = (b) => {
        const r = b.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && b.contains(hit);
      };
      const btn = Array.from(document.querySelectorAll(`[data-hotkey="${hk}"]`))
        .find((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true" && (!modal || modal.contains(b)) && onTop(b));
      if (onCtl) { e.preventDefault(); el.blur(); }
      if (!btn) return;
      e.preventDefault();
      btn.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // เสียงสั้นๆ จาก server ที่ทุกคนได้ยิน (ไม่มีป้าย)
  //  f.voice = เสียงพากย์ของผู้เล่นคนนั้น (server/voice.js) — ตัดประโยคเก่าของคนเดียวกันก่อนพูดประโยคใหม่ (ไม่พูดซ้อนกัน)
  useEffect(() => {
    const voices = new Map();
    const onSfx = (f) => {
      if (!f?.sound) return;
      if (!f.voice) { playSfx(f.sound); return; }
      const prev = voices.get(f.voice);
      if (prev) stopSfx(prev.a, prev.id);
      const a = playSfx(f.sound, { voice: true });
      if (a) voices.set(f.voice, { a, id: sfxPlayId(a) });
    };
    socket.on("sfx", onSfx);
    return () => socket.off("sfx", onSfx);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const remain = Math.max(150, FLASH_MAX_MS - (Date.now() - noticeStartRef.current));
    const t = setTimeout(() => setNotice(null), remain);
    return () => clearTimeout(t);
  }, [notice]);

  const skill = (tier) => {
    clickSound();
    // จอคอม (ระบบกระดาน): สกิลที่มีระยะ → เลือกเป้า/ทิศบนกระดานก่อน · self → ใช้ทันที (GRID_PLAN §7.2)
    if (vp.w >= 768) {
      // ปุ่มที่ "ทำงานอยู่" (skillPub active — วาเลนไทน์ในมิติหลบสายตา: กด = ออก) ใช้ทันที ไม่เลือกเป้า
      if (ch?.[tier]?.active) { socket.emit("useSkill", { tier }); return; }
      const kind = ch?.[tier]?.area?.kind || "self";
      if (kind === "target" || kind === "aoe" || kind === "line" || kind === "tile") { setPickReq({ kind: "skill", tier }); return; }
      socket.emit("useSkill", { tier });
      return;
    }
    // โอเบรอน (ฤดูร้อน) สกิลรอง/ท่าไม้ตาย: เข้าโหมดเลือกเป้าหมายกลาง (เลือกตัวเองได้)
    if (ch?.id === "oberon_summer" && (tier === "secondary" || tier === "ultimate")) { setGiftSel({ tier, anyone: true, name: ch[tier]?.name }); return; }
    socket.emit("useSkill", { tier });
  };
  // ป๊อปอัปยืนยันก่อนใช้สกิล (patch UX): กดช่องสกิล -> ถามยืนยันก่อนเสมอ ค่อยเรียก skill(tier) จริงตอนกด "ใช้งาน"
  //  เก็บข้อมูลสกิล/ลำดับ/แต้มที่ใช้จริง (หลังหักส่วนลด) ไว้โชว์ในป๊อปอัป — ยกเลิกแล้วไม่มีอะไรเกิดขึ้น
  const [skillConfirm, setSkillConfirm] = useState(null); // { tier, skillData, label, useCost }
  const [hkForms, setHkForms] = useState(false); // ไรโด ฮิคารุ: ตัวเลือกร่าง UltraLive เปิดอยู่
  if (hkForms && !myTurn) setHkForms(false); // หมดตาเรา = ปิดตัวเลือกร่าง
  // ปุ่มสกิลแบบหลายตัวเลือก (skill.choices — เคท/เอมิลิโกะ): tier ที่ตัวเลือกเปิดอยู่ · หมดตา/สลับตัว = ปิด
  const [choiceOpen, setChoiceOpen] = useState(null); // { tier, unit }
  // เคนซากิ คาซุมะ: แผงการ์ด Blay Rouzer (ช่องสกิลรองเฉพาะตัว) · หมดตา/คืนร่าง = ปิด
  const [kzOpen, setKzOpen] = useState(false);
  if (kzOpen && (!myTurn || canto || !me?.kazuma?.blade)) setKzOpen(false);
  // ฉากใส่การ์ด Evolution (Rouze Absorber) · หมดตา/เข้าร่างแล้ว = ปิด
  const [kzEvolve, setKzEvolve] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false); // อินุอิ: Faiz Phone กางอยู่
  if (phoneOpen && (!myTurn || canto || !me?.inui?.opened)) setPhoneOpen(false);
  if (kzEvolve && (!myTurn || canto || !me?.kazuma?.canEvolve)) setKzEvolve(false);
  if (choiceOpen && (!myTurn || (canto && !cantoTier(choiceOpen.tier)) || choiceOpen.unit !== me?.id || !ch?.[choiceOpen.tier]?.choices)) setChoiceOpen(null);
  // ตัวเลือกที่ไม่กินโควตา 1 สกิล/เทิร์น (server: ราคา 0 = สลับอาวุธ/ดาบเขม่า) — choice.free ทับได้ถ้า server ส่งมา
  const choiceFree = (c) => (c.free != null ? !!c.free : (c.cost || 0) === 0);
  // เลือกตัวเลือกแล้ว: self = ใช้ทันที · มีระยะ = เข้าโหมดเลือกเป้า/ทิศบนกระดานตามพื้นที่ของตัวเลือก
  const pickChoice = (tier, c) => {
    setChoiceOpen(null);
    const a = c.area || { kind: "self" };
    if (a.kind === "target" || a.kind === "aoe" || a.kind === "line" || a.kind === "tile") { setPickReq({ kind: "skill", tier, form: c.key, area: a, name: c.name }); return; }
    socket.emit("useSkill", { tier, form: c.key });
  };
  //  ถ้าผู้เล่นปิด "ยืนยันสกิล" จากหน้าโต๊ะรวมผู้เล่น -> ข้ามป๊อปอัป ใช้สกิลทันทีที่กดช่อง
  // อินุอิ Start Up: เสียง axel_startUp_soundeffect เริ่มพร้อมเพลงตอนนับ 10 วิ (ทุกคนได้ยิน) · พักพร้อมนาฬิกา (ฉากตี/คลิป)
  const inuiUp = (state.players || []).some((p) => p.inui?.startUp?.running);
  const clockWorld = !!state.clockUp && !state.clockUp.paused; // ช่วง Clock Up (server/clockUp.js) — ตัวหยุดเวลาแทรก = ปิด
  const faizClock = state.clockUp ? state.clockUp.members.find((m) => m.kind === "faiz" && !m.over) : null;
  const alterWorld = clockWorld && state.clockUp.members.some((m) => m.kind === "alter" && !m.over); // เอมิยะ คริซุงุ Time Alter: จอโทนส้ม
  const inuiUpRef = useRef(false);
  useEffect(() => {
    if (inuiUp && !inuiUpRef.current) { inuiUpRef.current = true; startLoopSfx("inui_startup"); }
    else if (!inuiUp && inuiUpRef.current) { inuiUpRef.current = false; stopLoopSfx(); return; }
    if (inuiUp) { if (phase === "ACTION") resumeLoopSfx(); else pauseLoopSfx(); } // เดินตามนาฬิกา 10 วิ: ฉากตี/คลิปพักทั้งคู่
  }, [inuiUp, phase]);
  // เอมิยะ คริซุงุ Time Alter: เสียงหัวใจเต้นวนตลอดช่วง (ผู้ใช้สั่ง 2026-11-11 · Mixkit "Fast Heartbeat") · คลิปเล่น = พัก (ห้ามซ้อนวีดีโอ) · Start Up ของอินุอิมาก่อน
  const alterBeat = alterWorld && !inuiUp;
  const alterBeatRef = useRef(false);
  useEffect(() => {
    if (alterBeat && !alterBeatRef.current) { alterBeatRef.current = true; startLoopSfx("kiri_heart"); }
    else if (!alterBeat && alterBeatRef.current) { alterBeatRef.current = false; stopLoopSfx(); return; }
    if (alterBeat) { if (phase === "CUTSCENE") pauseLoopSfx(); else resumeLoopSfx(); }
  }, [alterBeat, phase]);
  useEffect(() => () => { if (alterBeatRef.current) stopLoopSfx(); }, []);
  // เฟรดดี้ (กลางวัน): ผู้ชมอยู่ใกล้ = เพลงวนจนออกห่าง (state.freddyNear — per-viewer) · ไม่ทับลูปของคนอื่น
  //  มินิเกมประตู / คลิป = ไม่มีเพลงนี้
  const freddyLoop = inuiUp || alterBeat || phase === "CUTSCENE" || state.freddyDoor ? null : state.freddyNear ? "freddy_music" : null;
  const freddyLoopRef = useRef(null);
  useEffect(() => {
    if (freddyLoopRef.current === freddyLoop) return;
    if (freddyLoopRef.current) stopLoopSfx();
    freddyLoopRef.current = freddyLoop;
    if (freddyLoop) startLoopSfx(freddyLoop);
  }, [freddyLoop]);
  useEffect(() => () => { if (freddyLoopRef.current) stopLoopSfx(); }, []);
  const requestSkillUse = (tier, skillData, label, useCost) => {
    // ไรโด ฮิคารุ UltraLive: เลือกร่างจากตัวเลือก 7 ปุ่ม (การเลือกร่าง = การยืนยัน)
    if (me?.hikaru && tier === "basic" && vp.w >= 768) { clickSound(); setHkForms(true); return; }
    // อินุอิ ทาคุมิ: Faiz Phone แผงกดรหัส (เปิดกระเป๋าแล้ว)
    if (me?.inui?.opened && tier === "basic" && vp.w >= 768) { clickSound(); setPhoneOpen(true); return; }
    // เคนซากิ คาซุมะ: เปิดแผงการ์ด Blay Rouzer — เสียงเปิดแผงทุกครั้ง (เฉพาะคนกด · ผู้ใช้สั่ง 2026-10-25)
    if (me?.kazuma && tier === "secondary" && vp.w >= 768) { playSfx("kazuma_open"); setKzOpen(true); return; }
    // ปุ่มหลายตัวเลือก: เปิดตัวเลือก (การเลือก = การยืนยัน)
    if (ch?.[tier]?.choices && vp.w >= 768) { clickSound(); setChoiceOpen({ tier, unit: me?.id }); return; }
    // ระบบคู่: กระจกเงา (สลับตัว · 0 แต้ม) ไม่ต้องยืนยัน — ตื่นขึ้นอีกครั้ง (มีราคา) ยังถามตามการตั้งค่า
    const quickSwitch = tier === "basic" && (me?.duoWith || me?.duoOf) && !ch?.basic?.cost;
    // ปุ่มที่ทำงานอยู่ (กด = ออก · 0 แต้ม) ไม่ต้องยืนยัน
    if (!skillConfirmOn || quickSwitch || ch?.[tier]?.active) { skill(tier); return; }
    setSkillConfirm({ tier, skillData, label, useCost });
  };
  const cancelSkillConfirm = () => { clickSound(); setSkillConfirm(null); };
  const confirmSkillUse = () => {
    if (!skillConfirm) return;
    const t = skillConfirm.tier;
    setSkillConfirm(null);
    skill(t);
  };
  // หมดตาเรา / ของถูกใช้ไปแล้ว = ออกจากโหมดเลือกเป้า
  useEffect(() => {
    if (!pickReq) return;
    const gone = (pickReq.kind === "action" && !(me?.actions || []).some((x) => x.key === pickReq.key && !x.disabled && Array.isArray(x.tiles) && x.tiles.length));
    if (!myTurn || canto || gone) setPickReq(null);
  }, [pickReq, myTurn, canto, me?.actions]);
  // Road Trip: ปุ่มรถตู้ตอนสู้บนรถ (หักรถชน · ยิงป้อมปืน · ขึ้น/ลงหลังคา) — เข้าแถวปุ่มพิเศษของ HUD · ปุ่มลัด G H T Y (roadtrip/rtVanActions.jsx)
  const rtVanBtns = rtVanButtons({
    rt: state.gameMode === "roadtrip" ? state.roadtrip : null, youId: state.youId, me, round: state.roundNumber,
    defs: state.board ? RT_DEFS[state.board.area] : null, enabled: myTurn && !canto,
    picking: pickReq?.kind === "rtTurret",
    onTurret: () => setPickReq((r) => (r && r.kind === "rtTurret" ? null : { kind: "rtTurret" })),
  });
  useRtVanHotkeys(rtVanBtns);
  const rtTurretOk = rtVanBtns.some((b) => b.key === "rt:turret" && !b.disabled);
  useEffect(() => { if (pickReq?.kind === "rtTurret" && !rtTurretOk) setPickReq(null); }, [pickReq, rtTurretOk]);
  // โหมดเลือกเป้าที่ส่งให้ BoardStage
  let boardPick = null;
  if (pickReq && me) {
    const done = () => setPickReq(null);
    if (pickReq.kind === "skill") {
      const s = ch?.[pickReq.tier];
      // ตัวเลือกของปุ่มหลายตัวเลือก: พื้นที่/ชื่อของตัวเลือก + ส่ง form ไปด้วย
      const a = pickReq.area || s?.area || {};
      const label = `${pickReq.name || s?.name || ""} · ${areaText(a)}`;
      const tier = pickReq.tier;
      const f = pickReq.form ? { form: pickReq.form } : {};
      // area.cells (วาเลนไทน์ "รู้จักตัวเองอย่างแท้จริง") = เลือกศัตรูที่ยืนบนช่องตามรูป
      const cells = Array.isArray(a.cells) && a.cells.length ? a.cells : null;
      // area.count (เซลิน: จับคู่สลับ 2 คน) = เลือกให้ครบก่อนส่ง (onPick ได้ array) · เซลินสลับ/จับคู่ = ไม่ใช่ตัวเอง ไม่ใช่ตัว 2×2 ขึ้นไป
      const count = Math.max(1, a.count | 0);
      const small = ch?.id === "celine" && (pickReq.form === "swap" || pickReq.form === "pair") ? { allow: (p) => p.id !== me.id && (p.size || 1) <= 1 } : {};
      if (a.kind === "target") boardPick = { kind: "target", range: [1, a.range || 0], self: !!a.self, count, ...(cells ? { cells, allow: enemyOf } : {}), ...small, label, onPick: (id) => { socket.emit("useSkill", { tier, targets: Array.isArray(id) ? id : [id], ...f }); done(); }, onCancel: done };
      else if (a.kind === "aoe") boardPick = { kind: "aoe", radius: a.range || 0, square: !!a.square, label, onConfirm: () => { socket.emit("useSkill", { tier, ...f }); done(); }, onCancel: done };
      else if (a.kind === "line") boardPick = { kind: "line", len: a.len || 1, width: a.width || 1, arc: a.arc || 0, cone: !!a.cone, label, onPick: (dir) => { socket.emit("useSkill", { tier, dir, ...f }); done(); }, onCancel: done };
      // เลือกช่องบนกระดาน (Ice Spike — วางน้ำแข็ง/หนาม/คุก) · dir = ทิศผลักเฉพาะวางหนามทับคน
      //  orient = แนวกำแพงน้ำแข็งของเซลิน (place "wall" · "h" | "v")
      //  place "list" = ช่องที่เลือกได้มาจาก server (area.tiles มุมบนซ้าย · foot = ขนาดกรอบ — กล่องของลาพลัส 2×2)
      //  place "list" + count (ลอว์: Shambles / Shamble เลือก 2 อย่าง) = เลือกครบแล้วส่ง tiles ทีเดียว
      else if (a.kind === "tile") boardPick = { kind: "tile", range: a.range || 0, place: a.place || "any", square: a.square || 0, rect: a.rect || null, band: a.band || 0, ...(a.place === "list" ? { tiles: Array.isArray(a.tiles) ? a.tiles : [], foot: Math.max(1, a.foot | 0), count } : {}), label, onPick: (tile, dir, orient) => { socket.emit("useSkill", { tier, ...(Array.isArray(tile) ? { tiles: tile } : { tile }), ...(dir ? { dir } : {}), ...(orient ? { orient } : {}), ...f }); done(); }, onCancel: done };
    } else if (pickReq.kind === "ride") {
      // ยูนะ: ขอขี่คนที่อยู่ติดกัน (server/ride.js) — เจ้าของคนนั้นต้องกดยินยอม
      boardPick = { kind: "target", range: [1, 1], allow: (p) => p.id !== me.id && !p.ride && !p.summon && (p.size || 1) <= 1 && !(state.players || []).some((o) => o.ride === p.id), label: "ขี่", onPick: (id) => { socket.emit("rideAsk", { targetId: id }); done(); }, onCancel: done };
    } else if (pickReq.kind === "bomb") {
      // ระเบิดธาตุ (GRID_PLAN §8.7): เลือกช่องกลางในระยะเดินปกติ · กรอบ 3×3 ตามเมาส์
      const el = ELEMENTS[pickReq.el] || ELEMENTS.fire;
      boardPick = { kind: "tile", range: me.baseMov || me.mov || 0, place: "any", square: 3, label: `💣 ${el.icon} ${el.name}`, onPick: (tile) => { clickSound(); socket.emit("useInventoryItem", { uid: pickReq.uid, tile, element: pickReq.el }); done(); }, onCancel: done };
    } else if (pickReq.kind === "rtTurret") {
      // Road Trip: ยิงป้อมปืน = เลือกช่องในระยะ 4 จากรถตู้ → rt:turret { x, y }
      const tiles = turretTiles(state.roadtrip, state.board, state.board ? RT_DEFS[state.board.area] : null);
      boardPick = { kind: "tile", place: "list", tiles, foot: 1, label: "🎯 ยิงป้อมปืน", onPick: (tile) => {
        // ยิงได้เฉพาะช่องที่มีมอน (server ตรวจซ้ำ) — ช่องว่าง = เลือกต่อ
        const mob = (state.players || []).some((o) => o.alive && o.summon && o.summon.ownerId === "rt" && o.pos && o.pos.x === tile.x && o.pos.y === tile.y);
        if (!mob) return;
        clickSound(); rtEmit("rt:turret", { x: tile.x, y: tile.y }); done();
      }, onCancel: done };
    } else if (pickReq.kind === "action") {
      // ปุ่มพิเศษที่มี tiles (actions[].tiles): เลือกช่องบนกระดาน (มุมบนซ้ายของตัว) → charAction { key, tile }
      const act = (me.actions || []).find((x) => x.key === pickReq.key);
      const tiles = act && Array.isArray(act.tiles) ? act.tiles : [];
      boardPick = { kind: "tile", place: "list", tiles, foot: Math.max(1, me.size | 0), label: act ? act.name : pickReq.key, onPick: (tile) => { socket.emit("charAction", { key: pickReq.key, tile }); done(); }, onCancel: done };
    }
  }
  const pickGift = (id) => {
    socket.emit("useSkill", { tier: giftSel.tier, targets: [id], item: giftSel.item });
    setGiftSel(null);
  };
  useEffect(() => {
    if (giftSel && (phase !== "PLAYING" || done)) setGiftSel(null);
  }, [giftSel, phase, done]);

  // แบนเนอร์สลับกลางวัน/กลางคืน: เด้งเมื่อ cycle เปลี่ยนระหว่างแมตช์ แล้วหายเอง
  useEffect(() => {
    if (prevCycle.current && state.cycle && prevCycle.current !== state.cycle) {
      const j = state.journey;
      pushScene("cycle", {
        cycle: state.cycle,
        // การเดินทาง: ผลของช่วงเวลานี้ตามภูมิภาคที่อยู่ (ไม่ใช่กติกาวัน/คืนเดิม)
        journey: j ? { name: j.name, text: state.cycle === "night" ? j.nightDesc : j.day } : null,
      });
    }
    prevCycle.current = state.cycle;
  }, [state.cycle, state.journey, pushScene]);

  // เฟส CUTSCENE: วีดีโอแปลงร่าง (key=id -> remount กันจอดำ)
  //  โหมดประหยัด (patch 2.0.6): ข้ามวีดีโอ — แสดงกระดาน + แจ้งเตือนว่าใครเปิดท่าไม้ตาย รอเวลาเท่าวีดีโอจริง
  const csSkipped = lowQ && phase === "CUTSCENE" && state.cutscene ? state.cutscene : null;
  const cutsceneEl = phase === "CUTSCENE" && state.cutscene && !lowQ ? <Cutscene key={state.cutscene.id} cs={state.cutscene} />
    : null;
  // จอคอม: คัตซีนลอยทับกระดาน (ท้าย return ด้านล่าง) — เดิมคืนคัตซีนแทนกระดานทั้งจอ ทำให้กระดาน+สนาม 2.5D+HUD
  //  ถูกถอดแล้ว mount ใหม่ทุกครั้งที่จบคัตซีน (สร้างฉากใหม่ทั้งหมด = จอกระตุก/กะพริบตอนกลับมา) · มือถือคงแบบเดิม
  if (cutsceneEl && vp.w < 768) return cutsceneEl;

  // สถานะ+handler ของทุกโหมดเลือกเป้าหมาย มัดรวมไว้ที่เดียว ใช้ร่วมกันทั้ง layout มือถือและจอใหญ่ (ดู isTargetable/resolveAttackPick)
  const targetChain = {
    giftSel, pickGift,
    myId: me?.id,
    myTeamId: me?.teamId,
    teamModeActive: state.gameMode === "duo" || state.gameMode === "trio" || state.gameMode === "eos",
  };

  // ============================================================
  //  โหมดมือถือแนวตั้ง (< 768px): layout เฉพาะโทรศัพท์ ไม่ย่อจากจอคอม
  //  บน = การ์ดคู่ต่อสู้ (แตะเพื่อโจมตี) | ล่าง = แผงเรา + ปุ่มใหญ่เต็มนิ้ว
  // ============================================================
  if (vp.w < 768) {
    const revealed = phase === "SUMMARY" || phase === "ATTACK" || phase === "ATTACKING";
    return (
      <div className="fixed inset-0 overflow-hidden flex flex-col">
        <GameBackground cycle={state.cycle} round={state.roundNumber} lowQ={lowQ} />
        {/* แถบบน: รอบ + เวลา (เว้นขวาให้ปุ่มเสียง) */}
        <div className="shrink-0 flex flex-col items-center gap-1 pt-2 px-14 min-h-[40px]">
          {(phase === "PLAYING" || phase === "ATTACK") && (
            <div className="p-chip text-base font-bold text-white bg-black/55 px-5 py-1 border-b-2" style={{ borderColor: "var(--color-p-accent-bright)" }}>
              <span>{nightNow ? "🌙" : "☀️"} รอบที่ {state.roundNumber} · ⏱️ <TickSeconds /> วิ</span>
            </div>
          )}
        </div>

        {/* คู่ต่อสู้: การ์ดกริด (แตะการ์ดเพื่อโจมตีตอนเป็นผู้ชนะ) */}
        <div className={`shrink-0 max-h-[36vh] overflow-y-auto grid gap-2 px-2 pt-2 ${seatOthers.length <= 1 ? "grid-cols-1 max-w-sm w-full mx-auto" : "grid-cols-2"}`}>
          {seatOthers.map((p) => (
            <MobileOpponent
              key={p.id}
              p={p}
              phase={phase}
              targetable={isTargetable(p, iAmAttacker, targetChain)}
              onAttack={(id) => resolveAttackPick(id, targetChain)}
              onInspect={setStatusViewId}
              hostRef={(el) => registerOther(p.id, el)}
            />
          ))}
        </div>
        {iAmAttacker && (
          <div className="shrink-0 text-center mt-1.5 text-lg font-black text-echo-ice animate-pulse text-hard">
            ⚔️ แตะการ์ดคู่ต่อสู้เพื่อโจมตี!
          </div>
        )}
        {/* กลางจอ: กองการ์ดกลาง ทับตำแหน่งโลโก้เดิม (โลโก้เป็นแค่วอเตอร์มาร์กจางๆ ด้านหลัง) */}
        <div className="flex-1 min-h-0 grid place-items-center pointer-events-none">
          <div className="relative grid place-items-center">
            <img src="/image/logo_current.webp" alt="" className="h-14 w-auto opacity-25" />
            <div className="absolute inset-0 grid place-items-center">
              <DeckPile hostRef={deckRef} size="md" onClick={() => setDeckOpen(true)} />
            </div>
          </div>
        </div>
        {deckOpen && <DeckLedgerModal ledger={state.deckLedger || []} onClose={() => setDeckOpen(false)} />}
        {me?.qte && <QtePanel key={me.qte.idx} qte={me.qte} />}

        {/* ---------- แผงตัวเรา (ล่างสุด กดง่ายด้วยนิ้วโป้ง) ----------
            ออกแบบใหม่: รูป/แต้มรวม ลอยเป็นป้ายเฉียงเจาะทับขอบบนแผง (ไม่ใช่แถวในกล่องเหมือนเดิม)
            ช่องสกิล 3 อันจัดทรงพัด (ช่องกลางยกสูงกว่า) และปุ่มจั่ว/เปิดไพ่รวมเป็นปุ่มเดียวแบ่งเฉียงกลาง
            กระเป๋า/ร้านค้าย้ายไปเป็นไอคอนกลมลอยนอกแผงแทนปุ่มยาวเต็มแถว */}
        {me && (
          <div className="shrink-0 px-2 pb-2">
            <div className="p-self-panel relative rounded-3xl p-3 pt-8 shadow-2xl">
              {/* ป้ายลอย: รูปเรา (ซ้าย) */}
              <button
                onClick={() => { clickSound(); setShowChar(true); }}
                className="absolute -top-7 left-3 z-20"
                title="รายละเอียดตัวละคร"
                style={{ "--p-frame-color": me.color }}
              >
                {<Portrait p={me} className="w-14 h-16 p-player-frame" rounded="rounded-xl" />}
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-black/75 rounded-full px-1.5 leading-tight whitespace-nowrap">ℹ️</span>
              </button>
              {/* ป้ายลอย: แต้มรวม (ขวา) */}
              <TeamBadge teamId={me.teamId} className="absolute -top-5 left-1/2 -translate-x-1/2 z-20" />
              <div
                className="absolute -top-6 right-3 z-20 px-4 py-1 text-center font-black text-gray-900"
                style={{ background: "linear-gradient(120deg,#dcefff,var(--color-echo-ice))", clipPath: "polygon(12% 0,100% 0,88% 100%,0 100%)" }}
              >
                <div className="text-[10px] leading-none" style={{ fontFamily: P_DISPLAY }}>แต้มรวม</div>
                <div className="text-2xl leading-tight" style={{ fontFamily: P_DISPLAY }}>{me.score != null ? me.score : "???"}</div>
              </div>

              {/* การ์ด/แต้ม: เต็มความกว้าง จัดกลาง (ไม่ต้องแบ่งที่ให้รูป/คะแนนอีกต่อไป) */}
              <div ref={selfHandRef} className="flex items-center justify-center overflow-x-auto min-h-[52px]">
                {me.cards === null ? (
                  // ตาบอด: การ์ด/แต้มของตัวเองก็ถูกซ่อน
                  <div className="text-3xl font-black opacity-80">🌑 ???</div>
                ) : revealed ? (
                  <div className="text-3xl font-black">
                    {me.busted ? <span className="text-echo-hp">แตก!</span> : <>แต้ม <span className="text-echo-ice">{me.score}</span></>}
                  </div>
                ) : (
                  me.cards && me.cards.map((c, i) => <Card key={i} value={c.value} color={c.color} special={c.special} size="sm" />)
                )}
              </div>
              <div className="h-1.5 rounded-full bg-black/30 overflow-hidden mt-1.5">
                <div className="h-full transition-all" style={{ width: `${Math.min(100, ((me.score || 0) / 21) * 100)}%`, background: me.busted ? "#c0392b" : "#fff" }} />
              </div>

              {/* พลังชีวิต + เกราะ (บรรทัดเดียวเสมอ) + สถานะ + หลอดสกิล
                  min-w-0: ป้ายสถานะเป็น whitespace-nowrap ทั้งแถว — ถ้าไม่ปลดล็อก min-width:auto
                  ป้ายที่โผล่ตอนกดสกิลจะดันหลอดสกิลที่ ml-auto ล้นออกนอกกล่อง */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 min-w-0">
                {<LifeBar p={me} />}
                {<StatusChips p={me} left />}
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="flex gap-1 p-1 rounded-lg bg-black/25">
                    {Array.from({ length: me.maxSkill }, (_, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rotate-45"
                        style={
                          i < me.skillPoints
                            ? { background: "linear-gradient(180deg,#ead2f0,var(--oc-echo-glow) 45%,var(--oc-echo))", boxShadow: "0 0 6px rgba(201,154,214,.8)" }
                            : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)" }
                        }
                      />
                    ))}
                  </span>
                  <span className="text-sm font-black whitespace-nowrap">{me.skillPoints}/{me.maxSkill}</span>
                </span>
              </div>

              {/* ช่องสกิล 3 อัน — ทรงพัด: ช่องกลาง (สกิลรอง) ยกสูงกว่าอีก 2 ช่อง */}
              <div className="grid grid-cols-3 gap-2 mt-3 items-end">
                <div className="translate-y-1.5">
                  <SkillSlot label="สกิลพื้นฐาน" tier="basic" skill={ch?.basic} points={me.skillPoints} disabled={!me.alive || phase !== "PLAYING" || done || noSkill || (me.skillUsed && !isMuimi) || muimiBasicLocked} onUse={requestSkillUse} ammo={isMuimi ? me.muimiEmergencyUses : undefined} />
                </div>
                <div className="-translate-y-2">
                  <SkillSlot label="สกิลรอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} disabled={done || phase !== "PLAYING" || noSkill || me.skillUsed} onUse={requestSkillUse} />
                </div>
                <div className="translate-y-1.5">
                  <SkillSlot label="ท่าไม้ตาย" tier="ultimate" skill={ch?.ultimate} points={me.skillPoints} disabled={done || phase !== "PLAYING" || noSkill || me.skillUsed || muimiUltLocked} onUse={requestSkillUse} cooldown={muimiUltCd} />
                </div>
              </div>
              {noSkill && phase === "PLAYING" && !done && (
                <div className="text-center text-sm font-bold text-echo-hp mt-1">🚫 ถูกห้ามใช้สกิล — เทิร์นนี้ใช้สกิลไม่ได้</div>
              )}
              {me.skillUsed && phase === "PLAYING" && !done && (
                <div className="text-center text-sm font-bold text-echo-ice mt-1">ใช้สกิลได้ 1 อันต่อเทิร์น — เทิร์นนี้ใช้ไปแล้ว</div>
              )}

              {/* แถวแอคชันหลัก: ไอคอนกระเป๋า/ร้านค้ากลม ขนาบข้างปุ่มจั่ว-เปิดไพ่ที่รวมเป็นชิ้นเดียว (แบ่งเฉียงกลาง)
                  แทนปุ่มยาวเต็มแถว 2 แถวซ้อนกันแบบเดิม — ลดความ "กล่องสี่เหลี่ยมเรียงกัน" ลง */}
              <div className="mt-3 flex items-stretch gap-2">
                <button
                  onClick={() => { clickSound(); setBagOpen(true); }}
                  className="relative shrink-0 w-12 rounded-2xl grid place-items-center text-2xl shadow-lg border-2 border-black/40"
                  style={{ background: "linear-gradient(160deg,#dcefff,var(--color-echo-ice))" }}
                  title="กระเป๋า"
                >
                  🎒
                  {me.inventory?.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] font-black bg-black text-white rounded-full w-4 h-4 grid place-items-center">{me.inventory.length}</span>
                  )}
                </button>

                <div className="flex-1">
                  {phase === "PLAYING" && me.alive && !done ? (
                    <>
                      <div className="relative flex h-14">
                        <button
                          disabled={state.deckEmpty || me.atCap || noDraw}
                          onClick={() => { clickSound(); socket.emit("hit"); }}
                          className="flex-1 font-black text-lg text-gray-900 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "var(--color-echo-cyan)", clipPath: "polygon(0 0,94% 0,100% 100%,0 100%)" }}
                        >
                          🎴 จั่วการ์ด
                        </button>
                        <button
                          onClick={() => { clickSound(); socket.emit("lock"); }}
                          className="flex-1 font-black text-lg text-gray-900 transition active:scale-95 -ml-3"
                          style={{ background: "var(--color-echo-ice)", clipPath: "polygon(6% 0,100% 0,100% 100%,0% 100%)" }}
                        >
                          ✅ เปิดไพ่
                        </button>
                      </div>
                      {noDraw && <div className="text-center text-sm font-bold text-echo-hp mt-1">🚫 เทิร์นนี้จั่วไม่ได้</div>}
                      {me.atCap && <div className="text-center text-sm font-bold text-echo-ice mt-1">{me.busted ? "ไพ่แตก! 😢 ยังกดสกิล/ใช้ไอเทมได้ จนกว่าจะเปิดไพ่" : "แต้มเต็มแล้ว! ใช้สกิล หรือเปิดไพ่ได้เลย"}</div>}
                      {state.deckEmpty && <div className="text-center text-sm font-bold text-echo-hp mt-1">🂠 การ์ดหมดกอง — ทุกคนจั่วเพิ่มไม่ได้</div>}
                    </>
                  ) : phase === "PLAYING" && me.alive && done ? (
                  <div className="text-center text-lg font-bold py-2">{me.busted ? "แตก! 😢" : me.statuses?.sleep ? "หลับไหลอยู่ 💤" : me.statuses?.stun ? "สตั้นอยู่ 😵" : "พร้อมแล้ว ✅"} รอเพื่อน...</div>
                ) : phase === "ATTACK" ? (
                  <div className="text-center text-lg font-bold py-2">
                    {iAmAttacker ? "⚔️ แตะการ์ดคู่ต่อสู้ด้านบน!" : `รอ ${attacker ? attacker.name : "ผู้ชนะ"} เลือกเป้าหมาย...`}
                  </div>
                ) : !me.alive ? (
                  <div className="text-center text-lg opacity-80 py-2">💀 ตกรอบแล้ว</div>
                ) : <div className="py-1" />}
                </div>

                <button
                  onClick={() => { if (shopList[0]) viewShop(shopList[0]); }}
                  className="relative shrink-0 w-12 rounded-2xl grid place-items-center text-2xl shadow-lg border-2 border-black/40"
                  style={{ background: "linear-gradient(160deg,#dcefff,var(--color-echo-ice))" }}
                  title="ร้านค้า"
                >
                  🏪
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-black text-white rounded-full px-1 leading-4 whitespace-nowrap">🪙{me.gold ?? 0}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- เฟสสรุปผล: ลีดเดอร์บอร์ด (เต็มจอ เลื่อนดูได้) ---------- */}
        {phase === "SUMMARY" && (
          <SummaryTiers winners={summaryWinners} losers={summaryLosers} compact />
        )}

        {/* ---------- อนิเมชันเปลี่ยนเฟส ---------- */}
        {scene?.kind === "draw" && <DrawCall key={scene.id} />}

        {/* ---------- overlay ที่ใช้ร่วมกับจอคอม ---------- */}
        <OverlayLayer phase={phase} attack={state.attack} csSkipped={csSkipped} flash={flash} notice={notice} cycleFx={scene?.kind === "cycle" ? { ...scene.data, id: scene.id } : null} />
        <FlyingCardsLayer flights={cardFlights} onDone={removeCardFlight} />

        {/* ---------- แบนเนอร์รอบถัดไป ---------- */}
        {phase === "TRANSITION" && <RoundBanner round={state.roundNumber + 1} />}

        {scene?.kind === "atk" && <AttackCall key={scene.id} />}

        {shopShowing && <ShopHerald key={scene.id} name={scene.data?.name} />}

        {phase === "GAMEOVER" && (
          <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} onRematch={() => socket.emit("rematch")} />
        )}

        <ModalMounts
          showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
          statusView={statusView} statusViewIsSelf={statusViewId === state.youId} onCloseStatus={() => setStatusViewId(null)}
          shop={openShop} onCloseShop={() => setShopId(null)} shopBlock={shopBlock}
          bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber}
          myTurn={myTurn} bagSlots={me?.bagSlots || state.bagSlots}
          skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
          remoteShops={me?.remoteShop ? shopList : null} onRemoteShop={(sh) => { setBagOpen(false); viewShop(sh); }}
        />
      </div>
    );
  }

  // ---- จอคอม/แท็บเล็ต: กระดานเดินได้แบบ Fire Emblem (GRID_PLAN §11) ----
  //  กระดาน/ตัวละคร/แถบลำดับเดิน/คาดการณ์ อยู่ใน board/BoardStage.jsx · ไฟล์นี้คุม HUD ล่าง + เงื่อนไขกดได้/ไม่ได้
  //  กำลังเลือกเป้าบนกระดาน → แผงตัวเราเลื่อนลงพ้นจอ ไม่บังกระดาน
  // ฉากตีบนกระดาน (กล้องซูมเข้าคู่) = HUD หลบทั้งหมด
  const hudAway = !!me && (!!boardPick || fcOpen || (!!state.board && phase === "ATTACKING"));
  // ขนาด UI แผงตัวเรา: ออกแบบที่หน่วยฐาน 1440×810 แล้วขยายตามจอ (1080p = ×1.333)
  //  ความกว้างฐานขั้นต่ำ 1376 = ซ้าย+กลาง+ขวาเรียงได้ไม่ชนกัน (จอแคบ/4:3 จึงย่อตามความกว้าง)
  const hudZ = Math.min(1.6, Math.max(0.6, Math.min(vp.h / 810, vp.w / 1376)));
  const inBoardTurn = phase === "ORDER" || phase === "ACTION" || phase === "ATTACKING";
  // HUD แยกตามช่วง: ช่วงจั่ว = เหลือแค่ไพ่/แต้ม/จั่ว-พอ · ตาเรา = สกิล + ช่องคำสั่ง · อื่นๆ = ดูอย่างเดียว (คนที่กำลังเดินแสดงที่บนกลางแล้ว — ไม่ซ้ำข้างล่าง)
  const hudMode = phase === "PLAYING" ? "draw" : myTurn ? "turn" : "watch";
  // ---------- ระบบคู่: ปุ่มเลือกตัว (รูปเล็ก 2 ตัวเหนือรูปหลัก) · กดอีกตัว = กระจกเงา (useSkill basic) ----------
  const duoDone = new Set((state.duo && state.duo.done) || []);
  const mirrorLocked = !!(me?.skillLocks?.basic?.locked);
  const canSwitchTo = (u) => !!duoUnits && myTurn && !noSkill && !mirrorLocked && u.id !== me.id && u.alive && !!u.pos && !duoDone.has(u.id);
  const duoMirror = !!duoUnits && duoUnits.some((u) => u.id !== me?.id && u.alive); // ปุ่มพื้นฐาน = กระจกเงา (ไม่กินโควตา)
  const duoPick = duoUnits && duoUnits.length > 1 ? duoUnits.map((u) => ({
    id: u.id,
    node: <Portrait key={u.id} p={u} className="w-full h-full" rounded="" />,
    active: u.id === me?.id,
    done: duoDone.has(u.id),
    dead: !u.alive,
    onClick: rtStop ? (u.id !== me?.id && u.alive && u.pos ? () => { clickSound(); setRtSel(u.id); } : null) // จุดพัก: สลับตัวได้เลย ไม่ใช่สกิล
      : canSwitchTo(u) ? () => { clickSound(); socket.emit("useSkill", { tier: "basic" }); } : null,
  })) : null;
  // ปุ่มหลายตัวเลือก: ตัวเลือกนี้ใช้ได้ตอนนี้ไหม (แต้ม · โควตา · มีเป้าในระยะ · ล็อก)
  const choiceOk = (c) => !c.locked && !c.active && (me?.skillPoints || 0) >= (c.cost || 0) && (!(c.ember > 0) || (me?.shinra?.ember || 0) >= c.ember) && (!me?.skillUsed || choiceFree(c)) && !noTargetInRange(c.area);
  const slotOff = (tier) => {
    const s = ch?.[tier];
    if (!myTurn || (noSkill && !me?.skillLocks?.[tier]?.ignoresNoSkill) || giftLocked(tier)) return true;
    if (canto && !cantoTier(tier)) return true; // เดินต่อหลังจบตา: เหลือแค่ปุ่มพื้นฐาน (เซลิน ดาบเล็ก: เดินกับรออย่างเดียว · เอมิลิโกะ: สลับอาวุธได้)
    if (me?.inui?.opened && tier === "basic") return false; // Faiz Phone: เปิดเครื่องได้เสมอในตาตัวเอง · รหัสตรวจในเครื่อง
    if (s?.active) return false; // ทำงานอยู่ (กด = ออก · ไม่กินโควตา)
    if (s?.choices) return s.browse ? !s.choices.length : !s.choices.some(choiceOk); // browse = เปิดดูตัวเลือกได้เสมอ (โรลันด์: มือการ์ด) · ตัวที่ใช้ไม่ได้จางอยู่ในแผง
    if (tier === "basic") return (me.skillUsed && !basicFree && !giftFree("basic") && !duoMirror) || muimiBasicLocked || noTargetInRange(s?.area);
    if (tier === "ultimate") return (me.skillUsed && !giftFree("ultimate")) || muimiUltLocked || noTargetInRange(s?.area);
    return (me.skillUsed && !giftFree(tier)) || noTargetInRange(s?.area);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: nightNow ? "#0b1830" : "#dfeaf6" }}>
      {state.board ? (
        <BoardStage state={state} me={me} onRtSelect={setRtSel} lowQ={lowQ} vp={vp} pick={boardPick} onInspect={setStatusViewId} registerOther={registerOther}
          atkSignal={atkSignal} onAttackables={setAttackables} onOverlay={setFcOpen} statusOf={forecastStatusItems} />
      ) : (
        <GameBackground cycle={state.cycle} round={state.roundNumber} lowQ={lowQ} journey={arenaJourney} />
      )}
      {/* Start Up / ช่วง Clock Up (ไรเดอร์ ZECT): โลกสีซีด ขอบเบลอ · Start Up ในช่วง Clock Up ใช้เวลาของสมาชิก Faiz */}
      {(inuiUp || clockWorld) && <div className={`axel-world ${alterWorld && !inuiUp ? "alter" : clockWorld && !inuiUp ? "clock" : ""}`} data-low={lowQ ? "true" : "false"} />}
      {inuiUp && <AxelClock phase={phase} value={faizClock && faizClock.id !== me?.id ? faizClock.left : undefined} />}
      {clockWorld && !alterWorld && !lowQ && <div className="full-force-speed" />}
      {/* กองการ์ดกลาง: แถบสไลด์ขอบซ้ายกลางจอ — ค่าเริ่ม = หุบ (ผู้ใช้สั่ง 2026-10-09 · เกะกะจอ) · การ์ดยังบินออกจากตรงนี้ไปมือเรา */}
      {/*  สนาม Eos (ผู้ใช้สั่ง 2026-11-10 "รวมทั้ง 3 อันในอันเดียว สไลด์ออกมาแล้วกดได้"): ปุ่มแผนที่ + คู่มืออยู่ในถาดเดียวกับกองการ์ด */}
      {!rtTravel && <div className="deck-drawer" data-eos={state.world === "eos" && state.board ? "true" : undefined} data-open={deckTab ? "true" : "false"} data-away={fcOpen || (!!state.board && phase === "ATTACKING") ? "true" : "false"}>
        <div className="deck-drawer-pile"><DeckPile hostRef={deckRef} size="md" onClick={() => setDeckOpen(true)} /></div>
        {state.world === "eos" && state.board && (
          <div className="deck-drawer-extra">
            <button type="button" aria-label="แผนที่" tabIndex={deckTab ? 0 : -1} onClick={() => { clickSound(); setEosMapOpen(true); }}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 4v14M15 6v14" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
            <button type="button" aria-label="คู่มือ" tabIndex={deckTab ? 0 : -1} className="q" onClick={() => { clickSound(); setEosGuideOpen(true); }}>?</button>
          </div>
        )}
        <button type="button" className="deck-drawer-tab" aria-expanded={deckTab} aria-label="กองการ์ดกลาง" onClick={() => { clickSound(); setDeckTab((v) => !v); }}>
          <span className="deck-drawer-ico" aria-hidden="true" /><span className="deck-drawer-arrow" aria-hidden="true">{deckTab ? "◂" : "▸"}</span>
        </button>
      </div>}
      {deckOpen && <DeckLedgerModal ledger={state.deckLedger || []} onClose={() => setDeckOpen(false)} />}
      {eosMapOpen && state.world === "eos" && <EosMap state={state} onClose={() => setEosMapOpen(false)} />}
      {eosGuideOpen && state.world === "eos" && <EosGuide onClose={() => setEosGuideOpen(false)} />}
      {eosSitOpen && state.world === "eos" && <EosSituation state={state} onClose={() => setEosSitOpen(false)} />}
      {/* สนาม Eos: ป้ายเข้าพื้นที่ เมื่อตัวเราเดินเข้าโซนใหม่ (eos/EosZoneCard.jsx) */}
      {state.world === "eos" && state.board && <EosZoneCard state={state} />}
      {state.world === "eos" && state.board && <EosScoreboard state={state} />}
      {state.world === "eos" && state.board && <EosPerks state={state} />}
      {state.world === "eos" && state.board && !eosSitOpen && <EosAlerts state={state} />}

      {/* QTE — ลอยกลางจอ */}
      {me?.qte && <QtePanel key={me.qte.idx} qte={me.qte} />}

      {/* สนาม Colony: ขอบจอแดงกะพริบ — ประตูปิดเทิร์นนี้ / นับถอยหลังระเบิด 3 เทิร์นสุดท้าย */}
      {state.colony && (phase === "PLAYING" || inBoardTurn) && ((state.colony.countdown == null && state.colony.sealIn != null && state.colony.sealIn <= 1) || (state.colony.countdown != null && state.colony.countdown <= 3)) && (
        <div className="colony-alarm" data-boom={state.colony.countdown != null ? "true" : "false"} aria-hidden="true" />
      )}
      {/* แถบซ้ายบน: กลางวัน/คืน · รอบ · เวลา · ภูมิภาค */}
      {!fcOpen && !(state.board && phase === "ATTACKING") && <HudTopBar
        night={nightNow}
        round={phase === "PLAYING" || inBoardTurn ? state.roundNumber : null}
        timer={<BoardTimer phaseKey={`${phase}-${state.roundNumber}-${state.actorId || ""}`} mine={myTurn} />}
        journey={state.journey && !state.colony && !state.moon && (phase === "PLAYING" || inBoardTurn)
          ? { ...journeyArea(state.journey.area), name: state.journey.name, turnsLeft: state.journey.turnsLeft }
          : state.fodlan && state.world === "eos" && (phase === "PLAYING" || inBoardTurn) // Eos (§8.6): ชื่อสนาม + สภาพอากาศ
            ? (() => { const sit = eosSituation(state).filter((s) => s.key !== "diff"); return { numeral: "✦", color: "#2f5f9c", glow: "#9fe2ff", name: "Eos", eos: true, sit, alert: sitCount(sit) }; })()
          : state.fodlan && (phase === "PLAYING" || inBoardTurn) // Fodlan: ป้ายด่าน + สภาพอากาศ (ไม่มีหน้าผลภูมิภาค)
            ? { ...fodlanStage(state.fodlan.stage), name: state.fodlan.name, turnsLeft: state.fodlan.turnsLeft, weather: state.fodlan.weather }
            : null}
        onJourney={state.world === "eos" ? () => { clickSound(); setEosSitOpen(true); } : state.fodlan ? undefined : () => { clickSound(); setJourneyInfoOpen(true); }}
        colony={state.colony && (phase === "PLAYING" || inBoardTurn) ? state.colony : null}
        moon={state.moon && (phase === "PLAYING" || inBoardTurn) ? state.moon : null}
        roadtrip={rtOn ? { rt: state.roadtrip, myTurn: myTurn && !canto && rtCanRear(state.roadtrip, state.youId) } : null}
        players={state.players}
        zoom={hudZ}
      />}
      {/* Road Trip: แถบจุดพัก (เวลา · ความพร้อม · อู่) + อู่ */}
      {rtStop && !fcOpen && <StopBar rt={state.roadtrip} players={state.players || []} youId={state.youId} zoom={hudZ} onGarage={rtStop.kind === "gas" ? rtGarageGo : null} />}
      {campSpot && rtStop && rtStop.kind === "camp" && <CampSpot key={campSpot} spot={campSpot} state={state} me={me} unitArg={rtUnitArg} zoom={hudZ} onClose={() => setCampSpot(null)} />}
      {sunrise > 0 && <div key={sunrise} className="rt-sunrise" onAnimationEnd={() => setSunrise(0)} />}
      {campOpen && rtStop && rtStop.kind === "camp" && <CampPanel state={state} me={me} unitArg={rtUnitArg} zoom={hudZ} onClose={() => setCampOpen(false)} />}
      {garageOpen && rtStop && (
        <Garage van={state.roadtrip.van || {}} gold={me?.gold || 0} far={rtGarageFar()} unitId={rtUnitArg.unitId} diff={state.roadtrip.diff} night={!!state.roadtrip.night} onClose={() => setGarageOpen(false)} />
      )}

      {/* ---------- แผงตัวเรา (ดีไซน์ HudMain — กระจกน้ำเงินตัดมุม) ----------
          ซ้ายล่าง = แผงผู้เล่น · ขอบซ้าย = ลิ้นชักสถานะ · กลางล่าง = แต้ม · มือไพ่ · จั่ว/พอ (ช่วงจั่ว) หรือ ย้อน/รอ (ตาเดิน)
          ขวาล่าง = แต้มสกิล · กระเป๋า · ร้านค้า · สกิล 3 ช่อง (ป้ายระยะ) — ส่วนวาดอยู่ที่ hud/SelfHud.jsx */}
      {me && (
        <SelfHud
          hidden={hudAway}
          noPeek={fcOpen || (!!state.board && phase === "ATTACKING")}
          lowQ={lowQ}
          zoom={hudZ}
          panel={
            <HudPanel
              // ระบบคู่ (เคท & เอมิลิโกะ): รูปหลัก = ภาพปกเดียวกับหน้าเลือกตัว (รูปแต่ละตัวอยู่ที่ปุ่มเลือกตัวด้านบน)
              portrait={<Portrait key={me.id} p={duoUnits && hand?.character?.cover ? { ...me, img: hand.character.cover } : me} className="w-full h-full" rounded="" />}
              hexPortrait={true}
              duo={duoPick}
              name={me.character?.name || me.name}
              onName={() => { clickSound(); setShowChar(true); }}
              teamId={state.gameMode === "eos" ? null : me.teamId} // Eos: ทุกคนทีมเดียว ไม่ต้องมีป้าย (ผู้ใช้ 2026-11-10)
              teamColor={teamAccent(me.teamId)}
              sp={me.skillPoints}
              spMax={me.maxSkill}
              spLabel={me.character?.id === "fern" ? "Energy" : undefined}
              vitals={<div className="hud-vitals">
                  <StatRow big kind="hp" value={me.hp} max={me.maxHp} extra={me.tempHp || 0} extraLabel="เลือดชั่วคราว" />
                  <StatRow big kind="ar" value={me.armor} max={me.maxArmor} />
                  <VitalExtras p={me} className="pc-extra-inline" />
                </div>}
              statuses={meStatuses}
              rawStatuses={me.statuses || {}}
            />
          }
          drawer={
            <HudStatusDrawer
              statuses={meStatuses}
              rawStatuses={me.statuses || {}}
              gold={me.gold || 0}
              goldMax={me.goldMax || 0}
              lowQ={lowQ}
              statusAlt={null}
              onOpenAll={() => { clickSound(); setStatusViewId(me.id); }}
            />
          }
          mode={hudMode}
          center={rtTravel ? <span /> : hudMode !== "draw" && ch?.basic?.book ? (
            // เจ้าหญิง Echo: สมุดไดอารี่กลาง HUD แทนช่องสกิลพื้นฐาน
            <DiaryCenter skill={ch.basic} disabled={hudMode !== "turn" || slotOff("basic")} cooldown={giftCd("basic")} onOpen={() => requestSkillUse("basic", ch.basic, "พื้นฐาน", ch.basic.cost)} />
          ) : hudMode === "draw" ? (
            <DrawDock
              cards={hand.cards}
              score={hand.score}
              busted={hand.busted}
              handRef={selfHandRef}
              draw={{
                disabled: state.deckEmpty || !(phase === "PLAYING" && handAlive && !done) || hand.atCap || noDraw,
                onClick: () => { clickSound(); socket.emit("hit"); },
              }}
              stand={{
                done: !!hand.locked,
                disabled: !(phase === "PLAYING" && handAlive && !done),
                onClick: () => { clickSound(); setColorPick(null); socket.emit("lock"); },
              }}
              bag={{ items: hand?.inventory || [], slots: hand?.bagSlots || me?.bagSlots || state.bagSlots || 5, hot: drawHot, onClick: () => { clickSound(); setColorPick(null); setBagOpen(true); } }}
              pick={pickLive ? {
                card: colorPick.card,
                onCard: (i) => { clickSound(); setColorPick((cp) => cp && { ...cp, card: cp.card === i ? null : i }); },
                onColor: (color) => { clickSound(); socket.emit("useDrawItem", { uid: colorPick.uid, cardIndex: colorPick.card, color }); setColorPick(null); },
              } : null}
            />
          ) : <span />}
          right={hudMode === "turn" ? (
            <HudCommand
              skills={
                <>
                  {ch?.basic && !ch.basic.book && <SkillSlot variant="hud" label="พื้นฐาน" tier="basic" skill={ch?.basic} points={me.skillPoints} rangeLabel={areaText(ch?.basic?.area)} disabled={slotOff("basic")} onUse={requestSkillUse} cooldown={giftCd("basic")} ammo={isMuimi ? me.muimiEmergencyUses : me.inui?.opened ? me.inui.ammo : undefined} />}
                  {me.kazuma
                    ? <BladeRouzerSlot kazuma={me.kazuma} skill={ch?.secondary} disabled={slotOff("secondary")} onOpen={() => requestSkillUse("secondary", ch?.secondary, "รอง", ch?.secondary?.cost)} />
                    : ch?.secondary && <SkillSlot variant="hud" label="รอง" tier="secondary" skill={ch?.secondary} points={me.skillPoints} rangeLabel={areaText(ch?.secondary?.area)} disabled={slotOff("secondary")} onUse={requestSkillUse} cooldown={giftCd("secondary")} ammo={me.sliver?.form === "banagher" && !me.sliver.unicornLeft ? me.sliver.ammo : undefined} />}
                  {ch?.ultimate && <SkillSlot variant="hud" label="ท่าไม้ตาย" tier="ultimate" skill={ch?.ultimate} points={me.skillPoints} rangeLabel={areaText(ch?.ultimate?.area)} disabled={slotOff("ultimate")} onUse={requestSkillUse} cooldown={muimiUltCd || giftCd("ultimate")} />}
                </>
              }
              attack={{ disabled: canto || !!state.action?.noStrike || !attackables.length, targets: attackables.length, onClick: () => { clickSound(); setAtkSignal((n) => n + 1); } }}
              shops={canto ? null : nearShops.map((sh) => ({ id: sh.id, kind: sh.kind, name: sh.name || shopName(sh.kind), onClick: () => viewShop(sh) }))}
              ride={rideNear && !canto ? { disabled: !!state.action?.locked || !!state.rideAsk, onClick: () => { clickSound(); setPickReq({ kind: "ride" }); } } : null}
              drop={me && (state.players || []).some((p) => p.alive && p.ride === me.id) ? { onClick: () => { clickSound(); socket.emit("rideDrop"); } } : null}
              extra={[...rtVanBtns, ...(me?.actions || []).map((x) => {
                // tiles = เลือกช่องบนกระดานก่อน (กดซ้ำ = ยกเลิก) · ไม่มี = ส่งทันที (ม้าของไจโร/ดิเอโก้)
                const picking = pickReq?.kind === "action" && pickReq.key === x.key;
                const tiles = Array.isArray(x.tiles) && x.tiles.length ? x.tiles : null;
                return {
                  ...x, on: picking, disabled: !!x.disabled || canto || (Array.isArray(x.tiles) && !tiles),
                  onClick: () => {
                    clickSound();
                    if (tiles) { setPickReq(picking ? null : { kind: "action", key: x.key }); return; }
                    if (x.key === "kazumaEvolution") { setKzEvolve(true); return; }
                    socket.emit("charAction", { key: x.key });
                  },
                };
              })]}
              bag={{
                onClick: () => { clickSound(); setBagOpen(true); },
                items: me?.inventory || [], slots: me?.bagSlots || state.bagSlots || 5,
                hot: !canto && (me?.inventory || []).some((it) => it.type === "battery" && (it.charge || 0) > 0) && (me?.skillPoints || 0) < (me?.maxSkill || 0),
              }}
              undo={{ disabled: !(state.action && state.action.moved && !state.action.locked), onClick: () => { clickSound(); socket.emit("undoMove"); } }}
              end={{ disabled: false, onClick: () => { clickSound(); setPickReq(null); socket.emit("endAction"); } }}
            />
          ) : hudMode === "watch" ? <BagButton solo items={me?.inventory || []} slots={me?.bagSlots || state.bagSlots || 5} onClick={() => { clickSound(); setBagOpen(true); }} /> : <span />}
        />
      )}

      {/* ---------- อนิเมชันเปลี่ยนเฟส ---------- */}
      {scene?.kind === "draw" && (state.board ? <PhaseCall key={scene.id} round={state.roundNumber} /> : <DrawCall key={scene.id} />)}

      {/* ---------- overlay ที่ใช้ร่วมกับมือถือ (ฉากตีวาดบนกระดานแทน AttackFx) ---------- */}
      <OverlayLayer boardFx phase={phase} attack={state.attack} csSkipped={csSkipped} flash={flash} notice={notice} cycleFx={scene?.kind === "cycle" ? { ...scene.data, id: scene.id } : null} />
      <FlyingCardsLayer flights={cardFlights} onDone={removeCardFlight} />
      {journeyInfoOpen && state.journey && <JourneyInfoModal journey={state.journey} onClose={() => setJourneyInfoOpen(false)} />}

      {/* ---------- แบนเนอร์รอบถัดไป ---------- */}
      {phase === "TRANSITION" && <RoundBanner round={state.roundNumber + 1} />}

      {shopShowing && <ShopHerald key={scene.id} name={scene.data?.name} />}

      {phase === "GAMEOVER" && (
        <VictoryScreen state={state} onBackToLobby={() => socket.emit("backToLobby")} onRematch={() => socket.emit("rematch")} />
      )}

      {/* ---------- modal รายละเอียดตัวละคร / ดูสถานะผู้เล่น / ร้าน / กระเป๋า ---------- */}
      <ModalMounts
        showChar={showChar} ch={ch} me={me} onCloseChar={() => setShowChar(false)}
        statusView={statusView} statusViewIsSelf={!!statusView && sameSide(statusView, hand)} onCloseStatus={() => setStatusViewId(null)}
        shop={openShop} onCloseShop={() => setShopId(null)} shopBlock={shopBlock}
        bagOpen={bagOpen} onCloseBag={() => setBagOpen(false)} players={state.players} gameState={state.gameState} roundNumber={state.roundNumber}
        myTurn={myTurn && !canto && !me?.summon} bagSlots={me?.bagSlots || state.bagSlots} newBag={!!state.board} drawBag={drawBag} onDrawUse={useDrawFromBag}
        rtFree={state.gameMode === "roadtrip" && !!state.roadtrip && state.roadtrip.phase === "stop"}
        rtStash={rtAtVan && state.roadtrip.van ? state.roadtrip.van.stash || null : null}
        skillConfirm={skillConfirm} onConfirmSkill={confirmSkillUse} onCancelSkill={cancelSkillConfirm}
        remoteShops={me?.remoteShop ? shopList : null} onRemoteShop={(sh) => { setBagOpen(false); viewShop(sh); }}
        onBomb={(it, el) => { setBagOpen(false); setPickReq({ kind: "bomb", uid: it.uid, el }); }}
      />
      {/* ยูนะขอขี่ (server/ride.js): เจ้าของตัวที่ถูกขอกดยินยอม/ปฏิเสธ */}
      {state.rideAsk && state.rideAsk.mine && (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border-2 bg-black/85 px-5 py-4 shadow-2xl" style={{ borderColor: state.rideAsk.fromColor || "#f0c868" }}>
            <img src={state.rideAsk.fromImg} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/30" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl" aria-hidden="true">🎠</span>
              <b className="text-white text-lg leading-none">{state.rideAsk.fromName}</b>
            </div>
            <div className="flex gap-2">
              <button type="button" className="w-14 h-14 rounded-xl bg-emerald-500 text-white text-2xl font-black" onClick={() => { clickSound(); socket.emit("rideAnswer", { ok: true }); }}>✓</button>
              <button type="button" className="w-14 h-14 rounded-xl bg-rose-600 text-white text-2xl font-black" onClick={() => { clickSound(); socket.emit("rideAnswer", { ok: false }); }}>✕</button>
            </div>
          </div>
        </div>
      )}
      {hkForms && me?.hikaru && (
        <HikaruForms hikaru={me.hikaru} onClose={() => setHkForms(false)} onPick={(form) => { setHkForms(false); socket.emit("useSkill", { tier: "basic", form }); }} />
      )}
      {kzOpen && me?.kazuma && ch?.secondary?.choices && (
        <BladeRouzerPanel
          kazuma={me.kazuma}
          choices={ch.secondary.choices}
          points={me.skillPoints}
          isOk={choiceOk}
          onClose={() => setKzOpen(false)}
          onPick={(c) => socket.emit("useSkill", { tier: "secondary", form: c.key })}
        />
      )}
      {phoneOpen && me?.inui && (
        <FaizPhone inui={me.inui} points={me.skillPoints || 0} skillUsed={!!me.skillUsed} onClose={() => setPhoneOpen(false)} onDial={(form) => socket.emit("useSkill", { tier: "basic", form })} />
      )}
      {kzEvolve && me?.kazuma && (
        <EvolutionScene onClose={() => setKzEvolve(false)} onDone={() => socket.emit("useSkill", { tier: "basic", form: "evolution" })} />
      )}
      {/* เจ้าหญิง Echo: ไดอารี่ความทรงจำ = สมุดเลือกตัวละคร (skill.book จาก characters/echo.js) */}
      {choiceOpen && ch?.[choiceOpen.tier]?.choices && ch[choiceOpen.tier].book && (
        <DiaryBook
          choices={ch[choiceOpen.tier].choices}
          isOk={choiceOk}
          onClose={() => setChoiceOpen(null)}
          onPick={(c) => pickChoice(choiceOpen.tier, c)}
        />
      )}
      {choiceOpen && ch?.[choiceOpen.tier]?.choices && !ch[choiceOpen.tier].book && (
        <SkillChoices
          title={ch[choiceOpen.tier].name}
          choices={ch[choiceOpen.tier].choices}
          isOk={choiceOk}
          onClose={() => setChoiceOpen(null)}
          onPick={(c) => pickChoice(choiceOpen.tier, c)}
        />
      )}
      {/* ดิโอ บรันโด: แถบ Time Meter/BloodStack · ปุ่มแทรกตา · ดวล Last Stand */}
      {me?.dio && !hudAway && !rtTravel && <DioGauge dio={me.dio} />}
      {/* คุซาคาเบะ ชินระ: แถบเปลวเพลง */}
      {me?.shinra && !hudAway && !rtTravel && <ShinraEmber shinra={me.shinra} lowQ={lowQ} />}
      {me?.dio && !rtTravel && <DioInterrupt dio={me.dio} onPress={() => { clickSound(); socket.emit("charAction", { key: "dio:world" }); }} />}
      {/* ช่วง Clock Up (ไรเดอร์ ZECT / Faiz Start Up — server/clockUp.js): ปุ่มแทรก/เข้าร่วมนอกตา · หมากชนกันกดรัว */}
      <ClockUpButton me={rtTravel ? null : me} onPress={(key) => () => { clickSound(); socket.emit("charAction", { key }); }} />
      <ClockDuel clock={state.clockUp || null} players={state.players} myId={me?.id} onMash={mashClock} />
      {/* เฟรดดี้ ฟาซแบร์: มินิเกมประตู 10 วิ (state.freddyDoor — characters/freddy_fazbear.js) */}
      <FreddyDoors door={state.freddyDoor || null} onPick={(d) => { clickSound(); socket.emit("freddyDoor", { door: d }); }} />
      <LastStandDuel duel={state.dioDuel || null} players={state.players} onDraw={() => { clickSound(); socket.emit("dioDuel", { action: "draw" }); }} onStand={() => { clickSound(); socket.emit("dioDuel", { action: "stand" }); }} />
      {/* คัตซีนวีดีโอ: ทับกระดานทั้งจอ (กระดานยัง mount อยู่ข้างใต้ — จบคัตซีนแล้วไม่ต้องสร้างฉากใหม่) */}
      {cutsceneEl && <div style={{ position: "fixed", inset: 0, zIndex: 150 }}>{cutsceneEl}</div>}
      {/* ยูกิ: ฉากระเบิดเกิดใหม่เป็นประตู 14 วิ (state.yukiBoom) — บนสุดเหนือ HUD/คัตซีน เล่นจนจบแม้เข้า GAMEOVER แล้ว */}
      <YukiBoom boom={state.yukiBoom || null} phase={phase} lowQ={lowQ} />
      {/* อรชุน: ฉาก Mahapralaya 17.4 วิ (state.arjunaUlt) · server พักตาเดินให้จนจบฉาก */}
      <ArjunaUlt run={arjunaRun} lowQ={lowQ} />
    </div>
  );
}
