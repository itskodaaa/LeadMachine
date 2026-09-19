import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 5908, url: 'https://meyersplus.com', name: 'MEYERS+ ENGINEERS' },
  { id: 5909, url: 'https://lviengineering.com', name: 'LVI Engineering' },
  { id: 5910, url: 'https://nbaeng.com', name: 'NBA Engineering' },
  { id: 5911, url: 'https://vhsinc.com', name: 'VHS Associates' },
  { id: 5912, url: 'https://joehillce.com', name: 'Joe Hill Consulting Engineers' },
  { id: 5913, url: 'https://freyerlaureta.com', name: 'Freyer & Laureta, Inc.' },
  { id: 5914, url: 'https://jazce.com', name: 'Ziegler Civil Engineering' },
  { id: 5915, url: 'https://hompisano.com', name: 'Hom-Pisano Engineering, Inc' },
  { id: 5916, url: 'https://paradigmse.com', name: 'PARADIGM Structural Engineers, Inc.' },
  { id: 5918, url: 'https://mkengrs.com', name: 'MK Engineers Inc.' }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n=== Checking #${lead.id} ${lead.name} (${lead.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const currentUrl = page.url();
      console.log(`Loaded URL: ${currentUrl}`);

      // Find contact links
      const contactLinks = await page.$$eval('a', anchors => {
        return anchors
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|connect|touch|inquir/i.test(a.text) || /contact/i.test(a.href))
          .slice(0, 5);
      });
      console.log('Contact links:', contactLinks);

      // Check forms on current page
      const forms = await page.$$eval('form', forms => {
        return forms.map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id
          }))
        }));
      });
      console.log(`Forms on main page: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }

      // If contact page exists, check it
      if (contactLinks.length > 0 && forms.length === 0) {
        const contactUrl = contactLinks[0].href;
        console.log(`Navigating to contact page: ${contactUrl}`);
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const cForms = await page.$$eval('form', forms => {
          return forms.map(f => ({
            action: f.action,
            method: f.method,
            id: f.id,
            className: f.className,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              name: i.name,
              type: i.type,
              placeholder: i.placeholder,
              id: i.id
            }))
          }));
        });
        console.log(`Forms on contact page: ${cForms.length}`);
        if (cForms.length > 0) {
          console.log(JSON.stringify(cForms, null, 2));
        } else {
          // Check text/email/mailto
          const mailtos = await page.$$eval('a[href^="mailto:"]', el => el.map(a => a.href));
          console.log('Mailtos on contact page:', mailtos);
        }
      }
    } catch (err) {
      console.log(`Error checking #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
