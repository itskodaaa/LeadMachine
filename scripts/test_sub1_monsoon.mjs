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

async function test4680() {
  console.log('\n--- Testing 4680 (Monsoon Metal Manufacturing) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://monsoonmetal.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Look at form 4
    // Find visible form inputs
    const isVisible = await page.$eval('#gform_4', el => el.offsetWidth > 0 && el.offsetHeight > 0).catch(() => false);
    console.log('gform_4 visible?', isVisible);

    // Let's scroll to the form
    await page.evaluate(() => {
      const f = document.querySelector('#gform_4');
      if (f) f.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill fields
    await page.type('#input_4_6_3', OUTREACH_PROFILE.firstName, { delay: 20 });
    await page.type('#input_4_6_6', OUTREACH_PROFILE.lastName, { delay: 20 });
    await page.type('#input_4_7', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('#input_4_9', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('#input_4_3', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Fields filled. Finding submit button...');
    const submitBtn = await page.$('#gform_submit_button_4');
    console.log('Submit button found?', !!submitBtn);

    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));

      const confirmation = await page.evaluate(() => {
        const confEl = document.querySelector('#gform_confirmation_message_4, .gform_confirmation_message, .confirmation');
        return {
          confText: confEl ? confEl.innerText : null,
          url: window.location.href,
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });

      console.log('Confirmation result:', confirmation);
    }
  } catch (e) {
    console.log('Error 4680:', e.message);
  } finally {
    await browser.close();
  }
}

test4680().catch(console.error);
