import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const contacts = [
  { id: 3808, url: 'https://arehna.com/contact' },
  { id: 3812, url: 'https://www.tsg-engineering.com/contact-us' },
  { id: 3813, url: 'https://www.elevatedeng.com/0/index.php/contact-us' },
  { id: 3814, url: 'https://riosarchitecture.com/contact/' },
  { id: 3816, url: 'https://www.bwstructural.com/contact' },
  { id: 3817, url: 'https://absoluteng.com/' }
];

async function checkContacts() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  for (const item of contacts) {
    console.log(`\n=================== Checking #${item.id}: ${item.url} ===================`);
    const page = await browser.newPage();
    try {
      const resp = await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 20000 });
      console.log(`Loaded ${item.id}: status=${resp ? resp.status() : 'null'}, url=${page.url()}`);
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        const text = document.body ? document.body.innerText.slice(0, 400) : '';
        const formInfo = forms.map(f => ({
          action: f.action,
          method: f.method,
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
        return { text, iframes, formInfo };
      });
      console.log(JSON.stringify(info, null, 2));
    } catch (e) {
      console.log(`Error on #${item.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

checkContacts();
