# Road Trip SFX + ambience builder (Mixkit originals + 2 synthesized layers -> trimmed/layered/looped/normalised mp3).
#  See roadtrip-sfx-sources.md. Same recipe as fodlan-sfx.py (one-shots -16 LUFS, loops -22 LUFS seamless).
#  python -I .claude/plans/roadtrip-sfx.py <mixkit-src-dir> client/public/roadtrip/sfx [key...]
#  python -I .claude/plans/roadtrip-sfx.py --check client/public/roadtrip/sfx
#  <mixkit-src-dir> holds <id>.wav from https://assets.mixkit.co/active_storage/sfx/<id>/<id>.wav (1662 = <id>-preview.mp3)
#  'synth:<name>' layers are generated here (tire squeal / brake squeal: Mixkit has no clean one).
#  One-shots mp3 128k, loops mp3 96k (media-size rule), 44.1 kHz stereo.
import subprocess, sys, os, re, tempfile, numpy as np
SR = 44100
A = 'auto'
ECHO = 'apad=pad_dur=1.5,aecho=0.8:0.7:70|150:0.35|0.22'

def load(path, ss=0.0, t=None, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{ss:.4f}', '-i', path]
    if t: cmd += ['-t', f'{t:.4f}']
    if af: cmd += ['-af', af]
    cmd += ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)
    return x.reshape(-1, 2).astype(np.float64)

def onset(x, after=0.0, rel=-30):
    m = np.abs(x).max(axis=1); i0 = int(after * SR)
    pk = m[i0:].max(); thr = pk * 10 ** (rel / 20)
    i = i0 + int(np.argmax(m[i0:] > thr))
    return max(i0, i - int(.004 * SR)) / SR

def env_db(x, win=.05):
    n = int(win * SR); k = len(x) // n
    m = (x[:k * n] ** 2).mean(axis=1).reshape(k, n).mean(axis=1)
    return 10 * np.log10(m + 1e-12)

def peak_time(x):
    e = env_db(x, .02); return int(np.argmax(e)) * .02 + .01

def rate_af(rate, af):
    r = f'asetrate={SR}*{rate},aresample={SR}' if rate and rate != 1 else None
    return ','.join(p for p in (r, af) if p) or None

# ---------------- synthesized layers ----------------
def _bandnoise(n, lo, hi, rng):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)

def synth(name, tmp):
    p = os.path.join(tmp, f'synth_{name}.wav')
    if os.path.exists(p): return p
    rng = np.random.default_rng(7)
    if name == 'screech':        # tire squeal: rubber stick-slip = jittery tone ~1.1-1.6 kHz + harmonics + hiss band
        d = 1.5; n = int(d * SR); t = np.arange(n) / SR
        jit = np.cumsum(rng.standard_normal(n)) ; jit = jit - np.convolve(jit, np.ones(2000) / 2000, 'same'); jit /= np.abs(jit).max()
        f0 = 1550 - 380 * t / d + 90 * jit + 40 * np.sin(2 * np.pi * 23 * t)
        ph = 2 * np.pi * np.cumsum(f0) / SR
        tone = np.sin(ph) + .45 * np.sin(2 * ph + .3) + .2 * np.sin(3 * ph + 1.1)
        am = 1 + .35 * np.sin(2 * np.pi * 37 * t + 3 * jit)
        y = tone * am * .55 + _bandnoise(n, 900, 5200, rng) * .45
        env = np.minimum(1, t / .04) * np.minimum(1, (d - t) / .5) ** 1.5
        y *= env
    elif name == 'squeal':       # brake squeal: purer tone ~2.7 kHz with slow wobble, swells then dies as the van stops
        d = 1.6; n = int(d * SR); t = np.arange(n) / SR
        f0 = 2650 + 60 * np.sin(2 * np.pi * 5.5 * t) + 120 * (t / d)
        ph = 2 * np.pi * np.cumsum(f0) / SR
        y = np.sin(ph) + .25 * np.sin(2 * ph) + _bandnoise(n, 2000, 6000, rng) * .12
        env = np.minimum(1, t / .12) * np.clip((d - t) / .7, 0, 1) ** 2 * (0.7 + .3 * np.sin(2 * np.pi * 1.7 * t))
        y *= env
    y = np.stack([y, y], 1) / (np.abs(y).max() + 1e-9) * .7
    wr(y, p); return p

def src_path(SRC, f, tmp):
    return synth(f[6:], tmp) if f.startswith('synth:') else os.path.join(SRC, f)

# ---------------- one-shots ----------------
# key: (length, fadeout, [layer...], opts)   layer = (file, src_start, gain_dB, at, src_dur, {rate, af})
#   opts: trim (onset dB), lim (alimiter), target (LUFS, default -16)
S = {
 'horn':          (0.72, .12, [('718.wav', A, 0, 0, .7)], {}),
 'horn_goofy':    (0.95, .25, [('715.wav', A, 0, 0, 1.0)], {}),
 'tire_screech':  (1.45, .5, [('synth:screech', 0, 0, 0, 1.5), ('1620.wav', 3, -12, 0, 1.5, {'af': 'lowpass=900'})], {}),
 'crash':         (1.8, .7, [('2980.wav', A, 0, 0, 1.9), ('1551.wav', A, -3, .03, 1.8), ('1616.wav', 0, -8, 0, 1.8, {'af': 'lowpass=2500'})], {'lim': .4}),
 'hazard_hit':    (0.9, .35, [('2980.wav', A, 0, 0, 1.0), ('1564.wav', A, -6, 0, .6)], {}),
 'nitro':         (2.0, .7, [('1714.wav', A, 0, 0, 2.2), ('1720.wav', 1, -9, .1, 2.0, {'af': 'afade=t=in:d=0.3'})], {}),
 'gear':          (0.75, .25, [('2757.wav', A, 0, 0, .8)], {}),
 'van_door':      (0.7, .25, [('1564.wav', A, 0, 0, .71)], {'lim': .25}),
 'sliding_door':  (2.5, .4, [('1534.wav', A, 0, 0, 2.6)], {}),
 'rear_doors':    (2.0, .6, [('3129.wav', A, 0, 0, 1.6), ('3129.wav', A, -3, .38, 1.6, {'rate': .94})], {}),
 'brake_stop':    (2.0, .6, [('synth:squeal', 0, -2, 0, 1.6), ('1626.wav', 5.2, -6, 0, 2.2, {'af': 'highpass=120'})], {}),
 'alert':         (1.0, .4, [('268.wav', A, 0, 0, 1.0)], {'lim': .3}),
 'boss_alarm':    (2.0, .25, [('994.wav', 0, 0, 0, 2.0)], {}),
 'fork_chime':    (1.3, .35, [('2309.wav', A, 0, 0, 1.4)], {}),
 'event_sting':   (2.2, .8, [('2633.wav', A, 0, 0, 2.6)], {'trim': -40}),
 'victory':       (3.4, 1.0, [('2059.wav', A, 0, 0, 3.5)], {}),
 'pump_beep':     (0.4, .1, [('1073.wav', A, 0, 0, .45)], {}),
 'fuel_fill':     (2.5, .6, [('1819.wav', 2, 0, 0, 2.6, {'af': 'lowpass=3000,afade=t=in:d=0.15'}), ('1835.wav', 5, -10, 0, 2.6, {'af': 'lowpass=700,afade=t=in:d=0.15'})], {'trim': -40}),
 'shop_chime':    (2.2, .8, [('109.wav', A, 0, 0, 2.4)], {}),
 'cash':          (1.0, .35, [('1993.wav', A, 0, 0, 1.0), ('1838.wav', A, -4, .12, .55)], {}),
 'toilet_flush':  (3.0, 1.0, [('1871.wav', A, 0, 0, 3.05)], {'trim': -40}),
 'teleport':      (2.2, .8, [('868.wav', A, 0, 0, 2.4)], {}),
 'dog_bark':      (1.6, .3, [('1.wav', A, 0, 0, 1.62)], {}),
 'claw':          (1.25, .3, [('1405.wav', A, 0, 0, 1.3)], {}),
 'gacha':         (1.6, .35, [('2817.wav', A, 0, 0, 1.0), ('2364.wav', A, -2, 1.02, .55)], {'lim': .3}),
 'arcade':        (0.7, .2, [('211.wav', A, 0, 0, .8)], {}),
 'splash':        (1.4, .5, [('1311.wav', A, 0, 0, 1.48)], {}),
 'ferris_creak':  (2.4, .7, [('3076.wav', .5, 0, 0, 2.6)], {'trim': -40}),
 'sizzle':        (2.0, .6, [('121.wav', 2, 0, 0, 2.2, {'af': 'afade=t=in:d=0.08'})], {'trim': -40, 'lim': .3}),
 'crowd_cheer':   (3.8, 1.2, [('459.wav', A, 0, 0, 4.0)], {}),
 'upgrade':       (1.3, .4, [('3164.wav', A, 0, 0, 1.4)], {}),
 'wrench':        (1.8, .3, [('853.wav', 2.2, 0, 0, 1.9)], {'lim': .3}),
 'paint_spray':   (1.0, .35, [('1890.wav', A, 0, 0, 1.1)], {}),
 'coin':          (0.6, .2, [('2069.wav', A, 0, 0, .7)], {}),
 'km_tick':       (0.12, .05, [('1117.wav', A, 0, 0, .15, {'af': 'highpass=800'})], {'peak': -20}),
 'region_enter':  (4.0, 1.2, [('2628.wav', A, 0, 0, 5.0)], {'trim': -45}),
 'ghost_whisper': (3.5, 1.2, [('302.wav', 0, 0, 0, 3.5, {'rate': .92, 'af': 'lowpass=3500,' + ECHO})], {'trim': -40}),
 'turret_fire':   (0.7, .3, [('1662-preview.mp3', A, 0, 0, .8), ('1681.wav', A, -10, 0, .7)], {'lim': .25}),
}

# ---------------- loops ----------------
# key: dict(L, X, beds=[(file, region_start, region_end, gain_dB, {af})], ev=[(file, src_start, src_dur, gain_dB, at, {rate, af})])
LOOPS = {
 'amb_road':          dict(L=24, X=2.5, beds=[('1620.wav', 1, 14, 0, {'af': 'lowpass=2500'}), ('2463.wav', 0, 66, -6, {'af': 'lowpass=3000'}), ('1172.wav', 0, 26, -12)]),
 'amb_wind':          dict(L=24, X=3, beds=[('2658.wav', 0, 61.8, 0), ('1172.wav', 0, 26.2, -8)]),
 'amb_day_birds':     dict(L=28, X=3, beds=[('2472.wav', 0, 209, 0), ('1221.wav', 0, 110, -8)]),
 'amb_forest':        dict(L=28, X=3, beds=[('1238.wav', 0, 125, 0), ('1213.wav', 0, 161, -6)]),
 'amb_desert':        dict(L=24, X=3, beds=[('2495.wav', 0, 60, 0), ('1154.wav', 0, 38.9, -10, {'af': 'lowpass=1200'})],
                           ev=[('2494.wav', 0, 5.4, -14, 11.0, {'af': 'afade=t=in:d=1,afade=t=out:st=4:d=1.4'})]),
 'amb_snow':          dict(L=24, X=3, beds=[('1154.wav', 0, 38.9, 0), ('1175.wav', 0, 13.27, -4)]),
 'amb_night':         dict(L=28, X=3, beds=[('1789.wav', 0, 42, 0), ('1241.wav', 0, 113, -6)]),
 'amb_ghost':         dict(L=24, X=3, beds=[('1172.wav', 0, 26.2, 0), ('1157.wav', 0, 12.35, -3)],
                           ev=[('1163.wav', 0, 4.4, -10, 6.5, {'af': 'lowpass=2500'}), ('2623.wav', 0, 3.7, -12, 16.0, {'af': 'lowpass=3000,' + ECHO})]),
 'amb_station':       dict(L=26, X=3, beds=[('2929.wav', 0, 46.6, 0, {'af': 'lowpass=2200'}), ('2504.wav', 0, 50, -12, {'af': 'lowpass=400'}), ('371.wav', 0, 62, -8)]),
 'amb_station_night': dict(L=24, X=3, beds=[('1788.wav', 0, 18.8, 0), ('2678.wav', 0, 126, -9, {'af': 'lowpass=1500'}), ('910.wav', 0, 12.3, -14, {'af': 'highpass=100,lowpass=4000'})]),
 'amb_motel':         dict(L=24, X=3, beds=[('1785.wav', 0, 60, 0), ('3126.wav', 0, 51, -9, {'af': 'lowpass=1400'})]),
 'wash_loop':         dict(L=16, X=2, beds=[('1537.wav', 20, 150, 0), ('1870.wav', 0, 5.3, -8)]),
 'engine_loop':       dict(L=4, X=.6, beds=[('1623.wav', 1.5, 8.97, 0, {'af': 'lowpass=3500'})], target=-20),
}

def wr(a, p):
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', p], input=pcm, check=True)

def lufs_tp(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
    pk = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', r)
    return (float(I[-1]) if I else float('-inf')), (float(pk[-1]) if pk else None)

def finish(mix, key, target, ceiling_lufs, tmp, out, lim=None, loop=False, br='128k'):
    w = os.path.join(tmp, key + '.wav')
    mix = mix / max(1e-9, np.abs(mix).max()) * 10 ** (-6 / 20)
    wr(mix, w)
    if lim:
        w2 = w[:-4] + '_lim.wav'; N = len(mix)
        if loop: wr(np.tile(mix, (3, 1)), w)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', f'alimiter=limit={lim}:attack=0.5:release=40:level=disabled', w2], check=True)
        mix = load(w2)
        if loop: mix = mix[N:2 * N]
        mix = mix / max(1e-9, np.abs(mix).max()) * 10 ** (-6 / 20); wr(mix, w)
    I, _ = lufs_tp(w)
    pk = 20 * np.log10(np.abs(mix).max())
    gain = (target - I) if I != float('-inf') else (-3 - pk)
    gain = min(gain, -3.5 - pk)
    if I != float('-inf'): gain = min(gain, ceiling_lufs - I)
    mix = mix * 10 ** (gain / 20)
    wr(mix, w)
    o = os.path.join(out, key + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', br, '-ar', str(SR), '-ac', '2', o], check=True)
    return o

def build_oneshot(key, spec, SRC, OUT, tmp):
    L, F, layers, opt = spec
    mix = np.zeros((int(SR * (L + 1.5)), 2))
    for lay in layers:
        f, ss, g, at, dur = lay[:5]; o = lay[5] if len(lay) > 5 else {}
        p = src_path(SRC, f, tmp)
        if ss == A or isinstance(ss, tuple):
            ss = onset(load(p), after=ss[1] if isinstance(ss, tuple) else 0)
        x = load(p, ss, dur, rate_af(o.get('rate'), o.get('af'))) * 10 ** (g / 20)
        if isinstance(at, tuple): at = max(0.0, at[1] - peak_time(x))
        i = int(at * SR); n = min(len(x), len(mix) - i); mix[i:i + n] += x[:n]
    st = onset(mix, rel=opt.get('trim', -30))
    mix = mix[int(st * SR):int(st * SR) + int(L * SR)]
    fi = int(.003 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(F * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]
    if 'peak' in opt:                 # too short for LUFS: set by sample peak instead
        mix = mix / max(1e-9, np.abs(mix).max()) * 10 ** (opt['peak'] / 20); wr(mix, os.path.join(tmp, key + '.wav'))
        o = os.path.join(OUT, key + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(tmp, key + '.wav'), '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '2', o], check=True)
        return o, st
    t = opt.get('target', -16)
    return finish(mix, key, t, t + .5, tmp, OUT, opt.get('lim'), br='128k'), st

def seam_cost(e, s, P, X, win, med):
    a, b = int(s / win), int((s + X) / win)
    c, d = int((s + P) / win), int((s + P + X) / win)
    w1, w2 = e[a:b], e[c:d]
    if len(w1) == 0 or len(w2) == 0: return 1e9
    exc = max(w1.max() - med, w2.max() - med)
    return max(0, exc - 4) + 2 * abs(w1.mean() - w2.mean())

def bed_layer(p, r0, r1, L, X, af):
    full = load(p, r0, r1 - r0, af)
    n = len(full) / SR
    k = 1
    while L / k + X > n - .05: k += 1
    P = L / k
    e = env_db(full, .05); med = float(np.median(e))
    best = min(((seam_cost(e, s, P, X, .05, med), s) for s in np.arange(0, n - P - X - .05, .1)), key=lambda t: t[0])
    s = best[1]; i = int(s * SR); Pn = int(round(P * SR)); Xn = int(X * SR)
    seg = full[i:i + Pn + Xn]
    t = np.linspace(0, np.pi / 2, Xn)[:, None]
    loop = seg[:Pn].copy()
    loop[:Xn] = seg[:Xn] * np.sin(t) + seg[Pn:Pn + Xn] * np.cos(t)
    return np.tile(loop, (k, 1)), s, k, best[0]

def build_loop(key, spec, SRC, OUT, tmp):
    L, X = spec['L'], spec['X']; N = int(round(L * SR))
    mix = np.zeros((N, 2)); notes = []
    for b in spec['beds']:
        f, r0, r1, g = b[:4]; o = b[4] if len(b) > 4 else {}
        x, s, k, cost = bed_layer(src_path(SRC, f, tmp), r0, r1, L, X, o.get('af'))
        x = x[:N] if len(x) >= N else np.pad(x, ((0, N - len(x)), (0, 0)))
        x = x / max(1e-9, np.sqrt((x ** 2).mean())) * 10 ** (-20 / 20)
        mix += x * 10 ** (g / 20); notes.append(f'{f}@{r0 + s:.1f}s x{k} cost={cost:.1f}')
    for ev in spec.get('ev', []):
        f, ss, dur, g, at = ev[:5]; o = ev[5] if len(ev) > 5 else {}
        p = src_path(SRC, f, tmp)
        if ss == A: ss = onset(load(p))
        x = load(p, ss, dur, rate_af(o.get('rate'), o.get('af')))
        x = x / max(1e-9, np.abs(x).max()) * 10 ** ((-10 + g) / 20)
        i = int(at * SR)
        n1 = min(len(x), N - i); mix[i:i + n1] += x[:n1]
        if len(x) > n1: mix[:len(x) - n1] += x[n1:]
    e = env_db(mix, .05); med = float(np.median(e)); n = len(e); h = min(10, n // 4)
    best = min(((abs(np.mean(e[(np.arange(r, r + h)) % n]) - np.mean(e[(np.arange(r - h, r)) % n]))
                 + max(0, e[(np.arange(r - h, r + h)) % n].max() - med - 3), r) for r in range(n)))
    rot = int(best[1] * .05 * SR)
    c = (np.arange(-int(.025 * SR), int(.025 * SR)) + rot) % len(mix)
    v = np.abs(mix[c]).sum(axis=1) + np.abs(mix[(c + 1) % len(mix)] - mix[c]).sum(axis=1) * 4
    rot = int(c[np.argmin(v)])
    mix = np.roll(mix, -rot, axis=0); notes.append(f'rotate {rot / SR:.3f}s')
    t = spec.get('target', -22)
    return finish(mix, key, t, t + .5, tmp, OUT, spec.get('lim'), loop=True, br='96k'), '; '.join(notes)

def dur_of(o):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o], capture_output=True, text=True).stdout)

def check(OUT):
    print('key\tlen\tLUFS\tpeak\tlead_ms\thead/tail_dB\tjump')
    for fn in sorted(os.listdir(OUT)):
        if not fn.endswith('.mp3'): continue
        o = os.path.join(OUT, fn); k = fn[:-4]
        x = load(o); I, pk = lufs_tp(o)
        m = np.abs(x).max(axis=1); lead = int(np.argmax(m > 10 ** (-50 / 20))) / SR * 1000
        h = 20 * np.log10(np.sqrt((x[:SR // 2] ** 2).mean()) + 1e-12); t = 20 * np.log10(np.sqrt((x[-SR // 2:] ** 2).mean()) + 1e-12)
        d = np.abs(np.diff(x, axis=0)).mean(axis=1); jump = np.abs(x[0] - x[-1]).mean() / (np.median(d) + 1e-9)
        isloop = k in LOOPS
        print(f'{k}\t{len(x) / SR:.2f}\t{I:.1f}\t{pk:.1f}\t{lead:.0f}\t' + (f'{h:.1f}/{t:.1f} ({t - h:+.1f})\t{jump:.1f}' if isloop else '-\t-'))

if __name__ == '__main__':
    if sys.argv[1] == '--check':
        check(sys.argv[2]); sys.exit()
    SRC, OUT = sys.argv[1], sys.argv[2]; ONLY = set(sys.argv[3:])
    os.makedirs(OUT, exist_ok=True); tmp = tempfile.mkdtemp(prefix='roadtrip-sfx-')
    for key, spec in S.items():
        if ONLY and key not in ONLY: continue
        o, st = build_oneshot(key, spec, SRC, OUT, tmp)
        I, pk = lufs_tp(o); print(f'{key}\t{dur_of(o):.3f}s\tI={I}\tpk={pk}\ttrim={st:.3f}')
    for key, spec in LOOPS.items():
        if ONLY and key not in ONLY: continue
        o, notes = build_loop(key, spec, SRC, OUT, tmp)
        I, pk = lufs_tp(o); print(f'{key}\t{dur_of(o):.3f}s\tI={I}\tpk={pk}\tLOOP {notes}')
