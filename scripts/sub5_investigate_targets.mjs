import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testDynamic() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing Lead 4270 Dynamic Engineers ===');
    await page.goto('https://www.dynamicengineers.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('#Field_97531308', PROFILE.email);
    await page.type('#Field_97531307', PROFILE.firstName);
    await page.type('#Field_91100132', PROFILE.lastName);
    await page.type('#Field_97531310', PROFILE.company);
    await page.type('#Field_97531316', PROFILE.message);

    page.on('dialog', async d => {
      console.log('Dialog:', d.message());
      await d.accept();
    });

    await page.click('#Field_0');
    await new Promise(r => setTimeout(r, 6000));
    console.log('Post-submit URL:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasThanks = /thank|received|sent|success|appreciate/i.test(bodyText);
    console.log('Has confirmation text:', hasThanks);
    const match = bodyText.match(/(thank[^\.\n]+|we have received[^\.\n]+|sent successfully[^\.\n]+)/i);
    if (match) console.log('Match snippet:', match[0]);
  } catch (e) {
    console.log('Error 4270:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSoap() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing Lead 4274 SOAP Engineering ===');
    await page.goto('https://soapeng.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });

    const captcha = await page.$('.et_pb_contact_captcha_question');
    if (captcha) {
      const question = await page.evaluate(el => el.innerText, captcha);
      console.log('SOAP Math question:', question);
      const parts = question.split('+').map(s => parseInt(s.trim()));
      if (parts.length === 2) {
        const sum = parts[0] + parts[1];
        console.log('Solved sum:', sum);
        await page.type('input.input.et_pb_contact_captcha', String(sum));
      }
    }

    await page.type('#et_pb_contact_subject_0', `${PROFILE.fullName} - ${PROFILE.company}`);
    await page.type('#et_pb_contact_name_0', 'Exploring Collaboration Opportunities');
    await page.type('#et_pb_contact_email_0', PROFILE.email);
    await page.type('#et_pb_contact_message_0', PROFILE.message);

    const submitBtn = await page.$('button.et_pb_contact_submit');
    if (submitBtn) {
      console.log('Clicking SOAP submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const msg = await page.evaluate(() => {
        const el = document.querySelector('.et-pb-contact-message');
        return el ? el.innerText : null;
      });
      console.log('SOAP confirmation box:', msg);
    }
  } catch(e) {
    console.log('Error 4274:', e.message);
  } finally {
    await browser.close();
  }
}

async function testAspen() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing Lead 4271 Aspen EPC ===');
    await page.goto('https://aspenepc.com/aspen-contact-us-info.html', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('#firstname', PROFILE.firstName);
    await page.type('#lastname', PROFILE.lastName);
    await page.type('#email', PROFILE.email);
    await page.type('#phone', PROFILE.phone);
    await page.type('#message', PROFILE.message);

    page.on('dialog', async d => {
      console.log('Dialog Aspen:', d.message());
      await d.accept();
    });

    const submitBtn = await page.$('#contactForm button, #contactForm input[type="submit"], #contactForm .btn');
    if (submitBtn) {
      console.log('Clicking Aspen submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/(thank[^\.\n]+|received[^\.\n]+|sent[^\.\n]+|success[^\.\n]+)/i);
      console.log('Aspen result snippet:', match ? match[0] : 'No match found');
      console.log('Aspen URL now:', page.url());
    } else {
      console.log('No submit button found inside #contactForm');
      const allBtns = await page.evaluate(() => Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.outerHTML));
      console.log('Buttons:', allBtns);
    }
  } catch (e) {
    console.log('Error 4271:', e.message);
  } finally {
    await browser.close();
  }
}

async function testAlfa() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing Lead 4273 ALFA Engineering ===');
    await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    const inputs = await page.$$('form input, form textarea');
    console.log('ALFA inputs count:', inputs.length);
    const info = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form input, form textarea')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name,
        outerHTML: i.outerHTML.slice(0, 100)
      }));
    });
    console.log('ALFA fields info:', info);
  } catch (e) {
    console.log('Error 4273:', e.message);
  } finally {
    await browser.close();
  }
}

async function testNumeric() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing Lead 4278 Numeric Engineering ===');
    await page.goto('https://www.numericengineering.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('#name', PROFILE.fullName);
    await page.type('#company', PROFILE.company);
    await page.type('#email', PROFILE.email);
    await page.type('#timeline', 'Q2/Q3 2026');
    await page.type('#message', PROFILE.message);

    page.on('dialog', async d => {
      console.log('Dialog Numeric:', d.message());
      await d.accept();
    });

    const submitBtn = await page.$('form button[type="submit"], form button, form input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Numeric submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/(thank[^\.\n]+|received[^\.\n]+|sent[^\.\n]+|success[^\.\n]+)/i);
      console.log('Numeric result snippet:', match ? match[0] : 'No match found');
      console.log('Numeric URL now:', page.url());
    }
  } catch (e) {
    console.log('Error 4278:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testDynamic();
  await testSoap();
  await testAspen();
  await testAlfa();
  await testNumeric();
}

run();
