// จำลองผู้เล่นหลายเครื่องในโหมด Road Trip (QA — เฉพาะ dev) — เปิด server ของตัวเองบนพอร์ตว่าง แล้วต่อ socket หลายตัว
//  รัน: node scripts/rt-sim.js [ฉาก=all|stop|drive|fork|combat|lose] [จำนวนผู้เล่น=5]
//  ตรวจ: exception ใน stderr ของ server · คำสั่งที่ควรผ่านแต่ server ไม่รับ · ช่วงค้าง (ไม่ขยับ > 30 วิ) · state ไม่ตรงกันระหว่างเครื่อง · ตัวจับเวลาค้างหลังจบเกม
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");
const { io } = require(path.join(__dirname, "..", "client", "node_modules", "socket.io-client"));
const Maps = require("../server/roadtrip/maps");

const SCENE = process.argv[2] || "all";
const N = Math.max(1, Math.min(6, Number(process.argv[3]) || 5));
const CHARS = ["muimi", "kate", "fern", "gyro_zeppeli", "trafalgar_law", "kusakabe_shinra", "echo", "freddy_fazbear"];
const DIFFS = ["easy", "hard", "easy", "normal", "easy", "hard"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const bug = (msg) => { problems.push(msg); console.log("  ✗ " + msg); };
const ok = (msg) => console.log("  ✓ " + msg);

function freePort() {
  return new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
}
async function startServer(env) {
  const port = await freePort();
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port), ECHO_DEV_ACTION_TIME: "30", JOURNEY_START_SECONDS: "0", ECHO_RT_FILE: path.join(require("os").tmpdir(), `rt-sim-best-${port}.json`), ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const errs = [];
  child.stderr.on("data", (d) => { const t = String(d); errs.push(t); if (/error|exception|TypeError|ReferenceError/i.test(t)) bug(`server stderr: ${t.trim().split("\n").slice(0, 4).join(" | ")}`); });
  child.stdout.on("data", () => {});
  for (let i = 0; i < 50; i++) { await sleep(150); if (await canConnect(port)) break; }
  return { port, child, errs, url: `http://127.0.0.1:${port}` };
}
function canConnect(port) { return new Promise((res) => { const s = net.connect(port, "127.0.0.1", () => { s.end(); res(true); }); s.on("error", () => res(false)); }); }

function client(url, i, opts = {}) {
  const s = io(url, { transports: ["websocket"], forceNew: true, reconnection: false });
  const c = { i, s, st: null, token: null, name: `ทดสอบ${i + 1}`, ch: opts.ch || CHARS[i % CHARS.length] };
  s.on("state", (st) => { c.st = st; });
  s.on("joined", ({ sessionToken }) => { c.token = sessionToken; });
  s.on("reconnected", ({ sessionToken }) => { c.token = sessionToken; });
  c.me = () => c.st && c.st.players.find((p) => p.id === c.st.youId);
  c.rt = () => c.st && c.st.roadtrip;
  c.emit = (ev, data) => s.emit(ev, data);
  c.join = () => new Promise((res) => {
    const go = () => s.emit("join", { name: c.name, position: i + 1, characterId: c.ch, color: "#C0392B" });
    if (s.connected) go(); else s.once("connect", go);
    s.once("joined", () => res(true));
    s.once("characterTaken", () => res(false));
  });
  c.close = () => s.close();
  return c;
}
async function until(pred, ms = 15000, step = 50) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (pred()) return true; } catch { /* state ยังไม่มา */ } await sleep(step); }
  return false;
}

// ---------- เข้าห้อง → พร้อม → โหวต Road Trip ----------
async function lobby(srv, n, chars = null) {
  const cs = [];
  for (let i = 0; i < n; i++) {
    const c = client(srv.url, i, chars ? { ch: chars[i] } : {});
    const joined = await c.join();
    if (!joined) bug(`ผู้เล่น ${i + 1} (${c.ch}) เข้าห้องไม่ได้`);
    cs.push(c);
  }
  await until(() => cs.every((c) => c.st && c.st.players.length === n));
  if (n === 1) cs[0].emit("startGame");
  else for (const c of cs) c.emit("toggleReady");
  if (!(await until(() => cs[0].st.gameState === "TEAM_MODE"))) bug(`ไม่เข้าหน้าเลือกโหมด (gameState ${cs[0].st.gameState})`);
  for (const c of cs) c.emit("selectGameMode", { mode: "roadtrip", world: "roadtrip", diff: DIFFS[c.i % DIFFS.length] });
  if (!(await until(() => cs.every((c) => c.rt()), 10000))) bug(`เข้าโหมด Road Trip ไม่ได้ (gameState ${cs[0].st.gameState})`);
  return cs;
}
function desync(cs, label) {
  // เทียบสนามหลักของ state.roadtrip ระหว่างเครื่อง (ข้อมูลเฉพาะคน: acts.cd/used)
  const sig = (c) => { const r = c.rt(); return r && JSON.stringify([r.phase, r.diff, r.van.driverId, r.van.upg, r.stop && r.stop.ready, r.fork && r.fork.votes]); };
  const base = sig(cs[0]);
  for (const c of cs.slice(1)) if (c.s.connected && sig(c) !== base) { bug(`${label}: state ไม่ตรงกัน ผู้เล่น 1 vs ${c.i + 1}`); return; }
}
const adjTiles = (o) => {
  const out = [];
  for (let x = o.x0 - 1; x <= o.x1 + 1; x++) for (let y = o.y0 - 1; y <= o.y1 + 1; y++) {
    const dx = Math.max(o.x0 - x, 0, x - o.x1), dy = Math.max(o.y0 - y, 0, y - o.y1);
    if (dx + dy === 1) out.push({ x, y });
  }
  return out;
};
const posKey = (p) => p && p.pos ? `${p.pos.x},${p.pos.y}` : "-";
async function walkTo(c, tiles) {
  for (const t of tiles) {
    const me = c.me();
    if (!me || !me.pos) return false;
    if (me.pos.x === t.x && me.pos.y === t.y) return true;
    c.emit("rt:walk", { x: t.x, y: t.y });
    if (await until(() => { const m = c.me(); return m.pos && m.pos.x === t.x && m.pos.y === t.y; }, 600)) return true;
  }
  return false;
}

// ---------- ฉาก: จุดพัก (ปั๊ม) ----------
async function sceneStop() {
  console.log("\n== จุดพัก: เดิน/ซื้อ/ให้-แลก/ทิ้ง/อู่/กิจกรรม/พร้อม พร้อมกันทุกคน ==");
  const srv = await startServer({ ECHO_DEV_RT_PHASE: "stop", ECHO_DEV_RT_DIFF: "easy" });
  const cs = await lobby(srv, N);
  if (!(await until(() => cs.every((c) => c.rt().phase === "stop" && c.me().pos)))) { bug("ไม่เข้าจุดพัก/ผู้เล่นไม่มีตำแหน่ง"); return finish(srv, cs); }
  ok(`เข้าปั๊ม area ${cs[0].st.board.area}`);
  const def = Maps.defs[cs[0].st.board.area];
  const shop = cs[0].st.shops[0];
  if (!shop) { bug("ปั๊มไม่มีร้าน"); return finish(srv, cs); }
  const mart = def.props.find((o) => o.kind === "mart");
  const around = adjTiles(mart);
  // ทุกคนเดินพร้อมกัน: 2 คนแรกเล็งช่องเดียวกัน (ต้องได้แค่คนเดียว)
  const target = around[0];
  cs[0].emit("rt:walk", target); cs[1 % cs.length].emit("rt:walk", target);
  await sleep(500);
  const onIt = cs.filter((c) => posKey(c.me()) === `${target.x},${target.y}`);
  if (onIt.length > 1) bug("สองคนหยุดช่องเดียวกัน"); else ok("เดินพร้อมกันช่องเดียวกัน: ได้คนเดียว");
  // ทุกคนไปยืนติดมินิมาร์ทคนละช่อง (พร้อมกัน)
  await Promise.all(cs.map((c, k) => walkTo(c, around.slice(k).concat(around.slice(0, k)))));
  const near = cs.filter((c) => around.some((t) => posKey(c.me()) === `${t.x},${t.y}`));
  if (near.length < cs.length) bug(`ยืนติดมินิมาร์ทได้ ${near.length}/${cs.length}`); else ok("ทุกคนยืนติดมินิมาร์ท");
  // ทุกคนซื้อพร้อมกัน (ของถูกสุดที่มีเงินพอ)
  const gold0 = cs.map((c) => c.me().gold);
  const cheap = [...shop.items].filter((it) => !it.sold).sort((a, b) => a.price - b.price)[0];
  for (const c of near) c.emit("buyShopItem", { shopId: shop.id, itemId: cheap.id });
  await sleep(600);
  const bought = near.filter((c) => c.me().gold < gold0[c.i]);
  if (bought.length < Math.min(cheap.stock != null ? cheap.stock : 99, near.filter((c) => gold0[c.i] >= cheap.price).length)) bug(`ซื้อพร้อมกัน: สำเร็จ ${bought.length}/${near.length} (${cheap.type} ราคา ${cheap.price}) ไม่ได้: ${near.filter((c) => !bought.includes(c)).map((c) => `${c.ch} ทอง ${gold0[c.i]} ctl ${c.st.controlId === c.st.youId ? "self" : c.st.controlId}`).join(", ")}`); else ok(`ซื้อพร้อมกัน ${bought.length} คน`);
  desync(cs, "หลังซื้อ");
  // ให้/แลก/ทิ้ง กับเพื่อนที่ยืนติดกัน
  const a = cs[0], b = cs.find((c) => c !== a && c.me().pos && Math.abs(c.me().pos.x - a.me().pos.x) + Math.abs(c.me().pos.y - a.me().pos.y) === 1);
  let adjOk = !!b;
  if (!b && cs.length > 1) { // ไปยืนข้างกัน
    const ap = a.me().pos;
    adjOk = await walkTo(cs[1], [{ x: ap.x + 1, y: ap.y }, { x: ap.x - 1, y: ap.y }, { x: ap.x, y: ap.y + 1 }, { x: ap.x, y: ap.y - 1 }]);
  }
  const mate = b || cs[1];
  if (mate && adjOk) {
    const it = (a.me().inventory || []).find((x) => x.type !== "kebread");
    if (it) {
      a.emit("giveItem", { uid: it.uid, toId: mate.me().id });
      if (await until(() => (mate.me().inventory || []).some((x) => x.uid === it.uid), 1500)) ok("ให้ของเพื่อนที่จุดพักได้"); else bug("ให้ของเพื่อนที่จุดพักไม่ได้ (giveItem)");
      const mine = (mate.me().inventory || []).find((x) => x.uid === it.uid);
      const theirs = (a.me().inventory || []).find((x) => x.type !== "kebread");
      if (mine && theirs) {
        mate.emit("swapItem", { uid: mine.uid, toId: a.me().id, theirUid: theirs.uid });
        if (await until(() => (a.me().inventory || []).some((x) => x.uid === mine.uid), 1500)) ok("แลกของที่จุดพักได้"); else bug("แลกของที่จุดพักไม่ได้ (swapItem)");
      }
    } else console.log("  · ข้ามให้/แลก (ไม่มีของ)");
  }
  const dropper = cs.find((c) => (c.me().inventory || []).some((x) => x.type !== "kebread"));
  if (dropper) {
    const it = dropper.me().inventory.find((x) => x.type !== "kebread");
    dropper.emit("dropItem", { uid: it.uid });
    if (await until(() => !(dropper.me().inventory || []).some((x) => x.uid === it.uid), 1500)) ok("ทิ้งของที่จุดพักได้"); else bug("ทิ้งของที่จุดพักไม่ได้ (dropItem)");
  }
  // ใช้ไอเทมนอกการต่อสู้ (rt:use) — ยาเกราะต้องเกราะไม่เต็ม ข้าม
  // อู่: สองคนอัปเกรดพร้อมกัน
  const garage = def.props.find((o) => o.kind === "garage");
  const gAround = adjTiles(garage);
  const [g1, g2] = [cs[cs.length - 1], cs[cs.length - 2] || cs[0]];
  await Promise.all([walkTo(g1, gAround), walkTo(g2, gAround.slice().reverse())]);
  const lv0 = g1.rt().van.upg.body | 0, gg = [g1.me().gold, g2.me().gold];
  g1.emit("rt:upg", { key: "body" }); g2.emit("rt:upg", { key: "body" });
  await sleep(600);
  const lv1 = g1.rt().van.upg.body | 0, spent = gg[0] - g1.me().gold + gg[1] - g2.me().gold;
  console.log(`  · อัปเกรดพร้อมกัน: ขั้น ${lv0}→${lv1} ใช้ทอง ${spent}`);
  if (lv1 - lv0 === 0 && spent > 0) bug("อัปเกรดไม่ขึ้นแต่เสียทอง");
  desync(cs, "หลังอัปเกรด");
  // กิจกรรมพร้อมกัน: ตู้น้ำมัน (ใช้ซ้ำได้) — ทุกคนกดพร้อมกัน
  const pump = def.props.find((o) => o.kind === "pump");
  for (const c of cs) c.emit("rt:act", { id: pump.id });
  await sleep(800);
  const fuel = cs[0].rt().van.fuel;
  if (cs.some((c) => c.rt().van.fuel !== fuel)) bug("น้ำมันไม่ตรงกันระหว่างเครื่อง");
  ok(`กิจกรรมตู้น้ำมันพร้อมกัน — น้ำมัน ${fuel}/${cs[0].rt().van.fuelMax}`);
  // กดพร้อมสลับไปมา แล้วพร้อมครบ → ขับต่อ
  cs[0].emit("rt:ready"); cs[0].emit("rt:ready"); // กดแล้วยกเลิก
  await sleep(300);
  if (cs[0].rt().stop && cs[0].rt().stop.ready[cs[0].st.youId]) bug("กดพร้อมสองครั้งแต่ยังพร้อมอยู่");
  for (const c of cs) c.emit("rt:ready");
  if (await until(() => cs.every((c) => c.rt().phase === "drive"), 5000)) ok("พร้อมครบ → ขับต่อ"); else bug(`พร้อมครบแต่ไม่ออกจากจุดพัก (${cs[0].rt().phase})`);
  if (cs.some((c) => (c.st.shops || []).length)) bug("ออกจากปั๊มแล้วร้านยังค้าง");
  return finish(srv, cs);
}

// ---------- ฉาก: ขับ (ที่นั่ง/เลี้ยว/ขอขับ/ยกให้/แตร/ไนตรัส) + หลุดแล้วกลับเข้า ----------
async function sceneDrive() {
  console.log("\n== ขับ: ที่นั่งคนขับ/ขอขับ/ยกให้/ไนตรัส/แตร + หลุดกลางทาง ==");
  const srv = await startServer({ ECHO_DEV_RT_PHASE: "drive" });
  const cs = await lobby(srv, N);
  if (!(await until(() => cs[0].rt().phase === "drive"))) { bug("ไม่เข้าช่วงขับ"); return finish(srv, cs); }
  // สองคนแย่งนั่งพร้อมกัน
  cs[0].emit("rt:seat", { seat: "driver" }); if (cs[1]) cs[1].emit("rt:seat", { seat: "driver" });
  await until(() => cs[0].rt().van.driverId, 1500);
  const drv = cs.find((c) => c.st.youId === cs[0].rt().van.driverId);
  if (!drv) { bug("ไม่มีใครได้นั่งคนขับ"); return finish(srv, cs); }
  ok(`${drv.name} ได้นั่งคนขับ`);
  drv.emit("rt:steer", { lane: drv.rt().van.lane === 1 ? 0 : 1 });
  const lane0 = drv.rt().van.lane;
  if (await until(() => cs.every((c) => c.rt().van.lane !== lane0), 1500)) ok("เลี้ยวแล้วทุกเครื่องเห็นเลนเดียวกัน"); else bug("เลี้ยวไม่ได้/เลนไม่ตรงกัน");
  drv.emit("rt:nitro");
  if (await until(() => cs[0].rt().van.nitroOn, 1200)) ok("ไนตรัส"); else console.log("  · ไม่มีไนตรัส (ขั้น 0)");
  for (const c of cs) c.emit("rt:horn");
  const other = cs.find((c) => c !== drv);
  if (other) {
    other.emit("rt:seat", { seat: "request" });
    if (await until(() => drv.rt().van.seatReq === other.st.youId, 1500)) ok("ขอขับ"); else bug("ขอขับไม่ขึ้น");
    drv.emit("rt:seat", { seat: "give" });
    if (await until(() => cs[0].rt().van.driverId === other.st.youId, 1500)) ok("ยกที่นั่งให้"); else bug("ยกที่นั่งไม่ได้");
    // คนขับหลุด → ที่นั่งว่าง → กลับเข้า (session) แล้วยังเล่นต่อได้
    const tok = other.token;
    other.close();
    if (await until(() => cs.find((c) => c !== other).rt().van.driverId == null, 2500)) ok("คนขับหลุด = ที่นั่งว่าง"); else bug("คนขับหลุดแต่ที่นั่งยังค้าง");
    const back = client(srv.url, other.i);
    back.s.on("connect", () => back.emit("reconnectSession", { sessionToken: tok }));
    if (await until(() => back.rt() && back.me(), 4000)) ok("กลับเข้าเกมกลางช่วงขับ"); else bug("กลับเข้าเกมไม่ได้");
    cs[cs.indexOf(other)] = back;
    back.emit("rt:seat", { seat: "driver" });
    if (await until(() => back.rt().van.driverId === back.st.youId, 1500)) ok("กลับมานั่งคนขับได้"); else bug("กลับเข้าแล้วนั่งคนขับไม่ได้");
  }
  // วิทยุ
  cs[0].emit("rt:radio", { src: "synth", station: 3 });
  if (await until(() => cs.every((c) => c.rt().radio.station === 3), 1500)) ok("วิทยุซิงก์"); else bug("วิทยุไม่ซิงก์");
  // ขับจนถึงทางแยก/สู้ (≤ 70 วิ)
  const t0 = Date.now();
  const moved = await until(() => cs[0].rt().phase !== "drive", 70000, 200);
  console.log(`  · ออกจากช่วงขับ → ${cs[0].rt().phase} หลัง ${Math.round((Date.now() - t0) / 1000)} วิ (กม. ${cs[0].rt().km})`);
  if (!moved) bug("ขับนานเกิน 70 วิ ไม่ถึงทางแยก");
  desync(cs, "หลังขับ");
  return finish(srv, cs);
}

// ---------- ฉาก: ทางแยก (โหวตแตก · มีคนไม่โหวต · มีคนหลุด) ----------
async function sceneFork() {
  console.log("\n== ทางแยก: โหวตแตก/ไม่โหวต/หลุด ==");
  const srv = await startServer({ ECHO_DEV_RT_PHASE: "fork" });
  const cs = await lobby(srv, Math.max(3, N));
  if (!(await until(() => cs[0].rt().phase === "fork"))) { bug("ไม่เข้าทางแยก"); return finish(srv, cs); }
  const n = cs[0].rt().fork.options.length;
  cs[0].emit("rt:vote", { i: 0 }); cs[1].emit("rt:vote", { i: n - 1 });
  await sleep(300);
  if (cs[0].rt().phase !== "fork") bug("ยังโหวตไม่ครบแต่ทางแยกตัดสินแล้ว");
  // คนที่เหลือ (ไม่โหวต) หลุด → ตัดสินทันที
  for (const c of cs.slice(2)) c.close();
  if (await until(() => cs[0].rt().phase !== "fork", 4000)) ok(`คนไม่โหวตหลุด → ตัดสินทันที → ${cs[0].rt().phase}`); else bug("คนที่ยังไม่โหวตหลุดแล้วทางแยกยังรอ");
  return finish(srv, cs);
}

// ---------- ฉาก: ต่อสู้ (ดักทาง/บนรถตู้/บอส) — เล่นตาจริง ----------
async function sceneCombat(kind) {
  console.log(`\n== ต่อสู้ ${kind}: จั่ว/พอ/เดิน/ตี/จบตา + ปุ่มรถตู้ ==`);
  const srv = await startServer({ ECHO_DEV_RT_PHASE: kind, ECHO_DEV_RT_KM: kind === "boss" ? "50" : "0" });
  const cs = await lobby(srv, N);
  if (!(await until(() => cs[0].rt().phase === "combat", 8000))) { bug(`ไม่เข้าการต่อสู้ ${kind}`); return finish(srv, cs); }
  ok(`เข้าการต่อสู้ ${cs[0].rt().combat.kind}`);
  let last = Date.now(), lastSig = "", turns = 0, rear = 0, swerve = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    const st = cs[0].st, r = st.roadtrip;
    if (!r) break;
    if (r.phase !== "combat") break;
    const sig = [st.gameState, st.roundNumber, st.actorId, (st.action && st.action.moved) || 0].join(":");
    if (sig !== lastSig) { lastSig = sig; last = Date.now(); }
    if (Date.now() - last > 40000) { bug(`การต่อสู้ค้าง ${sig}`); break; }
    for (const c of cs) {
      const s = c.st, me = c.me();
      if (!s || !me) continue;
      if (s.gameState === "PLAYING" && me.alive && !me.locked && !c.drew) { c.drew = true; c.emit((me.score || 0) >= 14 ? "lock" : "hit"); setTimeout(() => { c.drew = false; }, 250); }
      const ctl = s.controlId || s.youId;
      if (s.gameState === "ACTION" && s.actorId === ctl && c.acted !== sig) {
        c.acted = sig; turns++;
        const acts = (s.roadtrip.actions || {})[s.youId] || [];
        if (acts.includes("rear") && rear < 2) { rear++; c.emit("rt:rear"); }
        if (acts.includes("swerve") && swerve < 1) { swerve++; c.emit("rt:swerve", { side: Math.random() < 0.5 ? "left" : "right" }); }
        const actor = s.players.find((p) => p.id === ctl);
        const foe = actor && actor.pos && s.players.filter((p) => p.alive && p.pos && p.teamId !== actor.teamId).sort((a, b) => (Math.abs(a.pos.x - actor.pos.x) + Math.abs(a.pos.y - actor.pos.y)) - (Math.abs(b.pos.x - actor.pos.x) + Math.abs(b.pos.y - actor.pos.y)))[0];
        if (foe) {
          // เดินเข้าหา (ช่องในระยะเดินที่ใกล้เป้าสุด — server ปฏิเสธช่องที่ไปไม่ถึงเอง) แล้วตี
          const mov = actor.mov || 3, d0 = Math.abs(foe.pos.x - actor.pos.x) + Math.abs(foe.pos.y - actor.pos.y);
          if (d0 > 1) {
            const opts = [];
            for (let dx = -mov; dx <= mov; dx++) for (let dy = -mov; dy <= mov; dy++) if (Math.abs(dx) + Math.abs(dy) <= mov && (dx || dy)) opts.push({ x: actor.pos.x + dx, y: actor.pos.y + dy });
            opts.sort((a, b) => (Math.abs(a.x - foe.pos.x) + Math.abs(a.y - foe.pos.y)) - (Math.abs(b.x - foe.pos.x) + Math.abs(b.y - foe.pos.y)));
            const best = opts.find((t) => Math.abs(t.x - foe.pos.x) + Math.abs(t.y - foe.pos.y) >= 1 && !s.players.some((p) => p.alive && p.pos && p.pos.x === t.x && p.pos.y === t.y));
            if (best) c.emit("move", { x: best.x, y: best.y });
          }
          setTimeout(() => c.emit("attack", { targetId: foe.id }), 350);
        }
        setTimeout(() => c.emit("endAction"), 900);
      }
    }
    await sleep(120);
  }
  const r = cs[0].rt();
  console.log(`  · ตาที่เล่น ${turns} · ประตูท้าย ${rear} · ปาดรถ ${swerve} · จบที่ ${r ? r.phase : "-"} (${cs[0].st.gameState})`);
  if (r && r.phase === "combat") bug(`การต่อสู้ ${kind} ไม่จบใน 240 วิ`);
  if (r && r.phase === "drive") {
    if (cs.some((c) => (c.st.players || []).some((p) => p.summon))) bug("จบสู้แล้วยังมียูนิตที่ถูกเรียก/มอนค้าง");
    if (cs[0].st.actorId) bug("จบสู้แล้ว actorId ค้าง");
  }
  desync(cs, `หลังสู้ ${kind}`);
  return finish(srv, cs);
}

// ---------- ฉาก: แพ้ → สรุป → เล่นอีกรอบ → กลับห้องรอ ----------
async function sceneLose() {
  console.log("\n== แพ้ (รถพัง) → สรุป → เล่นอีกรอบ → กลับห้องรอ ==");
  const srv = await startServer({ ECHO_DEV_RT_PHASE: "drive" });
  const cs = await lobby(srv, 2);
  await until(() => cs[0].rt().phase === "drive");
  // ไม่มีคนขับ + สิ่งกีดขวางเลนกลาง — ขับจนกว่ารถพัง (สูงสุด 3 นาที) ไม่ได้ → ใช้ทางลัด: ไม่มี — รอสรุปจากการต่อสู้ที่แพ้
  // ทางลัดผ่านคำสั่ง: ไม่มี (ตั้งใจ) — ให้ ECHO_DEV_RT_PHASE=boss แทน
  await finish(srv, cs);
  const srv2 = await startServer({ ECHO_DEV_RT_PHASE: "boss", ECHO_DEV_RT_KM: "500", ECHO_DEV_RT_DIFF: "hard" });
  const cs2 = await lobby(srv2, 2);
  await until(() => cs2[0].rt().phase === "combat", 8000);
  // ไม่ตีเลย: จั่ว/พอ แล้ว "รอ" ทุกตา จนกว่าจะแพ้
  const t0 = Date.now();
  while (Date.now() - t0 < 180000 && cs2[0].rt() && cs2[0].rt().phase !== "over") {
    for (const c of cs2) {
      const s = c.st, me = c.me();
      if (s.gameState === "PLAYING" && me.alive && !me.locked) c.emit("lock");
      if (s.gameState === "ACTION" && s.actorId === (s.controlId || s.youId)) c.emit("endAction");
    }
    await sleep(200);
  }
  const r = cs2[0].rt();
  if (!r || r.phase !== "over") { bug(`ไม่แพ้ใน 3 นาที (${r && r.phase})`); return finish(srv2, cs2); }
  ok(`แพ้ — สรุป ${JSON.stringify(r.summary)}`);
  if (cs2[0].st.gameState !== "GAMEOVER") bug("phase over แต่ gameState ไม่ใช่ GAMEOVER");
  await sleep(2500);
  const fx0 = JSON.stringify(cs2[0].rt().van);
  await sleep(1500);
  if (JSON.stringify(cs2[0].rt() && cs2[0].rt().van) !== fx0) bug("จบเกมแล้ว state รถยังเปลี่ยน (ตัวจับเวลาค้าง)");
  for (const c of cs2) c.emit("rematch");
  if (await until(() => cs2[0].rt() && cs2[0].rt().phase !== "over" && cs2[0].st.gameState !== "GAMEOVER", 8000)) ok(`เล่นอีกรอบ → ${cs2[0].rt().phase} km ${cs2[0].rt().km} diff ${cs2[0].rt().diff}`); else bug(`เล่นอีกรอบไม่เริ่ม (${cs2[0].st.gameState})`);
  return finish(srv2, cs2);
}

async function finish(srv, cs) {
  for (const c of cs) c.close();
  await sleep(200);
  srv.child.kill();
  await sleep(150);
}

(async () => {
  const scenes = { stop: sceneStop, drive: sceneDrive, fork: sceneFork, ambush: () => sceneCombat("ambush"), onvan: () => sceneCombat("onvan"), boss: () => sceneCombat("boss"), lose: sceneLose };
  const list = SCENE === "all" ? Object.keys(scenes) : SCENE === "combat" ? ["ambush", "onvan", "boss"] : [SCENE];
  for (const k of list) { try { await scenes[k](); } catch (err) { bug(`ฉาก ${k} สคริปต์พัง: ${err && err.stack}`); } }
  console.log(`\nสรุป: ${problems.length ? problems.length + " ปัญหา" : "ไม่พบปัญหา"}`);
  for (const p of problems) console.log(" - " + p);
  process.exit(problems.length ? 1 : 0);
})();
