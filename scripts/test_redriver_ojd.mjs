import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(name, url) {
  console.log(`\n=== Checking ${name}: ${url} ===`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Title:', await page.title());
    console.log('Final URL:', page.url());

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      }));
    });
    console.log('Forms on page:', JSON.stringify(forms, null, 2));

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.href, text: a.innerText.trim() }))
        .filter(a => /contact|quote|about/i.test(a.text) || /contact|quote/i.test(a.href));
    });
    console.log('Relevant links:', links.slice(0, 5));

    const contacts = await page.evaluate(() => {
      const text = document.body.innerText;
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const phones = text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];
      return {
        emails: Array.from(new Set(emails)),
        phones: Array.from(new Set(phones.slice(0, 5)))
      };
    });
    console.log('Contacts on page:', contacts);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await checkSite('#3506 Red River Precision', 'https://www.redriverprec.com/');
  await checkSite('#3507 OJD Engineering Inc', 'https://ojdengineering.com/');
}

main();
