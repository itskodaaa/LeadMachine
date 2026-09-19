import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testGoDaddySites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Sanrachna Steel (4391)
  console.log('\n=== Submitting Sanrachna Steel (4391) ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://sanrachnasteel.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill
    await page.type('#input4', OUTREACH_PROFILE.fullName);
    await page.type('#input5', OUTREACH_PROFILE.email);
    await page.type('#input6', OUTREACH_PROFILE.phone);
    await page.type('textarea', OUTREACH_PROFILE.message);

    console.log('Sanrachna typed. Clicking Send button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'send');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const sanrachnaResult = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, [data-aid*="message"], [data-aid*="MESSAGE"]')).map(el => el.innerText);
      const text = document.body.innerText;
      return {
        alerts,
        hasThankYou: /thank you|thanks for|message has been sent|we will contact/i.test(text),
        excerpt: text.substring(0, 400)
      };
    });
    console.log('Sanrachna result:', sanrachnaResult);
    await page.close();
  } catch (e) {
    console.log('Sanrachna error:', e.message);
  }

  // 2. Sykes Consulting (4392)
  console.log('\n=== Submitting Sykes Consulting (4392) ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://sykes-consulting.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill
    await page.type('#input3', OUTREACH_PROFILE.fullName);
    await page.type('#input4', OUTREACH_PROFILE.email);
    await page.type('#input5', OUTREACH_PROFILE.phone);
    await page.type('textarea', OUTREACH_PROFILE.message);

    console.log('Sykes typed. Clicking Send button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'send');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const sykesResult = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, [data-aid*="message"], [data-aid*="MESSAGE"]')).map(el => el.innerText);
      const text = document.body.innerText;
      return {
        alerts,
        hasThankYou: /thank you|thanks for|message has been sent|we will contact/i.test(text),
        excerpt: text.substring(0, 400)
      };
    });
    console.log('Sykes result:', sykesResult);
    await page.close();
  } catch (e) {
    console.log('Sykes error:', e.message);
  }

  // 3. jblueprints Google Form (4387)
  console.log('\n=== Inspecting jblueprints Google form (4387) ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://docs.google.com/forms/d/e/1FAIpQLSdQxQxZ_N4F2E49i_yQZ1wV1r5Cj5i0s_g_t-g-n/viewform', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async () => {
      await page.goto('https://forms.gle/p9QBZHHkhwg2GVaQ8', { waitUntil: 'domcontentloaded', timeout: 15000 });
    });
    console.log('Google form URL:', page.url());
    console.log('Google form Title:', await page.title());
    const gformTitle = await page.title();
    const gformText = await page.evaluate(() => document.body.innerText);
    console.log('Google form excerpt:', gformText.substring(0, 300));
    await page.close();
  } catch (e) {
    console.log('Google form error:', e.message);
  }

  await browser.close();
}

testGoDaddySites();
