import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function test1736() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('POST Request:', req.url(), req.postData());
    }
  });

  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      try {
        const text = await resp.text();
        console.log('POST Response:', resp.status(), text.slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://cncprogramingmachining.com/ ...');
  await page.goto('https://cncprogramingmachining.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.evaluate(() => {
    const el = document.querySelector('#wpforms-form-17');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Typing into fields...');
  await page.type('#wpforms-17-field_0', 'Pamela Jameson', { delay: 20 });
  await page.type('#wpforms-17-field_1', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
  await page.type('#wpforms-17-field_2', 'Hello, We are interested in your precision machining services. Please have a representative contact us. Best regards, Pamela Jameson', { delay: 10 });

  // Verify fields in DOM
  const fieldsState = await page.evaluate(() => {
    const f0 = document.querySelector('#wpforms-17-field_0')?.value;
    const f1 = document.querySelector('#wpforms-17-field_1')?.value;
    const f2 = document.querySelector('#wpforms-17-field_2')?.value;
    const hp = document.querySelector('#wpforms-17-field-hp')?.value;
    return { f0, f1, f2, hp };
  });
  console.log('Fields state before click:', fieldsState);

  console.log('Clicking submit...');
  await page.click('#wpforms-submit-17');

  console.log('Waiting 10s...');
  await new Promise(r => setTimeout(r, 10000));

  const postState = await page.evaluate(() => {
    const errors = Array.from(document.querySelectorAll('.wpforms-error, label.error, div.error')).map(e => e.innerText);
    const conf = document.querySelector('.wpforms-confirmation-container-17, .wpforms-confirmation-scroll, div[id*="wpforms-confirmation"]');
    return {
      errors,
      conf: conf ? conf.innerText.trim() : null
    };
  });
  console.log('Post submit state:', postState);

  await browser.close();
}

test1736().catch(console.error);
