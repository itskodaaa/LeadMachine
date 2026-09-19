import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadsToCheck = [
  { id: 3359, url: 'https://dbrinc.com' },
  { id: 3360, url: 'https://centreforbuildingperformance.com' },
  { id: 3361, url: 'https://sparxeng.com' },
  { id: 3362, url: 'https://hlaengineers.com' },
  { id: 3365, url: 'https://dialexa.com' },
  { id: 3366, url: 'https://dmsusa.com' },
  { id: 3367, url: 'https://flowdesign.com' },
  { id: 3368, url: 'https://precisionmarketdata.com' },
  { id: 3369, url: 'https://precision.network' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leadsToCheck) {
    console.log(`\n================== Lead ${lead.id} (${lead.url}) ==================`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded' }).catch(e => console.log('goto err:', e.message));
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`Current URL: ${currentUrl}`);
      console.log(`Title: ${title}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(a => ({ href: a.href, text: a.innerText ? a.innerText.trim().toLowerCase() : '' }))
          .filter(a => a.href && (a.text.includes('contact') || a.href.toLowerCase().includes('contact') || a.text.includes('touch') || a.text.includes('quote') || a.text.includes('inquiry')));
      });
      console.log('Contact links:', contactLinks.slice(0, 5));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder
          }));
          return { index: i, action: f.action, id: f.id, class: f.className, inputs };
        });
      });
      console.log(`Forms found on root: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }
    } catch (err) {
      console.error(`Error inspecting ${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
