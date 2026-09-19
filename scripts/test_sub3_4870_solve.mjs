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
      console.log('NET POST:', res.url(), res.status());
      try {
        console.log('NET body:', (await res.text()).slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://irontransformation.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // Accept cookies
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('ACCEPT') || x.innerText.includes('ONLY NECESSARY'));
    if (b) b.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const allInputs = await page.$$('form input, form textarea, form select');
  for (const el of allInputs) {
    const ph = (await (await el.getProperty('placeholder')).jsonValue() || '').toLowerCase();
    const type = (await (await el.getProperty('type')).jsonValue() || '').toLowerCase();
    const tag = (await (await el.getProperty('tagName')).jsonValue() || '').toLowerCase();

    if (tag === 'select') {
      await el.select((await page.evaluate(s => s.options[1]?.value || '', el)));
    } else if (ph.includes('address you') || ph.includes('name')) {
      await el.type('Pamela Jameson', { delay: 20 });
    } else if (ph.includes('reply') || type === 'email') {
      await el.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
    } else if (ph.includes('phone') || type === 'tel') {
      await el.type('708-568-3708', { delay: 20 });
    }
  }

  await new Promise(r => setTimeout(r, 500));
  console.log('Initial click to trigger captcha...');
  await page.evaluate(() => {
    const form = document.querySelector('form');
    form?.querySelector('button[type="submit"], button')?.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Check what new inputs or text appeared
  const afterClick = await page.evaluate(() => {
    const form = document.querySelector('form');
    const inputs = Array.from(form ? form.querySelectorAll('input') : []).map(i => ({
      type: i.type, placeholder: i.placeholder, name: i.name, value: i.value
    }));
    return { formText: form?.innerText, inputs };
  });
  console.log('After click:', JSON.stringify(afterClick, null, 2));

  // If there is a math question like "A + B = ?"
  const match = afterClick.formText?.match(/(\d+)\s*\+\s*(\d+)\s*=/);
  if (match) {
    const ans = String(parseInt(match[1]) + parseInt(match[2]));
    console.log(`Solving math challenge: ${match[0]} -> ${ans}`);
    // Find empty input
    const inputs = await page.$$('form input');
    for (const input of inputs) {
      const val = await (await input.getProperty('value')).jsonValue();
      if (!val) {
        console.log('Typing answer into input...');
        await input.type(ans, { delay: 20 });
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    console.log('Clicking submit again...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      form?.querySelector('button[type="submit"], button')?.click();
    });

    await new Promise(r => setTimeout(r, 5000));
    const finalResult = await page.evaluate(() => {
      return {
        formText: document.querySelector('form')?.innerText,
        alert: document.querySelector('[role="alert"], [class*="success"]')?.innerText,
        body: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Final Result:', finalResult);
  }

  await browser.close();
})();
