import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4877, name: 'Vasquez Custom Metals', url: 'https://vasquezcustommetals.com' },
  { id: 4878, name: 'Contractor Metal Works', url: 'https://contractormetalworks.com' },
  { id: 4880, name: 'Alloy Fabricators, Inc.', url: 'https://alloyfabinc.com' },
  { id: 4881, name: 'Tampa Brass & Aluminum Corporation', url: 'https://tampabrass.com' },
  { id: 4882, name: 'T L Sheet Metal', url: 'https://www.tlsheetmetal.com' },
  { id: 4883, name: 'WG Welding', url: 'https://wgweldingerectioncorp.com' },
  { id: 4884, name: 'Tampa Welders', url: 'https://tampawelders.com' },
  { id: 4885, name: 'McNICHOLS CO.', url: 'https://www.mcnichols.com' },
  { id: 4887, name: 'Florida Metals', url: 'https://fltin.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`[#${lead.id}] ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20000);
    try {
      const response = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => {
        console.log(`Goto error: ${e.message}`);
        return null;
      });

      if (!response) {
        // try http
        const httpUrl = lead.url.replace('https://', 'http://');
        console.log(`Retrying HTTP: ${httpUrl}`);
        await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => {
          console.log(`HTTP retry failed: ${e.message}`);
        });
      }

      const currentUrl = page.url();
      const title = await page.title();
      console.log(`Loaded URL: ${currentUrl} | Title: ${title}`);

      // Check links for contact
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => /contact|quote|estimate|reach|about/i.test(l.text) || /contact|quote|estimate/i.test(l.href))
          .slice(0, 10);
      });
      console.log(`Contact/quote links:`, JSON.stringify(contactLinks, null, 2));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        const fList = Array.from(document.querySelectorAll('form'));
        return fList.map((f, i) => ({
          index: i,
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
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
      console.log(`Forms found: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }

      // Check captchas
      const captchaInfo = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], script[src*="recaptcha"]');
        const hasHCaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"], script[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { hasRecaptcha, hasHCaptcha, hasTurnstile };
      });
      console.log(`Captcha info:`, captchaInfo);

    } catch (err) {
      console.log(`Error inspecting #${lead.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
