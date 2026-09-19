import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const profile = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  subject: 'Custom Sheet Metal & Precision Fabrication Inquiry',
  message: 'Hello, reaching out on behalf of Northeast Precision Machinery regarding custom sheet metal fabrication capabilities and potential collaboration. Thank you, Pamela Jameson'
};

async function testSouthTexas() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wix-forms') || res.url().includes('submit') || res.request().method() === 'POST') {
      try {
        console.log('[Response]:', res.url(), res.status(), (await res.text()).slice(0, 200));
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://southtexassheetmetal.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate(() => {
      const f = document.querySelector('form[aria-label="Contact Form"]');
      if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    const fNameSel = 'input[aria-label="First Name"]';
    const lNameSel = 'input[aria-label="Last Name"]';
    const emailSel = 'input[aria-label="Email"]';
    const subjectSel = 'input[aria-label="Subject"]';
    const messageSel = 'textarea[aria-label="Message"]';

    await page.waitForSelector(fNameSel, { timeout: 5000 });
    await page.click(fNameSel);
    await page.type(fNameSel, profile.firstName, { delay: 20 });

    await page.click(lNameSel);
    await page.type(lNameSel, profile.lastName, { delay: 20 });

    await page.click(emailSel);
    await page.type(emailSel, profile.email, { delay: 20 });

    await page.click(subjectSel);
    await page.type(subjectSel, profile.subject, { delay: 20 });

    await page.click(messageSel);
    await page.type(messageSel, profile.message, { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking button via evaluate and native...');
    const btnHandle = await page.$('button[data-hook="submit-button"]');
    if (btnHandle) {
      await btnHandle.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const afterState = await page.evaluate(() => {
      return {
        bodyMatches: document.body.innerText.match(/(?:thank you|thanks|received|submitted)[^\n.!]*/i),
        formHtml: document.querySelector('form[aria-label="Contact Form"]')?.innerText
      };
    });
    console.log('After state:', afterState);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testSouthTexas();
