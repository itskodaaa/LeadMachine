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
    await page.goto('https://atkengsol.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    // Step 1
    await page.type('#name', OUTREACH.fullName, { delay: 10 });
    await page.type('#email', OUTREACH.email, { delay: 10 });
    await page.type('#company', OUTREACH.company, { delay: 10 });
    await page.type('#phone', OUTREACH.phone, { delay: 10 });

    const continueBtn1 = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.trim() === 'Continue');
    });
    await continueBtn1.click();
    await sleep(1500);

    // Are the dropdowns in step 2 required? Or can we just click Continue?
    console.log('Testing if Step 2 allows clicking Continue without selecting or by selecting...');
    
    // Let's inspect all buttons / selects in step 2
    const step2Html = await page.evaluate(() => {
      const formContainer = document.querySelector('main, form, [class*="form"], [class*="consultation"]');
      return formContainer ? formContainer.innerHTML : document.body.innerHTML;
    });
    fs.writeFileSync('/tmp/atkins_step2.html', step2Html);

    // Check if clicking Continue works directly
    const continueBtn2 = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.trim() === 'Continue' && b.offsetWidth > 0);
    });
    await continueBtn2.click();
    await sleep(1500);

    const hasMessage = await page.$('#message');
    console.log('Does Step 3 #message exist after clicking Continue?', !!hasMessage);

    if (!hasMessage) {
      console.log('Step 2 required selections. Let us see what is displayed:');
      const err = await page.evaluate(() => document.body.innerText);
      console.log(err.substring(0, 400));
    } else {
      console.log('Proceeded to Step 3! Filling message...');
      await page.type('#message', OUTREACH.message, { delay: 10 });
      await sleep(1000);

      // Listen for network
      page.on('response', async resp => {
        if (resp.request().method() === 'POST') {
          console.log('POST Response:', resp.status(), resp.url());
          try {
            console.log('Response body:', (await resp.text()).substring(0, 300));
          } catch (_) {}
        }
      });

      console.log('Submitting Step 3...');
      const submitBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.innerText.trim().includes('Submit') && b.offsetWidth > 0);
      });
      await submitBtn.click();
      await sleep(6000);

      const postSubmitText = await page.evaluate(() => document.body.innerText);
      const lines = postSubmitText.split('\n').map(l => l.trim()).filter(Boolean);
      console.log('Post submit text lines (first 30):', lines.slice(0, 30));
      const confirmed = /thank you|thanks|received|request received|consultation scheduled|in touch|fit/i.test(postSubmitText);
      console.log('Atkins Confirmed:', confirmed);
      console.log('Current URL:', page.url());
    }

  } catch (e) {
    console.log('Error testing Atkins:', e.message);
  } finally {
    await browser.close();
  }
}

testAtkins();
