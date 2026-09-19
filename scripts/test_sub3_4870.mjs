import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST') {
      console.log('POST:', res.url(), res.status());
      try { console.log('Body:', (await res.text()).slice(0, 300)); } catch (e) {}
    }
  });

  try {
    console.log('Navigating to irontransformation.com...');
    await page.goto('https://irontransformation.com/', { waitUntil: 'load', timeout: 45000 });
    console.log('Page loaded:', page.url());

    // Accept cookies if present
    try {
      const cookieBtn = await page.$('button');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const accept = btns.find(b => b.innerText.includes('ACCEPT') || b.innerText.includes('ONLY NECESSARY'));
        if (accept) accept.click();
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 1500));

    // Type fields:
    // "How should we address you?"
    // "Where can we reply?"
    // "Your phone number"
    // "Ask Laura anything…"
    console.log('Filling fields...');
    const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
    for (const input of inputs) {
      const ph = await (await input.getProperty('placeholder')).jsonValue();
      console.log('Input ph:', ph);
      if (ph.includes('address you')) {
        await input.type('Pamela Jameson', { delay: 20 });
      } else if (ph.includes('reply')) {
        await input.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
      } else if (ph.includes('phone')) {
        await input.type('708-568-3708', { delay: 20 });
      } else if (ph.includes('Laura') || ph.includes('anything')) {
        await input.type('Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.', { delay: 10 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log('Clicking Send...');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('SEND THE FIRST NOTE'));
      if (btn) {
        btn.click();
        return btn.innerText.trim();
      }
      return null;
    });
    console.log('Clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    const finalState = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="success"], [class*="confirm"], [class*="message"], [class*="popup"]')).map(e => e.innerText.trim()).filter(Boolean);
      return { alerts, url: window.location.href, excerpt: document.body.innerText.slice(0, 500) };
    });
    console.log('Final state:', finalState);

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
