# ตัดเสียงเอฟเฟกต์ King-Ohger (ดาบ Ohger Calibur · GRID_PLAN §7.22) จากไฟล์เสียงของเล่นที่ผู้ใช้อัดมา 3 ไฟล์ — ไม่ดาวน์โหลด ไม่สังเคราะห์
#  python -I .claude/plans/ohger-sfx.py [<โฟลเดอร์ต้นฉบับ>] [--out <โฟลเดอร์ปลายทาง>] [--only ชื่อ,ชื่อ] [--manifest <ไฟล์.json>]
#   ต้นฉบับ (ปกติ C:/Users/LOQ/Downloads): ohger_tranform.m4a · ohger_finish.m4a · ohger_attack.m4a
#   ปลายทาง (ปกติ client/public/characters/ohger/sfx — gitignore · ห้ามลบไฟล์อื่นใต้ client/public/characters)
#   manifest (ปกติ .claude/plans/ohger-sfx.json): { key: { src, start, end, seconds, loop, lufs, truePeak } }
#  ทุกไฟล์: ถอดเป็น mono 48 kHz → ตัดตามจุดใน CUTS → ปรับดังตามความดังที่หูได้ยิน (LUFS ไม่ใช่ peak)
#   one-shot -16 LUFS integrated · ลูป -18 LUFS (เบากว่าเพราะเล่นรองใต้เสียงกด) · คลิปสั้นกว่า 0.5 s ใช้ค่า momentary สูงสุดแทน
#   จำกัดยอดเอง (มองล่วงหน้า) → AAC .m4a 192k → ถอดกลับมาวัดซ้ำ ebur128 จน I ห่างเป้า < 0.3 LU และ true peak ≤ -1 dBTP
#  one-shot: หัวเสียงอยู่ต้นไฟล์ (ตัดความเงียบนำหน้าเหลือ ≤ 10 ms) · fade-in 2 ms กันคลิก (ต้นฉบับหลายท่อนถูกตัดแข็งกลางเสียง)
#  ลูป: หาความยาวรอบจาก cross-correlation ของคลื่นรอบจุดต่อ แล้ว crossfade 30 ms ด้วยเสียงก่อนจุดเริ่ม → จบไฟล์ต่อหัวไฟล์ได้เนียน
#   จำกัดยอดลูปบนสำเนาที่ต่อกัน 3 รอบแล้วเอารอบกลาง → เกนของ limiter ต่อเนื่องข้ามจุดวน
import json, os, re, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000
ONE_SHOT, LOOP = -16.0, -18.0
TP_MAX = -1.0
SRC = {"tf": "ohger_tranform.m4a", "fin": "ohger_finish.m4a", "atk": "ohger_attack.m4a"}

# ------------------------------------------------------------------ จุดตัด (วินาทีในไฟล์ต้นฉบับ)
# one-shot: (src, start, end, fade_out_s)   ลูป: (src, region_start, region_end, [คาบโดยประมาณ], "loop")
#  ohger_tranform: 5 ช่วงตามสี (แดง คุวากาตะ · ฟ้า ทนโบะ · เหลือง คามาคิริ · ม่วง ปาปิยอง · ดำ ฮาจิ)
#   แต่ละช่วง = เสียงกดตราเรียกชื่อ → ลูปรอ (คาบ ~1.97 s ดนตรีเดียวกันทุกสี) → ดนตรีนำ ~6 s (เหมือนกันทุกสี) → "<ชื่อ>、王者!" + หาง
#   จุดตัดแข็งที่ผู้ใช้ตัดต่อมาเอง (ระดับตกเหลือ < -50 dB ใน 2 ms) ใช้เป็นขอบท่อน
#   ฟ้า (60.66–62.19) กับเหลือง (79.53–80.99) ท่อนลูปของตัวเองสั้นกว่า 1 รอบ → ใช้ลูปจากช่วงสีแดง (ดนตรีเหมือนกัน corr 0.95–0.99)
#  ohger_finish: กดไก "オーガーチャージ!" 0.08–3.19 · ลูปรอดึงคันโยก 3.19–5.23 (จังหวะ 0.523 s)
#   ดึงคันโยก 15 ครั้ง (สีละ 3) เริ่มที่ 5.23 ห่างกัน ~1.3–1.6 s · ลูปเลือกทิศ 26.79–30.47 (คาบ ~1.77 s)
#   ปล่อย 30.47 → จบไฟล์ (เสียงไก/บี๊บ 30.47–32.41 → "オーガーフィニッシュ!" 32.41–36.05 → หางฟัน 36.05–40.27)
#  ohger_attack: แต่ละสี = ท่อนเฉพาะสี ~1 s → ท่อนกลางที่เหมือนกันทุกสี → ท่าโจมตีของสีนั้นอัดซ้ำ 2–4 เทค
#   เลือกเทคที่ครบ (หางลงถึง < -38 dB ไม่ถูกตัดกลาง) — แดง 4 เทค (2 เทคแรกหางถูกตัด 1.2 s) · ฟ้า เทคแรกหางถูกตัด
PULLS = [5.233, 6.520, 7.830, 9.218, 10.630, 12.003, 13.484, 14.988, 16.719, 18.366,
         19.717, 21.081, 22.463, 23.905, 25.317, 26.794]
CUTS = {
    "ohger_call_1": ("tf", 1.638, 4.224, 0.06),
    "ohger_call_2": ("tf", 58.592, 60.658, 0.04),
    "ohger_call_3": ("tf", 77.60, 79.532, 0.04),
    "ohger_call_4": ("tf", 94.788, 96.524, 0.04),
    "ohger_call_5": ("tf", 113.758, 115.710, 0.04),
    "ohger_tf_wait_1": ("tf", 4.224, 11.862, [1.97], "loop"),
    "ohger_tf_wait_2": ("tf", 4.224, 11.862, [1.97], "loop"),
    "ohger_tf_wait_3": ("tf", 4.224, 11.862, [1.97], "loop"),
    "ohger_tf_wait_4": ("tf", 96.524, 100.494, [1.97], "loop"),
    "ohger_tf_wait_5": ("tf", 115.710, 119.208, [1.97], "loop"),
    "ohger_tf_done_1": ("tf", 52.922, 57.15, 0.10),
    "ohger_tf_done_2": ("tf", 71.266, 75.05, 0.10),
    "ohger_tf_done_3": ("tf", 90.078, 93.79, 0.12),
    "ohger_tf_done_4": ("tf", 109.634, 113.25, 0.10),
    "ohger_tf_done_5": ("tf", 128.296, 131.82, 0.25),   # ต้นฉบับจบไฟล์ขณะหางยัง -30 dB → fade ยาวขึ้น
    "ohger_trigger": ("fin", 0.077, 3.186, 0.05),
    "ohger_charge_loop": ("fin", 3.186, 5.233, [0.523, 1.046, 1.569], "loop"),
    "ohger_standby_loop": ("fin", 26.794, 30.466, [1.77], "loop"),
    "ohger_finish_call": ("fin", 30.466, 40.267, 0.10),
    "ohger_atk_1": ("atk", 8.110, 9.900, 0.05),
    "ohger_atk_2": ("atk", 15.790, 17.870, 0.05),
    "ohger_atk_3": ("atk", 20.825, 22.565, 0.05),
    "ohger_atk_4": ("atk", 28.000, 29.690, 0.05),
    "ohger_atk_5": ("atk", 37.270, 39.150, 0.05),
}
for i in range(15):
    CUTS[f"ohger_pull_{i // 3 + 1}_{i % 3 + 1}"] = ("fin", PULLS[i], PULLS[i + 1], 0.03)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def lead_trim(x, rel_db=-40, keep=0.003):
    # ตัดความเงียบนำหน้า: เริ่มที่ตัวอย่างแรกที่ดังกว่า peak -40 dB ลบ 3 ms
    thr = np.max(np.abs(x)) * 10 ** (rel_db / 20)
    i = int(np.argmax(np.abs(x) > thr))
    return max(0, i - int(SR * keep))


def find_loop(x, a, b, periods, xf=0.03, win=0.08, slack=0.03):
    # หา (จุดเริ่ม, ความยาว) ที่คลื่นรอบจุดต่อเหมือนกันที่สุด (normalized cross-correlation ระดับตัวอย่าง)
    #  จุดเริ่มต้องมีเสียงก่อนหน้า xf วินาทีในท่อนเดียวกัน (ใช้ทำ crossfade) · ความยาวยาวสุดที่ corr ไม่แย่กว่าที่ดีสุดเกิน 0.03
    W, X, S = int(SR * win), int(SR * xf), int(SR * slack)
    best = []
    for P in periods:
        L0 = int(SR * P)
        lo, hi = int(SR * a) + X + W, int(SR * b) - L0 - S - W
        for s0 in range(lo, max(lo + 1, hi), int(SR * 0.005)):
            ref = x[s0 - W // 2: s0 + W // 2]
            seg = x[s0 + L0 - S - W // 2: s0 + L0 + S + W // 2]
            if len(seg) < len(ref) + 2 * S or np.linalg.norm(ref) < 1e-6:
                continue
            c = np.correlate(seg, ref, "valid")
            en = np.sqrt(np.convolve(seg ** 2, np.ones(len(ref)), "valid")) * np.linalg.norm(ref) + 1e-12
            r = c / en
            k = int(np.argmax(r))
            best.append((float(r[k]), P, s0, L0 - S + k))
    if not best:
        raise RuntimeError(f"no loop in {a}-{b}")
    top = max(r for r, *_ in best)
    r, P, s0, L = max((t for t in best if t[0] >= top - 0.03), key=lambda t: (t[3], t[0]))
    return s0, L, r


def make_loop(x, s0, L, xf=0.03):
    # y = x[s0:s0+L] · ท้าย xf วินาที crossfade (equal-power) ไปหาเสียงก่อน s0 → ตัวอย่างสุดท้ายต่อกับ y[0] ได้ต่อเนื่อง
    X = int(SR * xf)
    y = x[s0:s0 + L].copy()
    t = np.linspace(0, 1, X)
    y[-X:] = x[s0 + L - X:s0 + L] * np.cos(t * np.pi / 2) + x[s0 - X:s0] * np.sin(t * np.pi / 2)
    return y


def limit(x, ceil, look=0.004, rel=0.06):
    # จำกัดยอดแบบมองล่วงหน้า (ลดเกนก่อนยอดมาถึง · คืนเกนช้าๆ) — ไม่ตัดยอดแข็ง
    w = max(3, int(SR * look) | 1)
    env = np.lib.stride_tricks.sliding_window_view(np.pad(np.abs(x), (w // 2, w // 2), mode="edge"), w).max(axis=1)
    g = np.minimum(1, ceil / (env + 1e-9))
    a = np.exp(-1 / (SR * rel))
    out = g.copy()
    for i in range(1, len(out)):
        out[i] = min(g[i], a * out[i - 1] + (1 - a) * g[i])
    out = np.convolve(np.pad(out, (w // 2, w // 2), mode="edge"), np.ones(w) / w, mode="valid")
    return x * out


def save_wav(path, sig):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype("<i2").tobytes())


def ebur(path, tile=1):
    # วัดด้วย ffmpeg ebur128: (integrated LUFS, momentary max LUFS, true peak dBTP) · ลูปวัดแบบต่อกัน tile รอบ
    args = ["ffmpeg", "-hide_banner", "-nostats"]
    if tile > 1:
        args += ["-stream_loop", str(tile - 1)]
    m = subprocess.run(args + ["-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    summ = m[m.rindex("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summ).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summ).group(1))
    ms = [float(v) for v in re.findall(r"M:\s*(-?[\d.]+)", m[:m.rindex("Summary:")])]
    return I, max(ms) if ms else -70.0, tp


def render(name, y, is_loop, out_dir):
    tgt = LOOP if is_loop else ONE_SHOT
    short = len(y) / SR < 0.5 and not is_loop
    tmp = os.path.join(tempfile.gettempdir(), f"{name}.wav")
    dst = os.path.join(out_dir, f"{name}.m4a")

    def build(gain, ceil):
        z = y * 10 ** (gain / 20)
        if is_loop:  # จำกัดยอดบน 3 รอบต่อกันแล้วเอารอบกลาง (เกนต่อเนื่องข้ามจุดวน)
            z = limit(np.tile(z, 3), ceil)[len(z):2 * len(z)]
        else:
            z = limit(z, ceil)
        save_wav(tmp, z)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ar", str(SR), "-ac", "1", "-c:a", "aac", "-b:a", "192k",
                        "-movflags", "+faststart", dst], check=True)
        I, M, tp = ebur(dst, 3 if is_loop else 1)
        return (M if short else I), tp

    save_wav(tmp, y)
    I0, M0, _ = ebur(tmp, 3 if is_loop else 1)
    gain, ceil = tgt - (M0 if short else I0), 10 ** (-2.0 / 20)
    for _ in range(10):
        got, tp = build(gain, ceil)
        ok_l, ok_p = abs(got - tgt) < 0.3, tp <= TP_MAX
        if ok_l and ok_p:
            break
        if not ok_p:
            ceil *= 10 ** ((TP_MAX - 0.2 - tp) / 20)
        gain += tgt - got
    os.remove(tmp)
    return got, tp


def main():
    args = sys.argv[1:]
    def opt(flag, default):
        if flag in args:
            i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
        return default
    only = set(filter(None, opt("--only", "").split(",")))
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    out_dir = opt("--out", os.path.join(root, "client", "public", "characters", "ohger", "sfx"))
    man_path = opt("--manifest", os.path.join(root, ".claude", "plans", "ohger-sfx.json"))
    src_dir = args[0] if args else "C:/Users/LOQ/Downloads"
    os.makedirs(out_dir, exist_ok=True)
    audio = {k: decode(os.path.join(src_dir, f)) for k, f in SRC.items()}
    manifest = json.load(open(man_path, encoding="utf-8")) if os.path.exists(man_path) and only else {}
    for name, spec in CUTS.items():
        if only and name not in only:
            continue
        x = audio[spec[0]]
        if len(spec) == 5:
            src, a, b, periods, _ = spec
            s0, L, r = find_loop(x, a, b, periods)
            y = make_loop(x, s0, L)
            start, end, loop, note = s0 / SR, (s0 + L) / SR, True, f"seam corr {r:.3f}"
        else:
            src, a, b, fo = spec
            seg = x[int(SR * a):int(SR * b)]
            i = lead_trim(seg)
            y = seg[i:].copy()
            fi = int(SR * 0.002); y[:fi] *= np.linspace(0, 1, fi)
            n = min(len(y), int(SR * fo)); y[-n:] *= np.linspace(1, 0, n) ** 2
            start, end, loop, note = a + i / SR, b, False, ""
        lufs, tp = render(name, y, loop, out_dir)
        manifest[name] = {"src": SRC[src], "start": round(start, 4), "end": round(end, 4),
                          "seconds": round(len(y) / SR, 4), "loop": loop, "lufs": round(lufs, 1), "truePeak": round(tp, 1)}
        print(f"{name:22} {start:8.3f}-{end:8.3f} {len(y) / SR:5.2f}s {'loop' if loop else '    '} {lufs:6.1f} LUFS  TP {tp:5.1f}  {note}")
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
