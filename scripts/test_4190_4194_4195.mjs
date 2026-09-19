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
  cleanPhone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and explore potential collaboration and project quotes. Kindly have a representative contact us at your convenience. Thank you, Pamela Jameson.'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors'
    ]
  });

  // Test 4195 JM Gross Engineering
  console.log('\n--- 4195 JM Gross Engineering ---');
  {
    const page = await browser.newPage();
    try {
      page.on('response', async res => {
        if (res.url().includes('form') || res.url().includes('php')) {
          console.log('4195 response:', res.status(), res.url());
          try {
            const txt = await res.text();
            console.log('4195 response text:', txt.slice(0, 300));
          } catch(e) {}
        }
      });
      await page.goto('https://jmgrossengineering.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      const input1 = await page.$('input[name="custom_U32833"], input#widgetu32833_input');
      const input2 = await page.$('input[name="Email"], input#widgetu32828_input');
      if (input1) await input1.type(OUTREACH.fullName, { delay: 20 });
      if (input2) await input2.type(OUTREACH.email, { delay: 20 });

      console.log('4195 typed. Clicking submit button #u32851-4...');
      const btn = await page.$('#u32851-4, input[type="submit"]');
      if (btn) await btn.click();

      await new Promise(r => setTimeout(r, 4000));
      console.log('4195 Current URL:', page.url());
      const body = await page.evaluate(() => document.body.innerText.slice(0, 600));
      console.log('4195 body:', body);
    } catch (e) {
      console.log('4195 error:', e.message);
    } finally {
      await page.close();
    }
  }

  // Test 4194 McDowell Owens
  console.log('\n--- 4194 McDowell Owens ---');
  {
    const page = await browser.newPage();
    try {
      page.on('response', async res => {
        if (res.request().method() === 'POST') {
          console.log('4194 POST response:', res.status(), res.url());
          try {
            const txt = await res.text();
            console.log('4194 POST text preview:', txt.slice(0, 300));
          } catch(e) {}
        }
      });
      await page.goto('https://mcdowellowens.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      // Inspect form structure in detail
      const formInfo = await page.evaluate(() => {
        const form = document.querySelector('form');
        return {
          action: form.action,
          innerHTML: form.innerHTML
        };
      });
      console.log('4194 form action:', formInfo.action);
      // Let's see what inputs exist
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form:first-of-type input, form:first-of-type textarea')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          outer: i.outerHTML
        }));
      });
      console.log('4194 inputs:', JSON.stringify(inputs, null, 2));

      // Fill using page.type
      const fn = await page.$('input[name="form[First Name]"]');
      const ln = await page.$('input[name="form[Last Name]"]');
      const em = await page.$('input[name="form[Email]"]');
      const ph = await page.$('input[name="form[Phone]"]');
      const msg = await page.$('textarea[name="form[Your Message]"]');
      const chk = await page.$('input[name="form[I_agree][]"]');

      if (fn) await fn.type(OUTREACH.firstName, { delay: 10 });
      if (ln) await ln.type(OUTREACH.lastName, { delay: 10 });
      if (em) await em.type(OUTREACH.email, { delay: 10 });
      if (ph) await ph.type(OUTREACH.phone, { delay: 10 });
      if (msg) await msg.type(OUTREACH.message, { delay: 5 });
      if (chk) await chk.click();

      console.log('4194 typed fields. Clicking submit...');
      const sub = await page.$('form:first-of-type button[type="submit"], form:first-of-type input[type="submit"], form:first-of-type button');
      if (sub) {
        console.log('Clicking sub button:', await page.evaluate(b => b.outerHTML, sub));
        await sub.click();
      }

      await new Promise(r => setTimeout(r, 6000));
      const postSubmit = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('.alert, .message, .form-message, [class*="alert"], [class*="success"]')).map(a => a.innerText);
        return {
          url: window.location.href,
          alerts,
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });
      console.log('4194 post-submit:', postSubmit);

    } catch (e) {
      console.log('4194 error:', e.message);
    } finally {
      await page.close();
    }
  }

  // Test 4190 Bayside Mechanical Contractors Wix form
  console.log('\n--- 4190 Bayside Mechanical Contractors ---');
  {
    const page = await browser.newPage();
    try {
      page.on('response', async res => {
        if (res.url().includes('wix') || res.url().includes('submission') || res.url().includes('form')) {
          if (res.request().method() === 'POST') {
            console.log('4190 POST response:', res.status(), res.url().slice(0, 100));
          }
        }
      });
      await page.goto('https://baysidemechanicalcontractors.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 3000));

      const inputs = await page.$$('input[aria-label*="First name"], input[aria-label*="first name"]');
      console.log('4190 first name input count:', inputs.length);

      const fNameInput = await page.$('input[aria-label*="First name"]');
      const lNameInput = await page.$('input[aria-label*="Last name"]');
      const phoneInput = await page.$('input[aria-label*="Phone"]');
      const emailInput = await page.$('input[aria-label*="Email"]');
      const helpInput = await page.$('textarea[aria-label*="help"]');

      if (fNameInput) await fNameInput.type(OUTREACH.firstName, { delay: 10 });
      if (lNameInput) await lNameInput.type(OUTREACH.lastName, { delay: 10 });
      if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 10 });
      if (emailInput) await emailInput.type(OUTREACH.email, { delay: 10 });
      if (helpInput) await helpInput.type(OUTREACH.message, { delay: 5 });

      console.log('4190 typed. Clicking submit button...');
      const sub = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
        if (btn) {
          btn.scrollIntoView();
          btn.click();
          return true;
        }
        return false;
      });
      console.log('4190 submit clicked:', sub);

      await new Promise(r => setTimeout(r, 6000));
      const postSubmit = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[data-testid*="message"], [role="alert"], [class*="message"]')).map(a => a.innerText);
        return {
          alerts,
          bodySnippet: document.body.innerText.match(/thank you|thanks|message sent/i)?.[0] || 'none'
        };
      });
      console.log('4190 post-submit:', postSubmit);

    } catch (e) {
      console.log('4190 error:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
