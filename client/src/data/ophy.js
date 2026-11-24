// ข้อมูล Ophy ฝั่ง client (ชื่อ/ไอคอน/สูตร) — ต้องตรงกับ characters/ophy.js
export const OPHY_DIR = "/characters/ophy";
export const MATS = {
  herb: { name: "สมุนไพร", icon: "🌿", rgb: "110,210,90" },
  orb: { name: "ลูกแก้วธาตุ", icon: "🔮", rgb: "190,110,255" },
  crystal: { name: "ผลึกเวท", icon: "💎", rgb: "120,210,255" },
  pulse: { name: "แก่นชีพจร", icon: "🧬", rgb: "255,120,200" },
  water: { name: "น้ำบริสุทธิ์", icon: "💧", rgb: "90,170,255" },
  spirit: { name: "สสารวิญญาณ", icon: "👻", rgb: "220,220,255" },
};
export const POTIONS = {
  base: { n: 1, name: "น้ำยาตั้งต้น", icon: "⚗️", rgb: "58,120,230" },
  frost: { n: 2, name: "น้ำยาเย็นยะเยือก", icon: "❄️", rgb: "60,205,225" },
  bolt: { n: 3, name: "น้ำยาอัสนี", icon: "⚡", rgb: "235,210,60" },
  venom: { n: 4, name: "น้ำยาพิษร้าย", icon: "☠️", rgb: "200,40,200" },
  flame: { n: 5, name: "น้ำยาเพลิง", icon: "🔥", rgb: "245,135,30" },
  heal: { n: 6, name: "น้ำยาเยียวยา", icon: "❤️", rgb: "40,215,90" },
  noheal: { n: 7, name: "น้ำยาไร้ทางเยียวยา", icon: "🚫", rgb: "60,55,80" },
  ward: { n: 8, name: "น้ำยาภูมิต้านทาน", icon: "🛡️", rgb: "150,190,120" },
  invis: { n: 9, name: "น้ำยาล่องหน", icon: "👻", rgb: "220,228,240" },
  warp: { n: 10, name: "น้ำยาวาร์ป", icon: "🌀", rgb: "130,100,230" },
  morph: { n: 11, name: "น้ำยาแปลงร่าง", icon: "🐦", rgb: "220,40,40" },
};
export const potImg = (k) => `${OPHY_DIR}/potions/p${(POTIONS[k] || POTIONS.base).n}.webp`;
// สูตร (สลับตำแหน่งได้) — วัตถุดิบ = คีย์ · น้ำยา = "p:<คีย์>"
export const RECIPES = [
  ["base", ["herb", "herb", "water"]],
  ["frost", ["orb", "orb", "water"]],
  ["bolt", ["orb", "pulse", "water"]],
  ["venom", ["herb", "pulse", "water"]],
  ["flame", ["orb", "crystal", "water"]],
  ["heal", ["herb", "herb", "pulse"]],
  ["noheal", ["crystal", "crystal", "pulse"]],
  ["ward", ["herb", "crystal", "water"]],
  ["invis", ["spirit", "spirit", "water"]],
  ["warp", ["p:invis", "crystal", "orb"]],
  ["morph", ["p:invis", "p:heal", "pulse"]],
];
const sig = (list) => [...list].sort().join("+");
const BY_SIG = Object.fromEntries(RECIPES.map(([k, ing]) => [sig(ing), k]));
export const recipeOf = (tokens) => (tokens && tokens.length === 3 ? BY_SIG[sig(tokens)] || null : null);
export const tokenName = (t) => (t && t.startsWith("p:") ? (POTIONS[t.slice(2)] || {}).name : (MATS[t] || {}).name) || "";
export const POT_STACK = 5, MAT_STACK = 15, ROW = 6;
