import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkActualContactPages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 2292, name: 'CLT Crown Construction', url: 'https://cltcrownconstruction.com/contact-us' },
    { id: 2293, name: 'JFK Construction', url: 'https://jfkconst.com/contact-us/' },
    { id: 2297, name: 'Morales Concrete', url: 'https://moralesconcretenc.com/contact/' },
    { id: 2299, name: 'Churchill Contracting', url: 'https://www.churchillcontracting.com/get-a-quote' },
    { id: 2300, name: 'Best Built Carpentry', url: 'https://www.bestbuiltcarpentry.com/#contact-us' }
  ];

  for (const t of targets) {
    const page = await browser.newPage();
    console.log(`\n==============================================`);
    console.log(`--- Checking #${t.id} ${t.name} at ${t.url} ---`);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          action: f.action,
          className: f.className,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            id: i.id,
            type: i.type,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(e => e.outerHTML.slice(0, 80));
        return { forms, captchas, text: document.body ? document.body.innerText.slice(0, 300) : '' };
      });
      console.log('Forms:', JSON.stringify(info.forms, null, 2));
      console.log('Captchas:', info.captchas);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
}

checkActualContactPages();
