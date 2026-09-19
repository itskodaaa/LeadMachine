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

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testTechniWeeblyTeco() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. #4800 Unique Taper Tools Inc
  console.log('\n========================================');
  console.log('Testing Lead #4800 Unique Taper Tools Inc');
  try {
    const page = await browser.newPage();
    await page.goto('https://uniquetapertools.weebly.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#input-329407234715420164', { timeout: 10000 });
    await page.type('#input-329407234715420164', OUTREACH_PROFILE.email);

    // Intercept Weebly ajax form submit
    page.on('response', async res => {
      if (res.url().includes('formSubmitAjax.php')) {
        try {
          const body = await res.text();
          console.log('Weebly formSubmitAjax response:', body);
        } catch (_) {}
      }
    });

    console.log('Clicking Weebly submit button...');
    await page.evaluate(() => {
      const btn = document.querySelector('a.wsite-button');
      if (btn) btn.click();
      else document.querySelector('form').submit();
    });

    await new Promise(r => setTimeout(r, 6000));
    const bodyText = await page.evaluate(() => document.body.innerText);
    const matches = bodyText.split('\n').filter(l => /thank|sent|received|message|error|success|subscribed|virgil/i.test(l));
    console.log('Weebly post-submit matches:', matches.slice(0, 10));
    await page.close();
  } catch (e) {
    console.error('Error on #4800:', e.message);
  }

  // 2. #4801 Techni Tool Inc
  console.log('\n========================================');
  console.log('Testing Lead #4801 Techni Tool Inc');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.technitoolinc.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('#form-field-name', { timeout: 10000 });

    await page.type('#form-field-name', OUTREACH_PROFILE.fullName);
    await page.type('#form-field-field_b77bda8', OUTREACH_PROFILE.phone);
    await page.type('#form-field-email', OUTREACH_PROFILE.email);
    await page.type('#form-field-field_0eaf3a0', OUTREACH_PROFILE.company);
    await page.type('#form-field-message', OUTREACH_PROFILE.message);

    // Check checkboxes
    await page.evaluate(() => {
      const cb = document.querySelector('#form-field-field_50495fd-0');
      if (cb) cb.checked = true;
    });

    console.log('Filled Techni Tool form. Listening to ajax responses...');
    let elementorResponse = null;
    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          elementorResponse = await res.text();
          console.log('Elementor form ajax response:', elementorResponse);
        } catch (_) {}
      }
    });

    console.log('Clicking submit on Techni Tool...');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('.elementor-form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 8000));
    const confirmation = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message');
      return msg ? msg.innerText : null;
    });
    console.log('Elementor confirmation message:', confirmation);

    const bodySnippet = await page.evaluate(() => {
      return document.body.innerText.split('\n').filter(l => /thank|sent|received|message|error|success/i.test(l));
    });
    console.log('Techni Tool snippet:', bodySnippet.slice(0, 10));

    await page.close();
  } catch (e) {
    console.error('Error on #4801:', e.message);
  }

  // 3. #4795 Teco Metal Products (Wix Form)
  console.log('\n========================================');
  console.log('Testing Lead #4795 Teco Metal Products (Detailed Wix)');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.tecometalproducts.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    // Listen to network responses
    page.on('response', async res => {
      if (res.url().includes('wix') && (res.url().includes('submit') || res.url().includes('form') || res.url().includes('contact'))) {
        try {
          const txt = await res.text();
          console.log(`Wix network [${res.status()}] ${res.url().slice(0, 80)}:`, txt.slice(0, 150));
        } catch (_) {}
      }
    });

    // Type with puppeteer focus/click
    await page.click('#input_comp-jxbwzbfp');
    await page.type('#input_comp-jxbwzbfp', OUTREACH_PROFILE.fullName);

    await page.click('#input_comp-jxbwzbfw');
    await page.type('#input_comp-jxbwzbfw', OUTREACH_PROFILE.email);

    await page.click('#input_comp-jxbwzbg2');
    await page.type('#input_comp-jxbwzbg2', OUTREACH_PROFILE.subject);

    await page.click('#textarea_comp-jxbwzbg8');
    await page.type('#textarea_comp-jxbwzbg8', OUTREACH_PROFILE.message);

    console.log('Fields filled. Finding Wix submit button...');
    const submitBtnInfo = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit|send/i.test(b.innerText || ''));
      if (!btn) return null;
      return { id: btn.id, text: btn.innerText, tag: btn.tagName, rect: btn.getBoundingClientRect() };
    });
    console.log('Submit button info:', submitBtnInfo);

    if (submitBtnInfo) {
      await page.click(`button#${submitBtnInfo.id}`);
      await new Promise(r => setTimeout(r, 7000));

      const confirmation = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="inline-feedback"], [role="alert"], [class*="message"], [class*="success"]'))
          .map(el => el.innerText);
      });
      console.log('Wix confirmation element:', confirmation);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4795:', e.message);
  }

  await browser.close();
}

testTechniWeeblyTeco();
