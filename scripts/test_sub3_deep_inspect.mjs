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
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you, Pamela Jameson.'
};

async function testSites() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  // Test 4578 POWER Engineers
  console.log('\n--- Checking #4578 POWER Engineers ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://powereng.com/contact', { waitUntil: 'networkidle2', timeout: 30000 }).catch(async () => {
      await page.goto('https://powereng.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    console.log('4578 URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]')
      }));
    });
    console.log('4578 Forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4578 Error:', e.message);
  }

  // Test 4579 JMEG Electrical Contractors
  console.log('\n--- Checking #4579 JMEG Electrical Contractors ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.jmeg.us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4579 URL:', page.url());
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact|reach|quote|touch/i.test(a.innerText) || /contact/i.test(a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('4579 Contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log('4579 Contact page URL:', page.url());
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id })),
          text: f.innerText.slice(0, 200)
        }));
      });
      console.log('4579 Contact forms:', JSON.stringify(forms, null, 2));
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log('4579 Page text sample:', pageText);
    }
    await page.close();
  } catch (e) {
    console.log('4579 Error:', e.message);
  }

  // Test 4581 ATX Electrical Services
  console.log('\n--- Checking #4581 ATX Electrical Services ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://atxelectricalservices.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4581 Contact page URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder, required: i.required })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]'),
        text: f.innerText.slice(0, 200)
      }));
    });
    console.log('4581 Contact forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4581 Error:', e.message);
  }

  // Test 4582 TruTec Electric
  console.log('\n--- Checking #4582 TruTec Electric ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.trutecelectric.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4582 Contact page URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder, required: i.required })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]'),
        selectOptions: Array.from(f.querySelectorAll('select')).map(s => ({ name: s.name, options: Array.from(s.options).map(o => ({ val: o.value, text: o.text })) }))
      }));
    });
    console.log('4582 Forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4582 Error:', e.message);
  }

  // Test 4583 Electrical Consultants, Inc.
  console.log('\n--- Checking #4583 Electrical Consultants, Inc. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://eciusa.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4583 URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]'),
        html: f.innerHTML.slice(0, 300)
      }));
    });
    console.log('4583 Forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4583 Error:', e.message);
  }

  // Test 4585 Energy Systems Design, Inc.
  console.log('\n--- Checking #4585 Energy Systems Design, Inc. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.esdengineers.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4585 URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]'),
        html: f.innerHTML.slice(0, 300)
      }));
    });
    console.log('4585 Forms:', JSON.stringify(forms, null, 2));
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 600));
    console.log('4585 Body text snippet:', bodySnippet);
    await page.close();
  } catch (e) {
    console.log('4585 Error:', e.message);
  }

  // Test 4586 AC Electric, LLC
  console.log('\n--- Checking #4586 AC Electric, LLC ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://acelectricaustin.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4586 URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]')
      }));
    });
    console.log('4586 Forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4586 Error:', e.message);
  }

  // Test 4587 KDR Electrical Services
  console.log('\n--- Checking #4587 KDR Electrical Services ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://austinelectricalservice.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('4587 URL:', page.url());
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        action: f.action,
        method: f.method,
        selects: Array.from(f.querySelectorAll('select')).map(s => ({
          name: s.name,
          id: s.id,
          options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
        })),
        radios: Array.from(f.querySelectorAll('input[type="radio"]')).map(r => ({ name: r.name, value: r.value })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({ tag: b.tagName, type: b.type, text: b.innerText || b.value }))
      };
    });
    console.log('4587 Form Info:', JSON.stringify(formInfo, null, 2));
    await page.close();
  } catch (e) {
    console.log('4587 Error:', e.message);
  }

  // Test 4588 Electric Solutions LLC
  console.log('\n--- Checking #4588 Electric Solutions LLC ---');
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    const resp = await page.goto('https://electric-solutionsllc.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('4588 Status:', resp ? resp.status() : 'no resp', 'URL:', page.url());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
        hasRecaptcha: !!f.querySelector('[class*="recaptcha"], iframe[src*="recaptcha"]')
      }));
    });
    console.log('4588 Forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('4588 Error:', e.message);
  }

  await browser.close();
}

testSites().catch(console.error);
