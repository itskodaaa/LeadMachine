import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('email') || u.includes('godaddy') || u.includes('conversations') || u.includes('forms')) {
      console.log(`HTTP ${res.status()} -> ${u.substring(0, 100)}`);
      try {
        const txt = await res.text();
        console.log(`Resp: ${txt.substring(0, 150)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://twistedmetalswelding.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const nameSel = '[data-aid="CONTACT_FORM_NAME"]';
    const emailSel = '[data-aid="CONTACT_FORM_EMAIL"]';
    const msgSel = '[data-aid="CONTACT_FORM_MESSAGE"]';
    const submitSel = '[data-aid="CONTACT_SUBMIT_BUTTON_REND"]';

    await page.waitForSelector(nameSel);
    await page.click(nameSel);
    await page.type(nameSel, 'Pamela Jameson', { delay: 30 });

    await page.click(emailSel);
    await page.type(emailSel, 'pamela.jameson@nortiheastprecision.com', { delay: 30 });

    await page.click(msgSel);
    await page.type(msgSel, 'Hello, I am reaching out to explore potential collaboration and request quotes for upcoming projects. Kindly have a representative contact us.', { delay: 20 });

    console.log('Typed into fields using Puppeteer type. Clicking submit...');
    await page.click(submitSel);

    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const res = await page.evaluate(() => {
        const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS"], [data-aid*="SUCCESS"], .success, [role="alert"]');
        return {
          successText: successEl ? successEl.innerText : null,
          allBody: document.body.innerText.includes('Thank') || document.body.innerText.includes('thank')
        };
      });
      console.log(`Poll ${i}:`, JSON.stringify(res));
      if (res.successText || res.allBody) break;
    }
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
}

run();
