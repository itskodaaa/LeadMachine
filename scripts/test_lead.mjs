import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const lead = process.argv[2];

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
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  if (lead === '4134') {
    console.log('Testing 4134 houston civil engineering...');
    await page.goto('https://houstoncivil.com/contact/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await page.type('#form-field-name', OUTREACH_PROFILE.fullName);
    await page.type('#form-field-email', OUTREACH_PROFILE.email);
    await page.type('#form-field-message', OUTREACH_PROFILE.message);
    
    console.log('Submitting form...');
    await Promise.all([
      page.click('button[type="submit"], .elementor-button'),
      new Promise(r => setTimeout(r, 5000))
    ]);
    
    const result = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.elementor-message, .elementor-message-success, .elementor-message-danger, [role="alert"]')).map(m => ({
        className: m.className,
        text: m.innerText
      }));
      return { msgs, bodySnippet: document.body.innerText.slice(0, 800) };
    });
    console.log('Submission result msgs:', JSON.stringify(result.msgs, null, 2));
    console.log('Body snippet:', result.bodySnippet);
  } else if (lead === '4137') {
    console.log('Testing 4137 Civil Solutions...');
    await page.goto('https://ecivilsolutions.com', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    console.log('Landing page URL:', page.url());
    console.log('Landing page title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('Landing forms:', JSON.stringify(forms, null, 2));

    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href)).map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('Contact links:', contactLinks);

    if (contactLinks[0]) {
      console.log('Going to:', contactLinks[0].href);
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Contact page URL:', page.url());
      const contactForms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
        }));
      });
      console.log('Contact forms:', JSON.stringify(contactForms, null, 2));
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Contact page text snippet:', pageText.slice(0, 1000));
    }
  } else if (lead === '4138') {
    console.log('Testing 4138 Odyssey Engineering Group...');
    await page.goto('https://odysseyeg.com', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    console.log('Title:', await page.title());
    console.log('URL:', page.url());
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href)).map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('Contact links:', contactLinks);
    if (contactLinks[0]) {
      console.log('Going to contact page:', contactLinks[0].href);
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Contact page URL:', page.url());
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
        }));
      });
      console.log('Forms on Odyssey contact page:', JSON.stringify(forms, null, 2));
      console.log('Contact page text:', (await page.evaluate(() => document.body.innerText)).slice(0, 1000));
    }
  }

  await browser.close();
}

run().catch(console.error);
