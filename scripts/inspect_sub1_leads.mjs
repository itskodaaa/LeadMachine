import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 5591, name: 'Switch on Electrical Corp', url: 'https://soelectrical.net' },
  { id: 5592, name: 'Ickler Electric Corporation', url: 'https://icklerelectric.com' },
  { id: 5594, name: 'Direct Engineering Solutions, Inc.', url: 'https://des-sd.com' },
  { id: 5599, name: 'Mark Snyder Electric', url: 'https://marksnyderelectric.com' },
  { id: 5603, name: 'Smart Engineering Systems, Inc.', url: 'https://smartengineeringsys.com' },
  { id: 5605, name: 'Rizza Engineering, Inc.', url: 'https://rizzaengineering.com' },
  { id: 5607, name: 'Ramona Research, Inc.', url: 'https://ramonaresearch.com' },
  { id: 5608, name: 'Elen Consulting Inc.', url: 'https://elenconsulting.com' },
  { id: 5609, name: 'Wynn Engineering, Inc.', url: 'https://wynnengineering.com' }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  for (const t of targets) {
    console.log(`\n=================== Inspecting Lead #${t.id}: ${t.name} (${t.url}) ===================`);
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded' });
      // Find contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.innerText?.trim(),
          href: a.href
        })).filter(a => a.href && (
          /contact/i.test(a.text) || /contact/i.test(a.href) ||
          /about/i.test(a.text) || /get-in-touch/i.test(a.href) ||
          /quote/i.test(a.text) || /estimate/i.test(a.text)
        ));
      });
      console.log('Relevant navigation links:', JSON.stringify(links.slice(0, 10), null, 2));

      // Check current page for forms or mailto
      const formsAndMailto = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder
          }))
        }));
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        return { forms, mailtos, iframes };
      });
      console.log('Current page forms:', formsAndMailto.forms.length, 'mailtos:', formsAndMailto.mailtos, 'iframes:', formsAndMailto.iframes);
      if (formsAndMailto.forms.length > 0) {
        console.log('Form details:', JSON.stringify(formsAndMailto.forms, null, 2));
      }
    } catch (e) {
      console.log('Error inspecting:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
