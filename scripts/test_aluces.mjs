import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testAluces() {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.alucescorp.com/', { waitUntil: 'load', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  page.on('response', async r => {
    if (r.url().includes('wixforms') || r.url().includes('form')) {
      console.log('Aluces response:', r.url(), r.status());
      try {
        console.log('Body:', (await r.text()).substring(0, 300));
      } catch (e) {}
    }
  });

  await page.type('#input_comp-kf7u55db', 'Pamela Jameson');
  await page.type('#input_comp-kf7u55do', 'pamela.jameson@nortiheastprecision.com');
  await page.type('#input_comp-kf7u55du', '708-568-3708');
  await page.type('#input_comp-kf7u55e0', 'Exploring Collaboration Opportunities');
  await page.type('#textarea_comp-kf7u55e5', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship.');

  const btn = await page.$('div[id*="comp-kf7u55"] button');
  console.log('Button found:', !!btn, await page.evaluate(el => el.innerText, btn));
  await btn.click();
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => {
    const el = document.querySelector('#comp-kf7u55ca');
    return el ? el.innerText : '';
  });
  console.log('Form text after click:\n', text);
  await browser.close();
}
testAluces();
