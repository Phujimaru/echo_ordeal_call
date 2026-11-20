import sys,os; sys.path.insert(0,'scratchpad/court_tools')
from split import *
a=load('images/1.webp'); m=mask_of(a,(181,163,213))
ROWS=[(19,136,102),(151,263,88),(299,415,108),(432,554,105),(559,682,105),(705,813,148),(844,961,203),(984,1102,203),(1130,1254,137),(1270,1388,125),(1407,1523,103),(1554,1672,133),(1697,1814,103),(1838,1992,146)]
os.makedirs('scratchpad/court_tools/out',exist_ok=True)
allb=[]
for i,(y0,y1,w) in enumerate(ROWS):
    bs=split_row(m,y0,y1,w); bs=[tuple(int(v) for v in b) for b in bs if b[2]-b[0]>60]; allb.append(bs)
    print(i,len(bs),[ (b[3]-b[1],b[2]-b[0]) for b in bs])
    montage(a,bs,f'scratchpad/court_tools/out/ph_row{i:02d}.png')
import json; json.dump(allb,open('scratchpad/court_tools/out/ph_boxes.json','w'))
