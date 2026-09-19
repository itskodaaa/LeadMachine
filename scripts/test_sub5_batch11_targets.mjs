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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. #3944 Aluces Corporation (Wix form)
  console.log('--- Testing #3944 Aluces Corporation ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.alucescorp.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill form
    const nameInput = await page.$('input[name="name-*"], input[placeholder*="Name"]');
    if (nameInput) await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 30 });
    
    const emailInput = await page.$('input[name="email"], input[placeholder*="Email"]');
    if (emailInput) await emailInput.type(OUTREACH_PROFILE.email, { delay: 30 });

    const phoneInput = await page.$('input[name="phone"], input[placeholder*="Phone"]');
    if (phoneInput) await phoneInput.type(OUTREACH_PROFILE.phone, { delay: 30 });

    const subjInput = await page.$('input[name="subject-*"], input[placeholder*="Subject"]');
    if (subjInput) await subjInput.type(OUTREACH_PROFILE.subject, { delay: 30 });

    const msgInput = await page.$('textarea');
    if (msgInput) await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });

    // Find submit button in form
    const submitBtn = await page.$('button[type="submit"], button[data-testid="buttonElement"], div[id*="comp-kf7u55"] button');
    console.log('Submit button found:', !!submitBtn);

    // Watch for response or DOM changes
    let submitted = false;
    page.on('response', resp => {
      if (resp.url().includes('wixforms') || resp.url().includes('submit')) {
        console.log('API response:', resp.url(), resp.status());
        submitted = true;
      }
    });

    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Post submit text snippets:', bodyText.includes('Thanks for submitting') ? 'Thanks for submitting' : 'No thanks message');
    }
    await page.close();
  } catch (e) {
    console.log('3944 error:', e.message);
  }

  // 2. #3949 CONNECT Engineering (Wix form)
  console.log('\n--- Testing #3949 CONNECT Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.connecteng.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const fName = await page.$('input[name="first-name"]');
    if (fName) await fName.type(OUTREACH_PROFILE.firstName, { delay: 30 });

    const lName = await page.$('input[name="last-name"]');
    if (lName) await lName.type(OUTREACH_PROFILE.lastName, { delay: 30 });

    const email = await page.$('input[name="email"]');
    if (email) await email.type(OUTREACH_PROFILE.email, { delay: 30 });

    const subj = await page.$('input[name="subject"]');
    if (subj) await subj.type(OUTREACH_PROFILE.subject, { delay: 30 });

    const msg = await page.$('textarea');
    if (msg) await msg.type(OUTREACH_PROFILE.message, { delay: 10 });

    const submitBtn = await page.$('button[data-testid="buttonElement"], form#comp-kq7zuqku button');
    console.log('3949 Submit button found:', !!submitBtn);

    page.on('response', resp => {
      if (resp.url().includes('wixforms') || resp.url().includes('submit')) {
        console.log('API response 3949:', resp.url(), resp.status());
      }
    });

    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('3949 Post submit text snippets:', bodyText.includes('Thanks for submitting') ? 'Thanks for submitting' : 'Check text...');
    }
    await page.close();
  } catch (e) {
    console.log('3949 error:', e.message);
  }

  // 3. #3946 FormTech Land Surveying
  console.log('\n--- Testing #3946 FormTech Land Surveying ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://formtechco.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('3946 loaded url:', page.url());
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('form');
      return f ? f.outerHTML : 'no form';
    });
    console.log('3946 formHtml preview:', formHtml.substring(0, 300));
    await page.close();
  } catch (e) {
    console.log('3946 error:', e.message);
  }

  // 4. #3947 Globe Engineering
  console.log('\n--- Testing #3947 Globe Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://civil-engineer.us/contact_us', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('3947 contact_us url:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => f.outerHTML);
    });
    console.log('3947 forms found:', forms.length);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('3947 body text preview:', bodyText.substring(0, 300));
    await page.close();
  } catch (e) {
    console.log('3947 error:', e.message);
  }

  // 5. #3948 Civil Design Engineering
  console.log('\n--- Testing #3948 Civil Design Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://civildeng.com', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('3948 landed url:', page.url(), await page.title());
    await page.close();
  } catch (e) {
    console.log('3948 error:', e.message);
  }

  // 6. #3950 Seawater Construction
  console.log('\n--- Testing #3950 Seawater Construction ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://seawaterconstruction.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const contactSection = await page.evaluate(() => {
      const sec = document.querySelector('#contact');
      return sec ? sec.innerText : 'no #contact';
    });
    console.log('3950 contact section:', contactSection.substring(0, 300));
    await page.close();
  } catch (e) {
    console.log('3950 error:', e.message);
  }

  // 7. #3951 GRAEF
  console.log('\n--- Testing #3951 GRAEF ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://graef-usa.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('3951 contact page loaded:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        className: f.className,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')
      }));
    });
    console.log('3951 forms:', forms);
    await page.close();
  } catch (e) {
    console.log('3951 error:', e.message);
  }

  await browser.close();
}

run();
