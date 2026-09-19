import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkZeta() {
  console.log('\n--- Checking Zeta Engineering (4120) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://zeta-engineering.us/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
      return inputs.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        label: i.labels ? Array.from(i.labels).map(l => l.innerText) : [],
        parentText: i.parentElement ? i.parentElement.innerText : ''
      }));
    });
    console.log('Zeta fields:', JSON.stringify(fields, null, 2));
  } catch (e) {
    console.log('Zeta error:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkBei() {
  console.log('\n--- Checking BEI Engineers (4121) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.beitechnologies.net/houston/contact/default.asp', { waitUntil: 'networkidle2', timeout: 30000 });
    const info = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.slice(0, 500),
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            id: i.id,
            type: i.type,
            placeholder: i.placeholder
          }))
        }))
      };
    });
    console.log('BEI iframe info:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('BEI error:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkIds() {
  console.log('\n--- Checking IDS Engineering (4124) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.idseg.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    const honeypot = await page.evaluate(() => {
      const email2 = document.querySelector('input[name="your-email2"]');
      if (!email2) return null;
      return {
        outerHTML: email2.outerHTML,
        style: email2.getAttribute('style'),
        parentStyle: email2.parentElement ? email2.parentElement.getAttribute('style') : null,
        parentClass: email2.parentElement ? email2.parentElement.className : null,
        offsetParent: email2.offsetParent ? true : false
      };
    });
    console.log('IDS email2 honeypot check:', JSON.stringify(honeypot, null, 2));
  } catch (e) {
    console.log('IDS error:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkSb() {
  console.log('\n--- Checking S&B (4127) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.sbec.com/About/Contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    const details = await page.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      if (!form) return 'No form 1';
      const select = form.querySelector('select[name="recipient"]');
      const options = select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : [];
      const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        required: i.required,
        outerHTML: i.outerHTML
      }));
      return { action: form.action, options, inputs };
    });
    console.log('S&B form details:', JSON.stringify(details, null, 2));
  } catch (e) {
    console.log('S&B error:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkBlackline() {
  console.log('\n--- Checking Blackline Engineering (4128) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://blackline-eng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Blackline loaded domcontentloaded');
    await new Promise(r => setTimeout(r, 3000));
    const info = await page.evaluate(() => {
      return {
        title: document.title,
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder
          }))
        }))
      };
    });
    console.log('Blackline info:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('Blackline error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await checkZeta();
  await checkBei();
  await checkIds();
  await checkSb();
  await checkBlackline();
}

main();
