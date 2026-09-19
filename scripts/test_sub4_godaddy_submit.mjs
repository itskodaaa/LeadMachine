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
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testGodaddySubmit() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 4044, name: 'RWS Engineering Inc', url: 'https://rwsengineering.com/' },
    { id: 4048, name: 'Xpress Precision Products Inc', url: 'https://xpressprecisionproducts.com/#8efe47f0-19f2-42b9-a08c-2fd26527d4d6' }
  ];

  for (const t of targets) {
    console.log(`\n========================================\nTesting #${t.id} ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      
      // Monitor network requests & responses
      page.on('response', async res => {
        const url = res.url();
        if (url.includes('api') || url.includes('form') || res.request().method() === 'POST') {
          try {
            const body = await res.text();
            console.log(`[NET RESPONSE] ${res.status()} ${url.slice(0, 80)} -> ${body.slice(0, 150)}`);
          } catch (e) {}
        }
      });

      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Scroll form into view
      await page.evaluate(() => {
        const el = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      await new Promise(r => setTimeout(r, 1000));

      const nameInput = await page.$('[data-aid="CONTACT_FORM_NAME"]');
      const emailInput = await page.$('[data-aid="CONTACT_FORM_EMAIL"]');
      const messageInput = await page.$('[data-aid="CONTACT_FORM_MESSAGE"]');
      const submitBtn = await page.$('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

      if (!nameInput || !emailInput || !messageInput || !submitBtn) {
        console.log('Could not find all GoDaddy form elements:', {
          hasName: !!nameInput,
          hasEmail: !!emailInput,
          hasMsg: !!messageInput,
          hasBtn: !!submitBtn
        });
        continue;
      }

      console.log('Typing into form using page.type...');
      await nameInput.click();
      await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });

      await emailInput.click();
      await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });

      await messageInput.click();
      await messageInput.type(OUTREACH_PROFILE.message, { delay: 10 });

      console.log('Inputs populated. Values:');
      const values = await page.evaluate(() => ({
        name: document.querySelector('[data-aid="CONTACT_FORM_NAME"]')?.value,
        email: document.querySelector('[data-aid="CONTACT_FORM_EMAIL"]')?.value,
        message: document.querySelector('[data-aid="CONTACT_FORM_MESSAGE"]')?.value
      }));
      console.log('Values:', values);

      console.log('Clicking Submit button...');
      await submitBtn.click();

      // Wait up to 10 seconds and check DOM
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const alertElements = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="SUCCESS"], [data-aid*="MESSAGE"], [class*="success"], [class*="confirmation"], [class*="alert"]')).map(el => ({
          tag: el.tagName,
          className: el.className,
          dataAid: el.getAttribute('data-aid'),
          text: el.innerText.trim()
        }));
        
        return {
          alertElements,
          hasThankYou: /thank you|thanks|message has been sent|we'll be in touch|we have received/i.test(bodyText)
        };
      });

      console.log('Confirmation check:', JSON.stringify(confirmation, null, 2));
    } catch (e) {
      console.error(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testGodaddySubmit();
