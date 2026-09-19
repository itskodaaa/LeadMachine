import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const pagesToInspect = [
  { id: 4853, company: 'World Industrial Products Inc', url: 'https://worldindustrialproducts.com/contact/' },
  { id: 4855, company: 'ETS Rentals & Repairs', url: 'https://etsrentals.com/contact-us/' },
  { id: 4857, company: 'The Nanz Company', url: 'https://www.nanz.com/contact-us/' },
  { id: 4860, company: 'Smith Hamilton', url: 'https://smithhamiltonfl.com/contact/' },
  { id: 4861, company: "Pablo's Machine Shop & Welding Corporation", url: 'https://www.pablosmachineshopmedley.com/contact-us' },
  { id: 4862, company: 'I & C Electrical Contracting Services', url: 'https://www.electricalgeneratortampa.com/contact-us' },
  { id: 4863, company: 'Electrical Masters by MJR, Inc.', url: 'https://electricalmastersinc.com/contact-us/' },
  { id: 4864, company: 'Elkins Electric', url: 'https://elkinselectric.com/' },
  { id: 4865, company: 'Rustic Steel', url: 'https://rusticsteel.com/pages/contact-us' },
  { id: 4866, company: 'Metalcraft Services Of Tampa, LLC.', url: 'https://www.metalcraftservices.com/' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const item of pagesToInspect) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log(`\n=== Inspecting Lead #${item.id}: ${item.company} (${item.url}) ===`);
    try {
      const res = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`HTTP Status: ${res ? res.status() : 'null'}`);
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => {
          return {
            id: f.id,
            action: f.action,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              tagName: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required,
              visible: i.offsetParent !== null
            })),
            submitButtons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim())
          };
        });

        const recaptchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')).map(el => el.outerHTML.slice(0, 100));

        return {
          title: document.title,
          url: window.location.href,
          bodySnippet: document.body.innerText.slice(0, 300).replace(/\n+/g, ' '),
          forms,
          recaptchas
        };
      });

      console.log(JSON.stringify(info, null, 2));
    } catch (e) {
      console.error(`Error on #${item.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
