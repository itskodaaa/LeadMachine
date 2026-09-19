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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function checkOJD() {
  console.log('\n=== Checking #3507 OJD Engineering (https://ojdengineering.com/contact/) ===');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://ojdengineering.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          tag: i.tagName.toLowerCase(),
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      }));
    });
    console.log('Forms on OJD contact:', JSON.stringify(forms, null, 2));

    const captcha = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, [src*="recaptcha"]'),
        turnstile: !!document.querySelector('.cf-turnstile, [src*="challenges.cloudflare.com"]'),
        hcaptcha: !!document.querySelector('.h-captcha, [src*="hcaptcha"]')
      };
    });
    console.log('Captcha:', captcha);

    // If form exists and no blocking captcha, fill and submit!
    const wpform = await page.$('form.wpforms-form, form');
    if (wpform) {
      console.log('Attempting to fill OJD form...');
      // Fill inputs
      const nameInput = await page.$('input[name*="name"], input[id*="name"], input[placeholder*="Name"]');
      if (nameInput) await nameInput.type(OUTREACH.fullName, { delay: 20 });

      const emailInput = await page.$('input[type="email"], input[name*="email"], input[id*="email"]');
      if (emailInput) await emailInput.type(OUTREACH.email, { delay: 20 });

      const phoneInput = await page.$('input[type="tel"], input[name*="phone"], input[id*="phone"]');
      if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 20 });

      const msgInput = await page.$('textarea');
      if (msgInput) await msgInput.type(OUTREACH.message, { delay: 10 });

      console.log('Submitting OJD form...');
      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          submitBtn.click(),
          new Promise(r => setTimeout(r, 6000))
        ]);
        const text = await page.evaluate(() => document.body.innerText);
        const confirmation = text.includes('Thank you') || text.includes('thanks') || text.includes('message has been sent') || text.includes('we have received');
        console.log('OJD Submission confirmation detected:', confirmation);
        console.log('OJD Text snippet:', text.slice(0, 400));
      }
    }
  } catch (e) {
    console.error('OJD error:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkRedRiver() {
  console.log('\n=== Checking #3506 Red River Precision with resource aborting ===');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto('https://www.redriverprec.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Red River Title:', await page.title());
    console.log('Red River URL:', page.url());

    const contacts = await page.evaluate(() => {
      const text = document.body.innerText;
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() }));
      return { emails: Array.from(new Set(emails)), links: links.filter(l => /contact|quote|about/i.test(l.text) || /contact/i.test(l.href)) };
    });
    console.log('Red River Contacts & links:', contacts);
  } catch (e) {
    console.error('Red River error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await checkOJD();
  await checkRedRiver();
}

main();
