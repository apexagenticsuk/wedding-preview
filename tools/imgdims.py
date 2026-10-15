#!/usr/bin/env python3
"""Add width/height to every <img src="assets/..."> in the pages and write the dims map into content.json
(content.js uses it for images it renders), so images never cause layout shift."""
import re,json,os,glob,sys
from PIL import Image
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
cj=json.load(open('content.json'))
cache={}
def dim(src):
    src=src.split('?')[0]
    if src in cache: return cache[src]
    d=None
    if src.startswith('assets/') and os.path.exists(src):
        try:
            with Image.open(src) as im: d=list(im.size)
        except Exception: d=None
    cache[src]=d;return d
srcs=set(re.findall(r'assets/[\w\-./]+\.(?:jpg|jpeg|png|webp|gif)',open('content.json').read()))
for p in glob.glob('*.html'):
    s=open(p).read()
    srcs|=set(re.findall(r'assets/[\w\-./]+\.(?:jpg|jpeg|png|webp|gif)',s))
    def f(m):
        a,src,b=m.group(1),m.group(2),m.group(3)
        if re.search(r'\swidth=',a+b) or 'class="lite' in a: return m.group(0)
        d=dim(src)
        return m.group(0) if not d else '<img%s src="%s"%s width="%d" height="%d">'%(a,src,b,d[0],d[1])
    n=re.sub(r'<img\b([^>]*?)\ssrc="([^"]+)"([^>]*)>',f,s)
    if n!=s: open(p,'w').write(n)
dims={s:dim(s) for s in sorted(srcs) if dim(s) and not s.startswith('assets/yt_')}
if cj.get('dims')!=dims:
    cj['dims']=dims
    open('content.json','w').write(json.dumps(cj,indent=2,ensure_ascii=False)+'\n')
print('imgdims:',len(dims),'images')
