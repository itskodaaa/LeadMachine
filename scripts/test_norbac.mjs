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
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express interest in your industrial supply and engineering services. Please contact us regarding upcoming project quotes. Thank you, Pamela Jameson.'
};

async function testNorbac() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: false, // headed to see Wix interactions
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  page.on('response', resp => {
    if (resp.url().includes('wix') || resp.url().includes('form')) {
      if (resp.status() >= 400 || resp.url().includes('submit')) {
        console.log(`RESP: ${resp.status()} ${resp.url()}`);
      }
    }
  });

  try {
    console.log('Navigating to Norbac...');
    await page.goto('https://www.norbac3.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll to the form
    await page.evaluate(() => {
      const el = document.querySelector('form[id^="form-"]');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect visible inputs inside form
    const inputs = await page.$$('form[id^="form-"] input, form[id^="form-"] textarea');
    console.log(`Found ${inputs.length} inputs in form.`);

    for (const input of inputs) {
      const meta = await page.evaluate(el => ({
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        type: el.type,
        id: el.id,
        visible: el.offsetParent !== null
      }), input);
      console.log('Field:', meta);

      if (!meta.visible) continue;

      const label = ((meta.placeholder || '') + ' ' + (meta.ariaLabel || '')).toLowerCase();
      if (label.includes('name')) {
        await input.click({ clickCount: 3 });
        await input.type(OUTREACH_PROFILE.fullName, { delay: 50 });
      } else if (label.includes('phone')) {
        await input.click({ clickCount: 3 });
        await input.type(OUTREACH_PROFILE.phone, { delay: 50 });
      } else if (label.includes('email')) {
        await input.click({ clickCount: 3 });
        await input.type(OUTREACH_PROFILE.email, { delay: 50 });
      } else if (label.includes('company')) {
        await input.click({ clickCount: 3 });
        await input.type(OUTREACH_PROFILE.company, { delay: 50 });
      } else if (label.includes('product') || meta.type === 'textarea') {
        await input.click({ clickCount: 3 });
        await input.type(OUTREACH_PROFILE.message, { delay: 30 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    // Find visible submit button
    const submitButtons = await page.$$('form[id^="form-"] button');
    for (const btn of submitButtons) {
      const txt = await page.evaluate(el => el.innerText, btn);
      const visible = await page.evaluate(el => el.offsetParent !== null, btn);
      if (visible && txt.toLowerCase().includes('submit')) {
        console.log('Clicking visible submit button...');
        await btn.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="form-submitted"], .wixui-form__message, [class*="success"], [class*="error"], [class*="notification"]')).map(el => el.innerText.trim()).filter(Boolean);
      return {
        alerts,
        bodySnippet: document.body.innerText.slice(0, 400)
      };
    });

    console.log('Norbac Result:', result);
  } catch (e) {
    console.log('Error on Norbac:', e.message);
  } finally {
    await browser.close();
  }
}

testNorbac();
