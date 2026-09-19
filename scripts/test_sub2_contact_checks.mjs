import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

// Check 4238, 4239, 4240 pages
async function checkNoFormSites() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const urls = [
    { id: 4238, url: 'https://www.pndengineers.com/contact/' },
    { id: 4239, url: 'https://vmcprecisionllc.com/contact/' },
    { id: 4240, url: 'https://www.libertypc.com/contact-us/' }
  ];

  for (const item of urls) {
    const page = await browser.newPage();
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText);
      const iframes = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(i => i.src));
      console.log(`\n--- Lead #${item.id} (${item.url}) ---`);
      console.log('Iframes:', iframes);
      console.log('Text preview:\n', text.slice(0, 500));
    } catch (e) {
      console.log(`Error checking #${item.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkNoFormSites();
