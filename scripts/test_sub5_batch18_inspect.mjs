import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 5511, name: 'Fard Engineers Inc', url: 'https://fard.com' },
  { id: 5514, name: 'Advanced Professional Engineering Consultants', url: 'https://apecinc.net' },
  { id: 5516, name: 'GIT Engineering & Marine', url: 'https://gitengineering.com' },
  { id: 5518, name: 'Pro Engineering Consulting', url: 'https://proengc.com' },
  { id: 5520, name: 'Ridgeline Engineering Co', url: 'https://rdgln.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n=== Testing ${t.id} - ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('Goto err:', e.message));
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));
        const links = Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|quote|touch|inquiry/i.test(a.href + ' ' + a.text));

        return { currentUrl: window.location.href, forms, links: links.slice(0, 5) };
      });

      console.log('Current URL:', info.currentUrl);
      console.log('Forms count:', info.forms.length);
      console.log('Forms detail:', JSON.stringify(info.forms, null, 2));
      console.log('Contact links:', JSON.stringify(info.links, null, 2));

    } catch (err) {
      console.log('Error inspecting:', err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
