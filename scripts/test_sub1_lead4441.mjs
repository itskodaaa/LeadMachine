import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  name: 'Pamela Jameson',
  first: 'Pamela',
  last: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your precision engineering and automation services. We would appreciate the opportunity to explore potential collaboration on upcoming projects and request a representative to contact us for quotes. Thank you!'
};

async function test4441() {
  console.log('\n--- Testing Lead #4441 (Jah Environmental) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://jesh.llc/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill GoDaddy fields
    await page.waitForSelector('[data-aid="CONTACT_FORM_NAME"]', { timeout: 10000 });
    await page.type('[data-aid="CONTACT_FORM_NAME"]', profile.name, { delay: 30 });
    await page.type('[data-aid="CONTACT_FORM_EMAIL"]', profile.email, { delay: 30 });
    
    const phoneInput = await page.$('[data-aid*="Phone"]');
    if (phoneInput) {
      await phoneInput.type(profile.phone, { delay: 30 });
    }
    
    await page.type('[data-aid="CONTACT_FORM_MESSAGE"]', profile.message, { delay: 20 });
    
    // Check opt in if present
    const optIn = await page.$('[data-aid="CONTACT_FORM_EMAIL_OPT_IN"]');
    if (optIn) {
      await optIn.click();
    }
    
    console.log('Filled form on #4441. Clicking submit...');
    
    // Submit
    const submitBtn = await page.$('button[type="submit"], [data-aid="CONTACT_FORM_SUBMIT_BUTTON_REND"]');
    await submitBtn.click();
    
    // Wait for response or DOM changes
    await new Promise(r => setTimeout(r, 6000));
    
    const pageContent = await page.evaluate(() => {
      const text = document.body.innerText;
      const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE"]');
      return {
        textSnippet: text.slice(0, 1000),
        hasSuccessMsg: !!successEl,
        successText: successEl ? successEl.innerText : null,
        recaptchaIframe: Array.from(document.querySelectorAll('iframe[src*="recaptcha"]')).map(f => f.src)
      };
    });
    
    console.log('Post-submit check on #4441:', pageContent);

  } catch (e) {
    console.log('Error on #4441:', e.message);
  } finally {
    await browser.close();
  }
}

test4441();
