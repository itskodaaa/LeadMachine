import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testSingle(url, leadId) {
  console.log(`\n=================== Testing #${leadId}: ${url} ===================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Goto warn:', e.message));

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const text = document.body ? document.body.innerText : '';
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName,
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        required: i.required,
        visible: i.offsetWidth > 0 && i.offsetHeight > 0
      }));

      return {
        url: window.location.href,
        title: document.title,
        formsCount: forms.length,
        inputs,
        iframes,
        hasEmail: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g),
        hasPhone: text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g)?.slice(0, 5),
        sampleText: text.slice(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testSingle('https://www.gonefco.com/contact-us', 4728);
  await testSingle('https://www.thetoolcribaz.com/', 4729);
  await testSingle('https://www.hytechusa.com/contact-us', 4730);
  await testSingle('https://westfalltechnik.com/contact-us/', 4731);
  await testSingle('https://legacy-molding.com/contact', 4732);
  await testSingle('https://tmwinc.net/', 4733);
  await testSingle('https://www.zippertubing.com/pages/contact', 4734);
  await testSingle('https://dashdesigns.com/pages/contact', 4735);
  await testSingle('https://taigtools.com/contact/', 4736);
  await testSingle('https://www.gsiinternational.com/contact', 4737);
}

run();
