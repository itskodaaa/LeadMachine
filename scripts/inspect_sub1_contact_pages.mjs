import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const testPages = [
  { id: 4169, url: 'https://criterium-yancy.com/contact' },
  { id: 4169, url2: 'https://criterium-yancy.com/rfp/' },
  { id: 4170, url: 'https://momentumtx.com/contact.php' },
  { id: 4173, url: 'https://www.anvileng.com/contact' },
  { id: 4174, url: 'http://structural.nu' },
  { id: 4175, url: 'https://www.fifengineering.com/contact-us' },
  { id: 4176, url: 'https://www.imaginationeering.com/contact' },
  { id: 4177, url: 'https://www.walkertx.com/contact/' },
  { id: 4179, url: 'https://randbgroup.com/contact.html' }
];

async function inspectContactPages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of testPages) {
    const targetUrl = item.url || item.url2;
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${item.id}: ${targetUrl}`);
    const page = await browser.newPage();
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => console.log('Navigation warning:', e.message));
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      const bodySnippet = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
      console.log('Body snippet:\n', bodySnippet);

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, idx) => {
          const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
            label: (el.closest('label')?.innerText || document.querySelector(`label[for="${el.id}"]`)?.innerText || el.closest('.form-group, .gfield, .wpforms-field, div')?.querySelector('label')?.innerText || '').trim()
          }));
          const submitBtn = f.querySelector('button, input[type="submit"], input[type="button"]');
          return {
            formIdx: idx,
            id: f.id,
            action: f.action,
            fields,
            submitText: submitBtn ? (submitBtn.innerText || submitBtn.value) : null
          };
        });
      });

      console.log('Forms found:', JSON.stringify(forms, null, 2));

      // Captchas?
      const captchas = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'))
          .map(el => el.outerHTML.slice(0, 200));
      });
      if (captchas.length > 0) {
        console.log('CAPTCHAs detected:', captchas);
      }

    } catch (e) {
      console.log(`Error on ${targetUrl}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectContactPages();
