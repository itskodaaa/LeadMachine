import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 5522, name: 'High Rev Engineering', url: 'https://highrevengineering.com' },
  { id: 5523, name: 'System Solution', url: 'https://systemsolutionllc.com' },
  { id: 5524, name: 'Moraes Pham & Associates', url: 'https://moraespham.com' },
  { id: 5526, name: 'PR Wave Mechanical', url: 'https://prwavemechanical.com' },
  { id: 5527, name: 'Engage Engineering, Inc.', url: 'https://engageeng.com' },
  { id: 5528, name: 'Diakont', url: 'https://diakont.com' },
  { id: 5529, name: 'Assist 2 Develop', url: 'https://assist2develop.com' },
  { id: 5532, name: 'D&D Tech Inc: Precision Machining Services', url: 'https://sandiegocncprecision.com' },
  { id: 5535, name: 'Vinatech Engineering', url: 'https://vinatechinc.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n=== [${lead.id}] ${lead.name} (${lead.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const pageInfo = await page.evaluate(() => {
        const title = document.title;
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id
          }))
        }));

        const contactLinks = Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|quote|touch|inquir/i.test(a.text) || /contact|quote/i.test(a.href));

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return { title, formsCount: forms.length, forms, contactLinks: contactLinks.slice(0, 5), mailtos };
      });

      console.log('Title:', pageInfo.title);
      console.log('Forms count on home:', pageInfo.formsCount);
      console.log('Contact links:', pageInfo.contactLinks);
      console.log('Mailtos:', pageInfo.mailtos);

      // If contact links exist, check the first one
      if (pageInfo.contactLinks.length > 0) {
        const contactUrl = pageInfo.contactLinks[0].href;
        console.log(`Navigating to contact page: ${contactUrl}`);
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        const contactPageInfo = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            method: f.method,
            id: f.id,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              name: i.name,
              type: i.type,
              placeholder: i.placeholder,
              id: i.id
            }))
          }));
          const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
          return { formsCount: forms.length, forms, mailtos };
        });

        console.log('Contact Page Forms count:', contactPageInfo.formsCount);
        if (contactPageInfo.formsCount > 0) {
          console.log('Contact Page Forms:', JSON.stringify(contactPageInfo.forms, null, 2));
        }
        console.log('Contact Page Mailtos:', contactPageInfo.mailtos);
      }
    } catch (e) {
      console.error(`Error checking ${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
