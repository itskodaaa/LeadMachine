import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function testAtkins() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  try {
    console.log('Navigating to Atkins Engineering Solutions...');
    await page.goto('https://atkengsol.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    // Step 1
    console.log('Filling Step 1...');
    await page.type('#name', OUTREACH.fullName, { delay: 30 });
    await page.type('#email', OUTREACH.email, { delay: 30 });
    await page.type('#company', OUTREACH.company, { delay: 30 });
    await page.type('#phone', OUTREACH.phone, { delay: 30 });

    const continueBtn1 = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.trim() === 'Continue');
    });
    await continueBtn1.click();
    await sleep(1500);

    // Step 2: Select options
    console.log('Handling Step 2 dropdowns/buttons...');
    // Let's click the dropdown buttons if they exist
    const dropdowns = await page.$$('button');
    for (const b of dropdowns) {
      const txt = await page.evaluate(el => el.innerText.trim(), b);
      if (txt.includes('Select a service') || txt.includes('Select project type') || txt.includes('Select budget') || txt.includes('Select timeline')) {
        console.log('Clicking dropdown:', txt);
        await b.click();
        await sleep(500);
        // Select first available option in menu/listbox/popover
        await page.evaluate(() => {
          const item = document.querySelector('[role="option"], [role="menuitem"], [data-radix-collection-item], li, .select-item');
          if (item) item.click();
        });
        await sleep(300);
      }
    }

    const continueBtn2 = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.trim() === 'Continue' && b.offsetWidth > 0);
    });
    await continueBtn2.click();
    await sleep(1500);

    // Step 3
    console.log('Filling Step 3 message...');
    await page.waitForSelector('#message', { timeout: 5000 });
    await page.type('#message', OUTREACH.message, { delay: 10 });
    await sleep(1000);

    console.log('Clicking Submit Inquiry...');
    // Intercept network requests to see if API endpoint is called
    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('contact') || url.includes('api') || url.includes('inquiry') || url.includes('submit')) {
        console.log(`[Network Response] ${resp.status()} ${url}`);
        try {
          const text = await resp.text();
          console.log(`[Network Response Body]:`, text.substring(0, 300));
        } catch (_) {}
      }
    });

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.trim().includes('Submit') && b.offsetWidth > 0);
    });
    await submitBtn.click();
    await sleep(6000);

    const confirmation = await page.evaluate(() => {
      return {
        url: window.location.href,
        text: document.body.innerText.substring(0, 800)
      };
    });
    console.log('Post Submit Result:', confirmation);

  } catch (e) {
    console.log('Error testing Atkins:', e.message);
  } finally {
    await browser.close();
  }
}

testAtkins();
