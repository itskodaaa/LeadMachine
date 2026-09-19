import puppeteer from 'puppeteer';
import fs from 'fs';

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function submitMMCE() {
  console.log('Testing MMCE submission on http://www.mmce.us/index.php/request-consultation/');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content'
    ]
  });

  const page = await browser.newPage();
  try {
    const res = await page.goto('http://www.mmce.us/index.php/request-consultation/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded with status:', res.status(), 'URL:', page.url());

    // Fill the fields
    await page.type('#Question1', 'Pamela Jameson', { delay: 50 });
    await page.type('#Question2', 'Northeast Precision Machinery, Inc.', { delay: 50 });
    await page.type('#Question3', '708-568-3708', { delay: 50 });
    await page.type('#Question5', 'pamela.jameson@nortiheastprecision.com', { delay: 50 });
    await page.type('#Question6', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details and possible collaboration on upcoming project quotes. Thank you, Pamela Jameson', { delay: 20 });

    console.log('Clicking Submit button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Navigation error/timeout:', e.message)),
      page.click('input.formBlockSubmitButton')
    ]);

    console.log('Post-submit URL:', page.url());
    const content = await page.evaluate(() => document.body.innerText);
    console.log('Body snippet:', content.slice(0, 500));

    // Check confirmation
    const isSuccess = /thank you|received|survey-thank-you|success/i.test(content) || /survey-thank-you|thankyou/i.test(page.url());
    console.log('Success detected:', isSuccess);

  } catch (err) {
    console.error('Error submitting MMCE:', err.message);
  } finally {
    await browser.close().catch(() => {});
  }
}

submitMMCE();
