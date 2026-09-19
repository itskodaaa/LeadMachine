import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

  const listeners = await page.evaluate(() => {
    const form = document.querySelector('form');
    // Check react fiber
    const key = Object.keys(form).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
    return {
      hasReactProps: !!key,
      props: key ? Object.keys(form[key]) : null,
      onSubmit: key && form[key]?.onSubmit ? form[key].onSubmit.toString() : null
    };
  });
  console.log('React fiber listeners on form:', listeners);

  await browser.close();
}
check();
