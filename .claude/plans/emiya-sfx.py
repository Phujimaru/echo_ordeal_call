# Emiya Shirou SFX builder (Mixkit originals -> trimmed/layered/normalised mp3). See emiya-sfx-sources.md
#  python -I .claude/plans/emiya-sfx.py C:/Users/LOQ/Downloads/emiya-sfx-src C:/Echo/client/public/characters/emiya_shirou/sfx [key...]
#  needs numpy + ffmpeg on PATH; temp wavs go to a system temp dir
# Build Emiya SFX from Mixkit originals. usage: python -I build.py <srcdir> <outdir> [key...]
import subprocess, sys, os, json, re, numpy as np
SR = 44100
SRC, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
A = 'auto'
# key: (length, fadeout, mode, [(file, src_start|'auto', gain_dB, at, src_dur)])
R = {
 'emiya_trace': (1.0, .12, 'lufs', [('869.wav', 1.0, 0, 0, .55), ('2798.wav', A, -3, .42, .58)]),
 'emiya_trace_excalibur': (1.7, .12, 'lufs', [('658.wav', 0, 0, 0, 1.7), ('869.wav', .9, -4, .4, .7), ('2798.wav', A, -3, 1.05, .65)]),
 'emiya_break': (.7, .1, 'peak', [('3082.wav', A, 0, 0, .7), ('172.wav', .1, -6, 0, .6)]),
 'emiya_capacity': (.6, .1, 'peak', [('871.wav', A, 0, 0, .6)]),
 'emiya_avalon': (1.1, .12, 'lufs', [('656.wav', 0, 0, 0, 1.1)]),
 'emiya_atk_kb': (.85, .1, 'lufs', [('2160.wav', A, 0, 0, .85), ('2166.wav', A, -1, .25, .6)]),
 'emiya_atk_hrunting': (.8, .1, 'lufs', [('2767.wav', A, -7, 0, .3), ('1491.wav', .08, -9, 0, .5), ('2769.wav', A, 1, .28, .5), ('2070.wav', A, -3, .28, .4), ('2800.wav', A, -11, .29, .51)]),
 'emiya_atk_rule': (.7, .1, 'peak', [('2761.wav', A, -4, 0, .4), ('759.wav', A, -5, .04, .66), ('3083.wav', .4, -8, .06, .6)]),
 'emiya_atk_nine': (.95, .12, 'lufs', [('2794.wav', A, -2, 0, .95), ('2158-preview.mp3', A, 0, .06, .5), ('2199.wav', A, -3, .12, .5), ('2655.wav', 0, -6, 0, .6)]),
 'emiya_atk_excalibur': (.95, .12, 'lufs', [('2794.wav', A, 0, 0, .95), ('873.wav', A, -2, .02, .93)]),
 'emiya_throw': (.65, .1, 'peak', [('2649.wav', A, 0, 0, .55), ('2764.wav', A, -1, .40, .25)]),
 'emiya_caladbolg_shot': (.75, .1, 'lufs', [('2771.wav', A, -2, 0, .3), ('1467.wav', A, -1, 0, .75), ('2614.wav', .55, 0, 0, .75)]),
 'emiya_caladbolg_blast': (1.8, .12, 'lufs', [('2800.wav', A, 0, 0, 1.8), ('1686.wav', A, -4, .02, 1.78)]),
 'emiya_smash': (1.1, .12, 'lufs', [('3046-preview.mp3', 1.495, 0, 0, 1.1), ('1703.wav', A, -6, .01, 1.09)]),
 'emiya_rho': (1.1, .12, 'lufs', [('887.wav', A, 0, 0, 1.1), ('3108.wav', A, -3, .03, 1.07), ('2669.wav', A, -6, 0, 1.1)]),
 'emiya_excalibur': (1.9, .12, 'lufs', [('2589.wav', 1.05, 0, 0, 1.9), ('1341.wav', A, -4, .55, 1.35), ('2782.wav', 0, -10, .62, 1.28)]),
 'emiya_ubw': (2.3, .15, 'lufs', [('1327.wav', A, 0, 0, 2.3), ('1328.wav', A, -5, .2, 2.1), ('2610.wav', 0, -2, .55, 1.75)]),
 'emiya_stun': (.55, .08, 'peak', [('746.wav', A, 0, 0, .55)]),
}
LIMIT = {'emiya_atk_hrunting': 0.25, 'emiya_atk_rule': 0.25}
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
def lufs_tp(path_or_arr):
    p = path_or_arr
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', r)[-1]) if re.findall(r'I:\s+(-?[\d.]+) LUFS', r) else float('-inf')
    tp = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', r)
    return I, float(tp[-1]) if tp else None
import tempfile; tmp = tempfile.mkdtemp(prefix='emiya-sfx-')
os.makedirs(OUT, exist_ok=True)
for key, (L, F, mode, layers) in R.items():
    if ONLY and key not in ONLY: continue
    mix = np.zeros((int(SR * (L + .5)), 2))
    for f, ss, g, at, dur in layers:
        if ss == A or isinstance(ss, tuple):
            full = load(f); ss = onset(full, after=ss[1] if isinstance(ss, tuple) else 0)
        x = load(f, ss, dur) * 10 ** (g / 20)
        i = int(at * SR); n = min(len(x), len(mix) - i); mix[i:i + n] += x[:n]
    st = onset(mix, rel=-30)          # trim leading silence of the mix
    mix = mix[int(st * SR):int(st * SR) + int(L * SR)]
    fi = int(.003 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(F * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]
    w = os.path.join(tmp, key + '.wav')
    def wr(a, p):
        pcm = (np.clip(a, -1, 1) * 32767).astype('<i2').tobytes()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', p], input=pcm, check=True)
    # normalise in float first so wav never clips
    mix /= max(1e-9, np.abs(mix).max()); mix *= 10 ** (-6 / 20)
    wr(mix, w)
    if key in LIMIT:   # tame needle transients (stab/arrow hit) so loudness is not peak-bound
        w2 = w[:-4] + '_lim.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', f'alimiter=limit={LIMIT[key]}:attack=0.5:release=40:level=disabled', w2], check=True)
        mix = load(w2) ; mix /= max(1e-9, np.abs(mix).max()); mix *= 10 ** (-6 / 20); wr(mix, w)
    I, tp = lufs_tp(w)
    pk = 20 * np.log10(np.abs(mix).max())
    if I != float('-inf'):
        gain = -16 - I
    else:
        gain = -3 - pk
    gain = min(gain, -3.0 - pk)                     # sample-peak ceiling -3 dBFS (mp3 true-peak headroom)
    if I != float('-inf'): gain = min(gain, -15.5 - I)  # never louder than -14.5 LUFS
    mix *= 10 ** (gain / 20)
    wr(mix, w)
    o = os.path.join(OUT, key + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', str(SR), o], check=True)
    I2, tp2 = lufs_tp(o)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', o], capture_output=True, text=True).stdout)
    print(f"{key}\t{d:.3f}s\tI={I2} LUFS\tTP={tp2} dBFS\ttrim={st:.3f}\tmode={mode}")
