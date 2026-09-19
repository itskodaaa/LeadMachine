import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspect(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Title:', await page.title());
    console.log('Current URL:', page.url());

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => {
        return {
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
            tag: i.tagName,
            name: i.name,
            type: i.type,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            text: i.innerText || i.value
          }))
        };
      });
    });
    console.log('Forms found:', JSON.stringify(forms, null, 2));

    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => (a.innerText || '').toLowerCase().includes('contact') || (a.getAttribute('href') || '').toLowerCase().includes('contact'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Contact links:', JSON.stringify(contactLinks, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

const target = process.argv[2] || 'https://halversoneng.com';
inspect(target);
