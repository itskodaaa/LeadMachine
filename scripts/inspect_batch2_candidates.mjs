import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const targets = [
  { id: 899, name: 'The SolidWorks Expert', url: 'https://www.thesolidworksexpert.com/' },
  { id: 900, name: 'YAKER ENGINEERING', url: 'http://yakereng.com/' },
  { id: 904, name: 'FALCON MECHANICAL', url: 'https://falconmechanicalny.com/' },
  { id: 906, name: 'NY Building Systems', url: 'https://nybscinc.com/' },
  { id: 908, name: 'Philibert Engineering', url: 'http://philibertengineering.com/' },
  { id: 909, name: 'AHT Engineering', url: 'https://www.ahteng.com/' },
  { id: 911, name: 'Precision Engineering Design', url: 'https://precisionengineeringpc.com/' }
];

async function inspectCandidates() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      console.log(`\n==============================================`);
      console.log(`Testing #${t.id}: ${t.name} (${t.url})`);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      // Find contact link
      const contactUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const kw of ['contact', 'get-in-touch', 'reach-us', 'quote']) {
          const match = links.find(a => (a.innerText || '').toLowerCase().includes(kw) || (a.getAttribute('href') || '').toLowerCase().includes(kw));
          if (match && !match.href.startsWith('mailto:') && !match.href.startsWith('tel:')) return match.href;
        }
        return null;
      });

      console.log(`Contact URL: ${contactUrl}`);
      if (contactUrl && contactUrl !== page.url()) {
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        console.log(`Navigated to: ${page.url()}`);
        await new Promise(r => setTimeout(r, 2000));
      }

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.substring(0, 80));
        const emails = Array.from(document.body.innerText.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)).map(m => m[0]).slice(0, 5);

        return {
          title: document.title,
          captchas,
          emails,
          forms: forms.map((f, i) => ({
            id: f.id,
            action: f.action,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.hasAttribute('required')
            })),
            buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim())
          }))
        };
      });

      console.log(`Title: ${info.title}`);
      console.log(`Captchas:`, JSON.stringify(info.captchas));
      console.log(`Emails:`, JSON.stringify(info.emails));
      console.log(`Forms (${info.forms.length}):`);
      for (const f of info.forms) {
        console.log(` Form id="${f.id}", buttons=${f.buttons.join(', ')}`);
        for (const inp of f.inputs) {
          console.log(`   - ${inp.tag}[type=${inp.type}, name=${inp.name}, id=${inp.id}, req=${inp.required}] placeholder="${inp.placeholder}"`);
        }
      }

    } catch (err) {
      console.log(`Error on #${t.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectCandidates();
