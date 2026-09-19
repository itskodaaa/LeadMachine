import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4407, name: 'Mann Mechanical', url: 'https://mannmechanical.com/contact/' },
  { id: 4408, name: 'CHA Consulting, Inc.', url: 'https://www.chasolutions.com/contact/' },
  { id: 4410, name: 'Enginuity Works Corporation', url: 'https://enginuityworks.com/' },
  { id: 4411, name: 'Kickr Design', url: 'https://www.kickrdesign.com/contact/' },
  { id: 4413, name: 'KEY Engineering Group, Inc', url: 'https://keyengineeringgroup.com/' },
  { id: 4414, name: 'Function Engineering', url: 'https://www.function.com/' },
  { id: 4415, name: 'Tech Technology Solutions', url: 'https://techtechnologysolutions.com/contact' },
  { id: 4416, name: 'Robert and Company', url: 'https://robertandcompany.com/Contact.html' },
  { id: 4417, name: 'Atkins Engineering Solutions', url: 'https://atkengsol.com/contact' }
];

async function testContactPages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      console.log(`\n========================================`);
      console.log(`Testing #${t.id} ${t.name} -> ${t.url}`);
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
        console.log(`Goto failed: ${e.message}, trying domcontentloaded`);
        return page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      });

      const url = page.url();
      const title = await page.title();
      console.log(`Final URL: ${url} | Title: ${title}`);

      // Check text / contact details
      const bodySnippet = await page.evaluate(() => {
        return (document.body?.innerText || '').substring(0, 500).replace(/\n+/g, ' ');
      });
      console.log(`Body snippet: ${bodySnippet}`);

      // Inspect forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
            tag: c.tagName,
            src: c.src,
            className: c.className,
            sitekey: c.getAttribute('data-sitekey')
          }));
          return {
            index: i,
            id: f.id,
            name: f.name,
            action: f.action,
            inputCount: inputs.length,
            inputs,
            captchas
          };
        });
      });
      console.log(`Forms found:`, JSON.stringify(forms, null, 2));

      // Check iframes
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          id: iframe.id,
          name: iframe.name,
          width: iframe.width,
          height: iframe.height
        }));
      });
      console.log(`Iframes:`, iframes);

      // Check email addresses
      const emails = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', ''));
        return Array.from(new Set([...matches, ...mailtos])).filter(e => !e.includes('wixpress') && !e.includes('sentry') && !e.includes('example'));
      });
      console.log(`Emails found:`, emails);

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testContactPages();
