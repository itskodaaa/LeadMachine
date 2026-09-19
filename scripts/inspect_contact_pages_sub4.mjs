import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const pagesToCheck = [
  { id: 1206, name: 'Covey Machine', url: 'https://coveymachine.com/contact.htm' },
  { id: 1209, name: 'Hopkins Machine', url: 'http://hopkinsmachine.com' },
  { id: 1210, name: 'K C Precision', url: 'https://www.kcmach.com/contact/' },
  { id: 1210, name: 'K C Precision Quote', url: 'https://www.kcmach.com/quote/' },
  { id: 1213, name: 'Machining Systems', url: 'https://www.machiningsystemscorp.com/contact-us/' },
  { id: 1214, name: 'Industrial Maintenance Welding', url: 'https://imwnet.com/contact-us/' },
  { id: 1220, name: 'M&R Precision', url: 'https://mrprecision.com/contact-us/' },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--window-size=1280,800'
    ]
  });

  for (const item of pagesToCheck) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${item.id}: ${item.name} (${item.url})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`HTTP status: ${response ? response.status() : 'null'}, URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const info = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form'));
        const formDetails = forms.map((f, i) => {
          const action = f.getAttribute('action') || '';
          const method = f.getAttribute('method') || '';
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => {
            return {
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || '',
              name: el.getAttribute('name') || '',
              id: el.getAttribute('id') || '',
              placeholder: el.getAttribute('placeholder') || '',
              required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true'
            };
          });
          return { index: i, action, method, inputCount: inputs.length, inputs };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(el => ({
          tag: el.tagName,
          src: el.getAttribute('src') || '',
          cls: el.className || '',
          sitekey: el.getAttribute('data-sitekey') || ''
        }));

        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return {
          textLength: bodyText.length,
          snippet: bodyText.slice(0, 400).replace(/\s+/g, ' '),
          emails: [...new Set(emails)],
          formCount: forms.length,
          formDetails,
          captchas
        };
      });

      console.log(`Text preview: ${info.snippet}`);
      console.log(`Emails: ${info.emails.join(', ')}`);
      console.log(`Forms found: ${info.formCount}`);
      if (info.formCount > 0) {
        console.log(`Forms info:`, JSON.stringify(info.formDetails, null, 2));
      }
      if (info.captchas.length > 0) {
        console.log(`Captchas:`, info.captchas);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

main().catch(console.error);
