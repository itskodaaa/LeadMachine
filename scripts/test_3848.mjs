import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function test3848() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  console.log('Testing #3848 eltingmechanical.com');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://eltingmechanical.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.evaluate((p) => {
      const form = document.querySelector('form.sow-contact-form');
      if (!form) return;
      const name = form.querySelector('input[name="your-name-1"]');
      if (name) name.value = p.fullName;
      const email = form.querySelector('input[name="your-email-1"]');
      if (email) email.value = p.email;
      const subj = form.querySelector('input[name="subject-1"]');
      if (subj) subj.value = p.subject;
      const msg = form.querySelector('textarea[name="tell-us-about-your-project-and-how-you-want-us-to-help-you-1"]');
      if (msg) msg.value = p.message;
    }, OUTREACH);

    console.log('Submitted #3848 form. Waiting for navigation/response...');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      page.click('form.sow-contact-form button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL after submit:', page.url());
    const result = await page.evaluate(() => {
      const successEl = document.querySelector('.sow-contact-form-success, .sow-submit-success, .success, [class*="success"]');
      const errEl = document.querySelector('.sow-error, .error, [class*="error"]');
      return {
        success: successEl ? successEl.innerText : null,
        error: errEl ? errEl.innerText : null,
        bodySnippet: document.body?.innerText?.slice(0, 500)
      };
    });
    console.log('Result for #3848:', result);
  } catch (e) {
    console.log('Error #3848:', e.message);
  } finally {
    await page.close();
  }

  await browser.close();
}

test3848();
