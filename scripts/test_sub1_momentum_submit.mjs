import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkMomentum() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://momentumtx.com/contact.php', { waitUntil: 'networkidle2' });
  const html = await page.evaluate(() => {
    const f = document.querySelector('form');
    return {
      action: f?.action,
      method: f?.method,
      html: f?.outerHTML
    };
  });
  console.log('Form details:', html);

  await page.evaluate(() => {
    document.querySelector('input[name="your-name"]').value = 'Pamela Jameson';
    document.querySelector('input[name="your-email"]').value = 'pamela.jameson@nortiheastprecision.com';
    document.querySelector('input[name="your-subject"]').value = 'Project Collaboration Inquiry';
    document.querySelector('textarea[name="your-message"]').value = 'Hello, We would like to inquire about your engineering services. Please contact Pamela Jameson.';
  });

  console.log('Submitting via form.submit()...');
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Navigation event:', e.message)),
    page.evaluate(() => {
      document.querySelector('form').submit();
    })
  ]);

  console.log('Post submit URL:', page.url());
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500));
  console.log('Post submit text:', bodyText);

  await browser.close();
}

checkMomentum();
