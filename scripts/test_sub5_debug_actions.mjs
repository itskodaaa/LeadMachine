import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function debugFormActions() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. eelectricsf.com form handler
  const page1 = await browser.newPage();
  await page1.goto('https://eelectricsf.com/contact.html', { waitUntil: 'networkidle2' });
  const eelectricJs = await page1.evaluate(() => {
    const form = document.querySelector('#whatsapp-estimate-form');
    return {
      onsubmit: form ? form.getAttribute('onsubmit') : null,
      scripts: Array.from(document.querySelectorAll('script')).map(s => s.innerText).filter(t => t.includes('whatsapp') || t.includes('estimate') || t.includes('submit'))
    };
  });
  console.log('EElectric JS:', JSON.stringify(eelectricJs, null, 2));
  await page1.close();

  // 2. Becai form check
  const page2 = await browser.newPage();
  await page2.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2' });
  const becaiInputs = await page2.evaluate(() => {
    const form = document.querySelector('form');
    return Array.from(form.querySelectorAll('input, textarea, select')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      required: el.required,
      ariaRequired: el.getAttribute('aria-required'),
      checked: el.checked,
      label: el.closest('label')?.innerText || document.querySelector(`label[for="${el.id}"]`)?.innerText
    }));
  });
  console.log('Becai Inputs:', JSON.stringify(becaiInputs, null, 2));
  await page2.close();

  await browser.close();
}

debugFormActions();
