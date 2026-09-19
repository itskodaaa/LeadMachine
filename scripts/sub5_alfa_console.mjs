import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkConsole() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

  // Fill in
  const inputs = await page.$$('form input');
  await inputs[0].type('Pamela Jameson');
  await inputs[1].type('pamela.jameson@nortiheastprecision.com');
  await inputs[2].type('708-568-3708');
  await inputs[3].type('100 Main St, Chicago, IL');
  
  const serviceButtons = await page.$$('form button[type="button"]');
  for (const b of serviceButtons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text === 'Other') {
      await b.click();
      break;
    }
  }

  const textarea = await page.$('form textarea');
  await textarea.type('Hello, inquiry about project collaboration.');

  console.log('Clicking Send Message...');
  const submitBtn = await page.$('form button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 4000));

  // Check if form was cleared or replaced
  const inputsAfter = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form input, form textarea')).map(i => i.value);
  });
  console.log('Inputs after click:', inputsAfter);

  await browser.close();
}
checkConsole();
