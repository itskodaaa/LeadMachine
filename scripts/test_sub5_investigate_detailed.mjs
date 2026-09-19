import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. ICE (4429)
  console.log('--- Checking 4429 (iceagents.com) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://iceagents.com/index.php/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const iceInfo = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      return {
        formAction: form?.action,
        inputs: Array.from(form?.querySelectorAll('input, textarea') || []).map(i => ({ name: i.name, type: i.type, id: i.id })),
        outputDiv: document.querySelector('.wpcf7-response-output')?.outerHTML
      };
    });
    console.log('ICE form info:', iceInfo);
    await page.close();
  } catch (e) {
    console.log('ICE err:', e.message);
  }

  // 2. Paradigm (4430)
  console.log('--- Checking 4430 (paradigmeng.net) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://paradigmeng.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const paraInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const buttons = Array.from(form ? form.querySelectorAll('button') : []).map(b => ({ text: b.innerText, type: b.type, role: b.getAttribute('role') }));
      const labels = Array.from(form ? form.querySelectorAll('label') : []).map(l => ({ text: l.innerText, for: l.htmlFor }));
      return { buttons, labels };
    });
    console.log('Paradigm info:', paraInfo);
    await page.close();
  } catch (e) {
    console.log('Paradigm err:', e.message);
  }

  // 3. Dynabal (4433)
  console.log('--- Checking 4433 (dynabal.com/contact.html) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dynabal.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const dynaInfo = await page.evaluate(() => {
      return {
        html: document.body.innerHTML.slice(0, 1500),
        forms: document.querySelectorAll('form').length,
        inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({ tag: i.tagName, name: i.name, type: i.type }))
      };
    });
    console.log('Dynabal info:', dynaInfo);
    await page.close();
  } catch (e) {
    console.log('Dynabal err:', e.message);
  }

  // 4. Precision Measurements (4436) - check pm-home-contact.php captcha
  console.log('--- Checking 4436 (precision-measurements.com/pm-home-contact.php) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://precision-measurements.com/pm-home-contact.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const pmInfo = await page.evaluate(() => {
      const regexLabel = document.querySelector('label[for="item6_regex_1"]')?.innerText || '';
      const regexRow = document.querySelector('#item6_regex_1')?.parentElement?.innerHTML || '';
      return { regexLabel, regexRow };
    });
    console.log('PM captcha info:', pmInfo);
    await page.close();
  } catch (e) {
    console.log('PM err:', e.message);
  }

  // 5. Thomas & Hutton (4437)
  console.log('--- Checking 4437 (thomasandhutton.com/contact/) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.thomasandhutton.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const thInfo = await page.evaluate(() => {
      return {
        title: document.title,
        formsCount: document.querySelectorAll('form').length,
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type }))
        })),
        emails: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href)
      };
    });
    console.log('TH info:', thInfo);
    await page.close();
  } catch (e) {
    console.log('TH err:', e.message);
  }

  await browser.close();
}

run();
