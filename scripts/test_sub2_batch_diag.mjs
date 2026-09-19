import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3906, name: 'Small Jobs Electric, Inc.', url: 'https://smalljobselectric.com' },
  { id: 3907, name: 'Campo Engineering Inc', url: 'https://campoengineering.com' },
  { id: 3908, name: 'Infrastructure Consulting & Engineering, LLC', url: 'https://ice-eng.com' },
  { id: 3909, name: 'Avanti Group, Consulting Engineers', url: 'https://avantitampa.com' },
  { id: 3910, name: 'Environmental Engineering Consultants, Inc.', url: 'https://eec-tampabay.com' },
  { id: 3911, name: 'Greeley & Hansen', url: 'https://greeley-hansen.com' },
  { id: 3914, name: 'BCC Engineering, Inc', url: 'https://bcceng.com' },
  { id: 3916, name: 'Cornertech, Inc.', url: 'https://cornertech.com' },
  { id: 3917, name: 'Integral Machining & Engineering, LLC', url: 'https://integralmachining.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n==============================================`);
    console.log(`Checking [${lead.id}] ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    page.setDefaultTimeout(20000);

    try {
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded' });
      const status = resp ? resp.status() : 'No response';
      const finalUrl = page.url();
      const title = await page.title();
      console.log(`Status: ${status}, Title: "${title}", Final URL: ${finalUrl}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText?.trim(), href: a.href }))
          .filter(a => /contact|quote|reach|about/i.test(a.text) || /contact|quote/i.test(a.href))
          .slice(0, 5);
      });
      console.log(`Contact links:`, JSON.stringify(contactLinks));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          return {
            index: i,
            action: f.action,
            method: f.method,
            inputsCount: inputs.length,
            inputs: inputs.slice(0, 8),
            hasCaptcha: !!f.querySelector('.g-recaptcha, .h-captcha, [data-sitekey], iframe[src*="captcha"], iframe[src*="turnstile"]')
          };
        });
      });
      console.log(`Forms found: ${forms.length}`);
      forms.forEach(f => console.log(` - Form #${f.index}: action=${f.action}, captcha=${f.hasCaptcha}, inputs=${JSON.stringify(f.inputs.map(x => x.name || x.id || x.placeholder))}`));

      // Check page for recaptcha / turnstile
      const captchaDetected = await page.evaluate(() => {
        const recaptcha = !!document.querySelector('.g-recaptcha, .h-captcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
        const cfChallenge = document.body?.innerText?.includes('Attention Required! | Cloudflare') || document.body?.innerText?.includes('Verify you are human');
        return { recaptcha, cfChallenge };
      });
      console.log(`Captcha / WAF:`, JSON.stringify(captchaDetected));

    } catch (err) {
      console.log(`Error navigating to ${lead.url}: ${err.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
