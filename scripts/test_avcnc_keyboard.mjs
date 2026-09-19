import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testAvcncKeyboard() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('messages') || url.includes('apps-api')) {
      console.log(`[API Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[API Body] ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://avcnc.net/ ...');
    await page.goto('https://avcnc.net/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Focus and type into Name
    console.log('Typing Name...');
    await page.focus('[data-aid="CONTACT_FORM_NAME"]');
    await page.keyboard.type('Pamela Jameson', { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Focus and type into Email
    console.log('Typing Email...');
    await page.focus('[data-aid="CONTACT_FORM_EMAIL"]');
    await page.keyboard.type('pamela.jameson@northeastprecision.com', { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Focus and type into Message
    console.log('Typing Message...');
    await page.focus('[data-aid="CONTACT_FORM_MESSAGE"]');
    await page.keyboard.type('Hello, Northeast Precision Machinery specializes in precision machining, custom CNC fabrication, and tooling solutions. We would welcome the opportunity to discuss manufacturing requirements or support upcoming projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 20 });
    await new Promise(r => setTimeout(r, 1000));

    // Click submit button
    console.log('Clicking Submit button...');
    const submitBtn = await page.$('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const pageText = await page.evaluate(() => document.body.innerText);
      const isSuccess = /thank you|we will be in touch|message sent|thanks for reaching out/i.test(pageText);
      console.log('DOM confirmation on avcnc.net:', isSuccess);

      const errs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-aid*="ERR"], .error, [role="alert"]')).map(e => e.innerText.trim()).filter(Boolean);
      });
      console.log('Errors if any:', errs);
    }
  } catch (e) {
    console.error('Error on avcnc.net:', e);
  } finally {
    await browser.close();
  }
}

testAvcncKeyboard();
