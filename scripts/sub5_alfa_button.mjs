import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

  const btnInfo = await page.evaluate(() => {
    const form = document.querySelector('form');
    const fKey = Object.keys(form).find(k => k.startsWith('__reactProps$'));
    const btn = document.querySelector('form button[type="submit"]');
    const bKey = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
    return {
      formProps: fKey ? Object.keys(form[fKey]) : null,
      formOnSubmit: fKey && form[fKey].onSubmit ? form[fKey].onSubmit.toString() : null,
      btnProps: bKey ? Object.keys(btn[bKey]) : null,
      btnOnClick: bKey && btn[bKey].onClick ? btn[bKey].onClick.toString() : null
    };
  });
  console.log('Button/Form handlers:', btnInfo);
  await browser.close();
}
check();
