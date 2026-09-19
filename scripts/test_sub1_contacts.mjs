import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const contactPages = [
  { id: 3383, name: 'Allana Buick & Bers, Inc.', url: 'https://abbae.com/contact/' },
  { id: 3384, name: 'Jormac Aerospace Dallas', url: 'https://www.technoaerospace.com/contact-page' },
  { id: 3385, name: 'Austin Bridge & Road Inc', url: 'https://www.austin-ind.com/our-company/contact-us' },
  { id: 3387, name: 'ENFRA', url: 'https://enfrasolutions.com/contact' },
  { id: 3388, name: 'MixTech, Inc.', url: 'https://mixtech.com' },
  { id: 3389, name: 'Industrial Inspection & Analysis', url: 'https://industrial-ia.com/contact/' },
  { id: 3391, name: 'Thompson Engineering', url: 'https://www.thompsonengineering.com/contact-us/' },
  { id: 3394, name: 'EJES Inc.', url: 'https://www.ejesinc.com/contact/' },
  { id: 3396, name: 'Hall Technologies', url: 'https://halltechav.com' },
  { id: 3397, name: 'Texas Industrial Infrastructure Services, LLC', url: 'https://texasiis.com/contact-us' }
];

async function inspectContacts() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const item of contactPages) {
    console.log(`\n==================================================`);
    console.log(`[#${item.id}] ${item.name} -> ${item.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    try {
      const resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`HTTP Status: ${resp ? resp.status() : 'N/A'}, Loaded URL: ${page.url()}`);
      await new Promise(r => setTimeout(r, 3000)); // wait for dynamic scripts/iframes

      const result = await page.evaluate(() => {
        // Collect forms
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], div[class*="captcha"]');
          return {
            formIdx: i,
            id: f.id,
            className: f.className,
            action: f.action,
            inputs,
            buttons,
            hasRecaptcha
          };
        });

        // Collect iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
          src: f.src,
          id: f.id,
          name: f.name
        }));

        // Collect emails
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
        const text = document.body ? document.body.innerText : '';
        const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return {
          title: document.title,
          forms,
          iframes,
          emails: Array.from(new Set([...emails, ...emailMatches])).slice(0, 5),
          textSnippet: text.substring(0, 400).replace(/\s+/g, ' ')
        };
      });

      console.log(`Title: ${result.title}`);
      console.log(`Emails:`, result.emails);
      console.log(`Forms Count: ${result.forms.length}`);
      for (const f of result.forms) {
        console.log(`Form #${f.formIdx} (id: "${f.id}", class: "${f.className}", action: "${f.action}", hasRecaptcha: ${f.hasRecaptcha}):`);
        console.log(`  Inputs:`, f.inputs.map(i => `${i.tag}[type=${i.type}, name=${i.name}, id=${i.id}, req=${i.required}]`).join(', '));
        console.log(`  Buttons:`, f.buttons.join(', '));
      }
      console.log(`Iframes:`, result.iframes.map(i => i.src));

    } catch (e) {
      console.log(`Error on #${item.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectContacts();
