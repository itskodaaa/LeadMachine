import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspectSites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 3664, url: 'https://optimaengineering.com' },
    { id: 3667, url: 'https://michaelandson.com' },
    { id: 3669, url: 'https://brplusa.com' },
    { id: 3671, url: 'https://mcihvac.com' },
  ];

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      console.log(`\n--- Inspecting ${t.id} ${t.url} ---`);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Title: ${await page.title()}`);
      
      // Find contact links
      const contactLinks = await page.$$eval('a', anchors => 
        anchors
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|reach|connect|get-in-touch|quote/i.test(a.text) || /contact/i.test(a.href))
      );
      console.log('Contact links found:', contactLinks.slice(0, 5));

      const forms = await page.$$eval('form', forms => forms.map(f => ({
        id: f.id,
        className: f.className,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          type: i.type,
          placeholder: i.placeholder,
          id: i.id
        }))
      })));
      console.log(`Forms on landing page: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms[0], null, 2));
      }
    } catch (e) {
      console.log(`Error inspecting ${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectSites();
