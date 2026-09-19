import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4804, name: 'Columbia Marking Tools', url: 'https://www.columbiamt.com/Quote-Request.html' },
  { id: 4805, name: 'DLT Manufacturing', url: 'https://www.dltmanufacturing.com/contact-us' },
  { id: 4807, name: 'Metal Tech', url: 'https://metaltechcompany.com' },
  { id: 4808, name: 'Seven Star Tools', url: 'https://www.sevenstartools.com/contact-us' },
  { id: 4812, name: 'Snap Engineering Group', url: 'https://snapengineering.io/contact/' },
  { id: 4813, name: 'R.W. Smith Company', url: 'https://rwscompany.com/contact-us/' },
  { id: 4816, name: 'Martin Sprocket & Gear', url: 'https://www.martinsprocket.com/' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Inspecting #${t.id} ${t.name} -> ${t.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    try {
      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => {
        console.log(`Error navigating: ${e.message}`);
        return null;
      });
      console.log(`Response status: ${resp ? resp.status() : 'null'}`);
      console.log(`Final URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], .cf-turnstile, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')).map(c => c.outerHTML.slice(0, 150));

        // Also check if text says anything about email or phone
        const bodyText = document.body ? document.body.innerText : '';
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return { formCount: forms.length, forms, iframes, captchas, emails: [...new Set(emails)].slice(0, 5) };
      });

      console.log(`Forms found: ${info.formCount}`);
      if (info.forms.length > 0) {
        console.log(`Forms:`, JSON.stringify(info.forms, null, 2));
      }
      console.log(`Captchas:`, info.captchas);
      console.log(`Iframes:`, info.iframes);
      console.log(`Emails found:`, info.emails);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
