import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  // 1. WB Engineering
  console.log('--- 4062 WB Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://wb-3d.com/contact-wb-engineering/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        idx: i,
        action: f.action,
        id: f.id,
        fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || ''
        }))
      })).filter(f => f.fields.length > 3);
    });
    console.log(JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('WB error:', e.message);
  }

  // 2. Gables Engineering
  console.log('--- 4063 Gables Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.gableseng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const cf7 = await page.evaluate(() => {
      const f = document.querySelector('form.wpcf7-form');
      if (!f) return null;
      return {
        action: f.action,
        fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || ''
        }))
      };
    });
    console.log(JSON.stringify(cf7, null, 2));
    await page.close();
  } catch (e) {
    console.log('Gables error:', e.message);
  }

  // 3. Apex Engineering
  console.log('--- 4065 Apex Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://thestructurals.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const godaddy = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        action: f.action,
        fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          ariaLabel: el.getAttribute('aria-label'),
          label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || ''
        }))
      };
    });
    console.log(JSON.stringify(godaddy, null, 2));
    await page.close();
  } catch (e) {
    console.log('Apex error:', e.message);
  }

  await browser.close();
}

run();
