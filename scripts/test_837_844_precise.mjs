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
  email: 'pamela.jameson@northeastprecision.com', // Note: correct spelling
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to explore potential business collaboration and structural engineering services for our upcoming commercial facility projects. Could someone from your team please get in touch? Thank you.'
};

async function test837() {
  console.log('Testing #837 with page.type and click...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://qnspc.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Find input5 and input6 and textarea
    await page.waitForSelector('#input5', { timeout: 10000 });
    await page.click('#input5');
    await page.type('#input5', OUTREACH.fullName, { delay: 30 });

    await page.click('#input6');
    await page.type('#input6', OUTREACH.email, { delay: 30 });

    const textareaSelector = 'textarea';
    await page.click(textareaSelector);
    await page.type(textareaSelector, OUTREACH.message, { delay: 10 });

    await page.screenshot({ path: 'screenshots/837_typed.png' });

    // Submit
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit button on #837...');
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'screenshots/837_after_submit.png' });

    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const successMatch = text.match(/(thank you|received|sent|success|appreciate|shortly)/i);
      const errorMatch = text.match(/(error|invalid|captcha|verification failed|please enter)/i);
      return {
        hasSuccess: !!successMatch,
        successSnippet: successMatch ? successMatch[0] : null,
        hasError: !!errorMatch,
        errorSnippet: errorMatch ? errorMatch[0] : null,
        rawSection: document.querySelector('form')?.innerText || text.substring(0, 400)
      };
    });

    console.log('Result #837:', result);
  } catch (err) {
    console.log('Error #837:', err.message);
  } finally {
    await browser.close();
  }
}

async function test844() {
  console.log('\nTesting #844 (LERA) with page.type and click...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.lera.com/offices', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wix form fields:
    // First name: id starting with form-field-input-7e9d
    // Last name: id starting with form-field-input-4f00
    // Email: id starting with form-field-input-8ffe
    // Message: id starting with form-field-input-8aea
    const fNameSelector = 'input[id*="form-field-input-7e9d"]';
    const lNameSelector = 'input[id*="form-field-input-4f00"]';
    const emailSelector = 'input[id*="form-field-input-8ffe"]';
    const msgSelector = 'textarea[id*="form-field-input-8aea"]';

    await page.waitForSelector(fNameSelector, { timeout: 10000 });
    
    await page.click(fNameSelector);
    await page.type(fNameSelector, OUTREACH.firstName, { delay: 30 });

    await page.click(lNameSelector);
    await page.type(lNameSelector, OUTREACH.lastName, { delay: 30 });

    await page.click(emailSelector);
    await page.type(emailSelector, OUTREACH.email, { delay: 30 });

    await page.click(msgSelector);
    await page.type(msgSelector, OUTREACH.message, { delay: 10 });

    await page.screenshot({ path: 'screenshots/844_typed.png' });

    // The submit button in Wix
    const buttonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (buttonHandle) {
      console.log('Clicking Wix submit button on #844...');
      await buttonHandle.asElement().click();
    }

    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'screenshots/844_after_submit.png' });

    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const successElements = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')).map(e => e.innerText);
      const successMatch = text.match(/(thank you|thanks for submitting|received|sent|success|appreciate|shortly)/i);
      return {
        successElements,
        hasSuccess: !!successMatch,
        successSnippet: successMatch ? successMatch[0] : null,
        formText: document.querySelector('form')?.innerText || ''
      };
    });

    console.log('Result #844:', result);
  } catch (err) {
    console.log('Error #844:', err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await test837();
  await test844();
}

main();
