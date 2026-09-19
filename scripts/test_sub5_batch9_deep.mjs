import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function launchBrowser() {
  return await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

const leads = [
  { id: 3695, name: 'Northeast Tool & Manufacturing', url: 'https://northeasttool.us' },
  { id: 3698, name: 'PCOMPONENTS', url: 'https://pcomponents.com' },
  { id: 3699, name: 'SEI Technologies', url: 'https://seitechnologies.com' },
  { id: 3700, name: 'Allied Consulting Engineers', url: 'https://allied-engineers.com' },
  { id: 3701, name: 'Ensinger Precision Components, Inc.', url: 'https://ensinger-pc.com' },
  { id: 3702, name: 'FEAmax Engineering Service', url: 'https://feamax.com' },
  { id: 3704, name: 'Queen City Engineering & Design, PLLC', url: 'https://queencityeng.com' },
  { id: 3707, name: 'M2 Performance Solutions LLC', url: 'https://m2cnc.com' }
];

async function inspectAll() {
  const browser = await launchBrowser();
  for (const l of leads) {
    console.log(`\n============================\n[Lead ${l.id}] ${l.name} - ${l.url}`);
    const page = await browser.newPage();
    page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
    try {
      await page.goto(l.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      // Look for contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|inquir|about|get-in-touch/i.test(a.text) || /contact|quote|inquir/i.test(a.href))
          .slice(0, 10);
      });
      console.log('Contact links:', links);

      // Check current page forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const action = f.action;
          const method = f.method;
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => {
            return {
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required,
              visible: el.offsetWidth > 0 && el.offsetHeight > 0
            };
          });
          const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
          return { index: i, action, method, inputCount: inputs.length, inputs, captchas };
        });
      });
      console.log('Forms on main page:', JSON.stringify(forms, null, 2));

    } catch (e) {
      console.log('Error inspecting:', e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

inspectAll();
