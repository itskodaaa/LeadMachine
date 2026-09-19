import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testMonsoonPages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://monsoonmetal.com/products', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Products URL:', page.url());

    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ id: i.id, name: i.name, type: i.type, visible: i.offsetWidth > 0 && i.offsetHeight > 0 }))
    })));
    console.log('Forms on /products:', JSON.stringify(forms, null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testMonsoonPages().catch(console.error);
