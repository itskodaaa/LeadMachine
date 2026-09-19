import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Navigating to https://www.odysseyeg.com/contact/ ...');
  await page.goto('https://www.odysseyeg.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Loaded!');

  // Inspect form and its submit button
  const formDetails = await page.evaluate(() => {
    const f = document.querySelector('form[action*="contact"]');
    if (!f) return null;
    const btns = Array.from(f.querySelectorAll('button, input[type="submit"], input[type="button"], a.fusion-button')).map(b => ({
      tagName: b.tagName,
      type: b.type,
      id: b.id,
      className: b.className,
      value: b.value,
      innerText: b.innerText
    }));
    return { action: f.action, btns };
  });
  console.log('Form details:', JSON.stringify(formDetails, null, 2));

  // Fill form
  await page.evaluate(() => {
    const f = document.querySelector('form[action*="contact"]');
    f.querySelector('#name').value = 'Pamela Jameson';
    f.querySelector('#email').value = 'pamela.jameson@nortiheastprecision.com';
    f.querySelector('#phone').value = '708-568-3708';
    f.querySelector('#project').value = 'Commercial Engineering Consultation';
    f.querySelector('#Comments').value = 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson';

    ['#name', '#email', '#phone', '#project', '#Comments'].forEach(sel => {
      const el = f.querySelector(sel);
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const submitBtn = f.querySelector('button[type="submit"], input[type="submit"], .fusion-button');
    if (submitBtn) {
      console.log('Clicking submit...');
      submitBtn.click();
    } else {
      f.requestSubmit();
    }
  });

  console.log('Waiting for response...');
  await new Promise(r => setTimeout(r, 7000));

  const result = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.fusion-form-response-success, .fusion-alert, .alert, [role="alert"]')).map(e => e.innerText);
    const body = document.body.innerText;
    return { alerts, bodySnippet: body.slice(0, 1000) };
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  await browser.close();
}

run().catch(console.error);
