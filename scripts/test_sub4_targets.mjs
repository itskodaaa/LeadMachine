import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const contactPages = [
  { id: 4418, name: 'E Escher Inc', urls: ['https://eescherinc.com/contact-us/'] },
  { id: 4419, name: 'Evergreen Engineering Inc.', urls: ['https://evergreenengineering.com/contact/'] },
  { id: 4420, name: 'Miller Mechanical Contractors & Engineers, LLC', urls: ['http://mmce.us', 'https://www.mmce.us', 'http://www.mmce.us'] },
  { id: 4422, name: 'Phillips Gradick Engineering', urls: ['https://pgeng.net/contact/'] },
  { id: 4423, name: 'Criterium-Raby Engineers', urls: ['https://info.criterium-engineers.com/criterium-engineers-learn-more-form', 'https://criterium-engineers.com/contact'] },
  { id: 4424, name: 'Mangan Engineering & Automation Inc', urls: ['https://manganinc.com/contact/'] },
  { id: 4425, name: 'M E Cubed Engineering LLC', urls: ['https://www.me3eng.com/contact'] },
  { id: 4427, name: 'Murray Enterprise Mechanical LLC', urls: ['https://www.murrayenterprisemechanicalllc.net/contact-us'] },
  { id: 4428, name: 'Precision Design Associates', urls: ['http://pdaatl.com', 'https://www.pdaatl.com', 'http://www.pdaatl.com'] }
];

async function inspectTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const item of contactPages) {
    console.log(`\n==================================================`);
    console.log(`Inspecting #${item.id}: ${item.name}`);
    for (const url of item.urls) {
      const page = await browser.newPage();
      try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        console.log(`Navigating to: ${url}`);
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        console.log(`Loaded URL: ${page.url()} (status: ${res ? res.status() : 'N/A'})`);

        // Check iframes
        const iframes = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('iframe')).map(f => ({
            src: f.src,
            id: f.id,
            className: f.className
          }));
        });
        if (iframes.length > 0) {
          console.log(`Iframes:`, iframes);
        }

        // Check forms
        const formDetails = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type || '',
              name: el.name || '',
              id: el.id || '',
              placeholder: el.placeholder || '',
              text: el.innerText ? el.innerText.trim().slice(0, 30) : '',
              value: el.value ? el.value.trim().slice(0, 30) : ''
            }));
            return {
              formIndex: i,
              id: f.id,
              action: f.action,
              method: f.method,
              className: f.className,
              inputs,
              hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey]'),
              hasHcaptcha: !!f.querySelector('.h-captcha'),
              hasTurnstile: !!f.querySelector('.cf-turnstile')
            };
          });
          return forms;
        });

        console.log(`Forms found (${formDetails.length}):`, JSON.stringify(formDetails, null, 2));

        // Also check if any text/emails exist on page
        const emails = await page.evaluate(() => {
          const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
          const bodyText = document.body.innerText;
          const matched = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          return { mailtos, matchedEmails: Array.from(new Set(matched)).slice(0, 5) };
        });
        console.log(`Emails found:`, emails);

        break; // If url loaded successfully, break out of urls loop
      } catch (err) {
        console.log(`Failed loading ${url}: ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  }

  await browser.close();
}

inspectTargets();
