import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testAvalon() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('contact-form-7') || url.includes('wp-json') || url.includes('feedback')) {
      console.log(`[CF7 Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[CF7 Body] ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://www.avalon.aero/contact/ ...');
    await page.goto('https://www.avalon.aero/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[name="your-name"]', 'Pamela Jameson', { delay: 30 });
    await page.type('input[name="your-email"]', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page.type('input[name="your-phone"]', '708-568-3708', { delay: 30 });
    await page.type('input[name="your-subject"]', 'Precision CNC Machining & Aerospace Support Inquiry', { delay: 30 });
    await page.type('textarea[name="your-message"]', 'Hello, Northeast Precision Machinery provides precision machining, CNC fabrication, and equipment solutions. We would welcome the opportunity to connect with Avalon CNC regarding potential machining requirements or support for upcoming manufacturing projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    const submitBtn = await page.$('form.wpcf7-form input[type="submit"], form.wpcf7-form button');
    if (submitBtn) {
      console.log('Clicking CF7 submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const result = await page.evaluate(() => {
        const responseOutput = document.querySelector('.wpcf7-response-output');
        return {
          responseOutput: responseOutput ? responseOutput.innerText.trim() : null,
          hasSentClass: document.querySelector('.wpcf7-form.sent') !== null,
          hasFailedClass: document.querySelector('.wpcf7-form.failed') !== null,
          hasInvalidClass: document.querySelector('.wpcf7-form.invalid') !== null
        };
      });

      console.log('CF7 Submission Result:', JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error('Error on Avalon:', e);
  } finally {
    await browser.close();
  }
}

testAvalon();
