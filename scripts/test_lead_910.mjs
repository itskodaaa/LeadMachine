import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@northeastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your mechanical engineering services and would appreciate the opportunity to explore potential collaboration. Kindly arrange for a representative to contact us. Thank you.'
};

async function test910() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('Navigating to https://precisionny.com...');
    await page.goto('https://precisionny.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Current URL:', page.url());

    // Find contact page
    const contactUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const match = links.find(a => (a.innerText || '').toLowerCase().includes('contact') || (a.getAttribute('href') || '').toLowerCase().includes('contact'));
      return match ? match.href : null;
    });
    console.log('Contact URL:', contactUrl);
    if (contactUrl) {
      await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('On contact page:', page.url());
    }

    // Inspect forms
    const forms = await page.evaluate(() => {
      const fList = Array.from(document.querySelectorAll('form'));
      return fList.map((f, i) => ({
        index: i,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
    });
    console.log('Forms on 910:', JSON.stringify(forms, null, 2));

  } catch (err) {
    console.log('Error testing 910:', err.message);
  } finally {
    await browser.close();
  }
}
test910();
