import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check4681Contact() {
  console.log('\n--- Checking 4681 (AZ Sheet Metal Contact Page) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.azsheetmetalllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Final URL:', page.url());
    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder
      }))
    })));
    console.log('Forms found on /contact-us:', JSON.stringify(forms, null, 2));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Text snippet:', text.slice(0, 400).replace(/\n+/g, ' '));
  } catch (e) {
    console.log('4681 contact error:', e.message);
  } finally {
    await browser.close();
  }
}

async function check4674Body() {
  console.log('\n--- Checking 4674 / 4677 403 content ---');
  try {
    const html = execSync('curl -sL -m 10 "https://azdcelectric.com" | head -n 40', { encoding: 'utf8' });
    console.log('azdcelectric HTML snippet:\n', html);
  } catch (e) {
    console.log('curl error:', e.message);
  }
}

async function checkWinsupplyRedirect() {
  console.log('\n--- Checking Winsupply redirect ---');
  try {
    const res = execSync('curl -sIL -m 10 "https://www.winsupplyinc.com" | grep -iE "location|http/"', { encoding: 'utf8' });
    console.log('Winsupply redirect chain:\n', res);
  } catch (e) {
    console.log('curl error:', e.message);
  }
}

async function main() {
  await check4681Contact();
  await check4674Body();
  await checkWinsupplyRedirect();
}

main().catch(console.error);
