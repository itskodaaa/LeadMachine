import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const pagesToInspect = [
  { id: 4881, name: 'Tampa Brass - contact', url: 'https://tampabrass.com/contact/' },
  { id: 4881, name: 'Tampa Brass - smart-rfq', url: 'https://tampabrass.com/smart-rfq-form/' },
  { id: 4882, name: 'TL Sheet Metal - contact', url: 'https://www.tlsheetmetal.com/contact-us/' },
  { id: 4883, name: 'WG Welding - contact', url: 'https://wgweldingerectioncorp.com/contact' },
  { id: 4887, name: 'Florida Metals - contact', url: 'https://fltin.com/contact-us/' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const item of pagesToInspect) {
    console.log(`\n========================================`);
    console.log(`Checking [${item.id}] ${item.name}: ${item.url}`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    try {
      const res = await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => {
        console.log(`Navigation error: ${e.message}`);
        return null;
      });

      console.log(`Loaded URL: ${page.url()} | Title: ${await page.title()}`);

      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => ({
          formIndex: i,
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type=submit]')).map(b => b.innerText || b.value)
        }));
      });

      console.log(`Forms found (${formDetails.length}):`, JSON.stringify(formDetails, null, 2));

      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      });
      console.log(`Iframes:`, iframes);

      const pageTextSnippet = await page.evaluate(() => {
        return document.body.innerText.slice(0, 500).replace(/\s+/g, ' ');
      });
      console.log(`Snippet:`, pageTextSnippet);

    } catch (err) {
      console.error(`Error on ${item.url}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
