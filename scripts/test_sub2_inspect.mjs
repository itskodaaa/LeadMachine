import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4455, name: 'Ingram Engineering, LLC', url: 'https://ingramengineering.net' },
  { id: 4456, name: 'Engineering Tools Atlanta Ltd', url: 'https://etatlanta.com' },
  { id: 4458, name: 'International Castings & Equipment', url: 'https://internationalcastings.com' },
  { id: 4460, name: 'Cardinal Systems Integration, LLC', url: 'https://cardinalsi.com' },
  { id: 4461, name: 'Axis Companies', url: 'https://axiscompanies.com' },
  { id: 4463, name: 'Hill Company, Inc.', url: 'https://hillcompany.com' },
  { id: 4464, name: 'Knights Engineering', url: 'https://knightsengineering.com' }
];

async function inspectLeads() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`Inspecting Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      let res = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => {
        console.log(`Error navigating to ${lead.url}:`, e.message);
        return null;
      });

      if (!res) {
        console.log('Trying with http...');
        res = await page.goto(lead.url.replace('https://', 'http://'), { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
          console.log(`Error navigating with http:`, e.message);
          return null;
        });
      }

      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      // Look for contact links if not already on contact page
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|reach|touch|about/i.test(a.innerText || a.href))
          .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }));
      });
      console.log('Contact links found:', contactLinks.slice(0, 5));

      // Look for forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          hasCaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .h-captcha, .cf-turnstile'),
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id,
            required: i.required
          }))
        }));
      });

      console.log(`Forms found on ${page.url()}:`, JSON.stringify(forms, null, 2));

      // Check if contact page has different form
      if (forms.length === 0 && contactLinks.length > 0) {
        const contactLink = contactLinks.find(c => /contact/i.test(c.text) || /contact/i.test(c.href));
        if (contactLink && contactLink.href !== page.url()) {
          console.log('Navigating to contact link:', contactLink.href);
          await page.goto(contactLink.href, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
          console.log('Contact page URL:', page.url());
          const cForms = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('form')).map((f, idx) => ({
              idx,
              id: f.id,
              name: f.name,
              action: f.action,
              method: f.method,
              hasCaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .h-captcha, .cf-turnstile'),
              inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
                name: i.name,
                type: i.type,
                placeholder: i.placeholder,
                id: i.id,
                required: i.required
              }))
            }));
          });
          console.log(`Forms found on contact page:`, JSON.stringify(cForms, null, 2));
        }
      }

    } catch (err) {
      console.log(`Error inspecting ${lead.id}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectLeads();
