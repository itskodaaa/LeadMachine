import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4902, name: 'Florida Industrial Solutions, LLC', url: 'https://www.shopfis.com' },
  { id: 4903, name: 'Advance Tool Company', url: 'https://advancetoolfla.com' },
  { id: 4904, name: 'Willett Precision Machining', url: 'https://www.willettprecision.com' },
  { id: 4905, name: 'VIM Tools', url: 'https://vimtools.com' },
  { id: 4906, name: 'Applied Industrial Technologies', url: 'https://applied.com' },
  { id: 4907, name: 'Bay Area Contractors Supply', url: 'https://bayareacontractorssupply.com' },
  { id: 4909, name: 'Coil Cutters', url: 'https://coilcutters.com' },
  { id: 4910, name: 'Grabber Construction Products - Tampa', url: 'https://www.grabberpro.com/ContactUs' },
  { id: 4911, name: 'Tampa Industrial Supply, LLC.', url: 'https://tampaindustrialsupply.com/contact.php' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
  });

  for (const lead of leads) {
    console.log(`\n============================`);
    console.log(`Checking #${lead.id} ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Loaded: ${currentUrl} | Title: ${title}`);

      // Check for captchas or security blocks
      const securityCheck = await page.evaluate(() => {
        const text = document.body ? document.body.innerText.toLowerCase() : '';
        const isWaf = text.includes('just a moment') || text.includes('attention required') || text.includes('cf-turnstile');
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
        const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { isWaf, hasRecaptcha, hasHcaptcha, hasTurnstile };
      });
      console.log('Security check:', securityCheck);

      // Check forms and contact links
      const pageInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const formDetails = forms.map((f, idx) => ({
          idx,
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));

        const links = Array.from(document.querySelectorAll('a[href]'))
          .filter(a => {
            const t = ((a.innerText || '') + ' ' + (a.getAttribute('href') || '')).toLowerCase();
            return t.includes('contact') || t.includes('quote') || t.includes('touch');
          })
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }));

        return { formDetails, links: links.slice(0, 5) };
      });

      console.log(`Found ${pageInfo.formDetails.length} forms:`, JSON.stringify(pageInfo.formDetails, null, 2));
      console.log(`Contact links:`, pageInfo.links);

    } catch (e) {
      console.log(`Error on #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
