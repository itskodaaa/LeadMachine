import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function testJRH(browser) {
  console.log('\n========================================');
  console.log('Testing #3596 JRH Engineering');
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.jrhengineering.net/contact-us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill in fields by finding matching labels/placeholders
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const id = (el.id || '').toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.closest('div')?.querySelector('label')?.innerText || '').toLowerCase();
        const combined = `${id} ${placeholder} ${label}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('help') || combined.includes('message')) {
          el.value = p.message;
        } else if (el.type === 'email' || combined.includes('email')) {
          el.value = p.email;
        } else if (combined.includes('phone') || el.type === 'tel' || placeholder.includes('xxx')) {
          el.value = p.phone;
        } else if (combined.includes('first') || label.includes('first')) {
          el.value = p.firstName;
        } else if (combined.includes('last') || label.includes('last')) {
          el.value = p.lastName;
        } else if (combined.includes('city')) {
          el.value = p.city;
        } else if (combined.includes('zip') || combined.includes('postal')) {
          el.value = p.zip;
        } else if (combined.includes('state')) {
          el.value = p.state;
        } else if (combined.includes('address') || combined.includes('street')) {
          el.value = p.address;
        } else if (!el.value && el.type === 'text') {
          el.value = p.company;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, PROFILE);

    // Scroll to submit button and click it
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const submitBtn = buttons.find(b => b.innerText.trim().toUpperCase() === 'SUBMIT');
      if (submitBtn) {
        submitBtn.scrollIntoView();
        submitBtn.click();
        return true;
      }
      return false;
    });
    console.log('JRH Submit button clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const wixSuccess = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')).map(el => el.innerText);
      const isSuccess = text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') || text.toLowerCase().includes('submitted') || wixSuccess.length > 0;
      return { isSuccess, wixSuccess, snippet: text.slice(0, 300) };
    });
    console.log('JRH Result:', result);

    if (result.isSuccess || result.wixSuccess.length > 0) {
      console.log('✅ JRH Engineering Contact Form submitted successfully!');
    }
  } catch (e) {
    console.log('JRH Error:', e.message);
  } finally {
    await page.close();
  }
}

async function testOSM(browser) {
  console.log('\n========================================');
  console.log('Testing #3591 One Source Manufacturing Tech LLC');
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.osmtech.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src || c.getAttribute('data-sitekey'));
      const text = document.body ? document.body.innerText : '';
      return { url: window.location.href, formsCount: forms.length, captchas, textSnippet: text.slice(0, 400) };
    });
    console.log('OSM /contact-us/ details:', details);

    // Also check /request-a-quote/
    await page.goto('https://www.osmtech.com/request-a-quote/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const quoteDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src || c.getAttribute('data-sitekey'));
      const text = document.body ? document.body.innerText : '';
      return { url: window.location.href, formsCount: forms.length, captchas, textSnippet: text.slice(0, 400) };
    });
    console.log('OSM /request-a-quote/ details:', quoteDetails);

  } catch (e) {
    console.log('OSM Error:', e.message);
  } finally {
    await page.close();
  }
}

async function testLTD(browser) {
  console.log('\n========================================');
  console.log('Testing #3590 LTD Material LLC');
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://ltdmaterial.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src || c.getAttribute('data-sitekey'));
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder
      }));
      return { url: window.location.href, formsCount: forms.length, captchas, inputs };
    });
    console.log('LTD details:', details);

    // If WPForms present, let's fill it
    if (details.inputs.length > 0 && details.captchas.length === 0) {
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
        for (const el of inputs) {
          const name = (el.name || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          const placeholder = (el.placeholder || '').toLowerCase();
          const label = (el.closest('label')?.innerText || el.closest('.wpforms-field')?.querySelector('label')?.innerText || '').toLowerCase();
          const full = `${name} ${id} ${placeholder} ${label}`;

          if (el.tagName.toLowerCase() === 'textarea' || full.includes('message') || full.includes('comment')) {
            el.value = p.message;
          } else if (el.type === 'email' || full.includes('email')) {
            el.value = p.email;
          } else if (full.includes('phone') || el.type === 'tel') {
            el.value = p.phone;
          } else if (full.includes('first')) {
            el.value = p.firstName;
          } else if (full.includes('last')) {
            el.value = p.lastName;
          } else if (full.includes('name')) {
            el.value = p.fullName;
          } else if (full.includes('company')) {
            el.value = p.company;
          }

          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, PROFILE);

      console.log('Submitting LTD WPForms...');
      await page.evaluate(() => {
        const btn = document.querySelector('.wpforms-submit') || document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 5000));

      const post = await page.evaluate(() => {
        const confirmation = document.querySelector('.wpforms-confirmation-container');
        const err = document.querySelector('.wpforms-error-alert, .wpforms-error');
        return {
          confirmed: !!confirmation,
          confirmationText: confirmation ? confirmation.innerText : '',
          errorText: err ? err.innerText : '',
          bodyText: document.body?.innerText?.slice(0, 300)
        };
      });
      console.log('LTD Post-submit:', post);
    }

  } catch (e) {
    console.log('LTD Error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await testJRH(browser);
  await testOSM(browser);
  await testLTD(browser);

  await browser.close();
}

run();
