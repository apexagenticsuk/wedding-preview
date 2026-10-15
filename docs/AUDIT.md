# Audit of https://theweddingcomedian.ie (Wix) — 15 Oct 2026

Method: public pages only, fetched read-only with a headless browser (rendered DOM, because Wix renders content with script) plus `curl` for `sitemap.xml`, `pages-sitemap.xml`, `blog-posts-sitemap.xml`. No login, no form submitted, nothing changed. `[x]` = rebuilt in this preview, `[~]` = rebuilt with a deliberate change, `[-]` = deliberately not rebuilt (reason given).

## Site-wide
- [x] Brand: "The Wedding Comedian" (Dave Young, Young1Productions)
- [~] Nav on every page: HOME, VIDEOS, TESTIMONIALS, CONTACT, DAVE YOUNG (external, http://www.daveyounglive.com/), BLOG. Preview adds FAQS (the live site has a /faqs page that is in the sitemap but not in the menu).
- [x] "Book Today" button (live: links to /contact). Preview: "Enquire" button on every page (see Contact).
- [x] Footer: "2026 Young1Productions | T: +353 (0)872616317 | E: info@theweddingcomedian.ie"
- [x] Socials (icon-only on live): TikTok https://www.tiktok.com/@theweddingcomedian , Facebook https://www.facebook.com/theweddingcomedian , Instagram https://www.instagram.com/theweddingcomedian/
- [-] `/blog-feed.xml` (RSS feed; Wix feature, only a title and the blog link).

## Pages found (pages-sitemap.xml lists 8)
| Live URL | In menu | Preview page |
|---|---|---|
| `/` Home | yes | `index.html` |
| `/videos` | yes | `videos.html` |
| `/testimonials` | yes | `testimonials.html` |
| `/contact` | yes | `contact.html` |
| `/blog` + 13 posts | yes | `blog.html` |
| `/faqs` | **no** (hidden, still public) | `faqs.html` |
| `/map` | no | **not rebuilt**: Wix template placeholder ("500 Terry Francois Street, San Francisco", "info@mysite.com", "123-456-7890", opening hours). Not Dave's content. |
| `/book-online` and 10 `/service-page/*` | no | **not rebuilt**: Wix Bookings template leftovers (Full Mani-Pedi, Haircut, Oxygen Facial… in US dollars). Not Dave's content. |

## Home (`/`)
Title: "Wedding | entertainment | ideas | Wedding entertainment | wedding comedian". Meta description: "Award winning wedding entertainment. The funniest comedian on the planet! Email: info@theweddingcomedian.ie Tel: +353 (0) 872616317".
- [x] H1 "The Wedding Comedian" + banner artwork (`WEDDING COMEDIAN.png`, "Comedian — multi award winning comedian")
- [x] "A little taste..." YouTube `HMX01IPn8Pc` (live: autoplay, muted, loop) + "More Videos" button
- [x] "Make your big day unforgettable!" intro (4 paragraphs)
- [~] "You asked..." Q&A (8 items) — on live Home **and** `/faqs`. Preview keeps one copy, on `faqs.html`; Home points to it.
- [x] "There's something about Dave!" — 8 celebrity/TV quotes with avatars: Billy Connolly, Jonathan Ross, The Miriam Show (RTE), Westlife, Pat Kenny (NEWSTALK & UTV), Wedding By Franc (RTE), Michael Buble, The Saturday Night Show (RTE). Several are clearly jokes; copied word for word (see report note). The Franc text is identical to his testimonial, so it is kept once (testimonials, with the avatar).
- [x] "It's all about the... F U N": F is for Family, U is for Unbelivable (sic, kept), N is for Naughty + Kipling / "UN Peace Tactics" prose (8 paragraphs) + second video `CaZVC3OfLpo` + "More Videos"
- [~] "And they said..." 3 testimonials (Mary McNally, John & Rita Crawford, Susan Clarke): same three are on /testimonials. Preview shows them on Home only and the rest on Testimonials (each review once).
- [x] "Say Hello to my little friends..." 6 photos with captions (opera singers, Donny Osmond, Westlife, Planet Hollywood Germany 2010, Michael Bublé…) + intro line
- [~] "Enquiry Form" section (contact box + form) at the bottom of Home — preview: Enquire button/section instead; the form lives on Contact only.

## FAQs (`/faqs`, also in Home) — 8 items, verbatim
- [x] Price & Availability (fees per enquiry; location and date matter; **no prices published**)
- [x] Start time / length: standard performance **one hour**, start time chosen by the couple, usually after the meal and before the band
- [x] Based in **Wicklow**; travels all over **Ireland, UK and Spain**
- [x] Older guests will enjoy it
- [x] **Own sound and lighting crew**; set-up discreetly before the meal; under 15 minutes; guests usually stay in the room
- [x] Best man revenge: info gathered beforehand
- [x] How to enquire: phone, email or short form; videos
- [x] **Deposit €200 due within ten working days of booking; agreed balance collected on the night, or on a monthly basis if preferred; formal confirmation sent.**
- Intro text and "Ask A Question" button (links to Contact/enquiries) [x]

## Videos (`/videos`) — "Sample the fun!" (H2 "Wedding comedy")
Five YouTube embeds (autoplay off). Titles matched to videos by on-page position (checked with element coordinates):
- [x] `1h0IttQTLRI` — "You Found the Perfect Guy... / The Best Man in the funniest way..."
- [x] `XmhCEtHtXkM` — "Have the time of your life! / It's all about the fun!"
- [x] `WL2Fnn3lwGA` — "Oh Mandy! / 4 men, 1 love song and some dance moves... what could go wrong?..."
- [x] `AM0VQBR10wU` — "Dave Young Laugh Harder / Always great fun with Dave Young..."
- [x] `H6mMF-nWVpY` — **no heading on the live page**; preview uses YouTube's own public title "Add a Little Laughter to Your Happily Ever After!" (flagged)
- [x] "Book Today" button

## Testimonials (`/testimonials`) — "Read all about him! / Some Kind Words..." — 11, verbatim
- [x] Mary McNally (Mother of the Bride) · Susan Clarke · Franc - Weddings by Franc (Wedding Event Designer) · Sean O Reilly (Groom) · John & Rita Crawford (Bride & Groom) · Morris Dillon (Father Of The Bride) · Jeremy & Susan Cunningham (Bride & Groom) · Connor & Ellen Nolan (Bride & Groom) · Kaya & Simon West · Geraldine & David Wallis · Father Jim Morris
- [x] Round photo per testimonial (Dave's own). No form on the page.

## Contact (`/contact`) — "Say I do!"
- [x] Intro: "Well, you made it here, time for some fun! …"
- [~] Enquiry form fields: name*, email, phone, wedding date*, wedding location, message*, SEND. **The live form posts to Wix's servers: not readable or reproducible.** Preview form opens the visitor's own email app with the details filled in, addressed to info@theweddingcomedian.ie (real, working, no server needed).
- [x] Contact box: "The Wedding Comedian — Available for your wedding in Ireland, Worldwide & Beyond! Tel: +353 87 2616317 · E-mail: info@theweddingcomedian.ie · Website: theweddingcomedian.ie"
- [x] "See you soon guys, You're in for a great time!"
- [x] Photos: framed "Book Now Before He's Taken!" artwork, "Just Married" car artwork

## Blog (`/blog`) — 13 posts (blog-posts-sitemap), 2016–2018
Dates are as printed on Wix. Views/comments/likes counters are visitor data and are **not** copied.
- [x] 2016-09-01 Wedding Entertainment Winner 2016 (Mrs2Be Brides' Choice) · 2016-09-20 Citywest Wedding Fair · 2016-10-02 Forever Young (Confetti Magazine interview) · 2017-01-26 The Bride of the Year Show RDS · 2017-06-08 The Wedding & Honeymoon Show RDS · 2017-06-29 Brides' Choice Awards · 2017-09-07 The Wedding & Honeymoon Show · 2017-09-21 The Wedding Journal Show 2017 · 2017-10-05 "Unforgettable & Fun!" · 2017-10-06 Did You Know? · 2017-10-25 Should you have a comedian entertain at your wedding? (XPOSÉ) · 2018-05-11 Fun Wedding Facts · 2018-10-11 Weddings Online Awards 2019
- Fun Wedding Facts: **no readable text** (the post is an image only, same picture as "Did You Know?") — kept as a title with that image, flagged.
- Post comment threads (counts shown on Wix): [-] not copied (visitor content, behind script).

## Payment / deposit
- The live site has no online payment method. The €200 deposit is described only in the FAQ ("We are very interested in looking into the possibility…"), and the preview shows it only there, word for word. The preview has no deposit buttons, section or editor (removed in round 3 at Dave's request).

## Unreadable / uncertain
- Wix form submission target (server side). Preview uses a mailto form.
- Comment threads, view counters, likes on the blog (not public content / not copied).
- Fun Wedding Facts post body (image only).
- Fifth video has no on-page heading.
- Home "Q&A" and the contact box are Wix widgets; text was read from the rendered DOM, so wording is as printed there (typos kept).
