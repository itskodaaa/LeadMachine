import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you,
Pamela Jameson`
};

async function testTargeted() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Test #3307 LTI Engineering (CF7)
  console.log('\n========================================\n--- Testing #3307 LTI Engineering ---');
  try {
    const page = await browser.newPage();
    page.on('dialog', async d => { console.log('Dialog:', d.message()); await d.dismiss(); });
    await page.goto('https://ltieng.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Fill CF7 fields
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="your-subject"]', OUTREACH_PROFILE.subject);
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Filled CF7. Clicking submit...');
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('contact-form-7') || res.url().includes('feedback'), { timeout: 10000 }).catch(e => null),
      page.click('input[type="submit"].wpcf7-submit')
    ]);

    if (response) {
      console.log('CF7 Response status:', response.status());
      try {
        const json = await response.json();
        console.log('CF7 Response JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('CF7 Response text:', await response.text());
      }
    }

    await new Promise(r => setTimeout(r, 4000));
    const output = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output');
      return {
        respText: resp ? resp.innerText : null,
        classes: resp ? resp.className : null,
        formClasses: document.querySelector('form.wpcf7-form')?.className
      };
    });
    console.log('CF7 Output element:', output);
    await page.close();
  } catch (e) {
    console.log('3307 Error:', e.message);
  }

  // 2. Test #3304 JM Welding (GoDaddy Builder)
  console.log('\n========================================\n--- Testing #3304 JM Welding ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jmweld.com/', { waitUntil: 'networkidle2', timeout: 20000 });

    const emailSelector = 'input[data-aid="CONTACT_FORM_EMAIL"]';
    const msgSelector = 'textarea[data-aid="CONTACT_FORM_MESSAGE"]';
    
    await page.waitForSelector(emailSelector, { timeout: 5000 });
    await page.click(emailSelector);
    await page.type(emailSelector, OUTREACH_PROFILE.email);

    await page.click(msgSelector);
    await page.type(msgSelector, OUTREACH_PROFILE.message);

    console.log('Filled JM Welding. Clicking submit...');
    const submitBtn = await page.$('form button, form [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send'));
        if (btn) btn.click();
      });
    }

    await new Promise(r => setTimeout(r, 5000));
    const godaddyRes = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 500),
        alerts: Array.from(document.querySelectorAll('[role="alert"], [data-aid*="CONFIRMATION"], [data-aid*="SUCCESS"], .notification, .alert')).map(el => el.innerText)
      };
    });
    console.log('JM Welding result:', JSON.stringify(godaddyRes, null, 2));
    await page.close();
  } catch (e) {
    console.log('3304 Error:', e.message);
  }

  // 3. Inspect #3305 IDS Power captcha
  console.log('\n========================================\n--- Inspecting #3305 IDS Power Captcha ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    const cap = await page.evaluate(() => {
      const captchaEl = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]');
      return Array.from(captchaEl).map(el => ({
        tag: el.tagName,
        src: el.getAttribute('src'),
        sitekey: el.getAttribute('data-sitekey'),
        class: el.className
      }));
    });
    console.log('IDS Captcha info:', JSON.stringify(cap, null, 2));
    await page.close();
  } catch (e) {
    console.log('3305 Error:', e.message);
  }

  // 4. Inspect #3306 Tovey Engineering "Click to Request Information" link
  console.log('\n========================================\n--- Inspecting #3306 Tovey Engineering Link ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.toveyengineering.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const link = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find(el => el.innerText.includes('Request Information'));
      return a ? { text: a.innerText, href: a.href } : null;
    });
    console.log('Tovey Request Info link:', link);
    if (link && link.href) {
      await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Target URL:', page.url());
      const hasForm = await page.evaluate(() => document.querySelectorAll('form').length);
      console.log('Target forms count:', hasForm);
    }
    await page.close();
  } catch (e) {
    console.log('3306 Error:', e.message);
  }

  await browser.close();
}

testTargeted();
