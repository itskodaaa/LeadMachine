import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: 'Hello, I am reaching out to express our interest in your engineering and architectural services and would appreciate the opportunity to explore potential collaboration. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=MixedContentForms,InsecureDownloadWarnings'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://nyengineering.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check form action
    const formAction = await page.evaluate(() => {
      const f = document.querySelector('form.contact-form');
      return { action: f?.action, method: f?.method };
    });
    console.log('Form Action:', formAction);

    await page.type('#g1-firstname', OUTREACH_PROFILE.firstName);
    await page.type('#g1-lastname', OUTREACH_PROFILE.lastName);
    await page.type('#g1-email', OUTREACH_PROFILE.email);
    await page.type('#contact-form-comment-g1-serviceexpected', OUTREACH_PROFILE.message);

    console.log('Clicking Book a Consultation...');
    await page.click('button.wp-block-jetpack-button, input[type="submit"], button[type="submit"]');

    await new Promise(r => setTimeout(r, 3000));

    // If on interstitial, click proceed
    if (page.url().includes('chromewebdata')) {
      console.log('On interstitial! Clicking Send anyway...');
      const proceedBtn = await page.$('#proceed-button');
      if (proceedBtn) await proceedBtn.click();
      await new Promise(r => setTimeout(r, 5000));
    }

    console.log('Current URL:', page.url());
    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const feedback = Array.from(document.querySelectorAll('.contact-form-success, .form-success, h3, [role="alert"]')).map(el => el.innerText);
      return {
        url: window.location.href,
        feedback,
        hasThank: text.toLowerCase().includes('thank') || text.toLowerCase().includes('sent') || text.toLowerCase().includes('received'),
        snippet: text.substring(0, 400)
      };
    });

    console.log('Result:', result);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
