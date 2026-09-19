import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function launchBrowser() {
  return await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function inspectFields(url, selector) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const fields = await page.evaluate((sel) => {
      const form = document.querySelector(sel) || document.querySelector('form');
      if (!form) return null;
      const elements = Array.from(form.querySelectorAll('input, textarea, select, button'));
      return elements.map(el => {
        let label = '';
        if (el.id) {
          const l = document.querySelector(`label[for="${el.id}"]`);
          if (l) label = l.innerText.trim();
        }
        if (!label) {
          const p = el.closest('label') || el.closest('.gfield') || el.closest('.frm_form_field') || el.parentElement;
          if (p) label = p.innerText.trim();
        }
        return {
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder || '',
          label: label.substring(0, 50),
          value: el.value || '',
          required: el.required
        };
      });
    }, selector);
    console.log(`\nURL: ${url}`);
    console.log(JSON.stringify(fields, null, 2));
  } catch (e) {
    console.log(`Error inspecting ${url}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log('--- Inspecting EUA ---');
  await inspectFields('https://eua.com/contact/', 'form.frm-show-form');
  console.log('--- Inspecting CPL ---');
  await inspectFields('https://cplteam.com/contact/', 'form#gform_1');
  console.log('--- Inspecting BAA Mechanical ---');
  await inspectFields('https://www.baamechanical.com/', 'form');
  console.log('--- Inspecting Converge Engineering ---');
  await inspectFields('https://www.convergeengineers.com/contact-7', 'form');
}

run();
