import sys; sys.path.insert(0,'scratchpad/court_tools')
from imgio import *
import numpy as np
def runs(v, thr, gap):
    idx=np.nonzero(v>thr)[0]
    if not len(idx): return []
    out=[[idx[0],idx[0]]]
    for i in idx[1:]:
        if i-out[-1][1]<=gap: out[-1][1]=i
        else: out.append([i,i])
    return [(a,b+1) for a,b in out]
def frames(a,bg,tol=60,rowthr=6,rowgap=2,colgap=3,minh=40,minw=30):
    d=np.abs(a[...,:3].astype(int)-np.array(bg)).sum(-1); m=d>tol
    res=[]
    for y0,y1 in runs(m.sum(1),rowthr,rowgap):
        if y1-y0<minh: continue
        band=m[y0:y1]
        for x0,x1 in runs(band.sum(0),1,colgap):
            if x1-x0<minw: continue
            sub=band[:,x0:x1]; ys=np.nonzero(sub.any(1))[0]
            res.append((int(y0+ys[0]),int(x0),int(y0+ys[-1]+1),int(x1)))
    return res
if __name__=='__main__':
    f,bg=sys.argv[1],tuple(map(int,sys.argv[2].split(',')))
    a=load('images/'+f)
    fr=frames(a,bg)
    row=None
    for b in fr:
        if b[0]//40!=row: row=b[0]//40; print()
        print(b, b[3]-b[1], b[2]-b[0], end=' | ')
