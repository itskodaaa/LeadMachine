import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function debug168() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php') || res.request().method() === 'POST') {
      try {
        const text = await res.text();
        console.log(`Response from ${res.url()}: status ${res.status()}, body: ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://jpgconstruction.us/', { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.type('input[name="form_fields[name]"]', 'Pamela Jameson');
    await page.type('input[name="form_fields[email]"]', 'pamela.jameson@nortiheastprecision.com');
    await page.type('input[name="form_fields[field_7394dff]"]', '708-568-3708');
    await page.type('textarea[name="form_fields[field_6a4a4c1]"]', 'Hello, I am reaching out regarding potential collaboration.');

    console.log('Clicking button...');
    await page.click('.elementor-form button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const html = await page.evaluate(() => {
      const f = document.querySelector('.elementor-form');
      return f ? f.outerHTML : 'no form';
    });
    console.log('Form HTML after submit:', html.slice(0, 1000));

  } catch (err) {
    console.error('Debug error:', err.message);
  } finally {
    await browser.close();
  }
}

debug168();
