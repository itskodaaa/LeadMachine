import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check(leadId, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========================================\n[#${leadId}] ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log(`Current URL: ${page.url()} (Status: ${res?.status()})`);

    const data = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const text = document.body ? document.body.innerText : '';
      return {
        formsCount: forms.length,
        forms: forms.map((f, i) => ({
          idx: i,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          }))
        })),
        textSnippet: text.slice(0, 400)
      };
    });

    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await check(1406, 'https://www.ellisonaz.com/contact');
  await check(1413, 'https://rayjacobs.com/contact/');
  await check(1417, 'https://continentalprecision.com/contactUs.html');
  await check(1418, 'https://usherprecisionaz.com/contact/');
  await check(1419, 'https://www.komatsustores.com/contact.htm');
  await check(1431, 'https://alumcoprecision.com/');
}

run();
