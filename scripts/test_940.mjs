import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: 'Hello, I am reaching out to express our interest in your infrastructure and engineering services and explore potential collaboration opportunities. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('admin-ajax')) {
      console.log('Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).substring(0, 300));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://yorkshireindustries.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#de_fb_first', OUTREACH_PROFILE.firstName);
    await page.type('#de_fb_last', OUTREACH_PROFILE.lastName);
    await page.type('#de_fb_email', OUTREACH_PROFILE.email);
    await page.type('#de_fb_phone', OUTREACH_PROFILE.phone);
    await page.type('#de_fb_message', OUTREACH_PROFILE.message);

    console.log('Form typed. Clicking Submit...');
    await page.click('button[type="submit"], input[type="submit"], .et_pb_contact_submit');

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.et-pb-contact-message, .et_pb_contact_message, .success, [role="alert"]')).map(m => m.innerText);
      const text = document.body ? document.body.innerText : '';
      return {
        msgs,
        hasThank: text.toLowerCase().includes('thank') || text.toLowerCase().includes('sent') || text.toLowerCase().includes('received'),
        snippet: text.substring(0, 400)
      };
    });

    console.log('Result:', result);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
