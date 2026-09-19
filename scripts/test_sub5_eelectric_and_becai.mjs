import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, We are reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function testBoth() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Check eelectricsf.com/contact.html
  console.log('=== Checking eelectricsf.com/contact.html ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://eelectricsf.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const cInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
      return {
        title: document.title,
        forms,
        bodySnippet: document.body.innerText.slice(0, 1000)
      };
    });
    console.log('eelectricsf contact page:', JSON.stringify(cInfo, null, 2));

    if (cInfo.forms.length > 0) {
      console.log('Found form on eelectricsf! Testing filling and submitting...');
      // Type into fields
      for (const inp of cInfo.forms[0].inputs) {
        if (inp.type === 'hidden') continue;
        const selector = inp.id ? `#${inp.id}` : (inp.name ? `[name="${inp.name}"]` : null);
        if (!selector) continue;
        if (inp.type === 'email' || inp.name?.toLowerCase().includes('email')) {
          await page.type(selector, PROFILE.email, { delay: 30 });
        } else if (inp.type === 'tel' || inp.name?.toLowerCase().includes('phone')) {
          await page.type(selector, PROFILE.phone, { delay: 30 });
        } else if (inp.name?.toLowerCase().includes('name')) {
          await page.type(selector, PROFILE.name, { delay: 30 });
        } else if (inp.type === 'textarea' || inp.name?.toLowerCase().includes('message')) {
          await page.type(selector, PROFILE.message, { delay: 10 });
        } else {
          await page.type(selector, PROFILE.company, { delay: 30 });
        }
      }

      const submitBtn = await page.$('form input[type="submit"], form button[type="submit"], form button');
      if (submitBtn) {
        await Promise.all([
          submitBtn.click(),
          new Promise(r => setTimeout(r, 5000))
        ]);
        const postSubmit = await page.evaluate(() => ({
          url: window.location.href,
          text: document.body.innerText.slice(0, 1000)
        }));
        console.log('eelectricsf post submit:', JSON.stringify(postSubmit, null, 2));
      }
    }
    await page.close();
  } catch (e) {
    console.log('eelectricsf contact error:', e.message);
  }

  // 2. Becai Electric: check form structure & Wix attributes
  console.log('\n=== Checking Becai Electric form attributes ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    const formMeta = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      return {
        formOuter: form.outerHTML.slice(0, 800),
        action: form.action,
        method: form.method,
        hasRecaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="captcha"]'),
        allButtons: Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => ({
          text: b.innerText || b.value,
          outer: b.outerHTML.slice(0, 200)
        }))
      };
    });
    console.log('Becai form meta:', JSON.stringify(formMeta, null, 2));

    // Try clicking inside each input and typing with page.keyboard
    const inputs = await page.$$('input[placeholder*="Name"], input[name="name-*"]');
    if (inputs.length > 0) {
      await inputs[0].click();
      await page.keyboard.type(PROFILE.name, { delay: 30 });
    }
    const emailInputs = await page.$$('input[placeholder*="Email"], input[name="email"]');
    if (emailInputs.length > 0) {
      await emailInputs[0].click();
      await page.keyboard.type(PROFILE.email, { delay: 30 });
    }
    const phoneInputs = await page.$$('input[placeholder*="Phone"], input[name="phone"]');
    if (phoneInputs.length > 0) {
      await phoneInputs[0].click();
      await page.keyboard.type(PROFILE.phone, { delay: 30 });
    }
    const subjectInputs = await page.$$('input[placeholder*="Subject"], input[name="subject"]');
    if (subjectInputs.length > 0) {
      await subjectInputs[0].click();
      await page.keyboard.type(PROFILE.subject, { delay: 30 });
    }
    const msgInputs = await page.$$('textarea');
    if (msgInputs.length > 0) {
      await msgInputs[0].click();
      await page.keyboard.type(PROFILE.message, { delay: 10 });
    }

    // Now check Send button
    const sendBtn = await page.$('button[data-testid="buttonElement"]') || await page.$('button::-p-text(Send)') || await page.$('form button');
    console.log('Send button found?', !!sendBtn);
    if (sendBtn) {
      await sendBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const postSend = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('[data-testid*="message"], [data-testid*="notification"], [id*="notification"], .wix-form-notification, p, span'))
          .map(el => el.innerText?.trim())
          .filter(t => t && (t.toLowerCase().includes('thank') || t.toLowerCase().includes('sent') || t.toLowerCase().includes('received') || t.toLowerCase().includes('error') || t.toLowerCase().includes('submitt')));
        return {
          msgs: Array.from(new Set(msgs)),
          url: window.location.href
        };
      });
      console.log('Becai post send:', JSON.stringify(postSend, null, 2));
    }

    await page.close();
  } catch (e) {
    console.log('Becai error:', e.message);
  }

  await browser.close();
}

testBoth();
