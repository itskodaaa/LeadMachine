import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testSpecific() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const urls = [
    { id: 1735, name: 'Laserod', url: 'https://laserod.com/contact/' },
    { id: 1735, name: 'Laserod Quote', url: 'https://laserod.com/request-quote/' },
    { id: 1736, name: 'Cnc programming', url: 'https://cncprogramingmachining.com/contact/' },
    { id: 1737, name: 'SOCAL CNC', url: 'https://socal-cnc.com/contact' },
    { id: 1739, name: 'Vanacore', url: 'http://vanacorecnc.com/' },
    { id: 1740, name: 'JH Precision', url: 'http://www.jhpmi.com/' },
    { id: 1741, name: 'Z-Tech', url: 'https://ztechmachininginc.com/' }
  ];

  for (const item of urls) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n========================================\nChecking #${item.id} ${item.name}: ${item.url}`);

    try {
      const resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Status: ${resp ? resp.status() : 'null'}, URL: ${page.url()}`);

      const info = await page.evaluate(() => {
        const title = document.title;
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            tag: inp.tagName,
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder,
            required: inp.required
          }));
          return {
            idx: i,
            id: f.id,
            className: f.className,
            action: f.action,
            fields
          };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile')).map(c => c.outerHTML.slice(0, 150));

        const bodySnippets = (document.body ? document.body.innerText : '').slice(0, 300).replace(/\s+/g, ' ');

        return { title, iframes, forms, captchas, bodySnippets };
      });

      console.log('Result:', JSON.stringify(info, null, 2));
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testSpecific().catch(console.error);
