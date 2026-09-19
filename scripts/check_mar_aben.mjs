import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkMarAndAben() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  // Mar Engineering
  console.log('--- Checking Mar Engineering ---');
  const page1 = await browser.newPage();
  try {
    const res = await page1.goto('http://marengineering.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Mar status:', res ? res.status() : 'none', 'URL:', page1.url());
    const info = await page1.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.slice(0, 200));
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => /contact/i.test(a.text) || /contact/i.test(a.href));
      return { forms, links, text: document.body ? document.body.innerText.slice(0, 300) : '' };
    });
    console.log('Mar info:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('Mar error:', e.message);
  }
  await page1.close();

  // ABEN Machine
  console.log('\n--- Checking ABEN Machine ---');
  const page2 = await browser.newPage();
  try {
    const res2 = await page2.goto('http://abenusa.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('ABEN status:', res2 ? res2.status() : 'none', 'URL:', page2.url());
    const info2 = await page2.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.slice(0, 200));
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => /contact/i.test(a.text) || /contact/i.test(a.href));
      return { forms, links, text: document.body ? document.body.innerText.slice(0, 300) : '' };
    });
    console.log('ABEN info:', JSON.stringify(info2, null, 2));
  } catch (e) {
    console.log('ABEN error:', e.message);
  }
  await page2.close();

  await browser.close();
}

checkMarAndAben();
