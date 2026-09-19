import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function inspectAlfa() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== ALFA Engineering Detailed Inspection ===');
    await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

    // Inspect labels and inputs
    const formDetails = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      return Array.from(form.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        type: el.type,
        placeholder: el.placeholder
      }));
    });
    console.log('ALFA Form elements:', formDetails);

    // Try filling
    const inputs = await page.$$('form input');
    // Name, Email, Phone, Address/Subject?
    if (inputs.length >= 4) {
      await inputs[0].type(PROFILE.fullName);
      await inputs[1].type(PROFILE.email);
      await inputs[2].type(PROFILE.phone);
      await inputs[3].type(PROFILE.address);
    }
    const textarea = await page.$('form textarea');
    if (textarea) {
      await textarea.type(PROFILE.message);
    }

    const btn = await page.$('form button[type="submit"], form button');
    console.log('Submitting ALFA form...');
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 5000));
      const postText = await page.evaluate(() => document.body.innerText);
      const match = postText.match(/(thank[^\.\n]+|received[^\.\n]+|sent[^\.\n]+|success[^\.\n]+|error[^\.\n]+)/i);
      console.log('ALFA post-submit text:', match ? match[0] : 'No match');
      // Also look for toast / alert elements
      const toasts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="alert"], [role="status"], .toast, [data-sonner-toast]')).map(t => t.innerText);
      });
      console.log('ALFA Toasts:', toasts);
    }
  } catch(e) {
    console.log('Error ALFA:', e.message);
  } finally {
    await browser.close();
  }
}

async function inspectDynamic() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Dynamic Engineers Detailed Inspection ===');
    await page.goto('https://www.dynamicengineers.com/contact', { waitUntil: 'networkidle2' });

    await page.type('#Field_97531308', PROFILE.email);
    await page.type('#Field_97531307', PROFILE.firstName);
    await page.type('#Field_91100132', PROFILE.lastName);
    await page.type('#Field_97531310', PROFILE.company);
    await page.type('#Field_97531316', PROFILE.message);

    // Let's capture network requests when clicking submit
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('contact') || url.includes('Field') || url.includes('dynamicengineers.com')) {
        console.log('Dynamic response:', res.status(), url);
      }
    });

    await page.click('#Field_0');
    await new Promise(r => setTimeout(r, 6000));

    const confirmationInfo = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.alert, .success, .thank, [id*=\"success\"], [class*=\"success\"], [class*=\"confirm\"]')).map(el => el.innerText);
      const formHtml = document.querySelector('#form1')?.innerHTML.slice(0, 500);
      return { alerts, formHtmlSnippet: formHtml };
    });
    console.log('Dynamic Engineers confirmation:', confirmationInfo);
  } catch(e) {
    console.log('Error Dynamic:', e.message);
  } finally {
    await browser.close();
  }
}

async function inspectAspen() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Aspen EPC Detailed Inspection ===');
    await page.goto('https://aspenepc.com/aspen-contact-us-info.html', { waitUntil: 'networkidle2' });

    const formAction = await page.evaluate(() => {
      const f = document.querySelector('#contactForm');
      return {
        action: f.getAttribute('action'),
        method: f.getAttribute('method'),
        onsubmit: f.getAttribute('onsubmit')
      };
    });
    console.log('Aspen form attrs:', formAction);

    // check scripts on page
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML.slice(0, 100)).filter(s => s.includes('contact') || s.includes('mail'));
    });
    console.log('Aspen contact scripts:', scripts);
  } catch(e) {
    console.log('Error Aspen:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspectAlfa();
  await inspectDynamic();
  await inspectAspen();
}

run();
