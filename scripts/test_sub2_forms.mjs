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

async function testForms() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. Check Reinhardt Fabrication (#4793)
  console.log('\n--- 1. Testing Lead #4793 Reinhardt Fabrication ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.reinhardtfabrication.com/#contact', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Fill form
    await page.type('#name', OUTREACH_PROFILE.fullName);
    await page.type('#email', OUTREACH_PROFILE.email);
    await page.type('#phone', OUTREACH_PROFILE.phone);
    await page.type('#message', OUTREACH_PROFILE.message);

    console.log('Filled form for #4793. Clicking submit...');
    
    // Check form submission
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => null),
      page.evaluate(() => {
        const form = document.querySelector('form');
        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitBtn) submitBtn.click();
        else form.submit();
      })
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Post-submit URL:', page.url());
    console.log('Contains thank you / sent:', /thank|sent|received|success/i.test(bodyText));
    console.log('Body snippet around confirmation:', bodyText.split('\n').filter(l => /thank|sent|received|message|contact|success/i.test(l)).slice(0, 5));

    await page.close();
  } catch (e) {
    console.error('Error on #4793:', e.message);
  }

  // 2. Check LM Fabrication (#4794)
  console.log('\n--- 2. Testing Lead #4794 LM Fabrication ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.lmfabrication.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Form fields
    await page.waitForSelector('input[name="dmform-0"]', { timeout: 10000 });
    await page.type('input[name="dmform-0"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="dmform-1"]', OUTREACH_PROFILE.email);
    await page.type('input[name="dmform-2"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="dmform-3"]', OUTREACH_PROFILE.message);

    console.log('Filled form for #4794. Clicking submit...');
    
    // Intercept network requests
    let submitAjaxSuccess = false;
    page.on('response', async res => {
      if (res.url().includes('dmform') || res.url().includes('ajax') || res.url().includes('form')) {
        try {
          const text = await res.text();
          console.log(`Ajax response from ${res.url().slice(0, 80)}:`, text.slice(0, 200));
          if (/success|true|ok|sent|200/i.test(text)) submitAjaxSuccess = true;
        } catch (_) {}
      }
    });

    await page.click('input[type="submit"]');
    await new Promise(r => setTimeout(r, 6000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('LM Fab post-submit body snippet:', bodyText.split('\n').filter(l => /thank|sent|received|message|success/i.test(l)).slice(0, 5));
    console.log('Ajax success:', submitAjaxSuccess);

    await page.close();
  } catch (e) {
    console.error('Error on #4794:', e.message);
  }

  // 3. Check Scorpio Iron Works (#4797)
  console.log('\n--- 3. Testing Lead #4797 Scorpio Iron Works ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.scorpioironworkstx.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    await page.waitForSelector('input[name="dmform-0"]', { timeout: 10000 });
    await page.type('input[name="dmform-0"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="dmform-1"]', OUTREACH_PROFILE.email);
    await page.type('input[name="dmform-2"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="dmform-3"]', OUTREACH_PROFILE.message);

    console.log('Filled form for #4797. Submitting...');
    let submitAjaxSuccess = false;
    page.on('response', async res => {
      if (res.url().includes('dmform') || res.url().includes('ajax') || res.url().includes('form')) {
        try {
          const text = await res.text();
          console.log(`Ajax response from ${res.url().slice(0, 80)}:`, text.slice(0, 200));
          if (/success|true|ok|sent|200/i.test(text)) submitAjaxSuccess = true;
        } catch (_) {}
      }
    });

    await page.click('input[type="submit"]');
    await new Promise(r => setTimeout(r, 6000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Scorpio post-submit body snippet:', bodyText.split('\n').filter(l => /thank|sent|received|message|success/i.test(l)).slice(0, 5));
    console.log('Ajax success:', submitAjaxSuccess);

    await page.close();
  } catch (e) {
    console.error('Error on #4797:', e.message);
  }

  // 4. Check Unique Taper Tools (#4800)
  console.log('\n--- 4. Testing Lead #4800 Unique Taper Tools Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://uniquetapertools.weebly.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        action: form.action,
        inputs: Array.from(form.querySelectorAll('input, textarea')).map(i => ({
          tag: i.tagName,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          type: i.type,
          label: i.closest('.wsite-form-field')?.innerText || ''
        }))
      };
    });
    console.log('Weebly form fields:', JSON.stringify(formInfo, null, 2));

    await page.close();
  } catch (e) {
    console.error('Error on #4800:', e.message);
  }

  await browser.close();
}

testForms();
