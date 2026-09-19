import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function submit4681() {
  console.log('\n--- Testing 4681 (AZ Sheet Metal) Submission ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.azsheetmetalllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill fields by placeholder
    await page.type('input[placeholder="Full name"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[placeholder="Email"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[placeholder="Phone number"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('textarea[placeholder="Message"]', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('4681 fields typed. Looking for submit button...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit")');
    if (!submitBtn) {
      // Find button by text
      const btns = await page.$$('button');
      for (const b of btns) {
        const txt = await page.evaluate(el => el.innerText, b);
        if (/submit/i.test(txt)) {
          console.log('Found button by text:', txt);
          await b.click();
          break;
        }
      }
    } else {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Post submit text snippet:', text.slice(0, 400).replace(/\n+/g, ' '));
    const confirmed = /thank you|received|sent|successfully|in touch|we will/i.test(text);
    console.log('4681 Confirmed?', confirmed);
  } catch (e) {
    console.log('4681 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function test4674Headed() {
  console.log('\n--- Testing 4674 (AZ DC Electric) with puppeteer ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    const resp = await page.goto('https://azdcelectric.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Status:', resp.status());
    console.log('Title:', await page.title());
  } catch (e) {
    console.log('4674 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await submit4681();
  await test4674Headed();
}

main().catch(console.error);
