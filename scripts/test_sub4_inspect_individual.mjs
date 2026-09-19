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

Thank your for your time and attention.

Sincerely,
Pamela Jameson`
};

async function inspectMTech(browser) {
  console.log('\n--- Checking #4258 M-Tech Precision Machining ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mtechprecisionmachining.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Inspect form labels and inputs
    const formDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => {
        const label = el.closest('label')?.innerText || 
                      document.querySelector(`label[for="${el.id}"]`)?.innerText ||
                      el.parentElement?.innerText || '';
        return { id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, label: label.replace(/\s+/g, ' ').trim() };
      });
      return inputs;
    });
    console.log('M-Tech inputs:', JSON.stringify(formDetails, null, 2));
  } catch (e) {
    console.log('M-Tech error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectArrowSci(browser) {
  console.log('\n--- Checking #4259 Arrow Science & Tech ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.arrowscitech.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const details = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => {
        const label = el.closest('[data-testid]')?.innerText || 
                      el.parentElement?.parentElement?.innerText || '';
        return { id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, label: label.replace(/\s+/g, ' ').trim() };
      });
      return inputs;
    });
    console.log('Arrow inputs:', JSON.stringify(details, null, 2));
  } catch (e) {
    console.log('Arrow error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectAllometrics(browser) {
  console.log('\n--- Checking #4260 Allometrics ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://allometrics.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const frames = page.frames();
    console.log(`Allometrics frames count: ${frames.length}`);
    for (const frame of frames) {
      console.log(`Frame URL: ${frame.url()}`);
      try {
        const inputs = await frame.evaluate(() => {
          return Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
            id: el.id, name: el.name, type: el.type, placeholder: el.placeholder
          }));
        });
        if (inputs.length > 0) {
          console.log(`Frame inputs (${inputs.length}):`, inputs);
        }
      } catch (err) {
        console.log('Frame eval error:', err.message);
      }
    }
  } catch (e) {
    console.log('Allometrics error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectMicroPrecision(browser) {
  console.log('\n--- Checking #4261 Micro Precision ---');
  const page = await browser.newPage();
  try {
    await page.goto('http://microprecisionco.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Loaded Micro Precision: Title =', await page.title());
    const formHtml = await page.evaluate(() => document.querySelector('form')?.outerHTML);
    console.log('Form HTML snippet:', formHtml?.slice(0, 300));
  } catch (e) {
    console.log('Micro Precision error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectOdyssey(browser) {
  console.log('\n--- Checking #4263 Odyssey Precision Fabricating ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://odysseyprecision.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form#form_contact-form') || document.querySelector('.frm_forms form');
      if (!form) return 'No Formidable form found';
      return Array.from(form.querySelectorAll('.frm_form_field, input, textarea')).map(el => {
        return {
          id: el.id,
          class: el.className,
          label: el.querySelector('label')?.innerText?.trim() || '',
          inputName: el.querySelector('input, textarea')?.name || el.name,
          inputType: el.querySelector('input, textarea')?.type || el.type
        };
      });
    });
    console.log('Odyssey inputs:', JSON.stringify(inputs, null, 2));
  } catch (e) {
    console.log('Odyssey error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectDAC(browser) {
  console.log('\n--- Checking #4265 DAC Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dacengineers.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate(() => {
      const cf7 = document.querySelector('.wpcf7');
      return {
        hasCf7: !!cf7,
        innerHTML: cf7?.innerHTML?.slice(0, 400)
      };
    });
    console.log('DAC CF7 info:', info);
  } catch (e) {
    console.log('DAC error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectGR2(browser) {
  console.log('\n--- Checking #4267 GR2 Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://gr2engineering.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.elementor-form');
      const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]');
      const gBadge = document.querySelector('.grecaptcha-badge');
      return {
        hasForm: !!form,
        recaptchaIframe: !!recaptchaIframe,
        gBadge: !!gBadge,
        formFields: Array.from(document.querySelectorAll('.elementor-field-group')).map(g => g.innerText.trim())
      };
    });
    console.log('GR2 info:', info);
  } catch (e) {
    console.log('GR2 error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectZentech(browser) {
  console.log('\n--- Checking #4268 Zentech Inc ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.zentech-usa.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const details = await page.evaluate(() => {
      const form = document.querySelector('form');
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => {
        const label = el.closest('[data-testid]')?.innerText || 
                      el.parentElement?.parentElement?.innerText || '';
        return { id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, label: label.replace(/\s+/g, ' ').trim() };
      });
      return inputs;
    });
    console.log('Zentech inputs:', JSON.stringify(details, null, 2));
  } catch (e) {
    console.log('Zentech error:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await inspectMTech(browser);
  await inspectArrowSci(browser);
  await inspectAllometrics(browser);
  await inspectMicroPrecision(browser);
  await inspectOdyssey(browser);
  await inspectDAC(browser);
  await inspectGR2(browser);
  await inspectZentech(browser);

  await browser.close();
}

main();
