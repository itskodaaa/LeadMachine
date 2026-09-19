import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkAlvarezNetwork() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    page.on('request', req => {
      if (req.method() === 'POST' || req.url().includes('wp-json') || req.url().includes('admin-ajax')) {
        console.log('REQ:', req.method(), req.url(), req.postData());
      }
    });

    page.on('response', async res => {
      if (res.request().method() === 'POST' || res.url().includes('wp-json') || res.url().includes('admin-ajax')) {
        try {
          const text = await res.text();
          console.log('RES:', res.status(), res.url(), text.slice(0, 500));
        } catch (e) {}
      }
    });

    await page.goto('https://www.alvarezeng.com/contact/', { waitUntil: 'domcontentloaded' });

    await page.type('input[name="your-name"]', 'Pamela Jameson');
    await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com');
    await page.type('input[name="phone"]', '708-568-3708');
    await page.type('textarea[name="your-message"]', 'Interested in engineering collaboration and quotes.');

    console.log('Submitting form...');
    await page.click('input[type="submit"]');

    await new Promise(resolve => setTimeout(resolve, 8000));

    const finalDom = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        outputText: output ? output.innerText : '',
        outputHtml: output ? output.outerHTML : '',
        formStatus: form ? form.getAttribute('data-status') : '',
        classes: output ? output.className : ''
      };
    });
    console.log('DOM Result:', finalDom);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

checkAlvarezNetwork();
