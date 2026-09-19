import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkKocsis() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.kocsisusa.com/request-for-a-quote/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const formsData = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map((f, i) => {
      const heading = f.closest('section')?.querySelector('h1, h2, h3, h4')?.innerText || '';
      const visibleInputs = Array.from(f.querySelectorAll('input, select, textarea, button')).filter(el => {
        if (el.closest('[inert]')) return false;
        if (el.type === 'hidden') return false;
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      }).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || '',
        required: el.required
      }));

      const submitBtn = f.querySelector('button[type=\"submit\"], input[type=\"submit\"], button');
      return {
        formIndex: i,
        heading,
        action: f.action,
        visibleInputs,
        submitBtnText: submitBtn ? submitBtn.innerText : null
      };
    });
  });

  console.log('Kocsis Forms:\n', JSON.stringify(formsData, null, 2));
  await browser.close();
}

checkKocsis();
