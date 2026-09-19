import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSubpages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const targets = [
    { id: 4042, name: 'Victores Machine Shop', url: 'http://victoresmachineshop.com' },
    { id: 4043, name: 'MWL contact.htm', url: 'https://mwleng.com/contact.htm' },
    { id: 4044, name: 'RWS contact-us', url: 'https://rwsengineering.com/contact-us' },
    { id: 4045, name: 'Associated Machine contact-us', url: 'https://www.assocmachine.com/contact-us/' },
    { id: 4046, name: 'Alvarez Engineers contact', url: 'https://www.alvarezeng.com/contact/' },
    { id: 4047, name: 'NiceCold contact', url: 'https://nicecoldengineeringacrepairs.com/contact' },
    { id: 4048, name: 'Xpress Precision #contact', url: 'https://xpressprecisionproducts.com/#8efe47f0-19f2-42b9-a08c-2fd26527d4d6' },
    { id: 4049, name: 'Leslie Engineering contact.html', url: 'https://leslie-engineering.com/contact.html' },
    { id: 4050, name: 'Precision Tech Aero http', url: 'http://www.ptaero.com' }
  ];

  for (const t of targets) {
    console.log(`\n========================================\nChecking #${t.id} ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      const res = await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 20000 });
      console.log('HTTP status:', res ? res.status() : 'none');
      console.log('Final URL:', page.url());

      const details = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          htmlSnippet: f.outerHTML.slice(0, 500),
          fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            value: el.value,
            text: el.innerText
          }))
        }));

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return {
          bodySnippet: body.slice(0, 300).replace(/\\s+/g, ' '),
          formsCount: forms.length,
          forms,
          mailtos: [...new Set(mailtos)]
        };
      });

      console.log('Details:', JSON.stringify(details, null, 2));
    } catch (e) {
      console.log('Error checking target:', e.message);
    } finally {
      try { await page.close(); } catch (_) {}
    }
  }

  await browser.close();
}

checkSubpages();
