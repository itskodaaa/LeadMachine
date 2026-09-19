import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function debugLM3() {
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
    if (url.includes('form') || url.includes('submission') || url.includes('wix') || url.includes('recaptcha')) {
      console.log(`[Response] ${res.status()} ${url.slice(0, 100)}`);
      try {
        if (res.headers()['content-type']?.includes('json')) {
          const json = await res.json();
          console.log('JSON:', JSON.stringify(json).slice(0, 200));
        }
      } catch (e) {}
    }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('https://www.lm3technologies.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.type('#input_comp-lwh263gu3', 'Pamela', { delay: 20 });
  await page.type('#input_comp-lwh263gz', 'Jameson', { delay: 20 });
  await page.type('#input_comp-lwh2bkmy', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
  await page.type('#textarea_comp-lwh263h1', 'Hello, I am reaching out to discuss potential machining collaboration. Please get back to us. Thank you!', { delay: 10 });

  console.log('Clicking submit button directly in page...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
      btn.scrollIntoView();
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked?', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const formMsg = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.innerHTML : 'no form';
  });
  console.log('Form innerHTML after submit:\n', formMsg);

  await browser.close();
}

debugLM3();
