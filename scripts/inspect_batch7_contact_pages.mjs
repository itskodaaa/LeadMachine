import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const pagesToCheck = [
  { id: 2225, name: 'Sheet Metal Specialists', url: 'http://www.sheetmetalspecialists.com' },
  { id: 2230, name: 'Suri Steel', url: 'https://suristeel.com/contact/' },
  { id: 2233, name: 'Globe Stainless Inc', url: 'https://globestainless.com/contact/' },
  { id: 2236, name: 'Firm Designs', url: 'https://www.firmdesigns.us/contact' },
  { id: 2238, name: 'JC Mobile Welding', url: 'https://jcweldingrepair.com/contact-us/' },
  { id: 2246, name: 'America West Sheet Metal', url: 'http://americawestsheetmetal.com' },
  { id: 2249, name: 'Star Steel', url: 'https://starsteel.com/contact/' },
  { id: 2259, name: 'Macias Sheet Metal', url: 'https://www.maciassheetmetal.com/contact-us' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors']
  });

  for (const item of pagesToCheck) {
    console.log(`\n================== Checking #${item.id} ${item.name} (${item.url}) ==================`);
    const page = await browser.newPage();
    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Loaded URL:', page.url());
      console.log('Title:', await page.title());

      const data = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          className: f.className,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label')
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
        }));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          tagName: c.tagName,
          src: c.getAttribute('src'),
          sitekey: c.getAttribute('data-sitekey')
        }));

        const bodySnippet = document.body ? document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) : '';

        return { forms, captchas, bodySnippet };
      });

      console.log('Forms:', JSON.stringify(data.forms, null, 2));
      console.log('Captchas:', data.captchas);
      console.log('Body snippet:', data.bodySnippet);

    } catch (e) {
      console.log(`Error checking #${item.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
