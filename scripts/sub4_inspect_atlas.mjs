import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testAtlas() {
  console.log('\n--- Inspecting Lead #4158: Atlas Foundation Repair ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://atlasfoundation.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Atlas URL:', page.url());
    console.log('Atlas Title:', await page.title());

    // Find forms and all inputs
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className,
        elements: Array.from(f.querySelectorAll('input, select, textarea, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          value: el.value,
          ariaLabel: el.getAttribute('aria-label')
        }))
      }));
    });
    console.log('Atlas forms:', JSON.stringify(formInfo, null, 2));

    // Check contact page if any
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => /contact|quote|estimate/i.test(a.innerText || ''))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Atlas links:', links);
  } catch (e) {
    console.log('Atlas error:', e.message);
  } finally {
    await browser.close();
  }
}

testAtlas();
