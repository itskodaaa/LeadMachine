import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3839, name: 'EMA Structural Milestone Inspection Engineers', url: 'https://emaengineers.com' },
  { id: 3840, name: 'A2B Engineering LLC', url: 'https://a2beng.com' },
  { id: 3841, name: 'Ruark Construction and Engineering', url: 'https://rcegroup.net' },
  { id: 3842, name: 'Waterfront Engineering Inc.', url: 'https://myseawall.com' },
  { id: 3843, name: 'Colwill Engineering', url: 'https://colwillengineering.com' },
  { id: 3844, name: 'Hahn Engineering, Inc.', url: 'https://hahneng.com' },
  { id: 3845, name: 'IC Mechanical, LLC', url: 'https://icmech.com' },
  { id: 3846, name: 'Emerald Engineering, Inc.', url: 'https://emeraldmep.com' },
  { id: 3847, name: 'Hibbard Engineering', url: 'https://hibbardengineering.com' },
  { id: 3848, name: 'Elting Mechanical Enterprises, Inc.', url: 'https://eltingmechanical.com' }
];

async function inspectSites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nChecking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      
      let res;
      try {
        res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        console.log(`Initial goto error: ${e.message}`);
      }

      console.log(`Current URL: ${page.url()}, Status: ${res ? res.status() : 'unknown'}`);
      console.log(`Title: ${await page.title()}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => /contact|inquir|about|quote/i.test(l.text) || /contact|inquir|quote/i.test(l.href));
      });
      console.log('Contact/relevant links found:', JSON.stringify(links.slice(0, 8)));

      // Check forms on current page
      const formsInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          action: f.action,
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
      });
      console.log('Forms on page:', JSON.stringify(formsInfo, null, 2));

      // Captcha / iframe detection
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      });
      console.log('Iframes:', iframes);

    } catch (err) {
      console.log(`Error inspecting ${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectSites();
