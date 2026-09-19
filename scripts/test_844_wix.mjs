import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check844() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', async res => {
    if (res.url().includes('wix') || res.request().method() === 'POST') {
      try {
        console.log('Response:', res.status(), res.url());
        const txt = await res.text();
        console.log('Body:', txt.substring(0, 200));
      } catch (e) {}
    }
  });

  await page.goto('https://www.lera.com/offices', { waitUntil: 'networkidle2' });

  // Let's inspect the Wix form elements
  const details = await page.evaluate(() => {
    const form = document.querySelector('form') || document.querySelector('[data-testid="form"]');
    const inputs = Array.from(document.querySelectorAll('input, textarea, button'));
    return {
      formOuter: form ? form.outerHTML.substring(0, 500) : null,
      elements: inputs.map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        classes: el.className,
        text: el.innerText || el.value,
        ariaLabel: el.getAttribute('aria-label'),
        placeholder: el.placeholder
      }))
    };
  });

  console.log('LERA Form details:', JSON.stringify(details, null, 2));

  // Find exact selectors
  const fName = await page.$('input[id*="form-field-input-7e9d"]');
  const lName = await page.$('input[id*="form-field-input-4f00"]');
  const email = await page.$('input[id*="form-field-input-8ffe"]');
  const msg = await page.$('textarea[id*="form-field-input-8aea"]');

  if (fName && lName && email && msg) {
    console.log('Found all input elements. Focusing and typing...');
    await fName.focus();
    await page.keyboard.type('Pamela', { delay: 30 });
    
    await lName.focus();
    await page.keyboard.type('Jameson', { delay: 30 });

    await email.focus();
    await page.keyboard.type('pamela.jameson@northeastprecision.com', { delay: 30 });

    await msg.focus();
    await page.keyboard.type('Hello, Northeast Precision Machinery would like to explore structural engineering collaboration opportunities for upcoming facilities. Could someone from your team please contact us? Thank you.', { delay: 10 });

    // Look for submit button
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    console.log('Clicking Wix submit button...');
    await submitBtn.asElement().click();

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        const msg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')?.innerText;
        return {
          hasSuccess: text.toLowerCase().includes('thanks for submitting') || text.toLowerCase().includes('thank you'),
          msg,
          btnText: Array.from(document.querySelectorAll('button')).map(b => b.innerText)
        };
      });
      console.log(`LERA Sec ${i+1}:`, res);
      if (res.hasSuccess || res.msg) break;
    }
  }

  await browser.close();
}

check844();
