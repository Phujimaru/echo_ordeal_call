// ============================================================
//  ฉากเข้าโหมด Fodlan ต่อจากการ์ดผู้เล่น (MatchIntro โหมด fodlan) — บนลูกโลกร่วมใบเดิม · พรีวิว dev: ?fodlan
//   A โลกหมุนหาหมุด Fodlan (ทองคำ) → ล็อก → ดิ่งชนผิวโลก
//   B แฟลชบังจอ → กล้องพุ่งทะลุชั้นเมฆลงมาเหนือโต๊ะแผนที่
//   C เห็นทวีปก่อน: แผนที่ลุกเป็นสีทองจากการ์เร็ก มัค · หมุด 5 ด่านผุดขึ้นทีละอัน · หมุดด่านที่จะไปสว่าง
//   D กล้องโฉบลงหาหมุดด่าน → แฟลชสีประจำด่าน
//   E ฉากเข้าด่านตามภูมิภาค (dioramas/) + ป้ายชื่อด่าน + เสียงบรรยากาศค่อยๆ ดังขึ้น → แฟลชขาวส่งต่อกระดาน
//  สัดส่วนเวลาอยู่ที่ FODLAN_T (DOM ใน FodlanCine.jsx ใช้ชุดเดียวกัน) · u = เวลา / D
// ============================================================
import { dirFromLonLat } from "../globe/globeCore";
import { createDiveCamera, createMarker, aimAngles, setAim, nearYaw } from "../oc/intro/diveKit";
import { createFodlanTheatre } from "./fodlanTheatre";
import { FODLAN_GEO } from "./stages";
import { span, easeInOut, easeOut, easeIn, smooth, clamp01 } from "./kit";
import { fodlanAudio } from "./fodlanAudio";
import { playMusic } from "../audio";

export const FODLAN_T = {
  turn: 0.14,    // โลกหมุนถึงหมุด
  dive: 0.16,    // เริ่มดิ่ง
  crash: 0.26,   // ชนผิวโลก = แฟลช → สลับเป็นแผนที่
  reveal: 0.31,  // พ้นเมฆ แผนที่เริ่มลุกทอง
  pins: 0.4,     // หมุดผุด
  focus: 0.53,   // หมุดด่านสว่าง
  swoop: 0.6,    // โฉบลง
  stage: 0.735,  // แฟลชสีด่าน → ฉากด่าน
  title: 0.78,   // ป้ายชื่อด่าน
};
const T = FODLAN_T;

// music = false: เกมจริงให้ audioPolicy เลือกเพลงเอง (fodlan_map ระหว่างฉาก → เพลงด่านเมื่อเข้ากระดาน) · true = พรีวิวสั่งเล่นเอง
export function createFodlanFlight(core, { stage = 1, weather = false, lowQ = false, wrapEl = null, start = 0, music = true } = {}) {
  const { THREE, camera } = core;
  const theatre = createFodlanTheatre(core, { stage, weather, lowQ });
  const audio = fodlanAudio();
  const info = theatre.stageInfo;
  audio.preload(["cine_dive", "cine_clouds", "cine_reveal", "cine_map", "cine_swoop", "cine_stage", info.amb, info.wx, ...(stage === 4 ? ["campfire"] : [])].filter(Boolean));

  const dir = dirFromLonLat(FODLAN_GEO.lon, FODLAN_GEO.lat);
  let diveCam = null, marker = null, yaw0 = null, pitch0 = 0;
  const P = new THREE.Vector3();
  const cam = new THREE.Vector3(), at = new THREE.Vector3(), M = new THREE.Vector3(), tmp = new THREE.Vector3();
  let entered = false, lastU = 0, dioEvents = null, built = false;
  theatre.ready.then(() => { built = true; });

  // เส้นทางกล้องเหนือแผนที่ (B+C) — ลงจากเหนือเมฆจนลอยนิ่งเหนือทวีป
  const mapPos = new THREE.CatmullRomCurve3([[0, 34, 5], [0.2, 20, 8], [0.3, 13.2, 9.6], [-0.3, 11.4, 9.1], [-0.8, 10.6, 8.5]].map((p) => new THREE.Vector3(...p)));
  const mapLook = new THREE.CatmullRomCurve3([[0, 0, 0], [0.1, 0, 0.2], [0.2, 0, 0.4], [0.3, 0, 0.5], [0.35, 0, 0.6]].map((p) => new THREE.Vector3(...p)));
  const swoop = { from: new THREE.Vector3(), fromLook: new THREE.Vector3(), set: false };

  const cues = [
    [0.005, () => { if (music) playMusic("fodlan_map", performance.now()); }], // เพลงฉากแผนที่ (seq ใหม่ = เริ่มต้นเพลงทุกครั้ง)
    [0.1, () => audio.sfx("cine_dive")],
    [T.crash - 0.01, () => audio.sfx("cine_clouds")],
    [T.reveal, () => audio.sfx("cine_reveal")],
    [T.reveal + 0.02, () => audio.sfx("cine_map", { gain: 0.8 })],
    [T.swoop, () => audio.sfx("cine_swoop")],
    [T.stage - 0.01, () => { audio.sfx("cine_stage"); audio.setStage(stage, { weather, fade: 3 }); if (stage === 1 && weather) audio.thunder(true); if (music) playMusic(`fodlan_${stage}${weather ? "_wx" : ""}`); }],
  ];

  return {
    theatre,
    /** u = 0..1 ของฉากนี้ · t = วินาทีนาฬิกาฉาก */
    frame(u, dt, t) {
      // เสียงตามจังหวะ (เล่นครั้งเดียวเมื่อเวลาข้ามจุด)
      for (const [cu, fn] of cues) if (lastU < cu && u >= cu) { try { fn(); } catch { /* เสียงห้ามทำฉากพัง */ } }

      if (u < T.crash) {
        // ---------- A: หมุนโลก → ดิ่ง ----------
        if (!diveCam) diveCam = createDiveCamera(core, { lowQ, wrapEl });
        if (!marker) marker = createMarker(core, dir, core.spin, { inner: 0xffd27a, mid: 0xe8a94a, outer: 0xfff0c4 });
        const aim = aimAngles(core, dir);
        if (yaw0 == null) { yaw0 = core.world.rotation.y; pitch0 = core.world.rotation.x; }
        const ty = nearYaw(yaw0, aim.yaw);
        const k = easeInOut(span(u, 0, T.turn));
        setAim(core, yaw0 + (ty - yaw0) * k, pitch0 + (aim.pitch - pitch0) * k);
        P.copy(dir); core.spin.localToWorld(P);
        marker.update(span(u, T.turn - 0.06, T.turn), performance.now() - start, 1.2);
        const d = span(u, T.dive, T.crash);
        diveCam.frame(P, Math.pow(d, 2.4), d);
        lastU = u;
        return;
      }

      // ---------- สลับเป็นแผนที่ (ใต้แฟลช) ----------
      if (!entered) {
        if (!built) { lastU = u; return; } // ยังสร้างไม่เสร็จ (เครื่องช้ามาก) — ค้างใต้แฟลชไว้ก่อน
        entered = true;
        diveCam?.restore();
        const wrap = typeof wrapEl === "function" ? wrapEl() : wrapEl;
        if (wrap) { wrap.style.transform = ""; wrap.style.filter = ""; }
        theatre.enter();
        theatre.show("map");
      }
      const map = theatre.map;

      if (u < T.stage) {
        if (theatre.mode !== "map") theatre.show("map");
        const t2 = t;
        // แผนที่ลุกเป็นสีทองจากการ์เร็ก มัค
        const gm = map.at(0.505, 0.425, 0, tmp);
        const rk = span(u, T.reveal - 0.01, T.pins + 0.08);
        map.setReveal(rk >= 1 ? -1 : 0.2 + easeOut(rk) * 15, gm.x, gm.z);
        map.markers.forEach((mk, i) => {
          const show = span(u, T.pins + i * 0.022, T.pins + 0.04 + i * 0.022);
          const act = mk.stage.id === stage ? smooth(span(u, T.focus, T.focus + 0.04)) : 0;
          mk.set(show, act);
        });
        theatre.clouds.update(camera.position.y, 1 - span(u, T.crash + 0.035, T.reveal + 0.035));
        theatre.update(t2);

        if (u < T.swoop) {
          const k = easeOut(span(u, T.crash, T.swoop));
          mapPos.getPointAt(k, cam); mapLook.getPointAt(k, at);
          theatre.mapCam(cam, at, 34 + (1 - easeOut(span(u, T.crash, T.reveal))) * 22);
        } else {
          // ---------- D: โฉบลงหาหมุดด่าน ----------
          if (!swoop.set) { swoop.from.copy(camera.position); mapLook.getPointAt(1, swoop.fromLook); swoop.set = true; }
          map.markers[stage - 1].group.getWorldPosition(M);
          M.y += 0.3;
          const k = span(u, T.swoop, T.stage);
          const k1 = easeInOut(clamp01(k / 0.7)), k2 = easeIn(clamp01((k - 0.62) / 0.38));
          tmp.copy(M).add(new THREE.Vector3(0.4, 2.4, 3.2));
          cam.copy(swoop.from).lerp(tmp, k1);
          cam.y += Math.sin(k1 * Math.PI) * 1.2;
          cam.lerp(M, k2 * 0.96);
          at.copy(swoop.fromLook).lerp(M, easeInOut(clamp01(k * 1.6)));
          theatre.mapCam(cam, at, 34 + k2 * 30);
        }
        lastU = u;
        return;
      }

      // ---------- E: ฉากเข้าด่าน ----------
      if (theatre.mode !== "stage") { theatre.show("stage"); dioEvents = (theatre.dio?.events || []).map((e) => ({ ...e, done: false })); }
      const kd = span(u, T.stage, 1);
      const k = 1 - Math.pow(1 - kd, 1.5);
      theatre.stageFrame(k, t, 52 - 8 * easeOut(kd));
      dioEvents?.forEach((e) => { if (!e.done && k >= e.u) { e.done = true; try { audio.sfx(e.sfx, { gain: e.gain ?? 1 }); } catch { /* */ } } });
      lastU = u;
    },
    restore() {
      diveCam?.restore();
      theatre.restore();
    },
    dispose() {
      diveCam?.restore();
      theatre.dispose();
      if (marker) { core.spin.remove(marker.group); }
    },
  };
}
