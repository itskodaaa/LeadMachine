import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const P = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.'
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST' || res.url().includes('email') || res.url().includes('form') || res.url().includes('service')) {
      console.log('NET:', res.url(), res.status());
      try { console.log('Body:', (await res.text()).slice(0, 300)); } catch (e) {}
    }
  });

  await page.goto('https://swscontracting.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking "CONTACT US NOW!"...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b => b.innerText.trim().includes('CONTACT US NOW'));
    if (btn) btn.click();
  });

  console.log('Waiting for modal to render...');
  await new Promise(r => setTimeout(r, 3500));

  const inputs = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
    return els.map(e => ({
      id: e.id,
      name: e.name,
      ph: e.placeholder,
      visible: e.offsetWidth > 0 && e.offsetHeight > 0,
      label: e.closest('label')?.innerText || e.parentElement?.innerText
    }));
  });
  console.log('Rendered inputs:', inputs);

  // If inputs are visible, type into them
  const visible = inputs.filter(i => i.visible);
  if (visible.length > 0) {
    for (const v of visible) {
      const lbl = (v.label || '').toLowerCase();
      if (v.id) {
        if (lbl.includes('name')) {
          await page.type(`#${v.id}`, P.fullName, { delay: 20 });
        } else if (lbl.includes('email')) {
          await page.type(`#${v.id}`, P.email, { delay: 20 });
        } else if (lbl.includes('phone')) {
          await page.type(`#${v.id}`, P.phone, { delay: 20 });
        }
      } else {
        await page.type('textarea', P.message, { delay: 10 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log('Submitting GoDaddy modal form...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const send = btns.find(b => b.innerText.trim().toLowerCase() === 'send');
      if (send) send.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const res = await page.evaluate(() => {
      return {
        alert: document.querySelector('[role="alert"], [data-aid*="SUCCESS"], .form-response')?.innerText,
        text: document.body.innerText.slice(0, 400)
      };
    });
    console.log('Modal submit result:', res);
  }

  await browser.close();
})();
