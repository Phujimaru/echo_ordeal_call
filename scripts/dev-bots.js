// บอทสำหรับทดสอบกระดาน (เฉพาะ dev) — เข้าห้อง server ที่รันอยู่ แล้วเล่นแบบง่ายๆ
//  ใช้คู่กับ ?autoplay=muimi ฝั่ง client (ผู้เล่นจริงนั่งที่ 1 · บอทนั่งที่ 2..)
//  รัน: node scripts/dev-bots.js [จำนวนบอท=3] [url=http://localhost:3000] [โหมด=ffa|duo|trio]
//  บอท: พร้อม → โหวตโหมด (ทีม: เลือกทีมสลับกัน + ยืนยัน) → จั่วจนแต้ม ≥ 16 แล้ว "พอ"
//   → ตาของตัวเอง: เดินก่อน (มีเหรียญ = แวะร้านบ้าง ไม่งั้นเข้าหาศัตรูใกล้สุด) แล้วสุ่มทำ (ให้ทดสอบครอบคลุม):
//     ยิงปืน GUTS · ใช้สกิลที่แต้มพอ · ใช้ของในกระเป๋า · ซื้อของถ้ายืนติดร้าน → ตีถ้าถึง ไม่งั้น "รอ"
const path = require("path");
const { io } = require(path.join(__dirname, "..", "client", "node_modules", "socket.io-client"));
const Board = require("../server/board");

const N = Math.max(1, Math.min(6, Number(process.argv[2]) || 3));
const URL = process.argv[3] || "http://localhost:3000";
const MODE = ["ffa", "duo", "trio"].includes(process.argv[4]) ? process.argv[4] : "ffa";
const CHARS = ["oberon_summer", "muimi", "sliver_bullet"];
const COLORS = ["#C0392B", "#2E9E4B", "#E5B33B", "#9B4F96", "#E86A2B", "#1C3F6E"];
const TEAMS = ["A", "B", "C"];
const chance = (pct) => Math.random() * 100 < pct;
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

function bot(i) {
  const name = `บอท ${i + 1}`;
  const s = io(URL, { transports: ["websocket"] });
  let acted = null; // กันสั่งซ้ำในตาเดิมระหว่างรอ state ใหม่
  let drawing = false; // รอจั่ว/พอ อยู่ 1 คำสั่ง (state มาถี่ — ไม่งั้นจั่วรัว)
  let readySent = false;
  let tried = {}; // สิ่งที่ลองไปแล้วในตานี้ (กันวนซ้ำเมื่อ server ไม่รับคำสั่ง)
  let watchdog = null; // คำสั่งไม่ถูกรับ (ไม่มี state ใหม่) → "รอ" จบตา ไม่ให้ค้างจนหมดเวลา
  let shopTrip = false; // กำลังเดินไปร้าน (ข้ามหลายตา)
  s.on("connect", () => s.emit("join", { name, position: i + 2, color: COLORS[i % COLORS.length], characterId: CHARS[i % CHARS.length] }));
  s.on("state", (st) => {
    const me = st.players.find((p) => p.id === st.youId);
    if (!me) return;
    // รอให้ผู้เล่นจริงเข้าห้องก่อน (บอทพร้อมครบเองจะพาเข้าหน้าเลือกโหมดทันที)
    // toggleReady เป็นสวิตช์: ส่งครั้งเดียวต่อการรอ ไม่งั้น state 2 ก้อนที่มาก่อน server ตอบ = กดพร้อมแล้วยกเลิกเอง
    if (st.gameState === "LOBBY" && !me.ready && st.players.length >= N + 1 && !readySent) { readySent = true; s.emit("toggleReady"); }
    if (st.gameState === "LOBBY" && me.ready) readySent = false;
    if (st.gameState === "TEAM_MODE" && !me.modeVote) s.emit("selectGameMode", { mode: MODE });
    if (st.gameState === "TEAM_SETUP") {
      const teamCount = MODE === "trio" ? Math.ceil((N + 1) / 3) : Math.ceil((N + 1) / 2);
      if (!me.teamId) s.emit("chooseTeam", { teamId: TEAMS[(i + 1) % Math.max(1, teamCount)] });
      else if (!me.teamConfirmed) s.emit("confirmTeam", { confirmed: true });
    }
    if (st.gameState === "PLAYING" && me.alive && !me.locked && !drawing) {
      drawing = true;
      setTimeout(() => { drawing = false; s.emit((me.score ?? 0) >= 16 || me.atCap ? "lock" : "hit"); }, 400 + Math.random() * 600);
    }
    if (st.gameState !== "ACTION" || st.actorId !== me.id) { clearTimeout(watchdog); if (st.gameState !== "ATTACKING") tried = {}; }
    if (st.gameState === "ACTION" && st.actorId === me.id && st.action && me.pos) {
      const stamp = [st.roundNumber, st.action.moved, st.action.locked, me.skillUsed, (me.inventory || []).length, me.gold, me.skillPoints].join(":");
      if (acted === stamp) return;
      acted = stamp;
      clearTimeout(watchdog);
      setTimeout(() => takeTurn(st, me), 700);
    }
  });
  const send = (ev, data) => {
    s.emit(ev, data);
    clearTimeout(watchdog);
    if (ev !== "endAction") watchdog = setTimeout(() => s.emit("endAction"), 4000);
  };
  function takeTurn(st, me) {
    const teamMode = st.gameMode === "duo" || st.gameMode === "trio";
    const ally = (p) => teamMode && me.teamId && p.teamId === me.teamId;
    const map = { ...st.board, heal: new Set(st.board.heal) };
    // คนที่ server ไม่ส่งตำแหน่งมา (pos: null — นักบินปริศนาซ่อนตัว / ศัตรูในพุ่มไม้) = มองไม่เห็น ไม่นับเป็นเป้า/สิ่งกีดขวาง
    const units = st.players.filter((p) => p.alive && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null }));
    const foes = st.players.filter((p) => p.alive && p.pos && p.id !== me.id && !ally(p));
    if (!foes.length) { send("endAction"); return; }
    const range = me.range || [1, 1];
    const near = (lo, hi) => foes.filter((f) => { const d = Board.dist(me.pos, f.pos); return d >= lo && d <= hi; });
    const inv = me.inventory || [];
    const bagFull = inv.length >= (st.bagSlots || 5);

    // 1) เดินก่อน (แบบ FE) — มีเหรียญ → แวะร้าน (บางครั้ง) · ไม่งั้นเข้าหาศัตรู · ยืนตีถึง/ติดร้านอยู่แล้ว = ไม่เดิน
    if (!tried.move && !st.action.moved && !st.action.locked) {
      tried.move = true;
      // ตัดสินใจไปร้านแล้วไปให้ถึง (ไม่สุ่มใหม่ทุกตา ไม่งั้นเดินวนกลางทาง)
      if (shopTrip && ((me.gold || 0) < 6 || bagFull || !st.shopPos)) shopTrip = false;
      else if (!shopTrip && (me.gold || 0) >= 6 && st.shopPos && !bagFull && chance(50)) shopTrip = true;
      const wantShop = shopTrip;
      const already = wantShop ? Board.dist(me.pos, st.shopPos) === 1 : near(range[0], range[1]).length > 0;
      if (!already) {
        const blocked = st.shopPos ? new Set([Board.key(st.shopPos.x, st.shopPos.y)]) : null;
        const reach = Board.reachable(map, { id: me.id, ...me.pos }, me.mov || 0, units, { blocked, isAlly: (a, b) => teamMode && a.teamId && a.teamId === b.teamId });
        const goals = wantShop ? [{ pos: st.shopPos, shop: true }] : foes.map((f) => ({ pos: f.pos }));
        let best = null;
        for (const n of reach.values()) {
          for (const g of goals) {
            const d = Board.dist(n, g.pos);
            const score = (g.shop ? d === 1 : Board.inRange(range, d)) ? -100 + n.d : d;
            if (!best || score < best.score) best = { n, score };
          }
        }
        if (best && best.n.d > 0) { send("move", { x: best.n.x, y: best.n.y }); return; }
        // หลังเดิน state ใหม่จะเรียก takeTurn อีกรอบ (moved = true) → ทำอย่างอื่นต่อ
      }
    }
    // 2) ยิงปืน GUTS (จบตา)
    const ammo = inv.find((it) => it.type === "gutsAmmo");
    const gunRange = st.gutsRange || [1, 4];
    if (!tried.gun && ammo && inv.some((it) => it.type === "gutsGun") && me.gutsShotTurn !== st.roundNumber && near(gunRange[0], gunRange[1]).length && chance(60)) {
      tried.gun = true;
      send("useInventoryItem", { uid: ammo.uid, targetId: pickOne(near(gunRange[0], gunRange[1])).id });
      return;
    }
    // 3) สกิล (ครั้งเดียวต่อตา · สุ่ม)
    if (!tried.skill && !me.skillUsed && chance(45)) {
      tried.skill = true;
      const ch = me.character || {};
      // ท่าที่ไม่มี (ultimate: null) / ล็อก / คูลดาวน์ = ข้าม
      const lock = (t) => { const l = (me.skillLocks || {})[t]; return !!l && (!!l.locked || (l.cd || 0) > 0); };
      const tiers = ["basic", "secondary", "ultimate"].filter((t) => ch[t] && !lock(t) && (ch[t].cost || 0) <= (me.skillPoints || 0));
      const tier = tiers.length ? pickOne(tiers) : null;
      const a = tier ? ch[tier].area || { kind: "self" } : null;
      if (a && a.kind === "line") {
        const f = foes.reduce((b, x) => (!b || Board.dist(me.pos, x.pos) < Board.dist(me.pos, b.pos) ? x : b), null);
        const dx = f.pos.x - me.pos.x, dy = f.pos.y - me.pos.y;
        const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        send("useSkill", { tier, dir });
        return;
      }
      if (a && a.kind === "target") {
        const ok = st.players.filter((p) => p.alive && p.pos && Board.dist(me.pos, p.pos) <= (a.range || 0) && (p.id !== me.id || a.self));
        const t = ok.length ? pickOne(ok) : (a.self ? me : null);
        if (t) { send("useSkill", { tier, targets: [t.id] }); return; }
      } else if (a) {
        send("useSkill", { tier });
        return;
      }
    }
    // 4) ของในกระเป๋าที่ใช้กับตัวเอง
    const usable = inv.filter((it) => ["armor", "skillPoint", "resist", "fortune"].includes(it.type) || (it.type === "mark42" && !me.mark42));
    if (!tried.item && usable.length && chance(40)) {
      tried.item = true;
      const it = pickOne(usable);
      send("useInventoryItem", it.type === "mark42" ? { uid: it.uid, mode: "self" } : { uid: it.uid });
      return;
    }
    // 5) ซื้อของเมื่อยืนติดร้าน (ซื้อได้หลายชิ้น — tried นับต่อชิ้น)
    const nearShop = st.shopPos && Board.dist(me.pos, st.shopPos) === 1;
    if ((tried.buy || 0) < 2 && nearShop && !bagFull) {
      tried.buy = (tried.buy || 0) + 1;
      const hasGun = inv.some((it) => it.type === "gutsGun");
      const ok = (st.shop || []).filter((it) => !it.sold && it.price <= (me.gold || 0) && !(it.type === "gutsGun" && hasGun) && !(it.type === "mark42" && me.mark42));
      if (ok.length) { shopTrip = false; send("buyShopItem", { itemId: pickOne(ok).id }); return; }
    }
    // 6) ตีถ้าถึง ไม่งั้น "รอ"
    const inReach = foes.find((f) => Board.inRange(range, Board.dist(me.pos, f.pos)));
    if (inReach) { send("attack", { targetId: inReach.id }); return; }
    send("endAction");
  }
  s.on("disconnect", () => console.log(`${name} หลุด`));
  return s;
}

for (let i = 0; i < N; i++) setTimeout(() => bot(i), i * 300);
console.log(`บอท ${N} ตัว → ${URL} (${MODE})`);
