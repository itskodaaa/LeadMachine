import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const TARGETS = [
  { id: 4772, name: "A's Custom Welding Fabrication", url: 'https://ascustomwelding.com/' },
  { id: 4773, name: 'Alpine Sheet Metal Systems', url: 'https://www.alpinesheetmetalsystems.com/contact/' },
  { id: 4774, name: 'La Fragua Metal Works LLC', url: 'https://lafraguametalworks.com/' },
  { id: 4775, name: 'Integrus Fabrication', url: 'https://www.integrusfab.com/contact-us' },
  { id: 4776, name: 'Baldwin Metals Inc', url: 'https://baldwinmetals.com/contact/' },
  { id: 4777, name: 'Metals 4 U', url: 'https://www.metals4u.com/contact-us/' },
  { id: 4778, name: 'Metalrite Inc', url: 'http://metalrite.com/' },
  { id: 4779, name: 'Monarch Metal Inc.', url: 'https://www.monarchmetal.com/resources/locations/' },
  { id: 4780, name: 'Zahner Dallas Manufacturing Facility', url: 'https://azahner.com/contact/' }
];

async function deepInspect() {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const target of TARGETS) {
    console.log(`\n================== [Lead #${target.id}] ${target.name} ==================`);
    console.log(`Navigating to: ${target.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Title: ${title} | Final URL: ${currentUrl}`);

      const formData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => {
            const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : el.closest('label')?.innerText;
            return {
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              label: label ? label.trim() : '',
              value: el.value,
              required: el.required
            };
          });
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], [data-sitekey]');
          const hasHcaptcha = !!f.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
          const hasTurnstile = !!f.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
          return {
            index: i,
            id: f.id,
            action: f.action,
            method: f.method,
            hasRecaptcha,
            hasHcaptcha,
            hasTurnstile,
            inputs
          };
        });
      });

      console.log(`Forms found (${formData.length}):`);
      console.log(JSON.stringify(formData, null, 2));

      // Also check if there's text/email on the page
      const emails = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        return matches ? Array.from(new Set(matches)) : [];
      });
      console.log('Emails found:', emails);

    } catch (e) {
      console.error(`Error on ${target.url}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

deepInspect();
