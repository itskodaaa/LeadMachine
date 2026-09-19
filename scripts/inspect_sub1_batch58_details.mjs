import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 912, name: 'Geo Precision Land Surveying', url: 'https://geoprecisionlandsurveying.com' },
    { id: 929, name: 'Precisione Auto Body', url: 'https://autobodyprecisione.com' },
    { id: 950, name: 'ATANE Consulting', url: 'https://ataneconsulting.com' },
    { id: 952, name: 'ACID US LLC', url: 'https://acidprojects.com' },
    { id: 953, name: 'Field Engineer', url: 'https://fieldengineer.com' },
    { id: 955, name: 'Cyborg Inc.', url: 'https://cyborg.co' },
    { id: 963, name: 'SnS Design', url: 'https://snsdesign.com' }
  ];

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Inspecting Lead #${t.id} ${t.name} (${t.url})...`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile');
        const contactLinks = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => /contact|inquire|quote|estimate/i.test(l.text) || /contact|inquire|quote|estimate/i.test(l.href));
        
        return {
          currentUrl: window.location.href,
          formsCount: forms.length,
          captchaCount: captchas.length,
          contactLinks: contactLinks.slice(0, 3),
          forms: forms.map(f => ({
            action: f.action,
            className: f.className,
            id: f.id,
            inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
              tag: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              text: i.innerText
            }))
          }))
        };
      });

      console.log(`Lead #${t.id} Info:`, JSON.stringify(info, null, 2));

    } catch (e) {
      console.error(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
