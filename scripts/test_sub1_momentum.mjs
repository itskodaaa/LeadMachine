import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testMomentum() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to https://momentumtx.com/contact.php...');
    await page.goto('https://momentumtx.com/contact.php', { waitUntil: 'networkidle2', timeout: 30000 });

    // Populate fields
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[name="your-name"]');
      if (nameInput) {
        nameInput.value = 'Pamela Jameson';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const emailInput = document.querySelector('input[name="your-email"]');
      if (emailInput) {
        emailInput.value = 'pamela.jameson@nortiheastprecision.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const subjectInput = document.querySelector('input[name="your-subject"]');
      if (subjectInput) {
        subjectInput.value = 'Exploring Collaboration Opportunities';
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const msgInput = document.querySelector('textarea[name="your-message"]');
      if (msgInput) {
        msgInput.value = 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you,\nPamela Jameson';
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log('Fields filled. Submitting form...');
    
    // Listen to network responses
    page.on('response', async res => {
      if (res.url().includes('contact-form-7') || res.url().includes('feedback')) {
        try {
          const body = await res.text();
          console.log('CF7 Ajax Response:', res.status(), body);
        } catch (_) {}
      }
    });

    await page.evaluate(() => {
      const submitBtn = document.querySelector('form.wpcf7-form input[type="submit"], input[value="Send"]');
      if (submitBtn) submitBtn.click();
      else document.querySelector('form.wpcf7-form').submit();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const respOutput = document.querySelector('.wpcf7-response-output');
      const allDivs = Array.from(document.querySelectorAll('.wpcf7-response-output, .wpcf7-mail-sent-ok, .wpcf7-validation-errors, .alert'))
        .map(el => ({ class: el.className, text: el.innerText }));
      return { respOutput: respOutput ? respOutput.innerText : null, allDivs, url: window.location.href };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (err) {
    console.log('Error:', err);
  } finally {
    await browser.close();
  }
}

testMomentum();
