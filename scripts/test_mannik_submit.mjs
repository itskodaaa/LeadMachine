import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testMannikSubmit() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://manniksmithgroup.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Landed on:', page.url());

    // Check hidden fields
    const hiddenFields = await page.evaluate(() => {
      const f = document.querySelectorAll('form')[1];
      return Array.from(f.querySelectorAll('input[type="hidden"]')).map(i => ({ name: i.name, value: i.value }));
    });
    console.log('Hidden fields:', hiddenFields);

    await page.type('#from-name', 'Pamela Jameson');
    await page.type('#from-email', 'pamela.jameson@nortiheastprecision.com');
    await page.type('#subject', 'Exploring Collaboration Opportunities');
    await page.type('#message', 'Hello,\n\nI am reaching out on behalf of Northeast Precision Machinery, Inc. to express our interest in your civil and structural engineering consulting services. We would appreciate the opportunity to explore a potential collaboration on upcoming projects. Kindly have a representative contact us at your earliest convenience (Phone: 708-568-3708).\n\nThank you,\nPamela Jameson');

    console.log('Fields filled. Submitting...');
    page.on('response', res => {
      if (res.status() >= 400) console.log('Response code:', res.status(), res.url());
    });

    await Promise.all([
      page.evaluate(() => {
        const f = document.querySelectorAll('form')[1];
        const btn = f.querySelector('button, input[type="submit"]') || Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('SEND MESSAGE'));
        if (btn) btn.click();
        else f.submit();
      }),
      page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('No navigation'))
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL after submit:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    const messages = await page.evaluate(() => {
      const alerts = document.querySelectorAll('.alert, .success, .message, [role="alert"], .notification');
      return Array.from(alerts).map(a => a.innerText);
    });
    console.log('Alert messages:', messages);
    console.log('Body snippet after submit:\n', bodyText.slice(0, 800));

  } catch (e) {
    console.error('Error submitting Mannik:', e.message);
  } finally {
    await browser.close();
  }
}

testMannikSubmit();
