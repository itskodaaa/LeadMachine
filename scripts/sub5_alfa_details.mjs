import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkAlfaForm() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(() => {
    const form = document.querySelector('form');
    return {
      action: form?.action,
      method: form?.method,
      html: form?.outerHTML.slice(0, 1000)
    };
  });
  console.log('Form:', info);
  await browser.close();
}
checkAlfaForm();
