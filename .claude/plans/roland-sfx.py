# Roland SFX builder (Mixkit originals -> trimmed/layered/normalised mp3). See GRID_PLAN §7.25
#  python -I .claude/plans/roland-sfx.py C:/Users/LOQ/Downloads/roland-sfx-src C:/Echo/client/public/characters/roland/sfx [key...]
#  needs numpy + ffmpeg on PATH; temp wavs go to a system temp dir
# Build Roland SFX from Mixkit originals. usage: python -I build.py <srcdir> <outdir> [key...]
import subprocess, sys, os, json, re, numpy as np
SR = 44100
SRC, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
A = 'auto'
# key: (length, fadeout, mode, [(file, src_start|'auto', gain_dB, at, src_dur)])
R = {
 'roland_atk_allas': (.7, .1, 'lufs', [('1485.wav', A, -6, 0, .35), ('2761.wav', A, 0, .06, .6)]),
 'roland_atk_zelkova': (.85, .1, 'lufs', [('2764.wav', A, 0, 0, .45), ('833.wav', A, 0, .26, .55)]),
 'roland_atk_oldboys': (.8, .1, 'lufs', [('833.wav', A, 0, 0, .75), ('2600.wav', A, -10, .02, .7)]),
 'roland_atk_mook': (.8, .1, 'lufs', [('2789.wav', A, 0, 0, .8)]),
 'roland_atk_ranga': (.7, .1, 'lufs', [('2152-preview.mp3', A, 0, 0, .45), ('2184.wav', A, -2, .16, .5)]),
 'roland_atk_wheels': (1.1, .12, 'lufs', [('2795.wav', A, 0, 0, 1.1), ('3046-preview.mp3', 1.495, -4, 0, 1.1)]),
 'roland_atk_crystal': (.9, .1, 'lufs', [('2166.wav', A, 0, 0, .6), ('2160.wav', A, -1, .24, .65)]),
 'roland_atk_logic': (.9, .1, 'lufs', [('1662-preview.mp3', A, 0, 0, .8), ('1700.wav', A, -9, 0, .9), ('1665.wav', A, -6, .55, .35)]),
 'roland_atk_durandal': (.95, .12, 'lufs', [('2794.wav', A, 0, 0, .7), ('2160.wav', A, -1, .28, .65)]),
 'roland_draw': (.35, .08, 'peak', [('2002.wav', A, 0, 0, .35)]),
 'roland_emotion': (.9, .15, 'lufs', [('3108.wav', A, 0, 0, .9)]),
 'roland_ready': (1.2, .15, 'lufs', [('2589.wav', 1.05, 0, 0, 1.2)]),
 'roland_shard': (.35, .08, 'peak', [('2183.wav', A, 0, 0, .35)]),
 'roland_shatter': (.9, .12, 'lufs', [('759.wav', A, 0, 0, .9), ('3108.wav', A, -6, .03, .8)]),
 'roland_heart': (1.0, .15, 'lufs', [('490.wav', A, 0, 0, 1.0)]),
 'roland_death': (1.6, .2, 'lufs', [('565.wav', A, 0, 0, 1.6), ('2630.wav', 0, -8, 0, 1.5)]),
}
LIMIT = {'roland_atk_allas': 0.25, 'roland_atk_oldboys': 0.18, 'roland_atk_logic': 0.2, 'roland_shatter': 0.3, 'roland_death': 0.12}
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
