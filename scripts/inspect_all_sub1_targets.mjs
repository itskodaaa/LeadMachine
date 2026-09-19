import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4061, company: 'Coulomb Engineering Inc.', url: 'https://www.coulombengineeringinc.com/contact' },
  { id: 4062, company: 'WB ENGINEERING', url: 'https://wb-3d.com' },
  { id: 4063, company: 'Gables Engineering Inc', url: 'https://www.gableseng.com/contact/' },
  { id: 4064, company: "Let's prototype", url: 'https://letsprototype.com' },
  { id: 4065, company: 'Apex Engineering', url: 'https://thestructurals.com' },
  { id: 4066, company: 'Elite Power Up', url: 'https://elitepowerup.com' },
  { id: 4068, company: 'Fraga Engineers', url: 'https://www.fragaeng.com/contact' },
  { id: 4069, company: 'CEC Engineering Inc', url: 'https://www.cecenginc.com' },
  { id: 4070, company: '3FM CONSULTING', url: 'https://3fmengineering.com' },
  { id: 4071, company: 'GEM360 LLC', url: 'https://www.gem360llc.com/request-quote' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`[#${t.id}] ${t.company} -> ${t.url}`);
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

      // Navigate with domcontentloaded
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Wait extra 2s for client hydration
      await new Promise(r => setTimeout(r, 2000));

      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Page Title: "${title}" | URL: ${currentUrl}`);

      // Check if there is contact subpage link if on homepage
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|inquir|quote|get in touch/i.test(a.text) || /contact|quote/i.test(a.href));
      });
      if (contactLinks.length > 0) {
        console.log(`Contact Links:`, contactLinks.slice(0, 3));
      }

      // Check forms and inputs
      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        
        const details = forms.map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          class: f.className,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required,
            label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || ''
          }))
        }));

        // Also check standalone inputs outside forms (e.g. React/Vue/Wix)
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        }));

        return {
          formCount: forms.length,
          forms: details,
          allInputsCount: allInputs.length,
          allInputs: allInputs.slice(0, 10),
          captchas: captchas.map(c => c.className || c.src),
          iframes: iframes.filter(s => s.length > 0)
        };
      });

      console.log(`Form details:`, JSON.stringify(formDetails, null, 2));

    } catch (e) {
      console.log(`Error on #${t.id}: ${e.message}`);
    } finally {
      if (page) {
        try { await page.close(); } catch (_) {}
      }
    }
  }

  await browser.close();
}

run();
