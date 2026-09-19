import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkSubpage(leadId, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========================================\n[#${leadId}] Checking: ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3500));
    console.log(`Final URL: ${page.url()} (Status: ${res?.status()})`);

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 80));

      const formsDetails = forms.map((f, idx) => ({
        index: idx,
        action: f.action,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }))
      }));

      return {
        formsCount: forms.length,
        captchas,
        formsDetails,
        bodySnippet: document.body ? document.body.innerText.slice(0, 400) : ''
      };
    });

    console.log('Result:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.error(`Error on #${leadId}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await checkSubpage(1304, 'https://samuelengineering.com/contact-us/');
  await checkSubpage(1306, 'https://imegcorp.com/contact/');
  await checkSubpage(1310, 'https://reataeng.com/discuss-your-project/');
  await checkSubpage(1311, 'https://seakr.com/connect/');
  await checkSubpage(1314, 'https://valleymachineworks.com/contact');
}

run();
