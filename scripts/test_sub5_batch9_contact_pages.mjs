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

const targets = [
  { id: 3695, name: 'Northeast Tool', url: 'https://northeasttool.us' },
  { id: 3698, name: 'PCOMPONENTS', url: 'https://pcomponents.com' },
  { id: 3699, name: 'SEI Technologies', url: 'https://seitechnologies.com/contact-us/' },
  { id: 3701, name: 'Ensinger Precision Components', url: 'https://ensinger-pc.com' },
  { id: 3702, name: 'FEAmax', url: 'https://www.feamax.com/contact.html' },
  { id: 3704, name: 'Queen City Engineering', url: 'https://queencityeng.com' },
  { id: 3707, name: 'M2 Performance Solutions', url: 'https://m2cnc.com/contact-us.html' }
];

async function examineTargets() {
  const browser = await launchBrowser();
  for (const t of targets) {
    console.log(`\n==============================================\nExamining #${t.id} ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    page.on('dialog', async d => {
      console.log(`[#${t.id}] Alert/Dialog opened:`, d.message());
      try { await d.dismiss(); } catch (_) {}
    });

    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Current URL:', page.url());
      console.log('Title:', await page.title());

      // If northeasttool, let's find contact link
      if (t.id === 3695) {
        const contactLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ text: a.innerText.trim(), href: a.href }))
            .filter(a => /contact|quote|about/i.test(a.text) || /contact|quote/i.test(a.href));
        });
        console.log('Contact links found:', contactLinks);
      }

      // Check forms and fields
      const formData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, idx) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            required: el.required || el.getAttribute('aria-required') === 'true',
            className: el.className || '',
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          }));
          const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 80));
          return {
            formIdx: idx,
            action: f.action,
            method: f.method,
            id: f.id,
            className: f.className,
            captchas,
            inputs
          };
        });
      });

      console.log('Form data:', JSON.stringify(formData, null, 2));

      // Also check if there are forms outside <form> tags (like React / Wix / Hubspot / Webflow)
      const inputsOutside = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        return inputs.map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          inForm: !!el.closest('form'),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
      });
      console.log(`Total inputs found: ${inputsOutside.length}`);
      if (formData.length === 0 && inputsOutside.length > 0) {
        console.log('Inputs outside form:', JSON.stringify(inputsOutside, null, 2));
      }

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

examineTargets();
