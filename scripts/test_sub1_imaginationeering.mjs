import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testImaginationeering() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to https://www.imaginationeering.com/contact...');
    await page.goto('https://www.imaginationeering.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    // Inspect fields
    const formFields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return Array.from(form.querySelectorAll('input, textarea')).map(el => ({
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        style: el.getAttribute('style'),
        offsetParent: el.offsetParent !== null,
        label: el.closest('div')?.innerText?.trim()
      }));
    });
    console.log('Form fields on page:', JSON.stringify(formFields, null, 2));

    // Fill only the real fields
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[name="First Name"]');
      if (nameInput) {
        nameInput.value = 'Pamela Jameson';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const emailInput = document.querySelector('input[name=" Last Name"]');
      if (emailInput) {
        emailInput.value = 'pamela.jameson@nortiheastprecision.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const phoneInput = document.querySelector('input[name="Street"]');
      if (phoneInput) {
        phoneInput.value = '708-568-3708';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const subjectInput = document.querySelector('input[name=" City"]');
      if (subjectInput) {
        subjectInput.value = 'Exploring Collaboration Opportunities';
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const msgInput = document.querySelector('textarea[name="Phone Number"]');
      if (msgInput) {
        msgInput.value = 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you,\nPamela Jameson';
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log('Fields populated. Clicking submit...');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'networkidle2' }).catch(e => console.log('Nav timeout/handled by ajax')),
      page.evaluate(() => {
        const submitBtn = document.querySelector('form button[type="submit"], form input[type="submit"]');
        if (submitBtn) submitBtn.click();
        else document.querySelector('form').submit();
      })
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Post-submit URL:', page.url());

    const pageContent = await page.evaluate(() => {
      const body = document.body.innerText;
      const alerts = Array.from(document.querySelectorAll('.alert, .success, .message, .form-submission, [role="alert"], [class*="success"], [class*="confirm"], [class*="thank"]'))
        .map(el => el.innerText.trim());
      return { alerts, bodyPreview: body.slice(0, 1000) };
    });
    console.log('Page response:', JSON.stringify(pageContent, null, 2));

  } catch (err) {
    console.log('Error:', err);
  } finally {
    await browser.close();
  }
}

testImaginationeering();
