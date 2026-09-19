import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function testIntegrus() {
  console.log('Starting Integrus Electric test...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(45000);

    // Block heavy image, font, media requests that cause timeouts
    await page.setRequestInterception(true);
    page.on('request', req => {
      const resourceType = req.resourceType();
      const url = req.url();
      if (['image', 'media', 'font'].includes(resourceType) || url.includes('google-analytics') || url.includes('doubleclick')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.on('response', async res => {
      if (res.url().includes('wpcf7') || res.url().includes('feedback')) {
        try {
          const text = await res.text();
          console.log(`[CF7 Response] ${res.status()}: ${text.slice(0, 300)}`);
        } catch(e) {}
      }
    });

    console.log('Navigating to http://integruselectric.com ...');
    await page.goto('http://integruselectric.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('Page loaded successfully!');

    await new Promise(r => setTimeout(r, 2000));

    const formFound = await page.$('.wpcf7-form');
    console.log('Form found:', !!formFound);

    if (formFound) {
      await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
      await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
      await page.type('input[name="tel-593"]', OUTREACH_PROFILE.phone);
      await page.type('input[name="your-address"]', 'Chicago, IL');
      await page.type('textarea[name="textarea-970"]', OUTREACH_PROFILE.message);

      console.log('Submitting CF7 form...');
      const submitBtn = await page.$('.wpcf7-submit');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 6000));

        const result = await page.evaluate(() => {
          const out = document.querySelector('.wpcf7-response-output');
          return {
            formClass: document.querySelector('.wpcf7-form')?.className,
            output: out ? out.innerText : null
          };
        });
        console.log('Submit result:', JSON.stringify(result, null, 2));
      }
    }
  } catch(e) {
    console.error('Integrus error:', e);
  } finally {
    await browser.close();
  }
}

testIntegrus();
