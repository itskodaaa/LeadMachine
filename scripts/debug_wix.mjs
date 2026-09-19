import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function debugWix(id, url) {
  console.log(`\n--- Debugging Lead #${id}: ${url} ---`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('request', req => {
    if (req.url().includes('wix') && (req.method() === 'POST' || req.url().includes('submit') || req.url().includes('form'))) {
      console.log(`[Form Request] ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('wix') && (res.request().method() === 'POST' || res.url().includes('submit') || res.url().includes('form'))) {
      console.log(`[Form Response] ${res.status()} ${res.url()}`);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Get input elements
    const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
    console.log(`Found ${inputs.length} inputs`);

    for (const input of inputs) {
      const info = await page.evaluate(el => ({
        id: el.id,
        type: el.type,
        label: el.closest('div')?.innerText || el.id
      }), input);
      console.log('Input info:', info);

      await input.click({ clickCount: 3 });
      if (info.label.toLowerCase().includes('first') || info.id.toLowerCase().includes('first')) {
        await input.type('Pamela', { delay: 50 });
      } else if (info.label.toLowerCase().includes('last') || info.id.toLowerCase().includes('last')) {
        await input.type('Jameson', { delay: 50 });
      } else if (info.type === 'email' || info.label.toLowerCase().includes('email')) {
        await input.type('pamela.jameson@nortiheastprecision.com', { delay: 50 });
      } else if (info.label.toLowerCase().includes('phone')) {
        await input.type('708-568-3708', { delay: 50 });
      } else if (info.type === 'textarea' || info.label.toLowerCase().includes('message')) {
        await input.type('Inquiring about project collaboration and quote.', { delay: 50 });
      }
    }

    // Find submit button
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      return btns.find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'submit');
    });

    console.log('Clicking submit button directly via Puppeteer click...');
    await submitBtn.asElement().click();

    await new Promise(r => setTimeout(r, 6000));

    // Inspect any aria-invalid, error text, or captcha
    const postClick = await page.evaluate(() => {
      const invalids = Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(i => ({ id: i.id, outer: i.outerHTML.slice(0, 100) }));
      const errorDivs = Array.from(document.querySelectorAll('[class*="error"], [id*="error"]')).map(e => e.innerText.trim()).filter(Boolean);
      const captcha = Array.from(document.querySelectorAll('iframe[src*="captcha"], iframe[src*="recaptcha"], div[class*="captcha"]')).map(c => c.outerHTML.slice(0, 100));
      return { invalids, errorDivs, captcha };
    });

    console.log('Post-click state:', JSON.stringify(postClick, null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await debugWix(3547, 'https://www.capconsultingeng.com/contact');
}

run();
