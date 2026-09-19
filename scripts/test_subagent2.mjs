import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadsToInspect = [
  3849, 3850, 3853, 3854, 3855, 3856, 3857, 3858, 3859
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const id of leadsToInspect) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    console.log(`\n========================================`);
    console.log(`Lead #${lead.id}: ${lead.company_name} (${lead.website})`);
    
    const page = await browser.newPage();
    try {
      const url = lead.website.startsWith('http') ? lead.website : 'https://' + lead.website;
      console.log('Navigating to:', url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Current URL:', page.url());
      console.log('Page Title:', await page.title());

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText?.trim()?.replace(/\s+/g, ' '), href: a.href }))
          .filter(a => a.href && (a.href.toLowerCase().includes('contact') || (a.text && a.text.toLowerCase().includes('contact'))));
      });
      console.log('Contact links:', links.slice(0, 4));

      const analyzeForms = async () => {
        return await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map(f => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              tag: i.tagName.toLowerCase(),
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required
            }));
            const hasRecaptcha = !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
            return {
              action: f.action,
              inputsCount: inputs.length,
              hasRecaptcha,
              inputs
            };
          });
        });
      };

      let forms = await analyzeForms();
      console.log(`Forms found: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      } else if (links.length > 0 && links[0].href !== page.url()) {
        console.log(`Navigating to contact link: ${links[0].href}`);
        await page.goto(links[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        forms = await analyzeForms();
        console.log(`Forms on contact page: ${forms.length}`);
        console.log(JSON.stringify(forms, null, 2));
      }
    } catch (e) {
      console.log(`Error on #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
