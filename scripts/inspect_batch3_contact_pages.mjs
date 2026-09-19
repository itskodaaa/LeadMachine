import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkContactPage(id, url) {
  console.log(`\n================== Contact Page #${id} (${url}) ==================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Title:', await page.title());
    console.log('Final URL:', page.url());

    const data = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'))
        .filter(f => !f.className.includes('search'))
        .map((f, i) => ({
          idx: i,
          action: f.action,
          method: f.method,
          className: f.className,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(inp => ({
            tag: inp.tagName,
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type="submit"], .button, a.fl-button')).map(b => b.innerText || b.value)
        }));
      
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.src || c.className);
      const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

      return {
        forms,
        captchas,
        emails,
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });

    console.log(JSON.stringify(data, null, 2));

  } catch (e) {
    console.error(`Error on #${id}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  const pages = [
    [1031, 'https://rbdengineering.com/contact'],
    [1032, 'https://www.haegerengineering.com/contact-haeger/'],
    [1033, 'https://moshecal.com/Contact_Us.html'],
    [1035, 'https://thestructuralshop.com/contact%20us.html'],
    [1036, 'https://www.dbsterlin.com/contact/'],
    [1038, 'https://www.ckleng.com/contact-us'],
    [1039, 'https://www.ecslimited.com/contact-us/'],
    [1041, 'http://orionengineersllc.com/contact-us/'],
    [1042, 'https://info.burnsmcd.com/contact-us'],
    [1044, 'https://www.gec-group.com/contact/']
  ];

  for (const [id, url] of pages) {
    await checkContactPage(id, url);
  }
}

run();
