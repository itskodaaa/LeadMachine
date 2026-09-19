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

async function testTecoAndTechni() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. Lead #4795 Teco Metal Products
  console.log('\n========================================');
  console.log('Testing Lead #4795 Teco Metal Products (Clicking button directly)');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.tecometalproducts.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Listen to network responses
    page.on('response', async res => {
      if (res.url().includes('wix') && (res.url().includes('submit') || res.url().includes('form') || res.url().includes('contact'))) {
        try {
          const txt = await res.text();
          console.log(`Wix network [${res.status()}] ${res.url().slice(0, 80)}:`, txt.slice(0, 150));
        } catch (_) {}
      }
    });

    await page.click('#input_comp-jxbwzbfp');
    await page.type('#input_comp-jxbwzbfp', OUTREACH_PROFILE.fullName);

    await page.click('#input_comp-jxbwzbfw');
    await page.type('#input_comp-jxbwzbfw', OUTREACH_PROFILE.email);

    await page.click('#input_comp-jxbwzbg2');
    await page.type('#input_comp-jxbwzbg2', OUTREACH_PROFILE.subject);

    await page.click('#textarea_comp-jxbwzbg8');
    await page.type('#textarea_comp-jxbwzbg8', OUTREACH_PROFILE.message);

    console.log('Fields filled on Teco Metal. Clicking button element directly...');
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit|send/i.test(b.innerText || ''));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked button:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const allText = document.body.innerText;
      const alerts = Array.from(document.querySelectorAll('[data-testid="inline-feedback"], [role="alert"], [class*="message"], [class*="success"]'))
        .map(el => el.innerText);
      return { alerts, snippets: allText.split('\n').filter(l => /thank|sent|received|message|success|submitted/i.test(l)) };
    });
    console.log('Teco Metal Confirmation:', confirmation);

    await page.close();
  } catch (e) {
    console.error('Error on #4795:', e.message);
  }

  // 2. Lead #4801 Techni Tool Inc
  console.log('\n========================================');
  console.log('Testing Lead #4801 Techni Tool Inc (Checking form validation & reCAPTCHA)');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.technitoolinc.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    // Check all required fields in the form
    const fields = await page.evaluate(() => {
      const form = document.querySelector('.elementor-form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('.elementor-field-group')).map(g => ({
        label: g.querySelector('label')?.innerText?.trim(),
        required: g.classList.contains('elementor-field-required'),
        inputName: g.querySelector('input, textarea, select')?.name,
        inputType: g.querySelector('input, textarea, select')?.type,
        options: Array.from(g.querySelectorAll('option')).map(o => o.value)
      }));
    });
    console.log('Techni Tool Form fields:', JSON.stringify(fields, null, 2));

    await page.close();
  } catch (e) {
    console.error('Error on #4801:', e.message);
  }

  await browser.close();
}

testTecoAndTechni();
