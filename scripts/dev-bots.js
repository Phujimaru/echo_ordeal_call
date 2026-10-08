// บอทสำหรับทดสอบกระดาน (เฉพาะ dev) — เข้าห้อง server ที่รันอยู่ แล้วเล่นแบบง่ายๆ
//  ใช้คู่กับ ?autoplay=muimi ฝั่ง client (ผู้เล่นจริงนั่งที่ 1 · บอทนั่งที่ 2..)
//  รัน: node scripts/dev-bots.js [จำนวนบอท=3] [url=http://localhost:3000]
//  บอท: พร้อม → โหวต ffa → จั่วจนแต้ม ≥ 16 แล้ว "พอ" → ตาของตัวเอง: เดินเข้าหาศัตรูใกล้สุด ตีถ้าถึง ไม่งั้น "รอ"
const path = require("path");
const { io } = require(path.join(__dirname, "..", "client", "node_modules", "socket.io-client"));
const Board = require("../server/board");

const N = Math.max(1, Math.min(6, Number(process.argv[2]) || 3));
const URL = process.argv[3] || "http://localhost:3000";
const CHARS = ["oberon_summer", "muimi"];
const COLORS = ["#C0392B", "#2E9E4B", "#E5B33B", "#9B4F96", "#E86A2B", "#1C3F6E"];

function bot(i) {
  const name = `บอท ${i + 1}`;
  const s = io(URL, { transports: ["websocket"] });
  let acted = null; // กันสั่งซ้ำในตาเดิมระหว่างรอ state ใหม่
  let drawing = false; // รอจั่ว/พอ อยู่ 1 คำสั่ง (state มาถี่ — ไม่งั้นจั่วรัว)
  s.on("connect", () => s.emit("join", { name, position: i + 2, color: COLORS[i % COLORS.length], characterId: CHARS[i % CHARS.length] }));
  s.on("state", (st) => {
    const me = st.players.find((p) => p.id === st.youId);
    if (!me) return;
    // รอให้ผู้เล่นจริงเข้าห้องก่อน (บอทพร้อมครบเองจะพาเข้าหน้าเลือกโหมดทันที)
    if (st.gameState === "LOBBY" && !me.ready && st.players.length >= N + 1) s.emit("toggleReady");
    if (st.gameState === "TEAM_MODE" && !me.modeVote) s.emit("selectGameMode", { mode: "ffa" });
    if (st.gameState === "PLAYING" && me.alive && !me.locked && !drawing) {
      drawing = true;
      setTimeout(() => { drawing = false; s.emit((me.score ?? 0) >= 16 || me.atCap ? "lock" : "hit"); }, 400 + Math.random() * 600);
    }
    if (st.gameState === "ACTION" && st.actorId === me.id && st.action && me.pos) {
      const stamp = `${st.roundNumber}:${st.action.moved}`;
      if (acted === stamp) return;
      acted = stamp;
      setTimeout(() => takeTurn(st, me), 700);
    }
  });
  function takeTurn(st, me) {
    const map = { ...st.board, heal: new Set(st.board.heal) };
    const units = st.players.filter((p) => p.alive && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true }));
    const foes = st.players.filter((p) => p.alive && p.pos && p.id !== me.id);
    if (!foes.length) { s.emit("endAction"); return; }
    const range = me.range || [1, 1];
    const inReach = foes.find((f) => Board.inRange(range, Board.dist(me.pos, f.pos)));
    if (inReach) { s.emit("attack", { targetId: inReach.id }); return; }
    if (st.action.moved || st.action.locked) { s.emit("endAction"); return; }
    const blocked = st.shopPos ? new Set([Board.key(st.shopPos.x, st.shopPos.y)]) : null;
    const reach = Board.reachable(map, { id: me.id, ...me.pos }, me.mov || 0, units, { blocked });
    let best = null;
    for (const n of reach.values()) {
      for (const f of foes) {
        const d = Board.dist(n, f.pos);
        const score = Board.inRange(range, d) ? -100 + n.d : d;
        if (!best || score < best.score) best = { n, score };
      }
    }
    if (!best || best.n.d === 0) { s.emit("endAction"); return; }
    s.emit("move", { x: best.n.x, y: best.n.y });
    // หลังเดิน state ใหม่จะเรียก takeTurn อีกรอบ (moved = true) → ตีถ้าถึง ไม่งั้นรอ
  }
  s.on("disconnect", () => console.log(`${name} หลุด`));
  return s;
}

for (let i = 0; i < N; i++) setTimeout(() => bot(i), i * 300);
console.log(`บอท ${N} ตัว → ${URL}`);
