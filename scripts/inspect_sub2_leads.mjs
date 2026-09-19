import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4853, company: 'World Industrial Products Inc', url: 'https://worldindustrialproducts.com/contact/' },
  { id: 4855, company: 'ETS Rentals & Repairs', url: 'https://etsrentals.com/' },
  { id: 4857, company: 'The Nanz Company', url: 'https://www.nanz.com/' },
  { id: 4860, company: 'Smith Hamilton', url: 'https://smithhamiltonfl.com/' },
  { id: 4861, company: "Pablo's Machine Shop & Welding Corporation", url: 'https://www.pablosmachineshopmedley.com/contact-us' },
  { id: 4862, company: 'I & C Electrical Contracting Services', url: 'https://electricalgeneratortampa.com' },
  { id: 4863, company: 'Electrical Masters by MJR, Inc.', url: 'https://electricalmastersinc.com/' },
  { id: 4864, company: 'Elkins Electric', url: 'https://elkinselectric.com/' },
  { id: 4865, company: 'Rustic Steel', url: 'https://rusticsteel.com/' },
  { id: 4866, company: 'Metalcraft Services Of Tampa, LLC.', url: 'https://www.metalcraftservices.com/' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log(`\n=== Inspecting Lead #${lead.id}: ${lead.company} (${lead.url}) ===`);
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => {
          return {
            id: f.id,
            name: f.name,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
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

        // check iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);

        // check recaptcha
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');

        // check contact links
        const contactLinks = Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|quote|reach|get-in-touch/i.test(a.innerText || a.href))
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }));

        return {
          title: document.title,
          formsCount: forms.length,
          forms,
          iframes,
          hasRecaptcha,
          contactLinks: contactLinks.slice(0, 5)
        };
      });

      console.log(JSON.stringify(info, null, 2));
    } catch (e) {
      console.error(`Error inspecting #${lead.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
