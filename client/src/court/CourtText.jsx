// ข้อความในศาล: ชื่อสกิลที่ server ห่อด้วย «…» = สีเด่น (ไม่แสดง « ») · ตัวพิมพ์ทีละตัวนับเฉพาะตัวที่มองเห็น
const RE = /«([^»]*)»/g;

// แยกเป็นช่วง [{ t, hl }]
export function parts(text) {
  const s = String(text ?? ""), out = [];
  let last = 0, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), hl: false });
    out.push({ t: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last).replace(/[«»]/g, ""), hl: false });
  return out;
}
export const plain = (text) => parts(text).map((p) => p.t).join("");

// n = จำนวนตัวอักษร (code point) ที่แสดงแล้ว · ไม่ส่ง = ทั้งหมด
export function Rich({ text, n }) {
  const ps = parts(text);
  let left = n == null ? Infinity : n;
  const out = [];
  for (let i = 0; i < ps.length && left > 0; i++) {
    const cs = Array.from(ps[i].t), take = cs.slice(0, left).join("");
    left -= cs.length;
    out.push(ps[i].hl ? <span key={i} className="chl">{take}</span> : <span key={i}>{take}</span>);
  }
  return <>{out}</>;
}
