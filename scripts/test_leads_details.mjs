import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

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
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.`
};

async function inspectDetailed() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. #4030 check form
  {
    console.log('\n--- Inspecting #4030 https://www.ljaapa.com/contact ---');
    const page = await browser.newPage();
    try {
      await page.goto('https://www.ljaapa.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
      const html = await page.evaluate(() => {
        const form = document.querySelector('form');
        return {
          formHtml: form ? form.outerHTML.slice(0, 1500) : 'No form',
          allInputs: Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
            tag: el.tagName,
            id: el.id,
            name: el.name,
            type: el.type,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute('aria-label'),
            text: el.innerText || el.value
          }))
        };
      });
      console.log('4030 Inputs:', JSON.stringify(html.allInputs, null, 2));
    } catch(e) { console.error('4030 err:', e.message); }
    await page.close();
  }

  // 2. #4031 check
  {
    console.log('\n--- Inspecting #4031 https://mengineeringc.com ---');
    const page = await browser.newPage();
    try {
      await page.goto('https://mengineeringc.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('4031 Title:', await page.title());
      const contactUrl = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a')).find(el => (el.innerText || '').toLowerCase().includes('contact') || (el.href || '').toLowerCase().includes('contact'));
        return a ? a.href : null;
      });
      if (contactUrl) {
        console.log('4031 contactUrl:', contactUrl);
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea, button, form')).map(el => ({
          tag: el.tagName, id: el.id, name: el.name, type: el.type, text: el.innerText || el.value
        }));
      });
      console.log('4031 Elements:', JSON.stringify(inputs, null, 2));
    } catch(e) { console.error('4031 err:', e.message); }
    await page.close();
  }

  // 3. #4033 check
  {
    console.log('\n--- Inspecting #4033 https://psiengineeringinc.com/ ---');
    const page = await browser.newPage();
    try {
      await page.goto('https://psiengineeringinc.com/', { waitUntil: 'networkidle2', timeout: 15000 });
      const formDetails = await page.evaluate(() => {
        const form = document.querySelector('form');
        return {
          action: form?.action,
          method: form?.method,
          html: form?.innerHTML
        };
      });
      console.log('4033 Form Details:', formDetails.action, formDetails.html?.slice(0, 1000));
    } catch(e) { console.error('4033 err:', e.message); }
    await page.close();
  }

  // 4. #4034 Shark Design
  {
    console.log('\n--- Inspecting #4034 https://sharkdesign.com ---');
    const page = await browser.newPage();
    try {
      await page.goto('https://sharkdesign.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('4034 loaded:', page.url());
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form, input, textarea, button')).map(el => ({
          tag: el.tagName, id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, text: el.innerText || el.value
        }));
      });
      console.log('4034 Inputs:', JSON.stringify(inputs.slice(0, 20), null, 2));
    } catch(e) { console.error('4034 err:', e.message); }
    await page.close();
  }

  // 5. #4039 aeitools.com
  {
    console.log('\n--- Inspecting #4039 https://aeitools.com ---');
    const page = await browser.newPage();
    try {
      await page.goto('https://aeitools.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('4039 loaded:', page.url());
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form, input, textarea, button')).map(el => ({
          tag: el.tagName, id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, text: el.innerText || el.value
        }));
      });
      console.log('4039 Inputs:', JSON.stringify(inputs.slice(0, 20), null, 2));
    } catch(e) { console.error('4039 err:', e.message); }
    await page.close();
  }

  await browser.close();
}

inspectDetailed();
