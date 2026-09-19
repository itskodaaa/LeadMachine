import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testTDEngineers() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://tdengineers.com/contact.php', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Landed on:', page.url());

    // Inspect the form DOM details (labels, hidden fields, honeypot)
    const domDetails = await page.evaluate(() => {
      const f = document.querySelector('form');
      return {
        action: f.action,
        method: f.method,
        html: f.innerHTML
      };
    });
    console.log('Form HTML:\n', domDetails.html);

    // Let's fill the fields
    await page.evaluate(() => {
      // Find element0 (Name)
      const nameInput = document.querySelector('[name="form[element0]"]');
      if (nameInput) nameInput.value = 'Pamela Jameson';

      // Find element10 (Email)
      const emailInput = document.querySelector('[name="form[element10]"]');
      if (emailInput) emailInput.value = 'pamela.jameson@nortiheastprecision.com';

      // Find element11 (Questions/Message)
      const msgInput = document.querySelector('[name="form[element11]"]');
      if (msgInput) msgInput.value = 'Hello, I am reaching out on behalf of Northeast Precision Machinery to express our interest in your electrical engineering services and would appreciate discussing opportunities for collaboration on upcoming project quotes. Thank you, Pamela Jameson (708-568-3708)';

      // Check if comment field is hidden or honeypot
      const commentInput = document.querySelector('[name="comment"]');
      if (commentInput) {
        // Leave empty!
        console.log('Comment input found - leaving blank as honeypot');
      }
    });

    console.log('Submitting T&D Engineers form...');
    await Promise.all([
      page.click('input[name="submitButton"]'),
      page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('No navigation'))
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL after submit:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body after submit:\n', bodyText);

  } catch (e) {
    console.error('Error on TD Engineers:', e.message);
  } finally {
    await browser.close();
  }
}

testTDEngineers();
