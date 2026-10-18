import re,sys,html
d,suffix=sys.argv[1],sys.argv[2]
p='/workspace/%s/site/'%d
js=open(p+'content.js').read()
txt=re.search(r'var ENQ_PRIVACY="((?:[^"\\]|\\.)*)";',js).group(1).replace('\\"','"')
sents=re.split(r'(?<=[.])\s+(?=[A-Z])',txt)
# paragraph groups at sentence boundaries (text unchanged)
groups=[sents[0:2],sents[2:5],sents[5:8],sents[8:10],sents[10:]]
assert sum(len(g) for g in groups)==len(sents),len(sents)
def mark(s):
    s=html.escape(s,quote=False)
    s=re.sub(r'(\[[^\]]+\])',r'<mark class="ph">\1</mark>',s)
    s=s.replace('dataprotection.ie','<a href="https://www.dataprotection.ie" rel="noopener">dataprotection.ie</a>').replace('ico.org.uk','<a href="https://ico.org.uk" rel="noopener">ico.org.uk</a>')
    return s
paras=''.join('<p>'+mark(' '.join(g))+'</p>' for g in groups)
h=open(p+'contact.html').read()
h=re.sub(r'<title>.*?</title>','<title>Privacy notice | %s</title>'%suffix,h,1)
h=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="How we use the details you send through the enquiry form.">',h,1)
h=re.sub(r'<meta property="og:title" content="[^"]*">','<meta property="og:title" content="Privacy notice | %s">'%suffix,h,1)
h=re.sub(r'<meta property="og:description" content="[^"]*">','<meta property="og:description" content="How we use the details you send through the enquiry form.">',h,1)
a=h.index('<main');b=h.index('</main>')
main='''<main id="main" tabindex="-1">
<section class="phead"><div class="wrap"><p class="eyebrow">Privacy</p><h1>Privacy <span class="r">notice</span></h1></div></section>
<section class="enquire"><div class="wrap legalp">
<!-- FINAL privacy text from Ben. It is the same text as ENQ_PRIVACY in content.js (a test checks this). [Square brackets] are PLACEHOLDERS still to be filled in; nothing here has been invented. -->
'''+paras+'''
<p><a class="ul" href="contact.html">Back to the contact page</a></p>
</div></section>
'''
h=h[:a]+main+h[b:]
h=h.replace(' class="cur"','',1) if 'href="contact.html" class="cur"' in h else h
open(p+'privacy.html','w').write(h)
print(d,len(h),len(sents))
