import sys; sys.path.insert(0,'scratchpad/court_tools')
from imgio import *
from proj import runs
import numpy as np
def mask_of(a,bg,tol=60): return np.abs(a[...,:3].astype(int)-np.array(bg)).sum(-1)>tol
def split_row(m,y0,y1,w,colgap=3,minw=30):
    band=m[y0:y1]; col=band.sum(0); out=[]
    for x0,x1 in runs(col,1,colgap):
        W=x1-x0
        if W<minw: continue
        n=max(1,round(W/(w+5)))
        cuts=[x0]
        for i in range(1,n):
            c=x0+round(i*W/n); lo,hi=c-18,c+18
            j=lo+int(np.argmin(col[lo:hi])); cuts.append(j)
        cuts.append(x1)
        for a_,b_ in zip(cuts,cuts[1:]):
            sub=band[:,a_:b_]; rows=np.nonzero(sub.sum(1)>2)[0]; cs=np.nonzero(sub.sum(0)>0)[0]
            out.append((y0+int(rows[0]),a_+int(cs[0]),y0+int(rows[-1])+1,a_+int(cs[-1])+1))
    return out
def montage(a,boxes,path,bgc=(60,60,60)):
    H=max(b[2]-b[0] for b in boxes); W=sum(b[3]-b[1]+6 for b in boxes)
    can=np.zeros((H,W,4),np.uint8); can[...,:3]=bgc; can[...,3]=255; x=0
    for b in boxes:
        c=a[b[0]:b[2],b[1]:b[3]]; can[H-c.shape[0]:,x:x+c.shape[1]]=c; can[:,x+c.shape[1]:x+c.shape[1]+6,:3]=(255,0,0); x+=c.shape[1]+6
    save(path,can)
