import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 2313, name: 'AXR Contracting', url: 'https://axrcontracting.com' },
  { id: 2314, name: 'M.A.B Construction', url: 'https://mabconstructionnc.com' },
  { id: 2316, name: 'Doerre Construction', url: 'https://doerreconstruction.com' },
  { id: 2317, name: 'Forshaw Construction', url: 'https://forshawconstruction.com' },
  { id: 2318, name: 'Foard Construction Co', url: 'https://foardconstruction.com' },
  { id: 2319, name: 'Matthews Construction', url: 'https://matthewsconstruction.com' },
  { id: 2320, name: 'Watershed Builders', url: 'https://watershedbuilders.com' },
  { id: 2321, name: 'Turner & Co Contractor', url: 'https://turnercocontractor.wixsite.com' },
  { id: 2324, name: 'Andrew Roby', url: 'https://andrewroby.com' }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n========================================\n[#${t.id}] ${t.name}: ${t.url}`);

    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
          .filter(l => /contact|quote|about|reach|inquir|estimate/i.test(l.text) || /contact|quote|rfq/i.test(l.href));
      });

      let targetUrl = page.url();
      const contactLink = links.find(l => /contact|quote|reach/i.test(l.text) || /contact|quote/i.test(l.href));
      if (contactLink && contactLink.href !== targetUrl) {
        try {
          await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
          targetUrl = page.url();
        } catch (e) {}
      }

      const formDetails = await page.evaluate(() => {
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          className: f.className,
          action: f.getAttribute('action'),
          method: f.getAttribute('method'),
          inputCount: f.querySelectorAll('input:not([type="hidden"]), textarea').length,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            type: i.type,
            required: i.required
          }))
        }));
        return { captchas, forms };
      });

      console.log(`URL: ${targetUrl}`);
      console.log(`Forms & Captchas:`, JSON.stringify(formDetails, null, 2));

    } catch (e) {
      console.log(`Failed #${t.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectAll().catch(console.error);
