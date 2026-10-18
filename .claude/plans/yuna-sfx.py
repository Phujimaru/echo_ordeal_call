# สังเคราะห์เสียงเฉพาะตัวของยูนะ (ธีมดนตรี/ไอดอล) ด้วย ffmpeg aevalsrc
import subprocess, sys, os
OUT = sys.argv[1]
def hz(n):  # ชื่อโน้ต -> ความถี่
    names = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    nm, oc = n[:-1], int(n[-1])
    return 440 * 2 ** ((names[nm] + 12 * (oc - 4) - 9) / 12)
def bell(f, t0, dec=5.0, amp=0.5):
    # เสียงระฆัง/เปียโนไฟฟ้า: ฐาน + โอเวอร์โทน
    T = f"(t-{t0:.4f})"
    g = f"gte(t,{t0:.4f})"
    return (f"{g}*{amp}*exp(-{dec}*{T})*(sin(2*PI*{f:.2f}*{T})+0.35*sin(2*PI*{2*f:.2f}*{T})+0.12*sin(2*PI*{3.01*f:.2f}*{T}))")
def pad(f, t0, t1, amp=0.25):
    T = f"(t-{t0:.4f})"; L = t1 - t0
    env = f"min(1,{T}/0.12)*min(1,({t1:.4f}-t)/0.25)"
    return f"between(t,{t0:.4f},{t1:.4f})*{amp}*{env}*(sin(2*PI*{f:.2f}*t)+0.5*sin(2*PI*{f*1.005:.2f}*t)+0.3*sin(2*PI*{f*2:.2f}*t))"
def sweep(f0, f1, t0, t1, amp=0.4, shape='sin'):
    L = t1 - t0
    ph = f"2*PI*({f0}*(t-{t0})+({f1}-{f0})*(t-{t0})^2/(2*{L}))"
    w = f"sin({ph})" if shape == 'sin' else f"(2*gte(sin({ph}),0)-1)*0.6"
    return f"between(t,{t0},{t1})*{amp}*sin(PI*(t-{t0})/{L})*{w}"
def noise(t0, t1, amp=0.2, rise=False):
    L = t1 - t0
    env = f"((t-{t0})/{L})^2" if rise else f"exp(-8*(t-{t0}))"
    return f"between(t,{t0},{t1})*{amp}*{env}*(random(0)*2-1)"
def kick(t0, amp=0.9):
    T = f"(t-{t0})"
    return f"gte(t,{t0})*{amp}*exp(-14*{T})*sin(2*PI*(45*{T}+60*(1-exp(-30*{T}))/30*30))"
def glitch(f, t0, t1, amp=0.3):
    return f"between(t,{t0},{t1})*{amp}*(2*gte(sin(2*PI*{f}*t)*sin(2*PI*31*t),0)-1)*exp(-4*(t-{t0}))"
def make(name, parts, dur, echo=True, vol=1.0):
    expr = "+".join(parts)
    af = f"aevalsrc='{expr}':s=44100:d={dur}"
    flt = "highpass=f=60,"
    if echo: flt += "aecho=0.8:0.55:70|140:0.35|0.2,"
    flt += f"volume={vol},alimiter=limit=0.89,afade=t=out:st={max(0,dur-0.08)}:d=0.08"
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", af, "-af", flt, "-ac", "2", "-c:a", "libmp3lame", "-q:a", "3", os.path.join(OUT, name + ".mp3")]
    subprocess.run(cmd, check=True)
    print(name)
N = hz
make("yuna_hit", [bell(N('E6'), 0, 9, .5), bell(N('A6'), .07, 8, .45), noise(0, .12, .12)], .55)
make("yuna_idol_hit", [kick(0, .8), bell(N('C6'), .02, 5, .35), bell(N('E6'), .02, 5, .3), bell(N('G6'), .02, 5, .3), sweep(300, 1800, 0, .25, .25), noise(0, .3, .25)], .8)
make("yuna_bless", [bell(N(n), i * .11, 3, .38) for i, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'])] + [pad(N('C5'), 0, 1.8, .15), pad(N('G5'), .2, 1.8, .1), sweep(2000, 6000, .4, 1.6, .05)], 1.9)
make("yuna_shadow", [bell(N(n), i * .1, 4, .35) for i, n in enumerate(['E6', 'C6', 'A5', 'F5'])] + [noise(0, .9, .12, True), pad(N('A3'), 0, 1.0, .18)], 1.1)
make("yuna_vanish", [pad(N('A4'), 0, .9, .25), pad(N('E5'), 0, .9, .2), sweep(1200, 200, .1, .8, .2), noise(0, .8, .15, True)], .95)
make("yuna_appear", [bell(N(n), i * .06, 6, .32) for i, n in enumerate(['G5', 'B5', 'D6', 'G6', 'B6'])] + [sweep(400, 2400, 0, .35, .12)], .8)
make("yuna_song_delete", [glitch(N('A5'), 0, .2, .3), glitch(N('E5'), .18, .4, .3), glitch(N('A4'), .36, .7, .3), bell(N('A3'), .36, 4, .35)], .85)
make("yuna_song_smile", [pad(N('C5'), 0, 1.0, .2), pad(N('E5'), .05, 1.0, .18), pad(N('G5'), .1, 1.0, .16), bell(N('C6'), .1, 4, .3), bell(N('E6'), .25, 4, .25)], 1.05)
make("yuna_song_rest", [bell(N('G5'), 0, 5, .35), bell(N('C5'), .16, 4, .35)], .7)
make("yuna_song_tick", [bell(N('E6'), 0, 7, .3), bell(N('B6'), .05, 7, .2)], .5)
make("yuna_song_stop", [sweep(900, 120, 0, .45, .35, 'sq'), bell(N('C4'), .4, 6, .3)], .65, echo=False)
make("yuna_idol_cast", [kick(0, .9), kick(.32, .7), noise(0, .6, .25, True)] + [bell(N(n), .6 + i * .05, 3, .32) for i, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6'])] + [sweep(200, 2400, 0, .6, .2), pad(N('C4'), .6, 1.7, .25)], 1.8)
make("yuna_idol_end", [bell(N(n), i * .12, 3, .3) for i, n in enumerate(['G6', 'E6', 'C6', 'G5', 'C5'])] + [pad(N('C4'), 0, 1.0, .15)], 1.15)
make("yuna_ride_ask", [bell(N('G5'), 0, 6, .4), bell(N('D6'), .12, 5, .4)], .55)
make("yuna_ride_no", [bell(N('D5'), 0, 6, .4), bell(N('A4'), .14, 5, .4)], .6)
make("yuna_mount", [sweep(300, 900, 0, .2, .3), bell(N('C6'), .18, 6, .35), bell(N('G6'), .26, 6, .3)], .6)
make("yuna_fall", [sweep(1000, 150, 0, .35, .3), kick(.33, .8), noise(.33, .5, .2)], .7, echo=False)
