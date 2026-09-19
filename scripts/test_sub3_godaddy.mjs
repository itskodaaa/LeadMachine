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

async function testGoDaddy(leadId, url) {
  console.log(`\n========================================\nTesting GoDaddy site #${leadId}: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST' || res.url().includes('email') || res.url().includes('form')) {
      console.log('NET:', res.url(), res.status());
      try {
        console.log('Body:', (await res.text()).slice(0, 200));
      } catch (e) {}
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Find form section
  const formInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    return inputs.map(i => ({
      tag: i.tagName,
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      ariaLabel: i.getAttribute('aria-label'),
      label: i.closest('label')?.innerText || i.previousElementSibling?.innerText || i.parentElement?.innerText
    }));
  });
  console.log('Form inputs:', JSON.stringify(formInfo, null, 2));

  // Type fields realistically using page.type
  for (const info of formInfo) {
    if (info.type === 'file' || info.type === 'checkbox' || info.name === '_app_id') continue;
    const label = (info.label || '').toLowerCase();
    const ph = (info.placeholder || '').toLowerCase();
    const aria = (info.ariaLabel || '').toLowerCase();
    const combined = `${info.id} ${info.name} ${label} ${ph} ${aria}`;

    const selector = info.id ? `#${info.id}` : (info.tag === 'TEXTAREA' ? 'textarea' : null);
    if (!selector) continue;

    if (info.tag === 'TEXTAREA' || combined.includes('message')) {
      console.log(`Typing message into ${selector}`);
      await page.click(selector);
      await page.type(selector, P.message, { delay: 10 });
    } else if (combined.includes('email')) {
      console.log(`Typing email into ${selector}`);
      await page.click(selector);
      await page.type(selector, P.email, { delay: 20 });
    } else if (combined.includes('phone') || combined.includes('tel')) {
      console.log(`Typing phone into ${selector}`);
      await page.click(selector);
      await page.type(selector, P.phone, { delay: 20 });
    } else if (combined.includes('name')) {
      console.log(`Typing name into ${selector}`);
      await page.click(selector);
      await page.type(selector, P.fullName, { delay: 20 });
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // Find send button
  console.log('Clicking Send button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.trim().toLowerCase() === 'send');
    if (btn) {
      btn.click();
      return btn.innerText.trim();
    }
    return null;
  });
  console.log('Clicked:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const success = document.querySelector('[role="alert"], [data-aid*="SUCCESS"], .form-response')?.innerText;
    return { success, bodyExcerpt: document.body.innerText.slice(0, 500) };
  });
  console.log('Result:', result);

  await browser.close();
}

(async () => {
  await testGoDaddy(4869, 'https://swscontracting.com/');
  await testGoDaddy(4872, 'https://advantagesteelinc.com/');
})();
