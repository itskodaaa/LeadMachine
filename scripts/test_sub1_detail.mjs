import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const targets = [
  { id: 4441, url: 'https://jesh.llc/contact-us' },
  { id: 4442, url: 'https://www.proficientengineering.com/contact/' },
  { id: 4443, url: 'https://cowetatechprecision.com/contact/' },
  { id: 4444, url: 'https://rapidprecisioncastings.com/contact-us/' },
  { id: 4448, url: 'https://www.doble.com/contact/' },
  { id: 4453, url: 'https://www.br-automation.com/en/about-us/contact/' }
];

async function checkForms() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      console.log(`\n========================================`);
      console.log(`Target #${t.id}: ${t.url}`);
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required,
            visible: el.offsetParent !== null
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type=submit]')).map(b => ({
            tag: b.tagName.toLowerCase(),
            type: b.type,
            text: (b.innerText || b.value).trim(),
            id: b.id,
            name: b.name
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });

      console.log(`Forms found: ${forms.length}`);
      console.log(JSON.stringify(forms, null, 2));

      // Also check page text for emails or phone numbers
      const contactText = await page.evaluate(() => {
        return {
          textSnippet: document.body.innerText.slice(0, 500),
          emails: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', ''))
        };
      });
      console.log(`Emails:`, contactText.emails);

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

checkForms();
