import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testUnitedIronWorks() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('form') || url.includes('framer') || url.includes('api')) {
      if (res.status() !== 200 && res.status() !== 204) {
        console.log(`[Response] ${res.status()} ${url}`);
      } else if (url.includes('form') || url.includes('submit')) {
        console.log(`[Form Response] ${res.status()} ${url}`);
      }
    }
  });

  try {
    console.log('Navigating to https://unitedamw.com/contact-us ...');
    await page.goto('https://unitedamw.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill Name
    await page.type('input[name="Name"]', 'Pamela Jameson', { delay: 20 });
    // Phone
    await page.type('input[name="Phone"]', '7085683708', { delay: 20 });
    // Email
    await page.type('input[name="Email"]', 'pamela.jameson@northeastprecision.com', { delay: 20 });
    
    // Select Type
    await page.select('select[name="Type"]', 'Commercial');
    console.log('Selected Type = Commercial');

    // Location
    await page.type('input[name="Location"]', 'Chicago, IL', { delay: 20 });

    // Message
    await page.type('textarea[name="Message"]', 'Hello, Northeast Precision Machinery specializes in precision machining, custom architectural metal fabrication, and equipment solutions. We would welcome the opportunity to connect with United Iron Works regarding upcoming manufacturing projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    // Submit button
    const submitBtn = await page.$('form button, form input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit button on United Iron Works...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const hasThankYou = /thank you|received|submitted|message sent|thanks for reaching out|we will reach out/i.test(text);
        const formEl = document.querySelectorAll('form')[0];
        return {
          hasThankYou,
          formVisible: formEl ? formEl.offsetParent !== null : false,
          snippet: text.slice(0, 400)
        };
      });

      console.log('Result on United Iron Works:', JSON.stringify(confirmation, null, 2));
    }
  } catch (e) {
    console.error('Error on United Iron Works:', e);
  } finally {
    await browser.close();
  }
}

testUnitedIronWorks();
