# Enquiry form: switching on real sending (steps for Dave / Kane)

Nothing below has been done. The code is ready and tested against a stub sender. Until these steps are done and the site is redeployed, the
Cloudflare copy of the form shows an honest "could not be sent" message with a mailto link, and the GitHub Pages copy keeps the old mailto behaviour.

1. **Resend account** (free plan is enough for a few enquiries a month): https://resend.com . Create an API key with "Sending access" only.
2. **Verify a sending domain** in Resend (Domains, Add domain). Use a subdomain, e.g. `send.<yourdomain>` (so the main domain's email is untouched).
   Resend shows the exact DNS records to add at the domain's DNS host (typically an SPF TXT, a DKIM TXT, and an MX for bounces on the `send` subdomain).
   Copy them exactly from Resend's page, wait for "Verified". Optionally add a DMARC TXT record (`_dmarc`) as Resend suggests.
3. **Turnstile site** in the Cloudflare dashboard (Turnstile, Add site): widget mode Managed, hostname = the site's address
   (`wedding-preview-b6y.pages.dev` / `marta-preview.pages.dev`, and the real domain later). This gives a site key (public) and a secret key (private).
4. **Pages variables** (Cloudflare dashboard, the Pages project, Settings, Variables and Secrets), production:
   - plain text: `ENQUIRY_FROM` = `enquiries@send.<yourdomain>` (the verified sender), `TURNSTILE_SITEKEY` = the site key,
     optional `ENQUIRY_TO` (defaults to the site's info@ address).
   - secrets (encrypted): `RESEND_API_KEY`, `TURNSTILE_SECRET`. From a terminal instead: `wrangler pages secret put RESEND_API_KEY --project-name <project>` (it prompts; paste the value there).
5. **Redeploy** the site (`cloudflare/build.sh`, then `wrangler pages deploy`). Check `/api/enquiry-config` says `"configured":true`, then send one real test enquiry.
6. **Privacy text**: it is final wording from Ben, in ONE place, `ENQ_PRIVACY` in `content.js`; `privacy.html` repeats it (regenerate with `python3 tools/make-privacy.py <site> "<title suffix>"`
   after editing, or edit both; `cloudflare/test/enquiry-unit.mjs` fails if they differ). Fill in the two [square bracket] placeholders (contact email; data controller name/address/email).

What is stored: a per-visitor counter under a salted hash of the IP address (KV key `enq:<hash>:<hour>`, expires in 2 hours, no name/email/message); nothing else. Message text is never logged.
Limits: 5 sends per IP per hour, 3 s minimum between page load and Send, message 5000 characters, 20 KB per request.
