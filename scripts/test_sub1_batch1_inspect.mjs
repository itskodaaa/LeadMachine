import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 6143, name: 'Northwest Industrial Repair', url: 'https://nwindustrialrepair.com' },
  { id: 6144, name: 'LPD Engineering PLLC', url: 'https://lpdengineering.com' },
  { id: 6145, name: 'Einhorn Engineering, PLLC', url: 'https://einhornengineering.com' },
  { id: 6147, name: 'Exact Electric', url: 'https://exactelectric.com' },
  { id: 6148, name: 'Firstage Engineering', url: 'https://firstageengineering.com' },
  { id: 6149, name: 'Elmore', url: 'https://uselmore.com' },
  { id: 6150, name: 'Electric Company of Seattle', url: 'https://elcose.com' },
  { id: 6151, name: 'Fives Lund, LLC', url: 'https://fiveslund.com' },
  { id: 6154, name: 'VECA Electric & Technologies', url: 'https://veca.com' },
  { id: 6155, name: 'Bowie Electric Service, Inc', url: 'https://bowieservice.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================== Lead #${lead.id}: ${lead.name} (${lead.url}) ==================`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Current URL: ${page.url()}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .filter(a => /contact|reach|quote|estimate|touch/i.test(a.innerText || '') || /contact|quote/i.test(a.href || ''))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 5);
      });
      console.log('Contact links:', contactLinks);

      // Check forms on current page
      const formsInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type'),
            name: el.getAttribute('name'),
            id: el.getAttribute('id'),
            placeholder: el.getAttribute('placeholder'),
            required: el.required
          }));
          const action = f.getAttribute('action');
          const method = f.getAttribute('method');
          return { index: i, action, method, inputCount: inputs.length, inputs };
        });
      });
      console.log(`Forms on current page (${formsInfo.length}):`, JSON.stringify(formsInfo, null, 2));

    } catch (err) {
      console.log(`Error navigating to ${lead.url}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
