import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  country: 'United States',
  postal_code: '60601',
  message: 'Hello, I am reaching out to express our interest in your precision machining services and explore potential collaboration and quotes for upcoming projects. Kindly have a representative contact us at your earliest convenience. Thank you!'
};

async function test4255() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://link.cursivecrm.com/widget/form/5geqsZ9deRPsscNf9xPH', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Focus and type directly into elements
    async function fillField(selector, val) {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
      // Clear field
      await page.keyboard.down('Meta');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');
      await page.type(selector, val, { delay: 30 });
    }

    console.log('Filling fields on 4255...');
    await fillField('input[name="first_name"]', OUTREACH.firstName);
    await fillField('input[name="last_name"]', OUTREACH.lastName);
    await fillField('input[name="email"]', OUTREACH.email);
    await fillField('input[name="phone"]', OUTREACH.phone);
    await fillField('input[name="organization"]', OUTREACH.company);
    await fillField('input[name="address"]', OUTREACH.address);
    await fillField('input[name="city"]', OUTREACH.city);
    await fillField('input[name="state"]', OUTREACH.state);
    await fillField('input[name="country"]', OUTREACH.country);
    await fillField('input[name="postal_code"]', OUTREACH.postal_code);
    await fillField('textarea[name="b0tMsqp8DUsBsZaAGXrT"]', OUTREACH.message);

    // Click terms checkbox
    const termsChecked = await page.evaluate(() => {
      const cb = document.querySelector('input[name="terms_and_conditions"]');
      if (cb && !cb.checked) {
        cb.click();
        return true;
      }
      return cb ? cb.checked : false;
    });
    console.log('Terms checked:', termsChecked);

    // Let's inspect input values before submit
    const values = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(i => ({ name: i.name, value: i.value }));
    });
    console.log('Input values before submission:', values);

    // Listen for network responses
    page.on('response', async resp => {
      if (resp.url().includes('cursivecrm') || resp.url().includes('form')) {
        console.log('Response:', resp.status(), resp.url());
      }
    });

    console.log('Submitting...');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const postText = await page.evaluate(() => document.body.innerText);
    console.log('Post-submission page text snippet:', postText.slice(0, 400));
    const isSuccess = /thank|received|submitted|success/i.test(postText);
    console.log('4255 isSuccess:', isSuccess);

  } catch(e) {
    console.log('4255 error:', e.message);
  } finally {
    await browser.close();
  }
}
test4255();
