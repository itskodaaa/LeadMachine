import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3383, name: 'Allana Buick & Bers, Inc.', url: 'https://abbae.com' },
  { id: 3384, name: 'Jormac Aerospace Dallas', url: 'https://jormac.com' },
  { id: 3385, name: 'Austin Bridge & Road Inc', url: 'https://austin-ind.com' },
  { id: 3387, name: 'ENFRA', url: 'https://enfrasolutions.com' },
  { id: 3388, name: 'MixTech, Inc.', url: 'https://mixtech.com' },
  { id: 3389, name: 'Industrial Inspection & Analysis', url: 'https://industrial-ia.com' },
  { id: 3391, name: 'Thompson Engineering', url: 'https://thompsonengineering.com' },
  { id: 3394, name: 'EJES Inc.', url: 'https://ejesinc.com' },
  { id: 3396, name: 'Hall Technologies', url: 'https://halltechav.com' },
  { id: 3397, name: 'Texas Industrial Infrastructure Services, LLC', url: 'https://texasiis.com' }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  for (const lead of leads) {
    console.log(`\n==================================================`);
    console.log(`[Lead #${lead.id}] ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    try {
      let resp;
      try {
        resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (err) {
        console.log(`Direct load failed: ${err.message}. Trying http / www...`);
        try {
          const fallback = lead.url.replace('https://', 'http://www.');
          resp = await page.goto(fallback, { waitUntil: 'domcontentloaded', timeout: 25000 });
        } catch (err2) {
          console.log(`Fallback failed: ${err2.message}`);
        }
      }

      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl} (Status: ${resp ? resp.status() : 'N/A'})`);

      // Evaluate page content, forms, links
      const pageData = await page.evaluate(() => {
        const title = document.title;
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
          return {
            formIdx: i,
            id: f.id,
            action: f.action,
            inputs,
            buttons,
            hasRecaptcha
          };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|quote|reach|get-in-touch|inquiry/i.test(a.text) || /contact|quote|reach/i.test(a.href));

        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return {
          title,
          forms,
          iframes: iframes.slice(0, 5),
          contactLinks: contactLinks.slice(0, 10),
          emails: Array.from(new Set(emails))
        };
      });

      console.log(`Title: ${pageData.title}`);
      console.log(`Emails found: ${JSON.stringify(pageData.emails)}`);
      console.log(`Forms found: ${pageData.forms.length}`);
      if (pageData.forms.length > 0) {
        console.log(`Forms detail:`, JSON.stringify(pageData.forms, null, 2));
      }
      console.log(`Contact links:`, JSON.stringify(pageData.contactLinks));

    } catch (e) {
      console.log(`Error processing lead #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectAll();
