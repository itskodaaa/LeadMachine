import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function inspect(leadId, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========================================\n[#${leadId}] Visiting: ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3500));
    console.log(`Final URL: ${page.url()} (Status: ${res?.status()})`);

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const contactLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
        .filter(l => /contact|quote|rfq|get-in-touch|request/i.test(l.text) || /contact|quote|rfq/i.test(l.href));

      const formsDetails = forms.map((f, idx) => ({
        index: idx,
        action: f.action,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }))
      }));

      return {
        contactLinks: contactLinks.slice(0, 10),
        formsCount: forms.length,
        formsDetails,
        bodySnippet: document.body ? document.body.innerText.slice(0, 400) : ''
      };
    });

    console.log('Result:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.error(`Error on #${leadId}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspect(1561, 'https://sercomachineshop.com');
  await inspect(1562, 'https://fortworthcnc.biz');
  await inspect(1565, 'https://mcquearyindustries.com');
  await inspect(1567, 'https://mpechicago.com');
  await inspect(1571, 'https://cnhindustrial.com');
  await inspect(1572, 'https://chainvey.com');
  await inspect(1573, 'https://kitamura-machinery.com');
  await inspect(1577, 'https://generalmanufacturing.net');
}

run();
