import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testJYBAluminum() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('form') || url.includes('duda') || url.includes('_dm/s/rt/actions')) {
      console.log(`[HTTP Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[Body] ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://www.jybaluminumworks.com/ ...');
    await page.goto('https://www.jybaluminumworks.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill Duda form
    await page.type('input[name="dmform-0"]', 'Pamela Jameson', { delay: 30 });
    await page.type('input[name="dmform-1"]', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page.type('input[name="dmform-2"]', '708-568-3708', { delay: 30 });
    await page.type('textarea[name="dmform-3"]', 'Hello, Northeast Precision Machinery specializes in precision machining, custom metal fabrication, and equipment solutions. We would welcome the opportunity to discuss manufacturing requirements or support upcoming projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    const submitBtn = await page.$('input[name="submit"], button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Duda submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const hasThankYou = /thank you|received|submitted|message has been sent|gracias/i.test(text);
        const alertOrModal = document.querySelector('.dm-form-response, .dmResponse, .notification, .alert');
        return {
          hasThankYou,
          alertText: alertOrModal ? alertOrModal.innerText : null
        };
      });

      console.log('Confirmation result:', JSON.stringify(confirmation, null, 2));
    }
  } catch (e) {
    console.error('Error on JYB Aluminum:', e);
  } finally {
    await browser.close();
  }
}

testJYBAluminum();
