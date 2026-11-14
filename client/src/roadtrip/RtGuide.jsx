// Road Trip — คู่มือ (ผู้ใช้สั่ง 2026-11-15: ปุ่ม "?" ปุ่มเดียวแบบคู่มือสนาม Eos — อธิบายทุกอย่างของ Road Trip)
//  ปุ่ม ? มุมจอ (RtGuideButton — Game.jsx วางไว้ตลอดทริป ทั้งจอขับและกระดานจุดพัก/ต่อสู้) → หน้าต่างแท็บหมวด
//  ตัวเลขทั้งหมดจาก rtGuideData.js (เทียบกับ server ใน tests/roadtrip-guide.test.js) + rtMeta.js (ชื่อ/อัปเกรด) + props.js rtPropInfo (ของในจุดพัก)
//  ธีมสว่าง/มืดตามตัวแปร --rt-* (ui-theme.css สลับให้เมื่อ <html data-ui="dark">)
import { useEffect, useState } from "react";
import { clickSound } from "../audio";
import { FORK_KINDS, EVENT_KINDS, UPGRADES, DIFFS, REGIONS, DECOR_NOTE, upgPrice } from "./rtMeta";
import {
  RT_ROUTE, RT_DRIVE, RT_REWARD, RT_FIGHT, RT_DIFF, RT_STOP, RT_STASH, RT_BAG_CAP, RT_FUN, RT_CAMP, RT_FOOD, RT_MOB_CAPS, RT_ELITE, RT_MOBS, RT_MOB_ORDER, RT_MOB_WHERE,
  RT_BOSSES, RT_BOSS_MOVES, RT_BOSS_PHASES, RT_ROLES, mobTraits, mobImg, partyMul, bossPartyMul,
} from "./rtGuideData";
import { rtPropInfo } from "../board/roadtrip/props";
import { RT_RECIPES, shopInfoOf } from "../data/shop";
import { tip } from "./rtTip";
import "./roadtrip.css";
import "./rtGuide.css";

const pct = (v) => `${Math.round(v * 100)}%`;
const priceOf = (diff, base) => Math.max(1, Math.ceil(base * (RT_DIFF[diff] || RT_DIFF.normal).price));
const DIFF_KEYS = ["easy", "normal", "hard"];

function tripRows(diff) {
  const d = RT_DIFF[diff] || RT_DIFF.normal;
  return [
    ["🛣️", "วงจร", "ขับ → ทางแยก (โหวต) → จุดหมาย → ขับต่อ · ไปให้ไกลที่สุด"],
    ["🗳️", "โหวต", `ทางแยก ${RT_ROUTE.secs.fork} วิ · เหตุการณ์ ${RT_ROUTE.secs.event} วิ · เสียงข้างมาก · ทางแยกเสมอ = ทางที่อยู่ซ้ายกว่า · เหตุการณ์เสมอ = ทางปลอดภัย`],
    ["👹", "บอส", `ทุก ${RT_ROUTE.bossKm} กม. · ต้องล้มมันจึงไปต่อ`],
    ["🗺️", "ภูมิภาค", `เปลี่ยนทุก ${RT_ROUTE.regionKm} กม. · ${Object.values(REGIONS).map((r) => `${r.icon} ${r.name}`).join(" → ")} → วนใหม่ (มอนแกร่งขึ้น)`],
    ["🌙", "กลางวัน/คืน", `สลับทุก ${RT_ROUTE.nightKm} กม. · กลางคืนมีผีโบกรถ`],
    ["💥", "แพ้", "รถตู้ HP หมด · หรือผู้เล่นล้มหมดในการต่อสู้"],
    ["🪶", "ล้มแล้ว", d.autoRevive ? "ฟื้นเองครึ่งเลือดหลังจบการต่อสู้ · ปั๊มฟื้นครึ่ง · โรงแรมฟื้นเต็ม" : `ปั๊มฟื้นครึ่งเลือด · โรงแรมฟื้นเต็ม · ขนนกคืนชีพ${d.revive ? ` ${d.revive} 🪙` : " (สุ่มขายเป็นของหายาก)"}`],
    ...DIFF_KEYS.map((k) => [k === diff ? "▶" : "·", `ความยาก ${DIFFS[k].name}`, DIFFS[k].desc]),
    ["🪙", "เหรียญ", "ล้มมอน = เหรียญเข้าคนที่ล้ม · ชนะการต่อสู้ = ทุกคนได้โบนัส · ใช้ที่ร้าน/อู่/กิจกรรม"],
  ];
}

function routeRows(diff, km) {
  const win = (extra) => RT_REWARD.base + Math.floor(km / RT_REWARD.perKm) + extra;
  const kmOf = (k) => (RT_ROUTE.forkKm[k] ? `${RT_ROUTE.forkKm[k][0]}–${RT_ROUTE.forkKm[k][1]} กม.` : "");
  const F = (k) => FORK_KINDS[k];
  return [
    [F("gas").icon, F("gas").name, `${kmOf("gas")} · ไม่จำกัดเวลา · มินิมาร์ท · แผงวัตถุดิบ · ตู้น้ำมัน · อู่ (อัปเกรด/ซ่อม/แต่งรถ) · กิจกรรม · คนที่ล้มฟื้นครึ่งเลือด · ไนตรัสเติมเต็ม · น้ำมัน < ${RT_ROUTE.lowFuelPct}% = มีปั๊มให้เลือกเสมอ`],
    [F("motel").icon, F("motel").name, `${kmOf("motel")} · หลัง ${RT_ROUTE.motelFromKm} กม. · ไม่จำกัดเวลา · ทุกคนเลือด/เกราะเต็ม · คนที่ล้มฟื้นเต็ม · รถตู้ฟื้น 50% ของ HP สูงสุด · ไม่มีปั๊ม/อู่`],
    [F("fight").icon, F("fight").name, `${kmOf("fight")} · ดักทาง (รถจอด) หรือไล่ล่ารถ (สู้บนรถ) อย่างละครึ่ง · ชนะ ทุกคน 🪙 ${win(0)} (${RT_REWARD.base} + กม./${RT_REWARD.perKm})`],
    [F("elite").icon, F("elite").name, `${kmOf("elite")} · หลัง ${RT_ROUTE.eliteFromKm} กม. · มีหัวหน้า 1 ตัว (เลือด ×${RT_ELITE.hp} +2 · พลังโจมตี +${RT_ELITE.atk} · เกราะ +${RT_ELITE.armor}) · ชนะ ทุกคน 🪙 ${win(RT_REWARD.elite)} (+${RT_REWARD.elite})`],
    [F("event").icon, F("event").name, `${kmOf("event")} · สุ่ม 1 เหตุการณ์ แล้วโหวตทางรับมือ`],
    [F("boss").icon, F("boss").name, `ทุก ${RT_ROUTE.bossKm} กม. · ชนะ ทุกคน 🪙 ${win(RT_REWARD.boss)} (+${RT_REWARD.boss}) + เหรียญบอสเข้าคนที่ล้ม`],
    ["⚠️", "มอนไล่ล่ารถ", `ระหว่างขับ หลัง ${RT_DRIVE.onvanMinKm} กม. · ${RT_DRIVE.onvanPct}% ต่อช่วง · ไม่ติดกับการสู้ครั้งก่อน`],
    ["👁️", "เห็นล่วงหน้า", "ชิงช้าสวรรค์ที่ปั๊ม = เห็นมอน/เหตุการณ์จริงของทางแยกถัดไป"],
    ["🪙", "ราคาตามความยาก", `ราคาทุกอย่าง ×${RT_DIFF[diff].price} (${DIFFS[diff].name})`],
  ];
}

function eventRows(diff) {
  const E = (k) => EVENT_KINDS[k];
  return [
    [E("police").icon, E("police").name, `จ่ายค่าปรับ 🪙 ${priceOf(diff, 5)} (กองกลาง) · เหยียบหนี 50% ระยะ +2 กม. / พลาด รถ −4 · ลงไปลุย = สู้แก๊งมอเตอร์ไซค์`],
    [E("cows").icon, E("cows").name, "จอดรอ น้ำมัน −3 ลิตร · บีบแตรฝ่า 50% ผ่านฟรี / พลาด รถ −3"],
    [E("hitchhiker").icon, E("hitchhiker").name, "กลางวัน 60% ทีมได้ เสริมพลัง/คุ้มครอง/หลบหลีก · 40% ติด อ่อนแอ/เชื่องช้า · มีผลสู้ครั้งหน้า"],
    ["👻", "ผีโบกรถ", "กลางคืน · รับขึ้นรถ = ทีมติด อ่อนแอ/เชื่องช้า สู้ครั้งหน้าแน่นอน"],
    [E("truck").icon, E("truck").name, "ค้นของ: ทุกคน 🪙 3–8 + กม./50 · 40% ได้ไอเทม · 35% ซอมบี้รถบรรทุกซุ่ม = สู้"],
    [E("merchant").icon, E("merchant").name, "ขายของ 1 ชิ้น ถูกกว่าร้าน 40% (คริสตัลชีวิต/เกราะ · รองเท้าลม · ขนนกคืนชีพ) · เข้ากระเป๋าคนที่โหวตซื้อ"],
    [E("shrine").icon, E("shrine").name, "แวะไหว้ 50% ทุกคนเลือด +3 · กลางคืนเสี่ยง 30% ติดดีบัฟ"],
    [E("race").icon, E("race").name, "ชนะแน่ถ้าเครื่องยนต์ขั้น 1 (+1 ต่อรอบภูมิภาค สูงสุด 3) · ไม่ถึงลุ้น 30% · ชนะ ทุกคน 🪙 +6 · แพ้ รถ −2"],
    ["⏱️", "ไม่มีใครโหวต", "เลือกทางปลอดภัยให้เอง · เงินกองกลางไม่พอ = เลือกไม่ได้"],
  ];
}

function vanRows(diff, van) {
  const d = RT_DIFF[diff] || RT_DIFF.normal;
  const lv = (k) => (van && van.upg ? van.upg[k] | 0 : 0);
  return [
    ["🚐", "HP รถตู้", "ชนสิ่งกีดขวาง · มอนทุบ · เหตุการณ์ · HP หมด = จบทริป"],
    ["⛽", "น้ำมัน", `${RT_DRIVE.fuelPerKm} ลิตร/กม. × ${d.fuel} (${DIFFS[diff].name}) · หมดถัง = คลาน ${RT_DRIVE.emptyKmh} กม./ชม. · ปั๊ม 1 🪙 = ${Math.round((RT_STOP.fuelPerGold / d.price) * 10) / 10} ลิตร`],
    ["🔥", "ไนตรัส", `ความเร็ว ×${RT_DRIVE.nitroMul} นาน ${RT_DRIVE.nitroMs / 1000} วิ · เติมเต็มทุกจุดพัก`],
    ["🚧", "สิ่งกีดขวาง", `เตือนล่วงหน้า ${RT_DRIVE.hzWarnMs / 1000} วิ · เลนเดียวกัน = รถ −${d.hazard} (+1 ทุก 150 กม. − ขั้นกันชน · อย่างน้อย 1)`],
    ["🧑‍✈️", "ที่นั่งคนขับ", `ว่างอยู่ = ใครนั่งก่อนได้ก่อน · คนอื่นกดขอ → คนขับกดยกให้ · ไม่ขยับเกิน ${RT_DRIVE.driverIdleMs / 1000} วิ = ลุกเอง · ไม่มีคนขับ = รถวิ่งตรง`],
    ["🔧", "ซ่อมรถ", `อู่ที่ปั๊ม · 1 🪙 ≈ ${Math.round((RT_STOP.repairPerGold / d.price) * 10) / 10} HP · กล่องเครื่องมือในรถ`],
    ...UPGRADES.map((u) => [u.icon, `${u.name} ${lv(u.key)}/3`, `${u.desc}${lv(u.key) < 3 ? ` · ขั้นถัดไป 🪙 ${upgPrice(lv(u.key), diff, van, u.key)}` : ""}`]),
    ["🧳", "คลังรถตู้", `ของกองกลาง ${RT_STASH.base} ช่อง + ${RT_STASH.perLv} ต่อขั้นที่เก็บของ · ฝาก/หยิบได้ตอนขับและข้างกระเป๋าที่จุดพัก · กระเป๋าคนละไม่เกิน ${RT_BAG_CAP}`],
    ["🎨", "ของแต่ง/สี/ทรง/ทะเบียน", `ที่อู่ · ${DECOR_NOTE}`],
    ["📻", "วิทยุ", "สถานีเพลง หรือ YouTube · ทุกคนในรถฟังเพลงเดียวกัน"],
  ];
}

function stopRows(diff) {
  const rt = { diff };
  const kinds = [
    ["mart"], ["pump"], ["garage"], ["claw"], ["gacha"], ["arcade"], ["karaoke"], ["fortune"], ["spicy"], ["dog"], ["wash"], ["wc"], ["pond"], ["ferris"],
    ["bbq"], ["vending"], ["pool"], ["stall", "food"], ["stall", "drinks"], ["motel", "office"], ["motel", "room"],
  ];
  const extra = {
    dog: `ให้อาหาร ${RT_STOP.dogFeeds} ครั้ง (ครั้งละจุดพัก) = หมาขึ้นรถ ช่วยสู้ (♥ ${RT_FIGHT.dog.hp} · พลังโจมตี ${RT_FIGHT.dog.atk} · เดิน ${RT_FIGHT.dog.mov})`,
    claw: "40% ไอเทม · 30% 🪙 1–4 · 30% พลาด", gacha: "40% ไอเทม · 30% 🪙 1–4 · 30% พลาด", wc: "20% เจอไอเทม",
  };
  return kinds.map(([kind, style]) => {
    const i = rtPropInfo({ kind, style }, rt);
    if (!i) return null;
    return [i.icon, i.name, extra[kind] ? `${i.desc} · ${extra[kind]}` : i.desc];
  }).filter(Boolean).concat([
    ["📦", "กล่องรถ", `ยืนติดรถตู้ที่จอด (คลิกรถ) · ตอนขับ = เดินไปกล่องท้ายรถ · ${RT_STASH.base} ช่อง +${RT_STASH.perLv}/ขั้นที่เก็บของ · ทั้งทีมใช้ร่วม`],
    ["⏱️", "ออกเดินทาง", `ไม่จำกัดเวลา · ทุกคนที่ยังอยู่ (มีชีวิต + ต่ออยู่) กดพร้อม · ทุกคนหลุด = ออกเองใน ${RT_CAMP.afkSecs} วิ`],
  ]);
}

const ING_NAMES = ["ingRice", "ingEgg", "ingVeg", "ingSpice", "ingMeat", "ingFish"];
function campRows(diff) {
  const C = RT_CAMP, M = C.mallow, Fd = RT_FOOD;
  const ing = ING_NAMES.map((t) => `${shopInfoOf({ type: t }).icon} ${priceOf(diff, Fd.ing[t])} 🪙`).join(" · ");
  const rows = [
    ["🏕️", "ตั้งแคมป์", `ปุ่ม "แคมป์" ตอนขับ (N) → โหวต ${C.voteMs / 1000} วิ เสียงข้างมาก (เสมอ = ไม่) · ห่างแคมป์ครั้งก่อน ${C.cdKm} กม. · ห้ามเมื่อบอสถัดไปอยู่ใน ${C.bossGapKm} กม. · ไม่จำกัดเวลา`],
    ["⛺", "เต็นท์", "เดินเข้าเต็นท์ · พลังชีวิต/เกราะเต็ม + ล้างสถานะ (คนละครั้ง) · ทุกคนนอนครบ = ฟ้าสาง ออกเดินทาง"],
    ["🔥", "กองไฟ / ครัวกลางแจ้ง", `ทำอาหาร · วัตถุดิบจากกระเป๋าก่อนแล้วกล่องรถ · สุก ${C.cookMs / 1000} วิ · คนข้าวตามจังหวะ (Space) ≥ ${Math.round(C.greatAt * 100)}% = อร่อยพิเศษ (+${Fd.greatHeal}) · กินที่กองไฟด้วยกัน ≥ ${Fd.feast.min} คน = คุ้มครอง +${Fd.feast.guard}`],
    ["🪓", "กองฟืน", `ผ่าฟืนตามจังหวะ คนละ ${C.chop.perPlayer} ครั้ง · ผ่าดี = ไฟกองใหญ่ขึ้น (สูงสุด ${C.fireMax} ขั้น) · ออกจากแคมป์ ทุกคน: ขั้น 1 หลบหลีก 10% · ขั้น 2 + คุ้มครอง +1 · ขั้น 3 + เสริมพลัง +1 (สู้ครั้งหน้า 1 เทิร์น)`],
    ["🍡", "ที่ปิ้งมาร์ชเมลโล่", `กดค้างปิ้ง ปล่อยตอนเหลืองทอง · ทอง = พลังชีวิต +${M.goldenHeal} +${M.goldenGold} 🪙 · พอดี = +${M.okHeal} · ไหม้ = 0 · คนละครั้ง`],
    ["👻", "ขอนเล่าเรื่อง: เรื่องผี", `รวม ≥ ${C.story.min} คนใน ${C.joinMs / 1000} วิ → โหวตตอนจบ · ทุกคนที่โหวต หลบหลีก ${C.story.evade}% (${C.story.turns} เทิร์น) · ตรงเสียงข้างมาก +${C.story.matchGold} 🪙`],
    ["🎸", "ขอนเล่าเรื่อง: ร้องเพลง", `รวม ≥ ${C.sing.min} คน → กดตามจังหวะ · เฉลี่ยทั้งวง ≥ ${Math.round(C.sing.pass * 100)}% = พลังชีวิต +${C.sing.heal} + เสริมพลัง +1 · ≥ ${Math.round(C.sing.great * 100)}% = 2 เทิร์น`],
    ["🔭", "กล้องบนลานหิน", `หากลุ่มดาวที่ตรงกับภาพ · ถูก +${C.stars.gold} 🪙 · คนละครั้ง`],
    ["🎣", "ท่าเรือ", `ตกปลาตามจังหวะ คนละ ${C.fish.casts} ครั้ง · ดี = ปลาสด ${C.fish.greatN} · พอได้ = 1`],
    ["🛶", "เรือแคนู", `2 คนพายตามจังหวะ · เฉลี่ย ≥ ${Math.round(C.canoe.pass * 100)}% = พลังชีวิต +${C.canoe.heal} +${C.canoe.gold} 🪙 · ≥ ${Math.round(C.canoe.great * 100)}% = +${C.canoe.greatGold} 🪙`],
    ["🌿", "เปลญวน / หมาแคมป์", `นอนเปล พลังชีวิต +${C.rest.hammockHeal} · ลูบหมา +${C.rest.petHeal} · คนละครั้ง`],
    ["🛠️", "แม่แรง", `ขันน็อต 3 ตัวตามจังหวะ = รถตู้ +1 ถึง +${C.repairHp} · ฟรี คนละครั้ง · กล่องรถ = ยืนติดรถตู้`],
    ["🏮", "ตลาดนัดกลางคืน", `รถฟู้ดทรัค (อาหารพร้อมกิน) · แผงวัตถุดิบ (ชนิดละ ${Fd.vendor}) · แผงของแคมป์`],
    ["🥬", "วัตถุดิบ", `${ing} · แผงวัตถุดิบในปั๊ม ชนิดละ ${Fd.grocer} · ซ้อนช่องละ ${Fd.stack}`],
  ];
  for (const r of RT_RECIPES) {
    const i = shopInfoOf({ type: r.dish });
    rows.push([i.icon, i.label({}), `${Object.keys(r.need).map((t) => shopInfoOf({ type: t }).icon).join(" + ")} · ${i.short} · กินได้ทุกที่นอกการต่อสู้`]);
  }
  return rows;
}

function funRows() {
  const F = RT_FUN;
  const jam = F.jam.tiers.map((t) => `${pct(t.min)}+ หลบหลีก ${t.evade}%${t.might ? ` เสริมพลัง +${t.might}` : ""} ${t.turns} เทิร์น`).join(" · ");
  return [
    ["🎲", "วงเต๋า", `ลงขัน ${F.dice.antes.join("/")} 🪙 · สูงสุด ${F.dice.max} คน · ทอย 2 ลูก แต้มสูงสุดกินกอง (เสมอ = แบ่ง) · คนเดียว = เล่นกับเจ้ามือ`],
    ["🎸", "วงดนตรี", `เพลง ${F.jam.lenMs / 1000} วิ กดโน้ตตามจังหวะ · ทุกคนยกเว้นคนขับ · ยิ่งคนเยอะคะแนนยิ่งคูณ · บัฟทีมสู้ครั้งหน้า: ${jam}`],
    ["🍖", "ปิ้งย่างบนหลังคา", `พลิกตอนสุกพอดี · ช่วงละ ${F.grill.perLeg} รอบ · ได้สูงสุด ${F.grill.max} ที่ · กิน = เลือด +${F.grill.heal} (เลือดเต็ม = เกราะ +${F.grill.armor})`],
    ["🔭", "ผู้ส่องทาง", `ส่องเห็นกล่องของข้างหน้า ปักหมุดได้ ${F.spot.max} · คนขับเข้าเลนทัน = ทุกคน 🪙 ${F.spot.coin} · ${F.spot.itemPct}% เป็นกล่องไอเทม (ไอเทม + ทุกคน 🪙 1)`],
    ["🧊", "ตู้เย็น", `เครื่องดื่ม ${F.fridge.stock} ขวด (เติมที่ปั๊ม) · ล้างสถานะผิดปกติ 1 อย่าง หรือ เลือด +${F.fridge.heal}`],
    ["🧰", "กล่องเครื่องมือ", `ยืนซ่อม ${F.repair.needMs / 1000} วิ = รถ +${F.repair.hp} HP · สองคนเร็วขึ้นเท่าตัว · คนละครั้งต่อ ${F.repair.cdMs / 1000} วิ`],
    ["🚶", "เดินในรถ", "คลิกของในรถ = เดินไปใช้เอง · ขึ้นหลังคาทางซันรูฟ"],
  ];
}

function fightRows(km) {
  const S = RT_FIGHT.swerve;
  return [
    ["⚔️", "ดักทาง", "รถตู้จอดกลางถนน · มอนโผล่หน้า/หลัง · ล้มหมด = ชนะ"],
    ["🚐", "ไล่ล่ารถ (สู้บนรถ)", `รถกำลังวิ่ง · ต้นเทิร์นถนนเลื่อน: คนนอกรถถอยหลัง ตกท้าย = −${RT_FIGHT.fallDmg} แล้วกลับท้ายรถ · รอด ${3 + Math.min(2, Math.floor(km / 100))} เทิร์น หรือล้มหมด = ชนะ`],
    ["🧑‍✈️", "คนขับ (สู้บนรถ)", `ช่องคนขับว่างตอนจบเทิร์น = รถส่าย รถ −2 · ปาดรถ: ชนมอนข้างรถ ${S.dmg} + ขั้นกันชน · มึน ${S.stun} เทิร์น · คูลดาวน์ ${S.cd}`],
    ["🎯", "ป้อมปืน", `ยืนช่องซันรูฟ/หลังคา · ยิงมอนห่างรถ ≤ ${RT_FIGHT.turretRange} · ดาเมจ ${RT_FIGHT.turretBase} + ขั้นป้อมปืน · ตาละครั้ง · อัปเกรดแล้วยิงเองต้นเทิร์นด้วย`],
    ["🪟", "หน้าต่างข้าง", "ตีปกติตัวประชิดถึง 3 ช่อง · สกิล/ตัวไกล อย่างน้อย 2"],
    ["⬆️", "หลังคา", `ทีละคน · ระยะ +2 · โดนได้แค่ตัวบิน/บอส · ถนนกระตุก/ปาดรถ = ร่วง ${pct(RT_FIGHT.roofFall)}`],
    ["🚪", "ประตูท้าย", "เปิด/ปิดในตาตัวเอง · เปิดแล้วยืนแถวท้ายรถ = ระยะตี +1"],
    ["🛡️", "บัฟสู้ครั้งหน้า", "จากกิจกรรม/เหตุการณ์ ติดตอนเริ่มการต่อสู้ครั้งถัดไป"],
    ["🏳️", "มอนถอย", `ครบ ${RT_FIGHT.maxRounds} เทิร์น (ไม่ใช่บอส) = มอนที่เหลือถอย = ชนะ`],
    ["🪙", "รางวัลชนะ", `ทุกคน ${RT_REWARD.base} + กม./${RT_REWARD.perKm} (ตอนนี้ ${RT_REWARD.base + Math.floor(km / RT_REWARD.perKm)}) · มอนระดับสูง +${RT_REWARD.elite} · บอส +${RT_REWARD.boss}`],
  ];
}

function MobCard({ type }) {
  const b = RT_MOBS[type];
  return (
    <li className="rtg-card">
      <span className="rtg-card-art"><img src={mobImg(type)} alt="" loading="lazy" draggable="false" /></span>
      <div className="rtg-card-body">
        <b className="rtg-card-name">{b.name}</b>
        <div className="rtg-card-stats rt-num">
          <span {...tip("พลังชีวิต (ฐาน)")}>♥ {b.hp}</span><span {...tip("เกราะ (ฐาน)")}>⛨ {b.armor}</span>
          <span {...tip("พลังโจมตี (ฐาน)")}>⚔ {b.atk}</span><span {...tip("ระยะเดิน")}>👣 {b.mov}</span><span {...tip("เหรียญของคนที่ล้มมัน")}>🪙 {b.gold}</span>
        </div>
        <div className="rtg-tags">
          {mobTraits(type).filter((t) => t.key !== "boss").map((t) => <span key={t.key} className="rtg-tag" {...tip(t.desc, t.label)}><span aria-hidden="true">{t.icon}</span>{t.label}</span>)}
        </div>
        {RT_MOB_WHERE[type] && <small className="rtg-card-where">📍 {RT_MOB_WHERE[type]}</small>}
      </div>
    </li>
  );
}
function BossCard({ type, i }) {
  const b = RT_MOBS[type];
  return (
    <li className="rtg-card rtg-boss">
      <span className="rtg-card-art"><img src={mobImg(type)} alt="" loading="lazy" draggable="false" /></span>
      <div className="rtg-card-body">
        <b className="rtg-card-name">{b.name} <small>{RT_ROUTE.bossKm * (i + 1)} กม.</small></b>
        <div className="rtg-card-stats rt-num">
          <span {...tip("พลังชีวิต (ฐาน)")}>♥ {b.hp}</span><span {...tip("เกราะ (ฐาน)")}>⛨ {b.armor}</span>
          <span {...tip("พลังโจมตี (ฐาน)")}>⚔ {b.atk}</span><span {...tip("ระยะเดิน")}>👣 {b.mov}</span><span {...tip("เหรียญของคนที่ล้มมัน")}>🪙 {b.gold}</span>
        </div>
        <ul className="rtg-moves">
          {(RT_BOSS_MOVES[type] || []).map((m) => <li key={m.name}><b>{m.name}{m.ph > 1 && <em className="rtg-ph2">ระยะ 2</em>}</b><span>{m.desc}</span></li>)}
        </ul>
      </div>
    </li>
  );
}
function Bestiary({ players }) {
  const n = Math.max(1, players | 0);
  const rows = [
    ["📈", "แกร่งขึ้นตามระยะ", `เลือด × (1 + โต × กม./10) · ต่อ 10 กม.: ${DIFF_KEYS.map((k) => `${DIFFS[k].name} +${pct(RT_DIFF[k].grow)}`).join(" · ")} · พลังโจมตีโตครึ่งหนึ่ง (สูงสุด ${RT_MOB_CAPS.atk})`],
    ["🔁", "รอบภูมิภาค", "วนครบ 5 ภูมิภาค = เลือด ×1.25 · เกราะ +1 ต่อรอบ"],
    ["👥", "จำนวนผู้เล่น", `เลือดมอน ×${partyMul(1).toFixed(2)} (1 คน) → ×${partyMul(6).toFixed(2)} (6 คน) · ตอนนี้ ${n} คน ×${partyMul(n).toFixed(2)}`],
    ["🔢", "จำนวนมอน", `(2 + กม./75 + ผู้เล่นที่เกิน 1) × ${DIFF_KEYS.map((k) => RT_DIFF[k].count).join("/")} ตามความยาก · สูงสุด ${RT_MOB_CAPS.count}`],
    ["👑", "บอส", `เลือด × ความยาก ${DIFF_KEYS.map((k) => RT_DIFF[k].bossHp).join("/")} × (1 + ${DIFF_KEYS.map((k) => RT_DIFF[k].bossGrow).join("/")} × ลำดับบอส) × ผู้เล่น ${bossPartyMul(1).toFixed(1)} (1 คน) → ${bossPartyMul(6).toFixed(1)} (6 คน) · พลังโจมตี +1 ทุก 2 บอส · 4 คนขึ้นไป +1 · 2 คน −1 · 1 คน −2 (สูงสุด ${RT_MOB_CAPS.bossAtk}) · ลูกน้อง 1 + 1 ต่อผู้เล่น 2 คน`],
    ...RT_BOSS_PHASES.map((p) => ["👑", `บอส ${p.label}`, p.desc]),
    ...Object.values(RT_ROLES).map((r) => [r.icon, r.label, r.desc]),
    ["💀", "หัวหน้า", `มอนระดับสูง 1 ตัวต่อฝูง · เลือด ×${RT_ELITE.hp} +2 · พลังโจมตี +${RT_ELITE.atk} · เกราะ +${RT_ELITE.armor} · เหรียญ +${RT_ELITE.gold}`],
    ["🎲", "หลบได้", "ทุกการตีของมอนหลบได้ (หลบหลีก/ช่องหลบ)"],
  ];
  return (
    <>
      <ul className="rtg-grid">{RT_MOB_ORDER.map((t) => <MobCard key={t} type={t} />)}</ul>
      <h3 className="rtg-h">บอส</h3>
      <ul className="rtg-grid rtg-grid-boss">{RT_BOSSES.map((t, i) => <BossCard key={t} type={t} i={i} />)}</ul>
      <h3 className="rtg-h">ความแกร่ง</h3>
      <ul className="rtg-rows">{rows.map(([ico, name, desc]) => <Row key={name} ico={ico} name={name} desc={desc} />)}</ul>
    </>
  );
}

const Row = ({ ico, name, desc }) => <li className="rtg-row"><span className="ico" aria-hidden="true">{ico}</span><b>{name}</b><p>{desc}</p></li>;

const TABS = [
  { id: "trip", icon: "🛣️", name: "การเดินทาง" },
  { id: "route", icon: "⑂", name: "ทางแยก" },
  { id: "event", icon: "❓", name: "เหตุการณ์" },
  { id: "van", icon: "🚐", name: "รถตู้" },
  { id: "stop", icon: "⛽", name: "จุดพัก" },
  { id: "camp", icon: "🏕️", name: "แคมป์" },
  { id: "fun", icon: "🎲", name: "ในรถ" },
  { id: "fight", icon: "⚔️", name: "การต่อสู้" },
  { id: "mob", icon: "👹", name: "มอน" },
];

export default function RtGuide({ rt, players = 1, onClose, initialTab = "trip" }) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const diff = rt && RT_DIFF[rt.diff] ? rt.diff : "normal";
  const km = Math.floor((rt && rt.km) || 0);
  const van = rt && rt.van;
  const rows = tab === "trip" ? tripRows(diff) : tab === "route" ? routeRows(diff, km) : tab === "event" ? eventRows(diff) : tab === "van" ? vanRows(diff, van)
    : tab === "stop" ? stopRows(diff) : tab === "camp" ? campRows(diff) : tab === "fun" ? funRows() : tab === "fight" ? fightRows(km) : null;
  return (
    <div className="rtg-back" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
      <div className="rtg rt-ui rt-plate" role="dialog" aria-label="คู่มือ Road Trip" onClick={(e) => e.stopPropagation()}>
        <i className="rt-bg" />
        <header>
          <h2>Road Trip</h2>
          <span className="rtg-diff" style={{ "--c": DIFFS[diff].color }}>{DIFFS[diff].name} · {km} กม.</span>
          <button type="button" className="rtg-x" aria-label="ปิด" onClick={() => { clickSound(); onClose(); }}>✕</button>
        </header>
        <nav role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} data-on={t.id === tab ? "true" : undefined} onClick={() => { clickSound(); setTab(t.id); }}>
              <span aria-hidden="true">{t.icon}</span>{t.name}
            </button>
          ))}
        </nav>
        <div className="rtg-body">
          {rows ? <ul className="rtg-rows">{rows.map(([ico, name, desc]) => <Row key={name} ico={ico} name={name} desc={desc} />)}</ul> : <Bestiary players={players} />}
        </div>
      </div>
    </div>
  );
}
