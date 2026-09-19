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

async function testInteractions() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test 1: Paradigm (#4430)
  console.log('--- TESTING PARADIGM (#4430) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://paradigmeng.net/', { waitUntil: 'networkidle2' });
    
    // Fill fields
    await page.type('#input1', PROFILE.name);
    await page.type('#input2', PROFILE.email);
    await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', PROFILE.message);

    console.log('Paradigm filled, finding submit button...');
    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (btn) {
      console.log('Clicking Paradigm submit button...');
      await btn.click();
      await new Promise(r => setTimeout(r, 5000));
      const result = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="CONFIRMATION"], [data-aid*="SUCCESS"], .x-el-p')).map(el => el.innerText);
        return {
          bodySnippet: document.body.innerText.slice(0, 1000),
          alerts: alerts.filter(t => /thank|sent|success|receive/i.test(t))
        };
      });
      console.log('Paradigm result:', result);
    }
    await page.close();
  } catch (e) {
    console.log('Paradigm error:', e.message);
  }

  // Test 2: ICE (#4429)
  console.log('--- TESTING ICE (#4429) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://iceagents.com/', { waitUntil: 'networkidle2' });
    await page.type('input[name="your-name"]', PROFILE.name);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('input[name="your-subject"]', PROFILE.subject);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('ICE filled, submitting form...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const result = await page.evaluate(() => {
        const output = document.querySelector('.wpcf7-response-output');
        const notValidTips = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(e => e.innerText);
        return {
          responseText: output ? output.innerText : null,
          responseClass: output ? output.className : null,
          notValidTips
        };
      });
      console.log('ICE result:', result);
    }
    await page.close();
  } catch (e) {
    console.log('ICE error:', e.message);
  }

  // Test 3: Precision Measurements (#4436)
  console.log('--- INSPECTING PM (#4436) item6 ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://precision-measurements.com/pm-home-contact.php', { waitUntil: 'networkidle2' });
    const pmInfo = await page.evaluate(() => {
      const allText = document.body.innerText;
      const images = Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src, alt: img.alt, class: img.className }));
      return { allText, images };
    });
    console.log('PM text:', pmInfo.allText);
    console.log('PM images:', pmInfo.images);
    await page.close();
  } catch (e) {
    console.log('PM error:', e.message);
  }

  // Test 4: Dynabal (#4433)
  console.log('--- INSPECTING DYNABAL (#4433) entire HTML ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dynabal.com/contact.html', { waitUntil: 'domcontentloaded' });
    const dynaSource = await page.content();
    console.log('Dynabal <form> matches:');
    const matches = dynaSource.match(/<form[\s\S]*?<\/form>/gi);
    if (matches) {
      console.log(`Found ${matches.length} forms:`, matches.map(m => m.slice(0, 300)));
    } else {
      console.log('No standard <form> tag found. Searching for "form" keyword in source:');
      const idx = dynaSource.indexOf('form');
      console.log(dynaSource.slice(Math.max(0, idx - 100), idx + 200));
    }
    await page.close();
  } catch (e) {
    console.log('Dynabal error:', e.message);
  }

  await browser.close();
}

testInteractions();
