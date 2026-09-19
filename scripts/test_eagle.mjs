import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkEagle() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    const resp = await page.goto('https://eagleprecisionmachining.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Eagle Precision Machining URL:', page.url(), 'status:', resp?.status());
    console.log('Title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('Forms:', JSON.stringify(forms, null, 2));

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Links:', links.filter(l => /contact|about|quote/i.test(l.text) || /contact|quote/i.test(l.href)));

  } catch (e) {
    console.error('Eagle error:', e.message);
  } finally {
    await browser.close();
  }
}

checkEagle();
