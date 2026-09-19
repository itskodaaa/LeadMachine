import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testLM3() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('form') || url.includes('submission') || url.includes('wixapps')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`Body: ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  await page.goto('https://www.lm3technologies.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.type('#input_comp-lwh263gu3', 'Pamela', { delay: 20 });
  await page.type('#input_comp-lwh263gz', 'Jameson', { delay: 20 });
  await page.type('#input_comp-lwh2bkmy', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
  await page.type('#textarea_comp-lwh263h1', 'Hello, We are interested in your precision automation and inspection systems and would like to explore collaboration. Please reach out to Pamela Jameson. Thank you.', { delay: 10 });

  console.log('Clicking the Send button...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#comp-lwh263h45 button') || document.querySelector('[data-testid="buttonElement"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked?', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const msg = document.querySelector('.wixui-form__message, [role="alert"], [data-testid="form-message"]');
    return {
      msgText: msg ? msg.innerText : null,
      fullBody: document.body.innerText.slice(0, 600)
    };
  });
  console.log('Result:', result);

  await browser.close();
}

testLM3();
