import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const leads = [
    { id: 3641, name: 'EM Structural', url: 'https://emstructural.com' },
    { id: 3642, name: 'WGPM Inc', url: 'https://wgpminc.com' },
    { id: 3643, name: 'Structural Solutions', url: 'https://structuralsolutionsandremodelingllc.com' },
    { id: 3644, name: 'Stability Engineering', url: 'https://stabilityengineering.com' },
    { id: 3645, name: 'HomeWorthy Engineering', url: 'https://homeworthy-engineering.com' },
    { id: 3646, name: 'Clinton Robertson PE', url: 'https://cdr-a.com' },
    { id: 3647, name: 'Structural Capacity', url: 'https://structuralcapacity.com' },
    { id: 3648, name: 'JDH Structural Engineers', url: 'https://jdhengineers.com' },
    { id: 3649, name: 'Cole C. Janisch', url: 'https://ccjse.com' },
    { id: 3650, name: 'FICCADENTI WAGGONER', url: 'https://fwcse.com' }
  ];

  for (const lead of leads) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      
      let res;
      try {
        res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (err) {
        console.log(`Failed to load base url: ${err.message}`);
      }

      console.log(`Final URL: ${page.url()}`);

      // Check links for contact
      const contactLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|connect|quote|get-in-touch/i.test(a.href) || /contact|reach|connect|quote|get in touch/i.test(a.text));
      });
      console.log('Contact links found:', contactLinks.slice(0, 5));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        const formEls = Array.from(document.querySelectorAll('form'));
        return formEls.map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          })),
          hasCaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], [data-sitekey]')
        }));
      });
      console.log('Forms on initial page:', JSON.stringify(forms, null, 2));

    } catch (e) {
      console.log(`Error inspecting ${lead.name}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run().catch(console.error);
