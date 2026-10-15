# Coverage: live Wix site vs this preview

Source: the read-only Wix crawl in `audit/` (public pages and public media URLs only; no logins). Every row says where the live item is on the new site, or flags it as a gap. No text was invented. Where an image carries its own text, that text stays inside the image and the alt text only names or quotes what is visible.

## 1. Pages

| Live page | New site | Notes |
|---|---|---|
| `/` Home | `index.html` | Hero, facts strip, praise, videos, testimonials teaser, FAQ teasers, social links |
| `/videos` | `videos.html` | All 5 videos (section 3) |
| `/testimonials` | `testimonials.html` | All 11 testimonials with their photos, plus the live header photo strip |
| `/contact` | `contact.html` | Phone, email, `mailto:` enquiry form (no form back end, by design) and the two live photos |
| `/blog` | `blog.html` | All 13 posts (section 2) |
| `/post/...` x13 | `blog.html` | Posts are shown on one page, each in full |
| `/faqs` | `faqs.html` | All questions. The €200 deposit appears only as FAQ text, as live has it |
| "DAVE YOUNG" menu item | link to `https://daveyounglive.com` | Dave's own site, same as the live menu link |
| `/map` | not reproduced | Wix template leftover: "500 Terry Francois Street, San Francisco", `info@mysite.com`, `123-456-7890`. Not Dave's content |
| `/book-online` | not reproduced | Wix Bookings template leftover (Nails, Hair, Pedicure... priced in US$). Not Dave's content |
| `/service-page/haircut` | not reproduced | Template leftover ("Describe your service here...") |

## 2. Blog posts (13)

| Live post (date) | New site | Image |
|---|---|---|
| Weddings Online Awards 2019 (11 Oct 2018) | `blog.html` | `blog_awards_2019.webp` (live id 21bfb1bd). Image-only content: the text is in the picture |
| Fun Wedding Facts (11 May 2018) | `blog.html` | `blog_fun_facts.webp` (live id 3ed356ee). **Image-only post**: the live post has no text. Shown at full natural size with alt "Infographic: 10 Facts you didn't know about Weddings". The facts are only in the image and are not retyped |
| Should you have a comedian entertain at your wedding? (25 Oct 2017) | `blog.html` | `blog_xpose.webp` (live id 7737387b), full text |
| Did You Know? (6 Oct 2017) | `blog.html` | `blog_reception_laughter.webp` (live id 4ecbd13d), full text |
| "Unforgettable & Fun!" (5 Oct 2017) | `blog.html` | `blog_unforgettable.webp` |
| The Wedding Journal Show 2017 (21 Sep 2017) | `blog.html` | `blog_wedding_show.webp` |
| The Wedding & Honeymoon Show (7 Sep 2017) | `blog.html` | `blog_honeymoon_show.webp` |
| Brides' Choice Awards (29 Jun 2017) | `blog.html` | `blog_brides_choice_nominated.webp` |
| The Wedding & Honeymoon Show RDS (8 Jun 2017) | `blog.html` | `blog_honeymoon_rds.webp` |
| The Bride of the Year Show RDS (26 Jan 2017) | `blog.html` | `blog_bride_of_the_year.webp` |
| Forever Young (2 Oct 2016, Confetti Magazine) | `blog.html` | `blog_forever_young.webp` |
| Citywest Wedding Fair (20 Sep 2016) | `blog.html` | `blog_citywest.webp` |
| Wedding Entertainment Winner 2016 (1 Sep 2016) | `blog.html` | `blog_brides_choice_winner.webp` |

Blog images are shown at natural aspect (no cropping) at up to 740px wide. Checked at 390 and 1280 px wide: no distortion, no horizontal overflow.

## 3. Videos (5 on /videos, plus 2 on Home)

| Live video (YouTube id) | New site |
|---|---|
| `1h0IttQTLRI` "You Found the Perfect Guy..." | Videos page |
| `XmhCEtHtXkM` "Have the time of your life!" | Videos page |
| `WL2Fnn3lwGA` "Oh Mandy!" | Videos page |
| `AM0VQBR10wU` "Dave Young Laugh Harder" | Videos page |
| `H6mMF-nWVpY` (fifth video) | Videos page |
| `HMX01IPn8Pc` "A little taste..." (Home) | Home |
| `CaZVC3OfLpo` "It's all about the fun" (Home) | Home, in the FUN section |

Click-to-play thumbnails (no YouTube loaded until clicked). Live autoplays the first Home video muted; that behaviour is not copied.

## 4. Media assets (57 ids found on the live pages)

| Live media id | What it is | New site |
|---|---|---|
| c7f6cc55 | "WEDDING COMEDIAN" logo banner | Used as the social share image `og.jpg`. The header uses the text brand |
| 4b88b89f, 4057345b, 9bb36b96 | TikTok / Facebook / Instagram icons | Replaced by text/SVG links to the same three profiles |
| 9fee978e | "Love & Laughter with The Wedding Comedian" photo (Dave plus bride and groom) | **Home hero** (`hero_dave.webp`) and the Forever Young post |
| c3e6ca3f = 6f536b6f (identical files) | Dave pulling a tie, "Wedding entertainment" | Home FUN section (`fun.webp`) |
| 5c19e2ca | Wedding crowd laughing | Home (`crowd.webp`) and the Connor testimonial |
| 4de8f16c | Couple | Home (`couple.webp`) and a testimonial |
| 88ba7269, c660647e, 9c84770c, b28d5a00, 6408343d, 529d1e03, a74d7bf9, 352f5bb0, e6e0fe1e | Testimonial photos | `rv_*.webp` on Testimonials/Home, with a per-image focal point (`pos` in `content.json`, editable in Shared) |
| 37773321, 68f150f7, d7596a2c, 0709c69a, 22e50fd6, e6e0fe1e, 84674e41, 615f2e0a | Praise avatars (Billy Connolly, Jonathan Ross, Miriam, Westlife, Pat Kenny, Franc, Michael Bublé, Saturday Night) | `av_*.webp`, with focal points. The Franc avatar is the same photo as the Franc testimonial photo, so one file (`rv_franc.webp`) serves both |
| cf62d7bb, 68ffdd9f, e1349df8, 62f4a29a, 963151aa, ca7f195e | Gallery photos | `gallery_1..6.webp` |
| 78dc694b, f69feb6c | Contact page photos | `frame.webp`, `car.webp` on Contact |
| 0670ce60 | Testimonials page header photo strip | `testi_strip.webp`, under the Testimonials title (added this round) |
| 21bfb1bd, 3ed356ee, 7737387b, 4ecbd13d, abdb83f4, ef23a699, 6a66721b, 8a01b269, 3922f0df, 86003a4b, ff0b4eeb, 56cb9efe | Blog post images | Section 2 |
| 120d097d | Champagne glasses background | Closing-band background (`glasses_800.webp`) |
| e134575c, 80481c84, 2485ce42, b6bed347, 05ab5595 | Black-and-white laughing photos used as small link tiles and banners on live Home | **Not reproduced.** The links they carried (Videos, Testimonials, Contact) are in the normal menu and buttons |
| 53a2b303 | Wedding rings photo (live deposit/enquiry background) | **Not reproduced.** It only decorated the deposit area, which was removed this round |
| ee8fcaad | PNG of the tagline "wedding in Ireland, Worldwide & Beyond!" | Not reproduced as an image; the same words are live text on the site |
| bc3ec7bc, dba11f19 | 1920x1080 and other Wix background fills | **Not reproduced.** Decorative backgrounds only; the originals could not be re-fetched as plain images |
| 11062b_2042bb73 | Looping background MP4 (Book Online and FAQs) | **Not reproduced.** Decorative background video, heavy; flagged for Dave to decide |

## 5. Not reproduced or not possible

- **Wix form back end and submissions.** The form stays `mailto:` with the visible email, by instruction.
- **Blog comments, views and likes** (for example "2 Comments" on a post). Wix runtime data, not Dave's content.
- **Fun Wedding Facts text.** Image-only on live; shown as the image. Text inside the infographic is not retyped.
- **Awards 2019 image** is a graphic Dave published, with his satirical edits of public figures in picture frames. It is reproduced unchanged as Dave's own live image. Dave should confirm he wants it on the new site.
- **The small B&W link-tile photos, rings photo, background fills and background video** listed in section 4.
- **Template leftovers** (Map, Book Online, Haircut): not Dave's content, deliberately left out.
- **Wix Bookings / Pay online:** none in use; no payment link exists or was created.
