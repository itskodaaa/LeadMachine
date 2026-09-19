import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testMrBaez() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('form') || url.includes('zyro') || url.includes('hostinger') || url.includes('submit')) {
      console.log(`[HTTP Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[Body] ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://mrbaezmetal.com/ ...');
    await page.goto('https://mrbaezmetal.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill inputs
    await page.type('[id="Name"]', 'Pamela', { delay: 30 });
    await page.type('[id="Last name"]', 'Jameson', { delay: 30 });
    await page.type('[id="Your email"]', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page.type('[id="Message"]', 'Hello, Northeast Precision Machinery specializes in precision machining, custom metal fabrication, and equipment solutions. We would welcome the opportunity to discuss manufacturing requirements. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    const submitBtn = await page.$('form button, form input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit button on Mr Baez...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const hasThankYou = /thank you|received|submitted|message has been sent|gracias/i.test(text);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"]')).map(e => e.outerHTML.slice(0, 80));
        return {
          hasThankYou,
          captchas,
          snippet: text.slice(0, 300)
        };
      });

      console.log('Submission result:', JSON.stringify(confirmation, null, 2));
    }
  } catch (e) {
    console.error('Error on Mr Baez:', e);
  } finally {
    await browser.close();
  }
}

testMrBaez();
