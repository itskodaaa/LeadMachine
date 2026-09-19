import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4717, name: 'MR Steel', url: 'https://mrsteel.com' },
  { id: 4718, name: 'Medford Knife & Tool', url: 'https://medfordknife.com' },
  { id: 4719, name: "Cupp's Industrial Supply", url: 'https://cuppsind.com' },
  { id: 4720, name: 'Kaplan Steel Rule Die Manufacturing', url: 'https://kaplanmfg.com' },
  { id: 4721, name: 'Accuzona Steel Rule Die Inc', url: 'https://accuzona.com' },
  { id: 4723, name: 'Foundry Tool & Mold Service', url: 'https://foundrytool.com' },
  { id: 4724, name: 'Precision Die & Stamping Inc', url: 'https://precisiondie.com' },
  { id: 4725, name: 'Toolcraft of Phoenix Inc.', url: 'https://aztoolcraft.com' },
  { id: 4727, name: 'Construction Tool & Supply', url: 'https://constructiontoolaz.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nChecking Lead ${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      const res = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
        console.log(`Goto error: ${e.message}`);
        return null;
      });
      console.log(`Status: ${res ? res.status() : 'failed'}, Final URL: ${page.url()}`);

      // Check contact links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .filter(a => /contact|quote|about|reach|touch|inquir/i.test(a.innerText || '') || /contact|quote/i.test(a.href || ''))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 10);
      });
      console.log(`Contact Links:`, JSON.stringify(links, null, 2));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            required: el.required
          }));
          return {
            index: i,
            action: f.action,
            method: f.method,
            inputs
          };
        });
      });
      console.log(`Forms found: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }
    } catch (err) {
      console.error(`Error inspecting ${lead.name}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspect();
