import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship.'
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://taigtools.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('#nf-field-1', { timeout: 10000 });
    await page.type('#nf-field-1', PROFILE.fullName);
    await page.type('#nf-field-2', PROFILE.email);
    await page.type('#nf-field-18', PROFILE.phone);
    await page.type('#nf-field-19', PROFILE.subject);
    await page.type('#nf-field-3', PROFILE.message);

    console.log('Clicking submit and waiting for navigation or change...');
    const navPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(e => e.message);
    await page.click('#nf-field-4');
    const navRes = await navPromise;
    console.log('Nav result:', navRes);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL:', page.url());
    const content = await page.evaluate(() => {
      const nfMsg = document.querySelector('.nf-response-msg')?.innerText;
      const alerts = Array.from(document.querySelectorAll('.alert, .notice, .woocommerce-message, .nf-msg')).map(e => e.innerText);
      const text = document.body.innerText;
      return {
        nfMsg,
        alerts,
        hasThank: /thank/i.test(text),
        hasSent: /sent/i.test(text),
        hasSuccess: /success/i.test(text),
        bodySnippet: text.slice(0, 500).replace(/\s+/g, ' ')
      };
    });
    console.log('Content:', content);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}
run();
