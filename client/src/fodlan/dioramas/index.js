// ฉากเข้าด่านทั้ง 5 ของ Fodlan — build(THREE, { weather, lowQ }) → { group, fog, cam, events, update(t, u, H, camPos) }
//  cam.at(u) = ตำแหน่ง/จุดมองของกล้อง · events = [{ u, sfx }] เสียงที่ต้องเล่นเมื่อฉากเดินถึง u
import { buildRiver } from "./river";
import { buildFog } from "./fog";
import { buildWar } from "./war";
import { buildSnow } from "./snow";
import { buildTomb } from "./tomb";

const BUILDERS = { 1: buildRiver, 2: buildFog, 3: buildWar, 4: buildSnow, 5: buildTomb };

export function buildDiorama(THREE, stage, opts) {
  return (BUILDERS[stage] || buildRiver)(THREE, opts);
}
