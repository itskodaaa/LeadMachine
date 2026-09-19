import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.lera.com/offices', { waitUntil: 'networkidle2' });
  
  const formStatus = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    return {
      btnFound: !!btn,
      btnDisabled: btn ? btn.disabled : null,
      btnClasses: btn ? btn.className : null,
      parentForm: btn ? btn.closest('form')?.id : null,
      formErrors: Array.from(document.querySelectorAll('[data-hook*="error"], [aria-invalid="true"], .error')).map(e => e.innerText)
    };
  });
  console.log('LERA form status before typing:', formStatus);

  // Focus and type into each
  const fName = await page.$('input[id*="form-field-input-7e9d"]');
  const lName = await page.$('input[id*="form-field-input-4f00"]');
  const email = await page.$('input[id*="form-field-input-8ffe"]');
  const msg = await page.$('textarea[id*="form-field-input-8aea"]');

  await fName.focus();
  await page.keyboard.type('Pamela');
  await fName.evaluate(e => e.blur());

  await lName.focus();
  await page.keyboard.type('Jameson');
  await lName.evaluate(e => e.blur());

  await email.focus();
  await page.keyboard.type('pamela.jameson@northeastprecision.com');
  await email.evaluate(e => e.blur());

  await msg.focus();
  await page.keyboard.type('Hello, Northeast Precision Machinery would like to explore structural engineering collaboration opportunities. Please contact us. Thank you.');
  await msg.evaluate(e => e.blur());

  await new Promise(r => setTimeout(r, 1000));

  const afterTypeStatus = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
    return {
      btnDisabled: btn ? btn.disabled : null,
      btnAriaDisabled: btn ? btn.getAttribute('aria-disabled') : null,
      invalidInputs: Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(e => e.id)
    };
  });
  console.log('After typing status:', afterTypeStatus);

  // Click submit with mouse click
  const btn = await page.$('button[type="button"]'); // or find button with text submit
  const btnHandle = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim() === 'Submit');
  });

  const boundingBox = await btnHandle.asElement().boundingBox();
  console.log('Submit button bounding box:', boundingBox);
  if (boundingBox) {
    // Scroll into view first
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim() === 'Submit');
      b.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));
    const newBox = await btnHandle.asElement().boundingBox();
    console.log('Scrolled submit button bounding box:', newBox);
    await page.mouse.click(newBox.x + newBox.width / 2, newBox.y + newBox.height / 2);
    console.log('Mouse clicked submit button!');
  }

  await new Promise(r => setTimeout(r, 5000));

  const afterClickStatus = await page.evaluate(() => {
    return {
      bodySnippet: document.body.innerText.substring(0, 500),
      alerts: Array.from(document.querySelectorAll('[role="alert"], [data-hook*="message"], .wixui-form__message, [data-hook*="notification"]')).map(e => e.innerText),
      allButtons: Array.from(document.querySelectorAll('button')).map(b => b.innerText)
    };
  });
  console.log('After click status:', afterClickStatus);

  await browser.close();
}
check();
