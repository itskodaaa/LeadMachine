import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
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

async function inspect(leadId, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log(`\n================== Inspecting Lead #${leadId}: ${url} ==================`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Title:', await page.title());
    console.log('Current URL:', page.url());

    // Check forms on landing page
    let forms = await getFormDetails(page);
    console.log(`Landing page forms found: ${forms.length}`);
    if (forms.length > 0) {
      console.log('Forms details:', JSON.stringify(forms, null, 2));
    }

    // Look for contact links
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const keywords = ['contact', 'get-in-touch', 'inquire', 'quote', 'estimate', 'reach'];
      return links
        .filter(a => {
          const text = (a.innerText || '').toLowerCase();
          const href = (a.getAttribute('href') || '').toLowerCase();
          return keywords.some(k => text.includes(k) || href.includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:');
        })
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });

    console.log('Contact links:', contactLinks);

    if (contactLinks.length > 0 && forms.length === 0) {
      console.log(`Navigating to contact page: ${contactLinks[0].href}`);
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log('Contact page Title:', await page.title());
      console.log('Contact page URL:', page.url());
      forms = await getFormDetails(page);
      console.log(`Contact page forms found: ${forms.length}`);
      console.log('Forms details:', JSON.stringify(forms, null, 2));
    }

  } catch (err) {
    console.error(`Error inspecting #${leadId}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function getFormDetails(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map((f, idx) => {
      const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || el.tagName.toLowerCase(),
        name: el.getAttribute('name') || '',
        id: el.getAttribute('id') || '',
        placeholder: el.getAttribute('placeholder') || '',
        text: el.innerText || el.value || ''
      }));
      const iframes = Array.from(f.querySelectorAll('iframe')).map(i => i.src);
      return { formIndex: idx, action: f.action, method: f.method, inputs, iframes };
    });
  });
}

const targetLeadId = process.argv[2];
const leadsToInspect = [
  { id: 4129, url: 'https://brizoconstruction.com' },
  { id: 4130, url: 'https://texashomeengineer.com' },
  { id: 4132, url: 'https://civilgrade.com' },
  { id: 4133, url: 'https://wga-llc.com' },
  { id: 4134, url: 'https://houstoncivil.com' },
  { id: 4136, url: 'https://hvj.com' },
  { id: 4137, url: 'https://ecivilsolutions.com' },
  { id: 4138, url: 'https://odysseyeg.com' }
].filter(l => !targetLeadId || l.id === Number(targetLeadId));

for (const lead of leadsToInspect) {
  await inspect(lead.id, lead.url);
}
