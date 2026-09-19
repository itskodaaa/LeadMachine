import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 3383, name: 'Allana Buick & Bers, Inc.', url: 'https://abbae.com/contact/' },
  { id: 3384, name: 'Jormac Aerospace Dallas', url: 'https://www.technoaerospace.com/contact-page' },
  { id: 3385, name: 'Austin Bridge & Road Inc', url: 'https://form.jotform.com/212636253000037' },
  { id: 3387, name: 'ENFRA', url: 'https://enfrasolutions.com/contact' },
  { id: 3388, name: 'MixTech, Inc.', url: 'https://mixtech.com' },
  { id: 3389, name: 'Industrial Inspection & Analysis', url: 'https://industrial-ia.com/contact/' },
  { id: 3391, name: 'Thompson Engineering', url: 'https://www.thompsonengineering.com/contact-us/' },
  { id: 3394, name: 'EJES Inc.', url: 'https://www.ejesinc.com/contact/' },
  { id: 3396, name: 'Hall Technologies', url: 'https://hallresearch.com/contact' },
  { id: 3397, name: 'Texas Industrial Infrastructure Services, LLC', url: 'https://texasiis.com/contact-us' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-features=IsolateOrigins,site-per-process']
  });

  for (const t of targets) {
    console.log(`\n========================================================`);
    console.log(`Analyzing #${t.id}: ${t.name} -> ${t.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.setRequestInterception(true);
      page.on('request', req => {
        const rt = req.resourceType();
        if (['image', 'media', 'font'].includes(rt)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Loaded URL: ${page.url()} | Status: ${resp ? resp.status() : 'N/A'}`);
      await new Promise(r => setTimeout(r, 2000));

      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => {
            let labelText = '';
            if (el.id) {
              const lbl = document.querySelector(`label[for="${el.id}"]`);
              if (lbl) labelText = lbl.innerText.trim();
            }
            if (!labelText && el.closest('label')) {
              labelText = el.closest('label').innerText.trim();
            }
            return {
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required,
              label: labelText
            };
          });
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], div[class*="captcha"]');
          return {
            idx: i,
            id: f.id,
            action: f.action,
            method: f.method,
            hasRecaptcha,
            fields,
            buttons
          };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const bodyText = document.body ? document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) : '';

        return {
          title: document.title,
          forms,
          iframes,
          mailtos,
          bodyText
        };
      });

      console.log(`Title: ${details.title}`);
      console.log(`Mailtos: ${JSON.stringify(details.mailtos)}`);
      console.log(`Iframes: ${JSON.stringify(details.iframes)}`);
      console.log(`Body snippet: ${details.bodyText}`);
      console.log(`Forms found: ${details.forms.length}`);
      for (const form of details.forms) {
        console.log(`-- Form ${form.idx} (id="${form.id}", action="${form.action}", recaptcha=${form.hasRecaptcha}):`);
        for (const f of form.fields) {
          if (f.type !== 'hidden') {
            console.log(`   * ${f.tag}[${f.type}] name="${f.name}" id="${f.id}" label="${f.label}" req=${f.required}`);
          }
        }
        console.log(`   Buttons: ${JSON.stringify(form.buttons)}`);
      }

    } catch (err) {
      console.log(`Error: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
