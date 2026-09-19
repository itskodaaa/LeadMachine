import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4802, name: 'Smith Tool & Manufacturing', url: 'https://smithtoolmfg.com' },
  { id: 4804, name: 'Columbia Marking Tools', url: 'https://columbiamt.com' },
  { id: 4805, name: 'DLT Manufacturing', url: 'https://dltmanufacturing.com' },
  { id: 4806, name: 'Big D Tool Center', url: 'https://bigdtoolcenter.com' },
  { id: 4807, name: 'Metal Tech', url: 'https://metaltechcompany.com' },
  { id: 4808, name: 'Seven Star Tools', url: 'https://sevenstartools.com' },
  { id: 4810, name: 'Fine Line Production', url: 'https://finelineproduction.com' },
  { id: 4812, name: 'Snap Engineering Group', url: 'https://snapengineering.io' },
  { id: 4813, name: 'R.W. Smith Company', url: 'https://rwscompany.com' },
  { id: 4816, name: 'Martin Sprocket & Gear - Foundry', url: 'https://martinsprocket.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`Checking #${lead.id} ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    try {
      let resp = null;
      try {
        resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      } catch (e) {
        console.log(`Initial goto failed (${e.message}), trying alternate...`);
        try {
          resp = await page.goto(lead.url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 12000 });
        } catch (e2) {
          console.log(`Alternate goto failed: ${e2.message}`);
        }
      }
      console.log(`Current URL: ${page.url()}, Status: ${resp ? resp.status() : 'failed'}`);

      // Check contact links
      const info = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        })).filter(l => /contact|quote|inquir|about|touch/i.test(l.text) || /contact|quote|inquir/i.test(l.href));
        
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], .cf-turnstile, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')).map(c => c.outerHTML.slice(0, 100));

        return { title: document.title, links: links.slice(0, 5), formCount: forms.length, forms, iframes, captchas };
      });

      console.log(`Title: ${info.title}`);
      console.log(`Forms found: ${info.formCount}`);
      if (info.forms.length > 0) {
        console.log(`Forms detail:`, JSON.stringify(info.forms, null, 2));
      }
      console.log(`Captchas:`, info.captchas);
      console.log(`Contact Links:`, info.links);
    } catch (err) {
      console.log(`Error inspecting ${lead.name}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
