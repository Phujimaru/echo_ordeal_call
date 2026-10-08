// สร้าง client/src/board/boardRules.js (ESM) จาก server/board.js (CommonJS) — กติกากระดานชุดเดียวกันทั้งสองฝั่ง
//  แก้ server/board.js แล้วรัน: node scripts/gen-board-rules.js
//  tests/board-rules-sync.test.js ฟ้องถ้าไฟล์ฝั่ง client ไม่ตรงกับที่สร้างจาก server/board.js
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "server", "board.js");
const OUT = path.join(__dirname, "..", "client", "src", "board", "boardRules.js");

function generate() {
  const src = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
  const m = src.match(/\nmodule\.exports = \{([\s\S]*?)\};\s*$/);
  if (!m) throw new Error("server/board.js ต้องจบด้วย module.exports = { ... };");
  const body = src.slice(0, m.index);
  return [
    "// ⚠️ ไฟล์นี้สร้างอัตโนมัติจาก server/board.js — ห้ามแก้ตรงนี้ (แก้ที่ server แล้วรัน node scripts/gen-board-rules.js)",
    body.trimEnd(),
    "",
    "// state.board จาก server ส่ง heal เป็น array ของ \"x,y\" — แปลงกลับเป็นรูปเดียวกับแผนที่ฝั่ง server ก่อนส่งให้ฟังก์ชันในไฟล์นี้",
    "function normalizeMap(pub) {",
    "  if (!pub) return null;",
    "  return { ...pub, terrain: pub.terrain || {}, heal: pub.heal instanceof Set ? pub.heal : new Set(pub.heal || []) };",
    "}",
    "",
    `export {${m[1].trimEnd()}\n  normalizeMap,\n};`,
    "",
  ].join("\n");
}

if (require.main === module) {
  fs.writeFileSync(OUT, generate());
  console.log("เขียน " + path.relative(process.cwd(), OUT));
}
module.exports = { generate, OUT };
