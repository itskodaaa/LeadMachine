import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3682, name: 'MSS Solutions, LLC', url: 'https://msssolutions.com' },
  { id: 3683, name: 'Team Mechanical, LLC', url: 'https://team-mech.com' },
  { id: 3685, name: 'Bahnson Mechanical Systems', url: 'https://bahnson.com' },
  { id: 3687, name: 'CNC Performance Engineering', url: 'https://cncpe.com' },
  { id: 3688, name: 'Tri-Tec Industries', url: 'https://tritecindustries.com' },
  { id: 3690, name: 'Upchurch Machine Company', url: 'https://upchurchmachine.com' },
  { id: 3691, name: 'Perigon International, Inc.', url: 'https://perigoneng.com' },
  { id: 3692, name: 'SEE Design', url: 'https://seedesignpllc.com' },
  { id: 3693, name: 'Pace Design and Development, LLC', url: 'https://pacecnc.com' },
  { id: 3694, name: 'IST PRECISION', url: 'https://istprecision.com' },
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      console.log(`\n========================================\nExamining #${lead.id} ${lead.name} (${lead.url})`);
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      const info = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        })).filter(l => /contact|quote|about|reach|touch|estimate|inquir/i.test(l.text) || /contact|quote|about|reach|touch|estimate|inquir/i.test(l.href));

        const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          id: f.id,
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input, textarea, select').length,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').trim());

        return { title: document.title, currentUrl: window.location.href, links, forms, iframes, emails };
      });

      console.log(`Page Title: ${info.title}`);
      console.log(`Current URL: ${info.currentUrl}`);
      console.log(`Relevant Links:`, JSON.stringify(info.links.slice(0, 5), null, 2));
      console.log(`Forms found (${info.forms.length}):`, JSON.stringify(info.forms, null, 2));
      console.log(`Emails:`, info.emails);
      console.log(`Iframes:`, info.iframes.filter(s => s.includes('captcha') || s.includes('hubspot') || s.includes('form') || s.includes('turnstile')));

    } catch (e) {
      console.log(`Error examining #${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
