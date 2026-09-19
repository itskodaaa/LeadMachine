import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testSingle(id, name, url, fillFn) {
  console.log(`\n========================================\nTesting #${id} ${name} (${url})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await fillFn(page);
    await new Promise(r => setTimeout(r, 6000));
    
    const pageUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    console.log(`Final URL: ${pageUrl}`);
    console.log(`Body snippet: ${bodyText.slice(0, 300).replace(/\n+/g, ' ')}`);
  } catch (e) {
    console.log(`Error on #${id}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  // #3843: Norlee Group / Colwill Engineering
  await testSingle(3843, 'Colwill Engineering', 'https://norleegroup.com/contact-us/', async (page) => {
    await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return;
      const fn = form.querySelector('input[name="first-name"]'); if (fn) fn.value = p.firstName;
      const ln = form.querySelector('input[name="last-name"]'); if (ln) ln.value = p.lastName;
      const comp = form.querySelector('input[name="company-name"]'); if (comp) comp.value = p.company;
      const em = form.querySelector('input[name="email"]'); if (em) em.value = p.email;
      const ph = form.querySelector('input[name="phone"]'); if (ph) ph.value = p.phone;
      const msg = form.querySelector('textarea[name="message"]'); if (msg) msg.value = p.message;
      const sel = form.querySelector('select[name="inquiry"]'); if (sel && sel.options.length > 1) sel.selectedIndex = 1;
    }, OUTREACH);
    console.log('Submitting #3843...');
    await page.click('form.wpcf7-form input[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    const output = await page.evaluate(() => document.querySelector('.wpcf7-response-output')?.innerText);
    console.log('#3843 wpcf7 response:', output);
  });

  // #3844: Hahn Engineering
  await testSingle(3844, 'Hahn Engineering, Inc.', 'https://www.hahneng.com/contact-us-tampa-fl', async (page) => {
    const res = await page.evaluate((p) => {
      const name = document.querySelector('input[name="dmform-0"]');
      if (name) { name.value = p.fullName; name.dispatchEvent(new Event('input', {bubbles:true})); }
      const email = document.querySelector('input[name="dmform-1"]');
      if (email) { email.value = p.email; email.dispatchEvent(new Event('input', {bubbles:true})); }
      const sel = document.querySelector('select[name="dmform-4"]');
      if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', {bubbles:true})); }
      const msg = document.querySelector('textarea[name="dmform-3"]');
      if (msg) { msg.value = p.message; msg.dispatchEvent(new Event('input', {bubbles:true})); }
      const btn = document.querySelector('form[id="1558203439"] input[type="submit"], form[id="1558203439"] button');
      if (btn) btn.click();
    }, OUTREACH);
    console.log('Submitted #3844, waiting...');
    await new Promise(r => setTimeout(r, 5000));
    const result = await page.evaluate(() => {
      const err = document.querySelector('.dmform-error, [class*="error"]');
      const succ = document.querySelector('.dmform-success, [class*="success"]');
      return {
        errVisible: err ? (err.offsetWidth > 0 && err.offsetHeight > 0) : false,
        errText: err ? err.innerText : null,
        succVisible: succ ? (succ.offsetWidth > 0 && succ.offsetHeight > 0) : false,
        succText: succ ? succ.innerText : null
      };
    });
    console.log('#3844 status:', result);
  });

  // #3846: Emerald Engineering
  await testSingle(3846, 'Emerald Engineering, Inc.', 'https://emeraldmep.com/contact/', async (page) => {
    await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return;
      const fn = form.querySelector('input[name="first-name"]'); if (fn) fn.value = p.firstName;
      const ln = form.querySelector('input[name="last-name"]'); if (ln) ln.value = p.lastName;
      const em = form.querySelector('input[name="your-email"]'); if (em) em.value = p.email;
      const ph = form.querySelector('input[name="phone-number"]'); if (ph) ph.value = p.phone;
      const subj = form.querySelector('input[name="your-subject"]'); if (subj) subj.value = p.subject;
      const msg = form.querySelector('textarea[name="your-message"]'); if (msg) msg.value = p.message;
    }, OUTREACH);
    console.log('Submitting #3846...');
    await page.click('form.wpcf7-form input[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    const output = await page.evaluate(() => document.querySelector('.wpcf7-response-output')?.innerText);
    console.log('#3846 wpcf7 response:', output);
  });

  // #3847: Hibbard Engineering
  await testSingle(3847, 'Hibbard Engineering', 'https://hibbardengineering.com/', async (page) => {
    await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return;
      const name = form.querySelector('input[name="your-name"]'); if (name) name.value = p.fullName;
      const em = form.querySelector('input[name="your-email"]'); if (em) em.value = p.email;
      const ph = form.querySelector('input[name="your-phone"]'); if (ph) ph.value = p.phone;
      const subj = form.querySelector('input[name="your-subject"]'); if (subj) subj.value = p.subject;
      const sel = form.querySelector('select[name="your-interest"]'); if (sel && sel.options.length > 1) sel.selectedIndex = 1;
    }, OUTREACH);
    console.log('Submitting #3847...');
    await page.click('form.wpcf7-form input[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    const output = await page.evaluate(() => document.querySelector('.wpcf7-response-output')?.innerText);
    console.log('#3847 wpcf7 response:', output);
  });
}

run();
