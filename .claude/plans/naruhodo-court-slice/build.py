import sys,os,json; sys.path.insert(0,'scratchpad/court_tools')
from split import *
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
def key(c,bg,tol=45,fringe=120,iters=2,**_):
    """flood-fill key: only background-coloured pixels connected to the frame border become transparent
    (sprite shading that happens to be lavender stays opaque), then peel bg-tinted fringe pixels off the edge."""
    c=c.copy(); h,w=c.shape[:2]
    d=np.abs(c[...,:3].astype(int)-np.array(bg)).sum(-1)
    cand=d<=tol; out=np.zeros((h,w),bool)
    st=[(y,x) for y in range(h) for x in (0,w-1) if cand[y,x]]+[(y,x) for x in range(w) for y in (0,h-1) if cand[y,x]]
    for q in st: out[q]=True
    while st:
        y,x=st.pop()
        for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0<=ny<h and 0<=nx<w and cand[ny,nx] and not out[ny,nx]: out[ny,nx]=True; st.append((ny,nx))
    # enclosed pockets of pure background (gap between arm and body): tight colour match + big enough
    inner=(d<=28)&~out
    for (y0,x0,y1,x1,n) in components(inner,min_px=12):
        sub=inner[y0:y1,x0:x1]
        # re-flood inside the bbox to mark just this component
        seed=next(((y,x) for y in range(y0,y1) for x in range(x0,x1) if inner[y,x] and not out[y,x]),None)
        if seed is None: continue
        st=[seed]; out[seed]=True
        while st:
            y,x=st.pop()
            for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if 0<=ny<h and 0<=nx<w and inner[ny,nx] and not out[ny,nx]: out[ny,nx]=True; st.append((ny,nx))
    for _ in range(iters):
        nb=np.zeros_like(out); nb[1:]|=out[:-1]; nb[:-1]|=out[1:]; nb[:,1:]|=out[:,:-1]; nb[:,:-1]|=out[:,1:]
        out|=nb&(d<=fringe)
    c[...,3]=np.where(out,0,255).astype(np.uint8); return c
def webp(path,arr,lossless=True,q=88):
    h,w=arr.shape[:2]
    args=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{w}x{h}','-i','-','-c:v','libwebp']
    args+=['-lossless','1'] if lossless else ['-quality',str(q)]
    args+=['-frames:v','1',path]
    subprocess.run(args,input=np.ascontiguousarray(arr).tobytes(),check=True)
def anchor_x(c):
    rgb=c[...,:3].astype(int); h=c.shape[0]
    tie=(rgb[...,0]>170)&(rgb[...,1]<90)&(rgb[...,2]>60)&(rgb[...,2]<150)&(c[...,3]>200)
    tie[:int(h*0.45)]=False
    xs=np.nonzero(tie)[1]
    if len(xs)>20: return int(round(np.median(xs)))
    al=c[...,3]>128; rows=np.nonzero(al.any(1))[0]; bot=al[rows[-1]-3:rows[-1]+1].any(0); xs=np.nonzero(bot)[0]
    return int(xs[0]) if len(xs) else 0
def atlas(name,sheet,bg,anims):
    """anims: list of (animName, [frame boxes], fps, loop)"""
    strips=[]; meta={}; AX={}
    for an,boxes,fps,loop in anims:
        fr=[key(sheet[b[0]:b[2],b[1]:b[3]],bg)[:-2] for b in boxes]
        ax=[anchor_x(f) for f in fr]; A=max(ax)
        W=max(A-ax[i]+f.shape[1] for i,f in enumerate(fr)); H=max(f.shape[0] for f in fr)
        st=np.zeros((H,W*len(fr),4),np.uint8)
        for i,f in enumerate(fr):
            ox=i*W+A-ax[i]; st[H-f.shape[0]:,ox:ox+f.shape[1]]=f
        strips.append((an,st,W,H,len(fr),fps,loop)); AX[an]=A
    TW=max(s[1].shape[1] for s in strips); TH=sum(s[3] for s in strips)
    at=np.zeros((TH,TW,4),np.uint8); y=0
    for an,st,W,H,n,fps,loop in strips:
        at[y:y+H,:st.shape[1]]=st; meta[an]={'y':y,'w':W,'h':H,'n':n,'fps':fps,'loop':loop,'ax':AX[an]}; y+=H
    webp(f'{OUT}/{name}.webp',at); json.dump(meta,open(f'{OUT}/{name}.json','w'),indent=0)
    print(name,at.shape)

# ---- Phoenix ----
ph=load('images/1.webp'); PB=json.load(open('scratchpad/court_tools/out/ph_boxes.json'))
R=lambda r,a=0,b=None: PB[r][a:b]
atlas('naruhodo',ph,(181,163,213),[
 ('idle',R(0,0,4),6,1),('talk',R(0,4,8),10,1),
 ('nervous',R(1,0,4),6,1),('nervousShut',R(1,4,8),6,1),('nervousTalk',R(1,8,12),10,1),
 ('think',R(2),6,1),('thinkTalk',R(3,0,4),10,1),('nod',R(3,4,8),10,0),
 ('shock',R(4),12,0),
 ('slam',R(5,0,1),1,0),('desk',R(5,1,4),6,1),('deskTalk',R(5,4,8),10,1),
 ('pointIn',R(6,0,2),10,0),('pointTalk',R(6,1,6),10,1),('point',R(7),6,1),
 ('paper',R(8,4,6),4,1),('paperTalk',R(8,0,4),10,1),
 ('confident',R(9,0,4),6,1),('confidentTalk',R(9,4,8),10,1),
 ('headDown',R(10),10,0),
 ('sheepish',R(11,0,4),6,1),('sheepishTalk',R(11,4,8),10,1),
 ('hitByObject',R(12),10,0),
 ('closeTalk',R(13,0,4),10,1),('close',R(13,4,8),6,1),
])
# ---- Judge ----
jd=load('images/7.png'); jm=mask_of(jd,(181,165,213))
JR=[(11,107),(136,232),(245,341),(369,465),(477,573),(600,696),(706,802),(834,930)]
JB=[[tuple(int(v) for v in b) for b in split_row(jm,y0,y1,116) if b[2]-b[0]>60] for y0,y1 in JR]
print('judge rows',[len(r) for r in JB])
atlas('judge',jd,(181,165,213),[
 ('idle',JB[0],6,1),('talk',JB[1],10,1),('shake',JB[2],10,0),('nod',JB[3],10,0),
 ('surprised',JB[4],6,1),('surprisedTalk',JB[5],10,1),('angry',JB[6],6,1),('angryTalk',JB[7],10,1),
])
# ---- scenes ----
s2=load('images/2.png'); P=lambda a,x: a[23:215,x:x+256]
webp(f'{OUT}/bg_wide.webp',P(s2,23)); webp(f'{OUT}/bg_judge.webp',P(s2,302)); webp(f'{OUT}/bg_cocounsel.webp',P(s2,581))
for nm,x in [('desk_defense',860),('stand_witness',1139),('desk_prosecution',1418)]:
    webp(f'{OUT}/{nm}.webp',key(P(s2,x),(18,103,35),tol=30,soft=30))
pan=s2[238:430,23:1319]; webp(f'{OUT}/bg_pan.webp',pan)
webp(f'{OUT}/bg_defense.webp',pan[:,0:256]); webp(f'{OUT}/bg_witness.webp',pan[:,520:776]); webp(f'{OUT}/bg_prosecution.webp',pan[:,1040:1296])
s3=load('images/3.png')
for nm,x in [('ui_title',23),('ui_bottom',302),('ui_top',581),('ui_cross',860),('ui_talk',1139)]: webp(f'{OUT}/{nm}.webp',P(s3,x))
s4=load('images/4.png')
for i,x in enumerate([23,302,581,860,1139,1418]):
    c=P(s4,x); c=key(c,(24,189,56),tol=40,soft=40) if i in (1,2,3) else c
    webp(f'{OUT}/gavel_{i}.webp',c)
s6=load('images/6.png'); webp(f'{OUT}/lines_top.webp',P(s6,23)); webp(f'{OUT}/lines_bottom.webp',P(s6,302))
s5=load('images/5.png')
for nm,b in [('shout_objection',(9,5,192,261)),('shout_takethat',(211,9,400,260)),('shout_holdit',(419,12,597,251))]:
    webp(f'{OUT}/{nm}.webp',key(s5[b[0]:b[2],b[1]:b[3]],(153,217,234),tol=40,soft=30))
print('done')
