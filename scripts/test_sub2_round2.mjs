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

async function testRound2() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. #4793 Reinhardt Fabrication
  console.log('\n--- 1. Testing #4793 Reinhardt Fabrication ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.reinhardtfabrication.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('#name', { timeout: 10000 });

    await page.type('#name', OUTREACH_PROFILE.fullName);
    await page.type('#email', OUTREACH_PROFILE.email);
    await page.type('#phone', OUTREACH_PROFILE.phone);
    await page.type('#message', OUTREACH_PROFILE.message);

    console.log('Fields typed. Checking form action / attributes...');
    const formAttr = await page.evaluate(() => {
      const f = document.querySelector('form');
      return { action: f.action, method: f.method, outerHTML: f.outerHTML.slice(0, 300) };
    });
    console.log('Form attr:', formAttr);

    // Let's click submit button
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Current URL:', page.url());
      const matches = bodyText.split('\n').filter(l => /thank|sent|received|message|error|success/i.test(l));
      console.log('Post-submit snippet:', matches.slice(0, 10));
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4793:', e.message);
  }

  // 2. #4795 Teco Metal Products
  console.log('\n--- 2. Testing #4795 Teco Metal Products ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.tecometalproducts.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const formInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        placeholder: i.placeholder,
        tagName: i.tagName
      }));
    });
    console.log('Teco Metal form inputs:', formInputs);

    const nameEl = await page.$('input[placeholder*="Name"], #input_comp-jxbwzbfp');
    const emailEl = await page.$('input[placeholder*="Email"], #input_comp-jxbwzbfw');
    const subjectEl = await page.$('input[placeholder*="Subject"], #input_comp-jxbwzbg2');
    const msgEl = await page.$('textarea[placeholder*="Message"], #textarea_comp-jxbwzbg8');

    if (nameEl) await nameEl.type(OUTREACH_PROFILE.fullName);
    if (emailEl) await emailEl.type(OUTREACH_PROFILE.email);
    if (subjectEl) await subjectEl.type(OUTREACH_PROFILE.subject);
    if (msgEl) await msgEl.type(OUTREACH_PROFILE.message);

    console.log('Filled fields. Finding Wix submit button...');
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      return btns.find(b => /submit|send/i.test(b.innerText || ''));
    });

    if (submitBtn) {
      console.log('Clicking Wix submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmationText = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="inline-feedback"], [class*="success"], [class*="thank"]'));
        return alerts.map(a => a.innerText);
      });
      console.log('Wix confirmation alerts:', confirmationText);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const matches = bodyText.split('\n').filter(l => /thank|sent|received|message|error|success/i.test(l));
      console.log('Post-submit snippet:', matches.slice(0, 10));
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4795:', e.message);
  }

  // 3. #4796 DG Metal quote page
  console.log('\n--- 3. Testing #4796 DG Metal /quote ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dgmetal.works/quote', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log('DG Metal /quote forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.error('Error on #4796:', e.message);
  }

  // 4. #4800 Unique Taper Tools Inc
  console.log('\n--- 4. Testing #4800 Unique Taper Tools Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://uniquetapertools.weebly.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('form', { timeout: 10000 });

    // The single text field is virgilwade33@gmail.com * (often an email newsletter subscribe or inquiry)
    const input = await page.$('form input[type="text"]');
    if (input) {
      await input.type(OUTREACH_PROFILE.email);
      console.log('Typed email into Weebly input. Submitting...');
      const submitBtn = await page.$('form input[type="submit"], form .wsite-button');
      if (submitBtn) await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      const matches = bodyText.split('\n').filter(l => /thank|sent|received|message|error|success|subscribed/i.test(l));
      console.log('Post-submit snippet:', matches.slice(0, 10));
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4800:', e.message);
  }

  await browser.close();
}

testRound2();
