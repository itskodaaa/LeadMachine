import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4772, url: 'https://ascustomwelding.com', name: "A's Custom Welding Fabrication" },
  { id: 4773, url: 'https://alpinesheetmetalsystems.com', name: 'Alpine Sheet Metal Systems' },
  { id: 4774, url: 'https://lafraguametalworks.com', name: 'La Fragua Metal Works LLC' },
  { id: 4775, url: 'https://integrusfab.com', name: 'Integrus Fabrication' },
  { id: 4776, url: 'https://baldwinmetals.com', name: 'Baldwin Metals Inc' },
  { id: 4777, url: 'https://metals4u.com', name: 'Metals 4 U' },
  { id: 4778, url: 'https://metalrite.com', name: 'Metalrite Inc' },
  { id: 4779, url: 'https://monarchmetal.com', name: 'Monarch Metal Inc.' },
  { id: 4780, url: 'https://azahner.com', name: 'Zahner Dallas Manufacturing Facility' },
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================== [Lead #${lead.id}] ${lead.name} (${lead.url}) ==================`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`Current URL: ${currentUrl} | Title: ${title}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(a => /contact|quote|reach|get-in-touch|estimate|inquiry/i.test(a.innerText + ' ' + a.href))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 10);
      });
      console.log('Contact links:', contactLinks);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          index: idx,
          id: f.id,
          action: f.action,
          method: f.method,
          inputNames: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        }));
      });
      console.log(`Forms found on homepage (${forms.length}):`, JSON.stringify(forms, null, 2));

      // Check if CAPTCHA exists
      const captchaInfo = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], [data-sitekey]');
        const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { hasRecaptcha, hasHcaptcha, hasTurnstile };
      });
      console.log('Captcha info:', captchaInfo);

    } catch (err) {
      console.error(`Error navigating to ${lead.url}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
