import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

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

async function testLead(leadId) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    if (leadId === 4129) {
      console.log('Testing #4129 Brizo Construction...');
      await page.goto('https://brizoconstruction.com', { waitUntil: 'domcontentloaded' });
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
      const contactLinks = links.filter(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      console.log('Contact links:', contactLinks);
      if (contactLinks.length > 0) {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
        console.log('Contact page URL:', page.url());
        const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        })));
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Body snippet:', body.slice(0, 500));
      }
    } else if (leadId === 4130) {
      console.log('Testing #4130 Gerard J. Duhon, P.E....');
      await page.goto('https://texashomeengineer.com', { waitUntil: 'domcontentloaded' });
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
      const contactLinks = links.filter(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      console.log('Contact links:', contactLinks);
      if (contactLinks.length > 0) {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
        console.log('Contact page URL:', page.url());
        const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        })));
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Body snippet:', body.slice(0, 500));
      }
    } else if (leadId === 4133) {
      console.log('Testing #4133 WGA...');
      try {
        await page.goto('https://wga-llc.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('Loaded:', page.url(), await page.title());
      } catch (e) {
        console.log('Failed https://wga-llc.com:', e.message);
        try {
          await page.goto('http://wga-llc.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
          console.log('Loaded http:', page.url(), await page.title());
        } catch (e2) {
          console.log('Failed http://wga-llc.com:', e2.message);
        }
      }
    } else if (leadId === 4134) {
      console.log('Testing #4134 houston civil engineering...');
      page.on('response', async res => {
        if (res.request().method() === 'POST') {
          console.log('POST Response URL:', res.url(), 'status:', res.status());
          try {
            const txt = await res.text();
            console.log('POST Response Body:', txt.slice(0, 300));
          } catch (_) {}
        }
      });
      await page.goto('https://houstoncivil.com/contact/', { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));
      await page.type('#form-field-name', OUTREACH_PROFILE.fullName);
      await page.type('#form-field-email', OUTREACH_PROFILE.email);
      await page.type('#form-field-message', OUTREACH_PROFILE.message);
      console.log('Clicking send...');
      await page.click('.elementor-button[type="submit"]');
      await new Promise(r => setTimeout(r, 6000));
      const alerts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.elementor-message, [role="alert"]')).map(el => el.innerText);
      });
      console.log('Alerts detected:', alerts);
    } else if (leadId === 4136) {
      console.log('Testing #4136 HVJ Associates Inc...');
      await page.goto('https://hvj.com', { waitUntil: 'domcontentloaded' });
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
      const contactLinks = links.filter(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      console.log('Contact links:', contactLinks);
      if (contactLinks.length > 0) {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
        console.log('Contact page URL:', page.url());
        const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        })));
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Body snippet:', body.slice(0, 500));
      }
    } else if (leadId === 4137) {
      console.log('Testing #4137 Civil Solutions...');
      page.on('response', async res => {
        if (res.request().method() === 'POST') {
          console.log('POST Response URL:', res.url(), 'status:', res.status());
          try {
            const txt = await res.text();
            console.log('POST Response Body:', txt.slice(0, 300));
          } catch (_) {}
        }
      });
      await page.goto('https://ecivilsolutions.com', { waitUntil: 'domcontentloaded' });
      console.log('Landing URL:', page.url(), 'Title:', await page.title());
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
      const contactLinks = links.filter(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      console.log('Contact links:', contactLinks);
      if (contactLinks.length > 0) {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
        console.log('Contact page URL:', page.url());
        const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, id: i.id }))
        })));
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
      }
    } else if (leadId === 4138) {
      console.log('Testing #4138 Odyssey Engineering Group...');
      await page.goto('https://odysseyeg.com', { waitUntil: 'domcontentloaded' });
      console.log('Landing URL:', page.url(), 'Title:', await page.title());
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
      const contactLinks = links.filter(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      console.log('Contact links:', contactLinks);
      if (contactLinks.length > 0) {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded' });
        console.log('Contact page URL:', page.url());
        const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, id: i.id }))
        })));
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Body snippet:', body.slice(0, 500));
      }
    }
  } catch (err) {
    console.error(`Error in lead ${leadId}:`, err.message);
  } finally {
    await browser.close();
  }
}

const id = parseInt(process.argv[2], 10);
if (id) {
  await testLead(id);
} else {
  console.log('Please provide a lead ID.');
}
