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

  await new Promise(r => setTimeout(r, 1500));

  // Now inspect visibility of inputs
  const modalInputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    return inputs.map(i => ({
      id: i.id,
      tag: i.tagName,
      placeholder: i.placeholder,
      visible: i.offsetWidth > 0 && i.offsetHeight > 0,
      label: i.closest('label')?.innerText || i.parentElement?.innerText
    })).filter(i => i.visible);
  });
  console.log('Visible inputs after opening modal:', JSON.stringify(modalInputs, null, 2));

  // Type into visible inputs
  for (const item of modalInputs) {
    if (item.tag === 'TEXTAREA') {
      await page.type('textarea', P.message, { delay: 10 });
    } else if (item.id) {
      const label = (item.label || '').toLowerCase();
      if (label.includes('name')) {
        await page.type(`#${item.id}`, P.fullName, { delay: 20 });
      } else if (label.includes('email')) {
        await page.type(`#${item.id}`, P.email, { delay: 20 });
      } else if (label.includes('phone')) {
        await page.type(`#${item.id}`, P.phone, { delay: 20 });
      }
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicking Send...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sendBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'send');
    if (sendBtn) sendBtn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const finalRes = await page.evaluate(() => {
    const success = document.querySelector('[role="alert"], [data-aid*="SUCCESS"], .form-response')?.innerText;
    return { success, bodyExcerpt: document.body.innerText.slice(0, 500) };
  });
  console.log('Final Result 4869:', finalRes);

  await browser.close();
})();
