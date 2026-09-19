import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function processBatch6Details() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Submit GoDaddy form on avcnc.net (#1779)
  console.log('=== Submitting #1779 Advance Virtu CNC (avcnc.net) ===');
  const page1 = await browser.newPage();
  page1.on('response', async res => {
    const url = res.url();
    if (url.includes('secureserver.net') || url.includes('messages') || url.includes('contact')) {
      console.log(`[API Response] ${res.status()} ${url}`);
    }
  });

  try {
    await page1.goto('https://avcnc.net/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Check form labels/placeholders
    const formFields = await page1.evaluate(() => {
      const form = document.querySelector('form.x-el-form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label'),
        label: i.closest('label') ? i.closest('label').innerText : (i.previousElementSibling ? i.previousElementSibling.innerText : '')
      }));
      return inputs;
    });
    console.log('Form fields for avcnc.net:', JSON.stringify(formFields, null, 2));

    // Type into inputs
    // In GoDaddy forms, typically:
    // first input is Name
    // second is Email
    // textarea is Message
    // Make sure _app_id is untouched!
    const inputs = await page1.$$('form.x-el-form input[type="text"]:not([name="_app_id"]), form.x-el-form input[type="email"]');
    console.log('Found non-honeypot text inputs:', inputs.length);
    if (inputs.length >= 2) {
      await inputs[0].click();
      await inputs[0].type('Pamela Jameson', { delay: 40 });
      console.log('Typed Name');
      await inputs[1].click();
      await inputs[1].type('pamela.jameson@northeastprecision.com', { delay: 40 });
      console.log('Typed Email');
    }

    const textarea = await page1.$('form.x-el-form textarea');
    if (textarea) {
      await textarea.click();
      await textarea.type('Hello, Northeast Precision Machinery specializes in precision machining, custom CNC fabrication, and tooling solutions. We would welcome the opportunity to discuss manufacturing requirements or support upcoming projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });
      console.log('Typed Message');
    }

    const submitBtn = await page1.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('form.x-el-form button, form.x-el-form [data-aid="CONTACT_SUBMIT_BUTTON_REND"]'));
      return btns.find(b => /send|submit/i.test(b.innerText)) || btns[0];
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking submit button on avcnc.net...');
      await submitBtn.asElement().click();
      await new Promise(r => setTimeout(r, 6000));
      const pageText = await page1.evaluate(() => document.body.innerText);
      const isSuccess = /thank you|we will be in touch|message sent|thanks for reaching out/i.test(pageText);
      console.log('DOM confirmation on avcnc.net:', isSuccess);
      const successMsg = await page1.evaluate(() => {
        const el = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MSG"], .c1-c, .c1-d');
        return el ? el.innerText : null;
      });
      console.log('Success element text:', successMsg);
    }
  } catch (e) {
    console.log('Error submitting avcnc.net:', e.message);
  }
  await page1.close();

  // 2. Check alloymachiningservices.com/contact.html (#1771)
  console.log('\n=== Checking #1771 Alloy Machining (contact.html) ===');
  const page2 = await browser.newPage();
  try {
    await page2.goto('https://alloymachiningservices.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const info2 = await page2.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
      return { url: window.location.href, forms, text: document.body.innerText.slice(0, 300) };
    });
    console.log('Alloy contact.html info:', JSON.stringify(info2, null, 2));
  } catch (e) {
    console.log('Error checking Alloy contact.html:', e.message);
  }
  await page2.close();

  // 3. Check avalon.aero contact link (#1773)
  console.log('\n=== Checking #1773 Avalon CNC (avalon.aero) ===');
  const page3 = await browser.newPage();
  try {
    await page3.goto('https://www.avalon.aero/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const contactLinks = await page3.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Avalon contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page3.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const info3 = await page3.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        }));
        return { url: window.location.href, forms, text: document.body.innerText.slice(0, 300) };
      });
      console.log('Avalon contact page info:', JSON.stringify(info3, null, 2));
    }
  } catch (e) {
    console.log('Error checking Avalon:', e.message);
  }
  await page3.close();

  // 4. Check ghprecision.com contact link (#1777)
  console.log('\n=== Checking #1777 G&H Precision (ghprecision.com) ===');
  const page4 = await browser.newPage();
  try {
    await page4.goto('https://ghprecision.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const contactLinks = await page4.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('GH Precision contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page4.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const info4 = await page4.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        }));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"]')).map(e => e.outerHTML.slice(0, 80));
        return { url: window.location.href, forms, captchas, text: document.body.innerText.slice(0, 300) };
      });
      console.log('GH Precision contact page info:', JSON.stringify(info4, null, 2));
    }
  } catch (e) {
    console.log('Error checking GH Precision:', e.message);
  }
  await page4.close();

  // 5. Check marengineering.com (#1778)
  console.log('\n=== Checking #1778 Mar Engineering (marengineering.com) ===');
  const page5 = await browser.newPage();
  try {
    await page5.goto('https://www.marengineering.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const contactLinks = await page5.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Mar Engineering contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page5.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const info5 = await page5.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        }));
        return { url: window.location.href, forms, text: document.body.innerText.slice(0, 300) };
      });
      console.log('Mar Engineering contact page info:', JSON.stringify(info5, null, 2));
    }
  } catch (e) {
    console.log('Error checking Mar Engineering:', e.message);
  }
  await page5.close();

  // 6. Check lightsoutcnc.com (#1783)
  console.log('\n=== Checking #1783 Lightsout CNC (lightsoutcnc.com) ===');
  const page6 = await browser.newPage();
  try {
    await page6.goto('https://lightsoutcnc.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const contactLinks = await page6.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact/i.test(a.innerText) || /contact/i.test(a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Lightsout CNC contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page6.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const info6 = await page6.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        }));
        return { url: window.location.href, forms, text: document.body.innerText.slice(0, 300) };
      });
      console.log('Lightsout CNC contact page info:', JSON.stringify(info6, null, 2));
    }
  } catch (e) {
    console.log('Error checking Lightsout CNC:', e.message);
  }
  await page6.close();

  await browser.close();
}

processBatch6Details();
