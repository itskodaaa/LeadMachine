import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3883, name: 'DeCaro Willson', url: 'https://decarowillson.com' },
  { id: 3884, name: 'EBI Surveying', url: 'https://ebisurvey.com' },
  { id: 3885, name: 'P G & H Engineering', url: 'https://pgheng.com' },
  { id: 3886, name: 'Kingdom Precision', url: 'https://kingdomprecision.com' },
  { id: 3887, name: 'KPI Engineering, Inc.', url: 'https://kpiengineering.com' },
  { id: 3888, name: 'Princeton Tool South', url: 'https://princetontool.com' },
  { id: 3889, name: 'Engineering Professionals, Inc.', url: 'https://engrpros.com' },
  { id: 3890, name: 'Pegasus TSI Inc', url: 'https://pegasustsi.com' },
  { id: 3891, name: 'Award Engineering Inc', url: 'https://awardengineering.com' },
  { id: 3892, name: 'Phoenix Engineering Group', url: 'https://phoenixeng.us' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`Inspecting #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Page title: ${await page.title()}`);
      console.log(`Final URL: ${page.url()}`);

      // Check forms on main page
      const pageForms = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));
      });

      // Find contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|inquir|quote|touch/i.test(a.text) || /contact|inquir|quote/i.test(a.href));
      });

      console.log(`Forms found on main: ${pageForms.length}`);
      console.log(`Contact links:`, links.slice(0, 5));

      // If contact link exists, visit it
      if (links.length > 0) {
        const targetLink = links[0].href;
        console.log(`Visiting contact link: ${targetLink}`);
        await page.goto(targetLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`Contact page title: ${await page.title()}`);
        console.log(`Contact page URL: ${page.url()}`);

        const contactForms = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
          return {
            formsCount: forms.length,
            captchaCount: captchas.length,
            captchaSrc: Array.from(captchas).map(c => c.src || c.className),
            inputs: Array.from(document.querySelectorAll('form input, form textarea, form select')).map(i => ({
              name: i.name,
              type: i.type,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required
            }))
          };
        });

        console.log(`Contact forms summary:`, JSON.stringify(contactForms, null, 2));
      }
    } catch (e) {
      console.log(`Error inspecting #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
