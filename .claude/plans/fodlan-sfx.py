# Fodlan map SFX + ambience builder (Mixkit originals -> trimmed/layered/looped/normalised mp3). See fodlan-sfx-sources.md
#  python -I .claude/plans/fodlan-sfx.py C:/Users/LOQ/Downloads/fodlan-sfx-src C:/Echo/client/public/fodlan/sfx [key...]
#  python -I .claude/plans/fodlan-sfx.py --check C:/Echo/client/public/fodlan/sfx      (loudness / seam / leading-silence report)
#  needs numpy + ffmpeg/ffprobe on PATH; temp wavs go to a system temp dir
#
# One-shot (same recipe as emiya-sfx.py): layers placed in time -> trim leading silence of the mix (first sample above
#   peak-30 dB, minus 4 ms) -> cut to length -> 3 ms fade-in / cosine fade-out -> gain-only to -16 LUFS integrated,
#   sample peak <= -3 dBFS, never louder than -15.5 LUFS (optional alimiter first) -> mp3 160k 44.1k stereo.
# Loop (amb_* / wx_* beds / campfire): every bed layer is cut from a search region at the offset whose two crossfade
#   windows have no transients and matching level, made seamless by equal-power crossfading its tail (P..P+X) into its
#   head (0..X), tiled k times when the source is shorter than the loop (period = L/k), RMS-matched to -20 dBFS + gain.
#   One-off "events" (raven, drip, distant sword clash...) are placed inside the loop and wrap around the end.
#   Mix -> gain-only to -22 LUFS, sample peak <= -3 dBFS. No fades, no trimming (sample N-1 flows into sample 0).
import subprocess, sys, os, re, math, tempfile, numpy as np
SR = 44100
A = 'auto'

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
    return max(i0, i - int(.004 * SR)) / SR      # 4 ms pre-roll

def env_db(x, win=.05):
    n = int(win * SR); k = len(x) // n
    m = (x[:k * n] ** 2).mean(axis=1).reshape(k, n).mean(axis=1)
    return 10 * np.log10(m + 1e-12)

def peak_time(x):
    e = env_db(x, .02); return int(np.argmax(e)) * .02 + .01

def rate_af(rate, af):
    r = f'asetrate={SR}*{rate},aresample={SR}' if rate and rate != 1 else None
    return ','.join(p for p in (r, af) if p) or None

ECHO = 'apad=pad_dur=1.5,aecho=0.8:0.7:70|150:0.35|0.22'          # "far off" tail for events
CRACKLE = 'volume=18dB,alimiter=limit=0.25:attack=0.1:release=15:level=disabled'   # flatten the few huge pops of 1330/1329
CAVE = 'apad=pad_dur=1.5,aecho=0.8:0.6:190|330:0.38|0.24'         # cavern tail for drips

# ---------------- one-shots ----------------
# key: (length, fadeout, [layer...], opts)   layer = (file, src_start, gain_dB, at, src_dur, {rate, af})
#   src_start: seconds | 'auto' (onset of the file) | ('auto', after_s)
#   at: seconds in the mix | ('pk', t) = put the layer's loudest 20 ms at t
S = {
 'wx_thunder':      (5.0, 1.6, [('1300.wav', A, 0, 0, 5.4)], {'lim': 0.3}),
 'wx_thunder2':     (5.0, 1.6, [('1279.wav', A, 0, 0, 5.4), ('1297.wav', 1.6, -9, .45, 4.6, {'af': 'lowpass=900'})], {}),
 'wx_tsunami_warn': (3.0, .45, [('2409.wav', .6, 0, 0, 3.0), ('1296.wav', .2, -9, 0, 3.0, {'af': 'lowpass=220,afade=t=in:d=2.4'})], {'trim': -45, 'lim': 0.33}),
 'wx_tsunami':      (3.8, 1.1, [('781.wav', 0, 0, 0, 4.0), ('2806.wav', 0, -4, ('pk', .55), 4.5), ('1198.wav', A, -7, .25, 1.5)], {'lim': 0.4}),
 'boat_board':      (1.3, .35, [('337.wav', A, 0, 0, .5), ('3076.wav', 1.0, -6, .05, 1.25)], {'lim': 0.3}),
 'boat_move':       (2.2, .45, [('1182.wav', .4, 0, 0, 1.5), ('1182.wav', 3.05, -2, 1.05, 1.2), ('1187.wav', 5.0, -9, 0, 2.3)], {}),
 'lever':           (1.1, .25, [('2857.wav', A, -6, 0, .2), ('2857.wav', A, -7, .07, .2, {'rate': .94}), ('2857.wav', A, -8, .14, .2, {'rate': .89}),
                                ('198.wav', A, 0, .22, .9), ('2856.wav', A, -5, .27, .8)], {'lim': 0.3}),
 'fish_cast':       (1.1, .2, [('2605.wav', A, 0, 0, .6), ('1317.wav', A, -2, .42, .4), ('1311.wav', A, -12, .40, .6)], {}),
 'fish_catch':      (1.6, .3, [('2922.wav', A, 0, 0, 1.0), ('3075.wav', A, -6, .25, 1.3), ('1095.wav', 0, -11, .15, .9, {'af': 'highpass=800'}), ('2457.wav', A, -3, .55, .6)], {'lim': 0.3}),
 'torch_place':     (1.3, .35, [('1348.wav', A, 0, 0, 1.3), ('1342.wav', A, -4, ('pk', .55), 1.1)], {}),
 'torch_out':       (1.4, .65, [('1198.wav', A, -2, 0, .6), ('123.wav', 3.0, -2, .05, 1.4, {'af': 'highpass=1200'}), ('2802.wav', A, -10, 0, 1.4)], {'lim': 0.27}),
 'crate_open':      (1.0, .25, [('2182.wav', A, -3, 0, .4), ('195.wav', A, 0, .05, .8), ('3141.wav', A, -8, .55, .45)], {'lim': 0.25}),
 'pillar_break':    (2.0, .6, [('1693.wav', A, 0, 0, 2.0), ('759.wav', A, -5, 0, 1.0), ('2630.wav', 1.6, -6, .1, 1.9), ('400.wav', 2.1, -8, .3, 1.7)], {'lim': 0.25}),
 'fog_clear':       (2.2, .6, [('2343.wav', 1.6, 0, 0, 2.4), ('2629.wav', A, -6, .5, 1.7)], {'trim': -40}),
 'catapult_fire':   (2.2, .6, [('3157.wav', .35, -2, 0, .9), ('2182.wav', A, -2, .45, .4), ('1344.wav', A, 0, .4, 1.8)], {}),
 'fireball_hit':    (2.0, .7, [('1705.wav', A, 0, 0, 2.0), ('1338.wav', .2, -6, .05, 1.95)], {}),
 'arrow_volley':    (1.5, .35, [('2767.wav', A, -4, 0, .5), ('2771.wav', A, -5, .06, .5, {'rate': 1.05}), ('1491.wav', A, -6, .10, .7, {'rate': .95}),
                                ('2767.wav', A, -6, .17, .5, {'rate': .92}), ('2771.wav', A, -6, .25, .5, {'rate': 1.1}), ('1491.wav', A, -7, .30, .7, {'rate': 1.05}),
                                ('2767.wav', A, -8, .38, .5, {'rate': 1.08}), ('2771.wav', A, -9, .46, .5, {'rate': .9}), ('1491.wav', A, -10, .55, .7)], {'lim': .3}),
 'arrow_hit':       (0.9, .25, [('2182.wav', A, 0, 0, .4), ('2070.wav', A, -3, .07, .5), ('2182.wav', A, -5, .16, .4, {'rate': .9}),
                                ('2769.wav', A, -12, .24, .5), ('2070.wav', A, -6, .30, .5, {'rate': 1.1})], {'lim': .14}),
 'dragon_roar':     (3.4, 1.0, [('1727.wav', A, 0, 0, 3.6)], {}),
 'dragon_fire':     (2.6, .6, [('2230.wav', A, 0, 0, 2.7), ('1336.wav', .9, -5, .3, 2.3)], {'lim': 0.4}),
 'war_horn':        (3.8, 1.2, [('2289.wav', A, 0, 0, 4.0)], {}),
 'grass_fire':      (2.4, .7, [('1327.wav', A, -2, 0, 1.6), ('1335.wav', .7, 0, .15, 2.3)], {}),
 'wood_chop':       (0.8, .3, [('796.wav', 11.41, 0, 0, .8), ('2182.wav', A, -6, ('pk', .015), .4), ('2943.wav', A, -9, ('pk', .015), .6)], {'lim': .08}),
 'avalanche':       (3.2, .9, [('2409.wav', 1.4, 0, 0, 3.4, {'af': 'lowpass=600'}), ('1474.wav', A, -4, .1, 2.8), ('1272.wav', A, -3, .15, 2.5),
                                ('403.wav', 1.6, -2, .5, 2.7), ('1271.wav', A, -6, 1.0, 1.8)], {'trim': -40, 'lim': 0.42}),
 'frostbite':       (1.0, .3, [('882.wav', A, 0, 0, 1.0), ('759.wav', A, -9, 0, .6, {'af': 'highpass=1500'}), ('2834.wav', A, -10, .05, .9)], {}),
 'throne':          (2.2, .8, [('656.wav', 0, 0, 0, 2.4), ('3108.wav', A, -6, .05, 1.8)], {}),
 'crest_pickup':    (1.0, .3, [('871.wav', A, 0, 0, 1.0), ('3083.wav', A, -5, .03, 1.0)], {}),
 'beast_roar':      (3.0, .9, [('1726.wav', A, 0, 0, 3.2), ('1970.wav', A, -5, .1, 2.9)], {}),
 'glow_pulse':      (2.2, .6, [('2583.wav', 1.5, 0, 0, 2.4), ('2669.wav', A, -4, 0, 1.9), ('2298.wav', 0, -10, 0, 2.2, {'af': 'lowpass=400,afade=t=in:d=0.8'})], {'trim': -40}),
 'cine_dive':       (2.6, .4, [('790.wav', .4, 0, 0, 2.2), ('1168.wav', A, -2, ('pk', 2.05), 2.0), ('2412.wav', 2.4, -4, .2, 2.4)], {'trim': -45}),
 'cine_clouds':     (2.0, .6, [('2604.wav', A, 0, 0, 2.0), ('1474.wav', A, -3, .05, 1.9)], {}),
 'cine_reveal':     (3.4, 1.4, [('788-preview.mp3', 1.7, 0, 0, 3.6), ('2908.wav', A, -5, ('pk', .4), 3.5), ('1143-preview.mp3', A, -6, ('pk', .4), 3.0)], {}),
 'cine_map':        (1.3, .3, [('1530.wav', A, 0, 0, .7), ('2383.wav', A, -2, .2, .9), ('1105.wav', A, -4, .6, .6)], {'lim': 0.15}),
 'cine_swoop':      (1.4, .35, [('1469.wav', A, 0, 0, 1.4), ('1490.wav', A, -6, ('pk', .35), .9)], {}),
 'cine_stage':      (2.2, .8, [('2903.wav', A, 0, ('pk', .8), 2.6), ('546-preview.mp3', A, -3, ('pk', .8), 2.6)], {}),
}

# ---------------- loops ----------------
# key: dict(L=length, X=crossfade, beds=[(file, region_start, region_end, gain_dB, {af})], ev=[(file, src_start, src_dur, gain_dB, at, {rate, af})])
LOOPS = {
 'amb_river':    dict(L=32, X=3, beds=[('1216.wav', 0, 95, 0), ('2454.wav', 0, 180, -8)]),
 'amb_fog':      dict(L=32, X=3, beds=[('2466.wav', 0, 90, 0), ('1162.wav', 8, 42, -4, {'af': 'lowpass=2500'}), ('1237.wav', 0, 25.3, -6)],
                      ev=[('62.wav', A, 1.2, -14, 9.0, {'af': 'lowpass=3000,' + ECHO}), ('62.wav', A, 1.2, -17, 22.4, {'rate': .92, 'af': 'lowpass=2600,' + ECHO}),
                          ('3076.wav', .4, 2.2, -16, 15.2, {'af': 'lowpass=1800'})]),
 'amb_war':      dict(L=34, X=3, beds=[('376.wav', 0, 43, -6, {'af': 'lowpass=1400,aecho=0.8:0.7:60|130:0.3|0.2'}), ('1196.wav', 0, 48, -2),
                                       ('1330.wav', 0, 24, -10, {'af': CRACKLE}), ('1736.wav', 0, 30.7, -9)], lim=.4,
                      ev=[('2763.wav', A, .8, -15, 5.0, {'af': 'lowpass=2200,' + ECHO}), ('2764.wav', A, .8, -17, 5.35, {'af': 'lowpass=2200,' + ECHO}),
                          ('2762.wav', A, .8, -16, 12.2, {'af': 'lowpass=2000,' + ECHO}), ('2776.wav', A, .8, -18, 19.6, {'af': 'lowpass=2000,' + ECHO}),
                          ('2764.wav', A, .8, -16, 20.0, {'rate': .95, 'af': 'lowpass=2200,' + ECHO}), ('2763.wav', A, .8, -17, 27.3, {'rate': 1.05, 'af': 'lowpass=2000,' + ECHO})]),
 'amb_snow':     dict(L=28, X=3, beds=[('1267.wav', 0, 31.8, 0), ('1153.wav', 60, 100, -8, {'af': 'lowpass=1800'})]),
 'amb_tomb':     dict(L=32, X=3, beds=[('2500.wav', 0, 41.2, 0), ('2745.wav', 0, 86, -8, {'af': 'lowpass=250'})],
                      ev=[('3179.wav', 0, 2, -6, 4.1, {'af': CAVE}), ('3179.wav', 0, 2, -10, 13.7, {'rate': 1.12, 'af': CAVE}),
                          ('3179.wav', 0, 2, -8, 21.0, {'rate': .9, 'af': CAVE}), ('3179.wav', 0, 2, -12, 27.6, {'rate': 1.05, 'af': CAVE})]),
 'wx_rain':      dict(L=30, X=3, beds=[('1262.wav', 10, 120, 0)]),
 'wx_miasma':    dict(L=28, X=3, beds=[('894.wav', 2, 62, 0), ('1162.wav', 10, 34, -3, {'af': 'highpass=300'}), ('123.wav', 0, 22.5, -12, {'af': 'highpass=1500'})],
                      ev=[('302.wav', 0, 7.8, -11, 5.5, {'af': 'lowpass=3500,' + ECHO}), ('302.wav', 0, 7.8, -13, 18.5, {'rate': .9, 'af': 'lowpass=3000,' + ECHO})]),
 'wx_blizzard':  dict(L=30, X=3, beds=[('1153.wav', 4, 56, 0), ('1175.wav', 0, 13.28, -6)]),
 'campfire':     dict(L=20, X=2, beds=[('1736.wav', 0, 30.7, 0), ('1330.wav', 0, 24, -6, {'af': CRACKLE}), ('1329.wav', 0, 14, -9, {'af': CRACKLE.replace('18dB', '12dB')})], lim=.15),
}

def wr(a, p):
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', p], input=pcm, check=True)

def lufs_tp(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
    pk = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', r)
    return (float(I[-1]) if I else float('-inf')), (float(pk[-1]) if pk else None)

def finish(mix, key, target, ceiling_lufs, tmp, out, lim=None, loop=False):
    w = os.path.join(tmp, key + '.wav')
    mix = mix / max(1e-9, np.abs(mix).max()) * 10 ** (-6 / 20)
    wr(mix, w)
    if lim:
        w2 = w[:-4] + '_lim.wav'; N = len(mix)
        if loop: wr(np.tile(mix, (3, 1)), w)      # limit 3 copies, keep the middle one -> limiter state is continuous across the seam
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', f'alimiter=limit={lim}:attack=0.5:release=40:level=disabled', w2], check=True)
        mix = load(w2)
        if loop: mix = mix[N:2 * N]
        mix = mix / max(1e-9, np.abs(mix).max()) * 10 ** (-6 / 20); wr(mix, w)
    I, _ = lufs_tp(w)
    pk = 20 * np.log10(np.abs(mix).max())
    gain = (target - I) if I != float('-inf') else (-3 - pk)
    gain = min(gain, -3.5 - pk)                                   # sample-peak ceiling -3.5 dBFS pre-encode -> <= -3 after mp3
    if I != float('-inf'): gain = min(gain, ceiling_lufs - I)
    mix = mix * 10 ** (gain / 20)
    wr(mix, w)
    o = os.path.join(out, key + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', str(SR), '-ac', '2', o], check=True)
    return o

def build_oneshot(key, spec, SRC, OUT, tmp):
    L, F, layers, opt = spec
    mix = np.zeros((int(SR * (L + 1.5)), 2))
    for lay in layers:
        f, ss, g, at, dur = lay[:5]; o = lay[5] if len(lay) > 5 else {}
        p = os.path.join(SRC, f)
        if ss == A or isinstance(ss, tuple):
            ss = onset(load(p), after=ss[1] if isinstance(ss, tuple) else 0)
        x = load(p, ss, dur, rate_af(o.get('rate'), o.get('af'))) * 10 ** (g / 20)
        if isinstance(at, tuple): at = max(0.0, at[1] - peak_time(x))
        i = int(at * SR); n = min(len(x), len(mix) - i); mix[i:i + n] += x[:n]
    st = onset(mix, rel=opt.get('trim', -30))
    mix = mix[int(st * SR):int(st * SR) + int(L * SR)]
    fi = int(.003 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(F * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]
    return finish(mix, key, -16, -15.5, tmp, OUT, opt.get('lim')), st

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
    out = np.tile(loop, (k, 1))
    return out, s, k, best[0]

def build_loop(key, spec, SRC, OUT, tmp):
    L, X = spec['L'], spec['X']; N = int(round(L * SR))
    mix = np.zeros((N, 2)); notes = []
    for b in spec['beds']:
        f, r0, r1, g = b[:4]; o = b[4] if len(b) > 4 else {}
        x, s, k, cost = bed_layer(os.path.join(SRC, f), r0, r1, L, X, o.get('af'))
        x = x[:N] if len(x) >= N else np.pad(x, ((0, N - len(x)), (0, 0)))
        x = x / max(1e-9, np.sqrt((x ** 2).mean())) * 10 ** (-20 / 20)       # RMS -20 dBFS
        mix += x * 10 ** (g / 20); notes.append(f'{f}@{r0 + s:.1f}s x{k} cost={cost:.1f}')
    for ev in spec.get('ev', []):
        f, ss, dur, g, at = ev[:5]; o = ev[5] if len(ev) > 5 else {}
        p = os.path.join(SRC, f)
        if ss == A: ss = onset(load(p))
        x = load(p, ss, dur, rate_af(o.get('rate'), o.get('af')))
        x = x / max(1e-9, np.abs(x).max()) * 10 ** ((-10 + g) / 20)
        i = int(at * SR)                 # wrap-around placement: the tail past L continues at the loop start
        n1 = min(len(x), N - i); mix[i:i + n1] += x[:n1]
        if len(x) > n1: mix[:len(x) - n1] += x[n1:]
    # the loop is circular, so its file start can be any sample: rotate to where the 0.5 s either side of the cut
    # match in level and nothing loud is happening (a player that starts it never opens on a one-off event)
    e = env_db(mix, .05); med = float(np.median(e)); n = len(e); h = 10
    best = min(((abs(np.mean(e[(np.arange(r, r + h)) % n]) - np.mean(e[(np.arange(r - h, r)) % n]))
                 + max(0, e[(np.arange(r - h, r + h)) % n].max() - med - 3), r) for r in range(n)))
    rot = int(best[1] * .05 * SR)
    # fine-tune +-25 ms to the quietest sample pair (both channels near zero, low slope): mp3 frames at the file
    # edges carry a little codec noise proportional to the signal there, so cut where the waveform is ~0
    c = (np.arange(-int(.025 * SR), int(.025 * SR)) + rot) % len(mix)
    v = np.abs(mix[c]).sum(axis=1) + np.abs(mix[(c + 1) % len(mix)] - mix[c]).sum(axis=1) * 4
    rot = int(c[np.argmin(v)])
    mix = np.roll(mix, -rot, axis=0); notes.append(f'rotate {rot / SR:.3f}s')
    return finish(mix, key, -22, -21.5, tmp, OUT, spec.get('lim'), loop=True), '; '.join(notes)

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
    os.makedirs(OUT, exist_ok=True); tmp = tempfile.mkdtemp(prefix='fodlan-sfx-')
    for key, spec in S.items():
        if ONLY and key not in ONLY: continue
        o, st = build_oneshot(key, spec, SRC, OUT, tmp)
        I, pk = lufs_tp(o); print(f'{key}\t{dur_of(o):.3f}s\tI={I}\tpk={pk}\ttrim={st:.3f}')
    for key, spec in LOOPS.items():
        if ONLY and key not in ONLY: continue
        o, notes = build_loop(key, spec, SRC, OUT, tmp)
        I, pk = lufs_tp(o); print(f'{key}\t{dur_of(o):.3f}s\tI={I}\tpk={pk}\tLOOP {notes}')
