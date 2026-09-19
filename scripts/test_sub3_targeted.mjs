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

async function testTargeted() {
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

  // 1. Verify 4190 Bayside Mechanical Contractors confirmation message text
  console.log('=== Checking 4190 Bayside details ===');
  {
    const page = await browser.newPage();
    try {
      await page.goto('https://baysidemechanicalcontractors.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));
      
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        for (const el of inputs) {
          const id = el.id.toLowerCase();
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if (el.tagName === 'TEXTAREA' || label.includes('help')) el.value = p.message;
          else if (label.includes('first')) el.value = p.firstName;
          else if (label.includes('last')) el.value = p.lastName;
          else if (label.includes('phone')) el.value = p.phone;
          else if (label.includes('email') || el.type === 'email') el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH);

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-testid], [class*="notification"], [class*="message"], [class*="success"]'));
        const texts = els.map(e => e.innerText.trim()).filter(t => /thank|success|sent|received/i.test(t));
        return {
          matchingTexts: Array.from(new Set(texts)),
          bodyHasThankYou: /thank you/i.test(document.body.innerText)
        };
      });
      console.log('4190 Confirmation:', confirmation);
    } catch (e) {
      console.log('4190 err:', e.message);
    } finally {
      await page.close();
    }
  }

  // 2. Lead 4192 Interfield Group
  console.log('\n=== Checking 4192 Interfield Group ===');
  {
    const page = await browser.newPage();
    try {
      await page.goto('https://interfield.net/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 3000));

      const formHtml = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? { action: form.action, id: form.id } : null;
      });
      console.log('4192 form header:', formHtml);

      // Fill form
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
        for (const el of inputs) {
          const label = (el.closest('.gfield')?.querySelector('label')?.innerText || '').toLowerCase();
          const name = el.name.toLowerCase();
          const combined = `${label} ${name}`;

          if (el.tagName === 'TEXTAREA' || combined.includes('message')) {
            el.value = p.message;
          } else if (combined.includes('email')) {
            el.value = p.email;
          } else if (combined.includes('phone')) {
            el.value = p.phone;
          } else if (combined.includes('first')) {
            el.value = p.firstName;
          } else if (combined.includes('last')) {
            el.value = p.lastName;
          } else if (combined.includes('name')) {
            el.value = p.fullName;
          } else if (combined.includes('company')) {
            el.value = p.company;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH);

      console.log('4192 clicking submit...');
      const submitBtn = await page.$('input[type="submit"], button[type="submit"], .gform_button');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('4192 nav err:', e.message)),
          submitBtn.click()
        ]);
      }

      await new Promise(r => setTimeout(r, 4000));
      const res4192 = await page.evaluate(() => {
        const conf = document.querySelector('.gform_confirmation_message, .gform_validation_errors, [role="alert"]');
        return {
          url: window.location.href,
          conf: conf ? conf.innerText : null,
          bodySnippet: document.body ? document.body.innerText.slice(0, 500) : ''
        };
      });
      console.log('4192 result:', res4192);

    } catch (e) {
      console.log('4192 err:', e.message);
    } finally {
      await page.close();
    }
  }

  // 3. Lead 4194 McDowell Owens Engineering
  console.log('\n=== Checking 4194 McDowell Owens ===');
  {
    const page = await browser.newPage();
    try {
      await page.goto('https://mcdowellowens.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 3000));

      const formInfo = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;
        return {
          action: form.action,
          method: form.method,
          fields: Array.from(form.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, value: i.value }))
        };
      });
      console.log('4194 initial form info:', formInfo);

      await page.evaluate((p) => {
        const form = document.querySelector('form');
        const fn = form.querySelector('input[name="form[First Name]"]');
        const ln = form.querySelector('input[name="form[Last Name]"]');
        const em = form.querySelector('input[name="form[Email]"]');
        const ph = form.querySelector('input[name="form[Phone]"]');
        const msg = form.querySelector('textarea[name="form[Your Message]"]');
        const chk = form.querySelector('input[name="form[I_agree][]"]');

        if (fn) fn.value = p.firstName;
        if (ln) ln.value = p.lastName;
        if (em) em.value = p.email;
        if (ph) ph.value = p.phone;
        if (msg) msg.value = p.message;
        if (chk) {
          chk.checked = true;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        }

        [fn, ln, em, ph, msg].forEach(el => {
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }, OUTREACH);

      console.log('4194 submitting...');
      const btn = await page.$('form button, form input[type="submit"]');
      if (btn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('4194 waitNav timeout:', e.message)),
          btn.click()
        ]);
      }

      await new Promise(r => setTimeout(r, 4000));
      const res4194 = await page.evaluate(() => {
        return {
          url: window.location.href,
          bodySnippet: document.body ? document.body.innerText.slice(0, 600) : ''
        };
      });
      console.log('4194 post submit URL:', res4194.url);
      console.log('4194 post submit body preview:', res4194.bodySnippet);

    } catch (e) {
      console.log('4194 err:', e.message);
    } finally {
      await page.close();
    }
  }

  // 4. Lead 4195 JM Gross Engineering
  console.log('\n=== Checking 4195 JM Gross Engineering ===');
  {
    const page = await browser.newPage();
    try {
      await page.goto('https://jmgrossengineering.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const museForm = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return 'No form';
        return {
          action: form.action,
          html: form.outerHTML
        };
      });
      console.log('4195 Muse form:', museForm.action);

      // Check fields and submit button
      const details = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder }));
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"], .submit-btn, [id*="submit"]')).map(b => ({ id: b.id, text: b.innerText || b.value }));
        return { inputs, btns };
      });
      console.log('4195 details:', JSON.stringify(details, null, 2));

      // Fill Muse form
      await page.evaluate((p) => {
        const nameInput = document.querySelector('input[name="custom_U32833"], input#widgetu32833_input');
        const emailInput = document.querySelector('input[name="Email"], input#widgetu32828_input');
        if (nameInput) {
          nameInput.value = p.fullName;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (emailInput) {
          emailInput.value = p.email;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH);

      // Click submit
      await page.evaluate(() => {
        const sub = document.querySelector('#u32832-4, input[type="submit"], button[type="submit"]');
        if (sub) sub.click();
      });

      await new Promise(r => setTimeout(r, 4000));
      const res4195 = await page.evaluate(() => {
        const status = document.querySelector('.fld-message, .fld-subm-alert, [class*="status"], [class*="message"]');
        return {
          statusText: status ? status.innerText : null,
          bodySnippet: document.body ? document.body.innerText.slice(0, 400) : ''
        };
      });
      console.log('4195 submission response:', res4195);

    } catch (e) {
      console.log('4195 err:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testTargeted();
