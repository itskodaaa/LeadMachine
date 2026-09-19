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
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function submitMonsoon() {
  console.log('\n--- Submitting 4680 (Monsoon Metal Manufacturing) on /products/ ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://monsoonmetal.com/products/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.evaluate(() => {
      const f = document.querySelector('#gform_2');
      if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1500));

    await page.type('#input_2_1_3', OUTREACH_PROFILE.firstName, { delay: 30 });
    await page.type('#input_2_1_6', OUTREACH_PROFILE.lastName, { delay: 30 });
    await page.type('#input_2_2', OUTREACH_PROFILE.email, { delay: 30 });
    await page.type('#input_2_4', OUTREACH_PROFILE.phone, { delay: 30 });
    await page.type('#input_2_3', OUTREACH_PROFILE.message, { delay: 10 });

    // Check if checkbox exists and click it if needed
    const checkbox = await page.$('#choice_2_6_1');
    if (checkbox) {
      await checkbox.click();
    }

    console.log('Form 2 filled. Clicking submit button...');
    const submitBtn = await page.$('#gform_submit_button_2');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));

      const res = await page.evaluate(() => {
        const conf = document.querySelector('#gform_confirmation_message_2, .gform_confirmation_message');
        return {
          conf: conf ? conf.innerText : null,
          url: window.location.href,
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });

      console.log('Submission result:', res);
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

submitMonsoon().catch(console.error);
