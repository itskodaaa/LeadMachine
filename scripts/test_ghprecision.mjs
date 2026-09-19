import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testGHPrecision() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('contact-us') || url.includes('admin-ajax.php')) {
      console.log(`[HTTP Response] ${res.status()} ${url}`);
    }
  });

  try {
    console.log('Navigating to https://ghprecision.com/contact-us/ ...');
    await page.goto('https://ghprecision.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill required fields
    await page.type('#wpforms-2520-field_0', 'Pamela', { delay: 30 });
    await page.type('#wpforms-2520-field_0-last', 'Jameson', { delay: 30 });
    await page.type('#wpforms-2520-field_1', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page.type('#wpforms-2520-field_3', '708-568-3708', { delay: 30 });
    await page.type('#wpforms-2520-field_4', 'Precision Machining Services Inquiry', { delay: 30 });
    await page.type('#wpforms-2520-field_2', 'Hello, Northeast Precision Machinery provides precision machining, CNC fabrication, and tooling solutions. We would welcome the opportunity to discuss manufacturing requirements or support upcoming precision machining projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    // Check required consent checkbox
    const cb = await page.$('#wpforms-2520-field_7_1');
    if (cb) {
      console.log('Checking consent checkbox...');
      await cb.click();
    }

    await new Promise(r => setTimeout(r, 1000));

    // Submit
    const submitBtn = await page.$('#wpforms-submit-2520, button[name="wpforms[submit]"]');
    if (submitBtn) {
      console.log('Clicking WPForms submit button...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('No full page navigation (likely AJAX):', e.message)),
        submitBtn.click()
      ]);
      
      await new Promise(r => setTimeout(r, 5000));

      const confirmation = await page.evaluate(() => {
        const confEl = document.querySelector('.wpforms-confirmation-container, [id*="wpforms-confirmation"]');
        const text = document.body ? document.body.innerText : '';
        const hasThankYou = /thanks for contacting us|thank you|we will be in touch|message has been sent/i.test(text);
        return {
          url: window.location.href,
          confText: confEl ? confEl.innerText.trim() : null,
          hasThankYou
        };
      });

      console.log('Confirmation result:', JSON.stringify(confirmation, null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testGHPrecision();
