import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function inspectCEI() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.goto('https://cei-az.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      className: f.className,
      id: f.id,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
    }));
  });
  console.log('All forms on CEI:', JSON.stringify(forms, null, 2));

  // If there's a contact form, fill it and submit specifically
  const contactFormIndex = forms.findIndex(f => f.inputs.some(i => i.name === 'contact_name'));
  if (contactFormIndex !== -1) {
    console.log(`Found contact form at index ${contactFormIndex}!`);
    
    page.on('response', async resp => {
      if (resp.request().method() === 'POST' || resp.url().includes('admin-ajax') || resp.url().includes('feedback')) {
        try {
          console.log(`CEI Response [${resp.status()}]: ${resp.url()} -> ${(await resp.text()).slice(0, 300)}`);
        } catch (_) {}
      }
    });

    await page.evaluate((p, idx) => {
      const f = document.querySelectorAll('form')[idx];
      const name = f.querySelector('input[name="contact_name"]');
      const email = f.querySelector('input[name="contact_email"]');
      const subj = f.querySelector('input[name="contact_subject"]');
      const comm = f.querySelector('textarea[name="contact_comment"]');

      if (name) name.value = p.fullName;
      if (email) email.value = p.email;
      if (subj) subj.value = p.subject;
      if (comm) comm.value = p.message;

      const submit = f.querySelector('input[type="submit"], button[type="submit"]');
      if (submit) submit.click();
      else f.submit();
    }, OUTREACH_PROFILE, contactFormIndex);

    await new Promise(r => setTimeout(r, 6000));

    const confirmation = await page.evaluate((idx) => {
      const f = document.querySelectorAll('form')[idx];
      const wpcf7Msg = document.querySelector('.wpcf7-response-output');
      return {
        wpcf7Msg: wpcf7Msg ? wpcf7Msg.innerText : null,
        formText: f ? f.innerText : null
      };
    }, contactFormIndex);

    console.log('CEI Confirmation:', confirmation);
  }

  await browser.close();
}

inspectCEI();
