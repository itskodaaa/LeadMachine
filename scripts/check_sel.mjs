import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSEL() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.goto('https://selinc.com/', { waitUntil: 'networkidle2', timeout: 20000 });
  
  const contactLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => /contact|support|sales/i.test(a.text) || /contact/i.test(a.href));
  });
  console.log('SEL Contact Links:', contactLinks);

  // Check https://selinc.com/contact/ or https://selinc.com/company/contact/
  for (const testUrl of ['https://selinc.com/contact/', 'https://selinc.com/company/contact/', 'https://selinc.com/support/']) {
    try {
      await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Visited ${testUrl} -> ${page.url()}`);
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => i.name || i.placeholder || i.type)
        }));
      });
      console.log(`Forms on ${testUrl}:`, JSON.stringify(forms));
      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasEmail: /[\w\.-]+@[\w\.-]+\.\w+/.test(text),
          emails: Array.from(text.matchAll(/[\w\.-]+@[\w\.-]+\.\w+/g)).map(m => m[0]).slice(0, 5),
          hasPhone: /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text),
          phones: Array.from(text.matchAll(/\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g)).map(m => m[0]).slice(0, 5)
        };
      });
      console.log(`Info on ${testUrl}:`, info);
    } catch (e) {
      console.log(`Failed to load ${testUrl}: ${e.message}`);
    }
  }

  await browser.close();
}

checkSEL();
