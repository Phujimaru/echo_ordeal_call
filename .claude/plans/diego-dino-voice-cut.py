import sys, wave, json, subprocess, numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]
CUTS = {
 "human": [("h01",0.00,1.14),("h02",1.26,2.86),("h03",3.77,5.62),("h04",5.76,10.94),("h05",10.94,12.96),("h06",12.98,14.46),
           ("h07",21.76,23.20),("h08",23.96,25.18),("h09",25.44,28.62),("h10",29.44,31.42),("h11",31.58,34.72),("h12",34.84,36.28),("h13",36.34,40.86)],
 "extra": [("e01",0.13,0.64),("e02",0.74,1.36),("e03",1.48,2.10),("e04",2.16,2.52),("e05",2.70,3.10),("e06",3.56,4.40),("e07",4.58,5.20),
           ("e08",5.34,6.70),("e09",6.90,8.76),("e10",8.88,9.78),("e11",9.92,10.50),("e12",10.76,11.12),("e13",11.24,12.00),("e14",12.08,13.18),
           ("e15",13.28,14.58),("e16",14.78,15.34),("e17",15.50,16.14),("e18",17.70,18.18),("e19",19.46,20.00),("e20",20.16,21.42),
           ("e21",21.98,23.02),("e22",23.18,24.92)],
 "transform": [("t01",0.00,1.38),("t02",2.86,3.33)],
 "dino": [("d01",0.10,0.74),("d02",0.84,6.30),("d03",6.46,7.38),("d04",7.42,10.72),("d05",10.76,12.10),("d06",12.14,15.30)],
}
SR=48000
def load(name):
    raw=subprocess.run(["ffmpeg","-v","error","-i",f"{SRC}/{name}.m4a","-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.float32)
report=[]
for name, cuts in CUTS.items():
    x=load(name); hop=SR//200  # 5ms
    n=len(x)//hop
    db=np.array([20*np.log10(np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)])
    for i,(k,a,b) in enumerate(cuts):
        if len(sys.argv)>3 and k not in sys.argv[3].split(","): continue
        lo_lim = cuts[i-1][2] if i>0 else 0.0
        hi_lim = cuts[i+1][1] if i+1<len(cuts) else len(x)/SR
        fa=int(a*200); fb=min(int(b*200),n-1)
        # start: go to the quietest frame within ±60ms (not before previous cut)
        w0=max(int(lo_lim*200),fa-12); w1=min(fa+12,fb)
        fa=w0+int(np.argmin(db[w0:w1+1]))
        w0=max(fb-12,fa+1); w1=min(int(hi_lim*200),fb+12,n-1)
        fb=w0+int(np.argmin(db[w0:w1+1]))
        s=x[fa*hop:fb*hop].copy()
        fi=int(SR*0.008); fo=int(SR*0.04)
        s[:fi]*=np.linspace(0,1,fi); s[-fo:]*=np.linspace(1,0,fo)
        tmp=f"{OUT}/{k}.f32"; s.tofile(tmp); np.tile(s,max(1,int(np.ceil(1.6/(len(s)/SR))))).tofile(tmp+".m")
        # two-pass-ish: loudnorm single pass to -10 LUFS, TP -1
        import re
        m=subprocess.run(["ffmpeg","-hide_banner","-f","f32le","-ar",str(SR),"-ac","1","-i",tmp+".m","-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
        I=float(re.findall(r"I:\s+(-?[\d.]+) LUFS",m)[-1]); g=-8.5-I
        subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i",tmp,
            "-af","volume=%.2fdB,alimiter=limit=0.79:attack=1:release=40:level=disabled"%g,"-c:a","aac","-b:a","128k",f"{OUT}/{k}.m4a"],check=True)
        import os; os.remove(tmp); os.remove(tmp+".m")
        report.append((k,name,fa/200,fb/200))
for r in report: print("%s %-9s %6.2f-%6.2f (%.2fs)"%(r[0],r[1],r[2],r[3],r[3]-r[2]))
