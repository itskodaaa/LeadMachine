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
    if (res.request().method() === 'POST' || res.url().includes('api')) {
      console.log('NET:', res.url(), res.status());
      try {
        const text = await res.text();
        console.log('NET body:', text.slice(0, 200));
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

  // Inspect all input elements inside the form
  const inputDetails = await page.evaluate(() => {
    const form = document.querySelector('form');
    const inputs = Array.from(form ? form.querySelectorAll('input, textarea, select') : document.querySelectorAll('input, textarea, select'));
    return inputs.map((el, i) => ({
      index: i,
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      required: el.required,
      className: el.className,
      value: el.value
    }));
  });
  console.log('Inputs in form:', JSON.stringify(inputDetails, null, 2));

  // Fill each input
  const allInputs = await page.$$('form input, form textarea, form select');
  console.log(`Found ${allInputs.length} elements in form`);

  for (const el of allInputs) {
    const ph = (await (await el.getProperty('placeholder')).jsonValue() || '').toLowerCase();
    const type = (await (await el.getProperty('type')).jsonValue() || '').toLowerCase();
    const tag = (await (await el.getProperty('tagName')).jsonValue() || '').toLowerCase();
    console.log(`Field: ${tag} type=${type} ph="${ph}"`);

    if (tag === 'select') {
      await el.select((await page.evaluate(s => s.options[1]?.value || '', el)));
    } else if (ph.includes('address you') || ph.includes('name')) {
      await el.type('Pamela Jameson', { delay: 20 });
    } else if (ph.includes('reply') || type === 'email') {
      await el.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
    } else if (ph.includes('phone') || type === 'tel') {
      await el.type('708-568-3708', { delay: 20 });
    } else if (ph.includes('laura') || tag === 'textarea' || ph.includes('anything')) {
      await el.type('Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.', { delay: 10 });
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // Click submit button inside form
  console.log('Submitting form...');
  const clicked = await page.evaluate(() => {
    const form = document.querySelector('form');
    const btn = form?.querySelector('button[type="submit"], button');
    if (btn) {
      btn.click();
      return btn.innerText.trim();
    }
    return null;
  });
  console.log('Clicked:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const form = document.querySelector('form');
    return {
      url: window.location.href,
      formText: form ? form.innerText : null,
      bodyExcerpt: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Result:', result);

  await browser.close();
})();
