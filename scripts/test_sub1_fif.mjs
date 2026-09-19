import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testFIF() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to https://www.fifengineering.com/contact-us...');
    await page.goto('https://www.fifengineering.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    page.on('response', async res => {
      if (res.url().includes('form') || res.url().includes('duda') || res.url().includes('ajax')) {
        try {
          const text = await res.text();
          console.log(`Response from ${res.url()}:`, text.slice(0, 300));
        } catch (_) {}
      }
    });

    await page.evaluate(() => {
      document.querySelector('input[name="dmform-0"]').value = 'Pamela Jameson';
      document.querySelector('input[name="dmform-1"]').value = 'pamela.jameson@nortiheastprecision.com';
      document.querySelector('input[name="dmform-2"]').value = '708-568-3708';
      document.querySelector('textarea[name="dmform-3"]').value = 'Hello, We are interested in your engineering services and would like to discuss potential collaboration on upcoming projects. Please have a representative contact us.';
      
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    console.log('Clicking submit on FIF Engineering...');
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('.dmform-success, .alert, .success, [class*="success"], [class*="response"], [class*="message"]'))
        .map(el => ({ class: el.className, text: el.innerText }));
      return { url: window.location.href, messages, body: document.body.innerText.slice(0, 500) };
    });

    console.log('FIF Result:', JSON.stringify(result, null, 2));

  } catch (err) {
    console.log('Error:', err);
  } finally {
    await browser.close();
  }
}

testFIF();
