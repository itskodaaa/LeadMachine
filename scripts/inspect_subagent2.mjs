import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4976, name: 'PSM Industries', url: 'https://psmindustries.com' },
  { id: 4977, name: 'Kinetic Die Casting Company', url: 'https://kineticdiecasting.com' },
  { id: 4980, name: 'TS Civil Engineering CA', url: 'https://tscivil.com' },
  { id: 4981, name: 'ISE Ingram Structural Engineering', url: 'https://ingramse.com' },
  { id: 4982, name: 'Osuna Engineering Inc.', url: 'https://osunaengineering.com' },
  { id: 4983, name: 'SC Solutions, Inc.', url: 'https://scsolutions.com' },
  { id: 4984, name: 'BEAR Engineering', url: 'https://beareng.com' },
  { id: 4986, name: 'C2C Engineering', url: 'https://c2cengineering.com' },
  { id: 4987, name: '9 Builders', url: 'https://9builders.com' },
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n==================\nInspecting #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`Title: ${title}, URL: ${currentUrl}`);

      // Check contact links
      const contactLinks = await page.$$eval('a', anchors => 
        anchors
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|quote|touch|connect/i.test(a.text) || /contact|quote/i.test(a.href))
      );
      console.log(`Contact links found:`, JSON.stringify(contactLinks.slice(0, 5)));

      // Check forms on current page
      const formsCount = await page.$$eval('form', forms => forms.length);
      console.log(`Forms on current page: ${formsCount}`);

      // Check email addresses
      const emails = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        return matches ? [...new Set(matches)] : [];
      });
      console.log(`Emails on current page:`, emails);

    } catch (e) {
      console.log(`Error navigating to ${lead.url}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
