import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4954, name: 'Helfrich Tool & Die', url: 'https://helfrichtool.com/contact-us.html' },
  { id: 4955, name: 'Husky Industries', url: 'https://huskyindustries.com/Contact.html' },
  { id: 4957, name: 'Prima Die Co Inc', url: 'https://primasales.com/contact-us' },
  { id: 4959, name: 'Bandel Manufacturing., Inc.', url: 'https://www.bandel.com/contact' },
  { id: 4960, name: 'Us Tool & Die', url: 'https://ustooldie.com/' },
  { id: 4961, name: 'L & L Tool & Die', url: 'https://lltool.com/contact-us/' },
  { id: 4962, name: 'Hollywood 3D Printing', url: 'https://hollywood3dprinting.com/get-a-quote' },
  { id: 4963, name: 'Stellar Products Inc', url: 'https://stellarprod.com/contact.htm' }
];

async function checkTargets() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      console.log(`\n========================================`);
      console.log(`Checking #${t.id} ${t.name}: ${t.url}`);
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Goto err:', e.message));

      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            className: el.className || '',
            text: el.innerText || el.value || '',
            isVisible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const text = document.body ? document.body.innerText.substring(0, 500).replace(/\s+/g, ' ') : '';
        const hasCaptcha = !!document.querySelector('.g-recaptcha, .h-captcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');

        return { forms, iframes, text, hasCaptcha };
      });

      console.log(`Forms found: ${details.forms.length}, Captcha: ${details.hasCaptcha}`);
      console.log(`Iframes: ${details.iframes.join(', ')}`);
      for (const f of details.forms) {
        console.log(`Form #${f.idx} (action: ${f.action}, id: ${f.id}):`);
        for (const inp of f.inputs) {
          if (inp.isVisible || inp.type === 'hidden') {
            console.log(`  - <${inp.tag} type="${inp.type}" name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"> text: ${inp.text}`);
          }
        }
      }
      if (details.forms.length === 0) {
        console.log('Page text snippet:', details.text);
      }
    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

checkTargets().catch(console.error);
