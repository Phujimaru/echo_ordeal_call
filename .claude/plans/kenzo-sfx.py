# Kenzo Suga / Kamen Rider Bake SFX builder (Mixkit originals -> trimmed/layered/normalised mp3). See kenzo-sfx-sources.md
#  python -I .claude/plans/kenzo-sfx.py C:/Users/LOQ/Downloads/kenzo-sfx-src C:/Echo/client/public/characters/kenzo_suga/sfx [key...]
#  needs numpy + ffmpeg on PATH; temp wavs go to a system temp dir (adapted from emiya-sfx.py)
import subprocess, sys, os, json, re, numpy as np
SR = 44100
SRC, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
A = 'auto'
G = '1662-preview.mp3'
# key: (length, fadeout, mode, [(file, src_start|'auto', gain_dB, at, src_dur)])
R = {
 'bake_shot': (.8, .15, 'lufs', [(G, .112, 0, 0, .8), ('1694.wav', .03, -4, 0, .6), ('1700.wav', .14, -9, .005, .79), ('2609.wav', .25, -16, .02, .6)]),
 'bake_shot2': (.75, .15, 'lufs', [('1693.wav', 0, 0, 0, .75), (G, .112, -5, 0, .5), ('2186.wav', .03, -10, .01, .74)]),
 'bake_open': (.45, .1, 'lufs', [('1674.wav', A, -2, 0, .17), ('2858.wav', .025, 0, .10, .35)]),
 'bake_card': (.3, .1, 'lufs', [('1660-preview.mp3', .395, 0, 0, .3), ('2001.wav', .013, -3, 0, .2), ('2183.wav', .066, -5, .004, .25), ('2177.wav', .118, -9, .008, .2)]),
 'bake_chomp': (.45, .15, 'lufs', [('2160.wav', .024, 0, 0, .45), ('833.wav', .099, -2, 0, .45), ('2775.wav', 0, -4, 0, .45), ('2853.wav', .057, -9, 0, .12)]),
 'bake_standby': (1.0, .15, 'lufs', [('3201.wav', .2, -3, 0, .45), ('3160.wav', .18, 0, .3, .7), ('2857.wav', A, -8, .3, .2)]),
 'bake_henshin': (1.5, .25, 'lufs', [('2596.wav', .45, -3, 0, 1.0), ('1143-preview.mp3', .25, -2, .2, 1.3), ('2186.wav', .03, -2, .48, 1.02), ('1428.wav', .105, -8, .55, .95)]),
 'bake_eject': (.7, .2, 'lufs', [('1664.wav', A, 0, 0, .18), ('3206.wav', A, -3, .02, .68), ('849.wav', .21, -8, .06, .6)]),
 'bake_corrode': (.6, .15, 'lufs', [('3155.wav', A, 0, 0, .3), ('2447.wav', .45, -2, .03, .57), ('123.wav', 5.0, -6, .02, .58)]),
 'bake_decay': (.6, .2, 'lufs', [('2945.wav', 0, -2, 0, .12), ('2937.wav', .23, -3, 0, .5), ('3158.wav', .22, -8, .03, .5), ('404.wav', .13, -4, .08, .52), ('2996.wav', .1, -12, .1, .4)]),
 'bake_again': (.5, .15, 'lufs', [('1665.wav', .09, 0, 0, .3), ('1659.wav', .17, -4, .10, .2), ('3164.wav', .08, -6, .16, .34)]),
}
LIMIT = {'bake_shot': 0.3, 'bake_shot2': 0.35, 'bake_chomp': 0.5, 'bake_open': 0.12, 'bake_card': 0.07, 'bake_standby': 0.3, 'bake_henshin': 0.45, 'bake_eject': 0.15, 'bake_corrode': 0.35, 'bake_decay': 0.1, 'bake_again': 0.3}
def load(f, ss=0, t=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{ss:.4f}', '-i', f if os.path.isabs(f) else os.path.join(SRC, f)]
    if t: cmd += ['-t', f'{t:.4f}']
    cmd += ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)
    return x.reshape(-1, 2).astype(np.float64)
def onset(x, after=0.0, rel=-30):
    m = np.abs(x).max(axis=1); i0 = int(after * SR)
    pk = m[i0:].max(); thr = pk * 10 ** (rel / 20)
    i = i0 + int(np.argmax(m[i0:] > thr))
    return max(i0, i - int(.004 * SR)) / SR   # 4 ms pre-roll
def lufs(p):
    # integrated loudness of the clip looped 4x (EBU gating needs 400 ms blocks; clips are 0.3-1.5 s)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-stream_loop', '3', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
    return float(m[-1]) if m else float('-inf')
def speak(a): return 20 * np.log10(max(1e-9, np.abs(a).max()))
def wr(a, p):
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', p], input=pcm, check=True)
import tempfile; tmp = tempfile.mkdtemp(prefix='kenzo-sfx-')
os.makedirs(OUT, exist_ok=True)
for key, (L, F, mode, layers) in R.items():
    if ONLY and key not in ONLY: continue
    mix = np.zeros((int(SR * (L + .5)), 2))
    for f, ss, g, at, dur in layers:
        if ss == A:
            ss = onset(load(f))
        x = load(f, ss, dur) * 10 ** (g / 20)
        i = int(at * SR); n = min(len(x), len(mix) - i); mix[i:i + n] += x[:n]
    st = onset(mix, rel=-30)          # trim leading silence of the mix
    mix = mix[int(st * SR):int(st * SR) + int(L * SR)]
    mix /= max(1e-9, np.abs(mix).max()); mix *= 10 ** (-6 / 20)
    w = os.path.join(tmp, key + '.wav')
    if key in LIMIT:   # tame needle transients so loudness is not peak-bound
        wr(mix, w); w2 = w[:-4] + '_lim.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', f'alimiter=limit={LIMIT[key]}:attack=0.5:release=40:level=disabled', w2], check=True)
        mix = load(w2)[:int(L * SR)]
        mix /= max(1e-9, np.abs(mix).max()); mix *= 10 ** (-6 / 20)
    fi = int(.003 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(F * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]
    wr(mix, w)
    I = lufs(w)
    gain = min(-16 - I, -3.3 - speak(mix))            # -16 LUFS, sample peak ceiling (mp3 headroom)
    o = os.path.join(OUT, key + '.mp3')
    for _ in range(4):
        wr(mix * 10 ** (gain / 20), w)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', str(SR), '-ac', '2', o], check=True)
        y = load(o); sp = speak(y); I2 = lufs(o)   # LAME low-pass eats some HF loudness -> correct on the mp3
        step = min(-16 - I2, -3.05 - sp)
        if abs(step) < .2 and sp <= -3.0: break
        gain += step
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o], capture_output=True, text=True).stdout)
    tr = np.argmax(np.abs(y[:int(.3 * SR)]).max(axis=1)) / SR
    m = np.abs(y).max(axis=1); first = np.argmax(m > m.max() * 10 ** (-20 / 20)) / SR
    print(f"{key}	{d:.3f}s	I={I2:.1f} LUFS	SP={sp:.1f} dBFS	peakAt={tr:.3f}	first-20dB={first:.3f}	trim={st:.3f}")
