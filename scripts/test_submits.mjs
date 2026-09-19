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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testStructuneering(browser) {
  console.log('\n--- Testing 4160 Structuneering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://structuneering.com/contact.html', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.type('#form_name', OUTREACH_PROFILE.fullName);
    await page.type('#form_email', OUTREACH_PROFILE.email);
    await page.type('#form_subject', OUTREACH_PROFILE.subject);
    await page.type('#form_message', OUTREACH_PROFILE.message);

    // Track network requests
    page.on('response', async res => {
      if (res.url().includes('contact') || res.request().method() === 'POST') {
        console.log(`[Response] ${res.status()} ${res.url()}`);
        try {
          console.log('Body:', (await res.text()).substring(0, 300));
        } catch (_) {}
      }
    });

    // Click submit
    console.log('Submitting...');
    await page.click('input[type="submit"], button[type="submit"], .btn-send, input.btn');
    await new Promise(r => setTimeout(r, 4000));
    const msg = await page.evaluate(() => {
      const el = document.querySelector('.messages');
      return el ? el.innerText : '';
    });
    console.log('Structuneering .messages element text:', msg);
  } catch (e) {
    console.log('Structuneering error:', e.message);
  } finally {
    await page.close();
  }
}

async function testLECGI(browser) {
  console.log('\n--- Testing 4163 LECGI ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://lecgitx.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    // Inspect the form fields
    const inputsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
      return inputs.map(i => ({
        id: i.id,
        tag: i.tagName,
        type: i.type,
        parentText: i.parentElement ? i.parentElement.innerText : '',
        prevText: i.previousElementSibling ? i.previousElementSibling.innerText : ''
      }));
    });
    console.log('LECGI inputs info:', inputsInfo);
  } catch (e) {
    console.log('LECGI error:', e.message);
  } finally {
    await page.close();
  }
}

async function testBestInspections(browser) {
  console.log('\n--- Testing 4166 Foresight Best Inspections ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://bestinspections.org/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    const captchaInfo = await page.evaluate(() => {
      const label = document.querySelector('.et_pb_contact_captcha_question');
      const input = document.querySelector('.et_pb_contact_captcha');
      const hidden = document.querySelector('input[name*="captcha"]');
      return {
        question: label ? label.innerText : (document.body.innerText.match(/\d+\s*[\+\-\*]\s*\d+/) || [null])[0],
        input: input ? input.outerHTML : null,
        allCaptchaEls: Array.from(document.querySelectorAll('[class*="captcha"]')).map(e => e.outerHTML)
      };
    });
    console.log('Best inspections captcha info:', captchaInfo);
  } catch (e) {
    console.log('Best inspections error:', e.message);
  } finally {
    await page.close();
  }
}

async function testHoustonStructure(browser) {
  console.log('\n--- Testing 4167 Houston Structure ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://houstonstructure.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        innerHTML: f.innerHTML
      }));
    });
    console.log('Houston Structure home forms count:', forms.length);
    if (forms[0]) console.log('Home form snippet:', forms[0].innerHTML.substring(0, 400));
  } catch (e) {
    console.log('Houston Structure error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  await testStructuneering(browser);
  await testLECGI(browser);
  await testBestInspections(browser);
  await testHoustonStructure(browser);

  await browser.close();
}

run();
