import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function runHeaded() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. ICE (#4429)
  console.log('--- HEADED: ICE (#4429) ---');
  try {
    const page = await browser.newPage();
    page.on('response', async res => {
      if (res.url().includes('contact-forms') || res.url().includes('feedback')) {
        console.log(`[ICE Res ${res.status()}] ${res.url()}:`, await res.text());
      }
    });

    await page.goto('https://iceagents.com/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to form
    await page.evaluate(() => {
      document.querySelector('form.wpcf7-form')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.click('input[name="your-name"]');
    await page.keyboard.type(PROFILE.name, { delay: 30 });

    await page.click('input[name="your-email"]');
    await page.keyboard.type(PROFILE.email, { delay: 30 });

    await page.click('input[name="your-subject"]');
    await page.keyboard.type(PROFILE.subject, { delay: 30 });

    await page.click('textarea[name="your-message"]');
    await page.keyboard.type(PROFILE.message, { delay: 15 });

    console.log('Filled ICE form. Clicking submit button with mouse...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 8000));
    }

    const iceOutput = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return {
        text: out ? out.innerText : null,
        className: out ? out.className : null
      };
    });
    console.log('ICE headed output:', iceOutput);
    await page.close();
  } catch (e) {
    console.log('ICE headed err:', e.message);
  }

  // 2. Paradigm (#4430)
  console.log('\n--- HEADED: PARADIGM (#4430) ---');
  try {
    const page = await browser.newPage();
    page.on('response', async res => {
      if (res.url().includes('apps-api') || res.url().includes('messages') || res.url().includes('contact')) {
        try {
          const t = await res.text();
          if (t.length < 500) console.log(`[Paradigm Res ${res.status()}] ${res.url()}:`, t);
        } catch(e) {}
      }
    });

    await page.goto('https://paradigmeng.net/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to form
    await page.evaluate(() => {
      document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.click('#input1');
    await page.keyboard.type(PROFILE.name, { delay: 30 });

    await page.click('#input2');
    await page.keyboard.type(PROFILE.email, { delay: 30 });

    await page.click('textarea[data-aid="CONTACT_FORM_MESSAGE"]');
    await page.keyboard.type(PROFILE.message, { delay: 15 });

    console.log('Paradigm filled. Clicking Send button...');
    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 8000));
    }

    const paraOutput = await page.evaluate(() => {
      return {
        bodySnippet: document.body.innerText.slice(0, 500),
        thankYou: /thank you/i.test(document.body.innerText)
      };
    });
    console.log('Paradigm headed output:', paraOutput);
    await page.close();
  } catch (e) {
    console.log('Paradigm headed err:', e.message);
  }

  await browser.close();
}

runHeaded();
