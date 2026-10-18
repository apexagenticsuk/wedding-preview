#!/usr/bin/env python3
"""Writes privacy.html from contact.html's header/footer and the two constants in content.js. Usage: python3 tools/make-privacy.py "<title suffix>"  (run from the site folder)"""
import re,sys,html
suffix=sys.argv[1]
js=open('content.js').read()
def const(n): return re.search(r'var %s="((?:[^"\\]|\\.)*)";'%n,js).group(1).replace('\\"','"')
note,ctrl=const('MAIL_PRIVACY'),const('MAIL_PRIVACY_CONTROLLER')
def mark(s):
    s=html.escape(s,quote=False);return re.sub(r'(\[[^\]]+\])',r'<mark class="ph">\1</mark>',s)
h=open('contact.html').read()
sub=lambda pat,rep:re.sub(pat,lambda m:rep,h,count=1)
h=sub(r'<title>.*?</title>','<title>Privacy notice | %s</title>'%suffix)
d='How the enquiry form on this site handles your details.'
h=sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="%s">'%d)
h=sub(r'<meta property="og:title" content="[^"]*">','<meta property="og:title" content="Privacy notice | %s">'%suffix)
h=sub(r'<meta property="og:description" content="[^"]*">','<meta property="og:description" content="%s">'%d)
a=h.index('<main');b=h.index('</main>')
main='''<main id="main" tabindex="-1">
<section class="phead"><div class="wrap"><p class="eyebrow">Privacy</p><h1>Privacy <span class="r">notice</span></h1></div></section>
<section class="enquire"><div class="wrap legalp">
<!-- DRAFT for Ben to check. Same words as MAIL_PRIVACY and MAIL_PRIVACY_CONTROLLER in content.js (a test checks this). [Square brackets] are PLACEHOLDERS still to be filled in; nothing here has been invented. -->
<p>'''+mark(note)+'''</p>
<p>'''+mark(ctrl)+'''</p>
<p><a class="ul" href="contact.html">Back to the contact page</a></p>
</div></section>
'''
h=h[:a]+main+h[b:]
h=re.sub(r' class="cur"','',h);h=h.replace(' aria-current="page"','')
open('privacy.html','w').write(h)
