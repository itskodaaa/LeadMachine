import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testAlfa() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Testing ALFA Engineering with Service Selection ===');
    await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

    page.on('response', async res => {
      if (res.url().includes('alfaengllc.com') || res.url().includes('api')) {
        console.log('Response:', res.status(), res.url());
      }
    });

    const inputs = await page.$$('form input');
    await inputs[0].type(PROFILE.fullName);
    await inputs[1].type(PROFILE.email);
    await inputs[2].type(PROFILE.phone);
    await inputs[3].type(PROFILE.address);

    // Select service button 'Civil Engineering Consulting' or 'Other'
    const serviceButtons = await page.$$('form button[type="button"]');
    for (const b of serviceButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Civil Engineering Consulting') || text.includes('Other')) {
        console.log('Clicking service button:', text);
        await b.click();
        break;
      }
    }

    const textarea = await page.$('form textarea');
    await textarea.type(PROFILE.message);

    const submitBtn = await page.$('form button[type="submit"]');
    console.log('Clicking Send Message...');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const pageText = await page.evaluate(() => document.body.innerText);
    const toasts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="alert"], [role="status"], .toast, [data-sonner-toast], div')).map(t => t.innerText).filter(t => /thank|received|sent|success|appreciate/i.test(t));
    });
    console.log('Toasts/matching divs:', toasts.slice(0, 5));
    const match = pageText.match(/(thank[^\.\n]+|received[^\.\n]+|sent[^\.\n]+|success[^\.\n]+)/i);
    console.log('Match snippet:', match ? match[0] : 'No match');
  } catch (e) {
    console.log('Error ALFA:', e.message);
  } finally {
    await browser.close();
  }
}

testAlfa();
