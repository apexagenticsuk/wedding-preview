#!/usr/bin/env python3
"""Make the optimised web images in assets/ from Dave's originals (downloaded read-only from his public Wix media URLs).
Usage: python3 tools/images.py <dir with originals>   (originals are not stored in this repo; see docs/AUDIT.md for the media ids)"""
import sys,os,glob
from PIL import Image,ImageOps
O=sys.argv[1] if len(sys.argv)>1 else '/workspace/wedding/audit/orig'
A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets')
def find(prefix):
    g=glob.glob(os.path.join(O,prefix+'*'));assert g,prefix;return g[0]
def save(im,name,q=78):
    im.save(os.path.join(A,name),'WEBP',quality=q,method=6);print(name,im.size,os.path.getsize(os.path.join(A,name))//1024,'KB')
def load(p):
    im=Image.open(find(p));im=ImageOps.exif_transpose(im)
    return im.convert('RGB') if im.mode not in('RGB',) else im
def fit(im,w,h=None,focus=(0.5,0.5)):
    if h: return ImageOps.fit(im,(w,h),Image.LANCZOS,centering=focus)
    r=w/im.width;return im.resize((w,round(im.height*r)),Image.LANCZOS)
def wide(im,w):
    return fit(im,w) if im.width>w else im
# name: (original id prefix, [(suffix,width,height|None,focus)], quality)
M={
 'hero':('c41c5f_88ba7269',[('_1200',1200,None,None),('_700',700,None,None)],74),
 'crowd':('c41c5f_5c19e2ca',[('',600,None,None)],78),
 'fun':('c41c5f_c3e6ca3f',[('',740,None,None),('_480',480,None,None)],78),
 'couple':('c41c5f_4de8f16c',[('',800,None,None),('_480',480,None,None)],76),
 'videos_bg':('c41c5f_e134575c',[('',1200,None,None)],70),
 'glasses':('120d097d',[('',1600,None,None),('_800',800,None,None)],62),
 'rings':('53a2b303',[('',700,None,None)],70),
 'frame':('c41c5f_78dc694b',[('',640,None,None)],78),
 'car':('c41c5f_f69feb6c',[('',560,None,None)],80),
 'banner':('c41c5f_c7f6cc55',[('',1200,None,None),('_700',700,None,None)],82),
}
G=[('c41c5f_cf62d7bb',(0.5,0.35)),('c41c5f_68ffdd9f',(0.5,0.3)),('c41c5f_e1349df8',(0.5,0.4)),('62f4a29a',(0.5,0.4)),('c41c5f_963151aa',(0.5,0.4)),('ca7f195e',(0.5,0.4))]
AV=['c41c5f_37773321','c41c5f_68f150f7','c41c5f_d7596a2c','c41c5f_0709c69a','c41c5f_22e50fd6','c41c5f_e6e0fe1e','c41c5f_84674e41','c41c5f_615f2e0a']
AVN=['billy_connolly','jonathan_ross','miriam','westlife','pat_kenny','franc','michael_buble','saturday_night']
AFOC={'billy_connolly':(0.5,0.3),'jonathan_ross':(0.5,0.35),'miriam':(0.5,0.3),'westlife':(0.5,0.35),'pat_kenny':(0.5,0.3),'franc':(0.5,0.3),'michael_buble':(0.5,0.3),'saturday_night':(0.5,0.25)}
TA={'mary':'c41c5f_88ba7269','susan':'c41c5f_c660647e','sean':'c41c5f_9c84770c','johnrita':'c41c5f_b28d5a00','morris':'c41c5f_6408343d','jeremy':'c41c5f_529d1e03','connor':'c41c5f_5c19e2ca','kaya':'c41c5f_a74d7bf9','geraldine':'c41c5f_4de8f16c','jim':'c41c5f_352f5bb0'}
BL={'wedding_show':'c41c5f_ef23a699','brides_choice_nominated':'c41c5f_8a01b269','brides_choice_winner':'c41c5f_ff0b4eeb','citywest':'c41c5f_56cb9efe','bride_of_the_year':'c41c5f_86003a4b','honeymoon_show':'c41c5f_6a66721b','honeymoon_rds':'c41c5f_3922f0df','forever_young':'c41c5f_9fee978e','unforgettable':'c41c5f_abdb83f4','reception_laughter':'c41c5f_4ecbd13d'}
def main():
    for k,(p,vs,q) in M.items():
        im=load(p)
        for suf,w,h,f in vs: save(wide(im,w) if not h else fit(im,w,h,f or (0.5,0.5)),f'{k}{suf}.webp',q)
    for i,(p,f) in enumerate(G,1): save(wide(load(p),640),f'gallery_{i}.webp',76)
    for p,n in zip(AV,AVN): save(fit(load(p),160,160,AFOC[n]),f'av_{n}.webp',78)
    for n,p in TA.items(): save(fit(load(p),120,120,(0.5,0.35)),f'rv_{n}.webp',80)
    save(fit(load('c41c5f_e6e0fe1e'),120,120,(0.5,0.3)),'rv_franc.webp',80)
    for n,p in BL.items(): save(wide(load(p),454),f'blog_{n}.webp',80)
    for v in ['HMX01IPn8Pc','CaZVC3OfLpo','1h0IttQTLRI','WL2Fnn3lwGA','XmhCEtHtXkM','AM0VQBR10wU','H6mMF-nWVpY']:
        im=Image.open(os.path.join(O,f'yt_{v}.jpg')).convert('RGB');save(fit(im,640,360),f'yt_{v}.webp',72)
    b=load('c41c5f_c7f6cc55');bg=Image.new('RGB',(1200,630),(251,246,239));t=wide(b,1100);bg.paste(t,((1200-t.width)//2,(630-t.height)//2));bg.save(os.path.join(A,'og.jpg'),quality=82)
if __name__=='__main__':main()
