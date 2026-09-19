import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testJFK() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('Navigating to https://jfkconst.com/contact-us/ ...');
    await page.goto('https://jfkconst.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill First Name
    await page.type('#input_1_1', 'Pamela', { delay: 30 });
    // Last Name
    await page.type('#input_1_3', 'Jameson', { delay: 30 });
    
    // Address fields
    await page.type('#input_1_4_1', '100 N LaSalle St Suite 1500', { delay: 30 });
    await page.type('#input_1_4_3', 'Chicago', { delay: 30 });
    
    // State input might be select or text
    const stateEl = await page.$('#input_1_4_4');
    if (stateEl) {
      const tagName = await page.evaluate(el => el.tagName.toLowerCase(), stateEl);
      if (tagName === 'select') {
        await page.select('#input_1_4_4', 'Illinois', 'IL');
      } else {
        await page.type('#input_1_4_4', 'IL', { delay: 30 });
      }
    }

    await page.type('#input_1_4_5', '60601', { delay: 30 });

    // Email
    await page.type('#input_1_5', 'pamela.jameson@northeastprecision.com', { delay: 30 });

    // Phone
    await page.type('#input_1_6', '708-568-3708', { delay: 30 });

    // Questions or Comments
    await page.type('#input_1_8', 'Hello, Northeast Precision Machinery specializes in precision machining, custom architectural metal fabrication, and equipment support. We would welcome the opportunity to discuss upcoming project requirements. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    // Do NOT touch honeypot #input_1_9 !

    console.log('Clicking submit button #gform_submit_button_1 ...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Navigation event:', e.message)),
      page.click('#gform_submit_button_1')
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const confirmEl = document.querySelector('.gform_confirmation_message, [id*="gform_confirmation"]');
      const errEl = document.querySelector('.validation_error, .gform_validation_errors');
      const bodyText = document.body ? document.body.innerText : '';
      const hasThankYou = /thank you|thanks for contacting|we will be in touch|received your message/i.test(bodyText);
      return {
        confirmText: confirmEl ? confirmEl.innerText.trim() : null,
        errorText: errEl ? errEl.innerText.trim() : null,
        hasThankYou,
        url: window.location.href
      };
    });

    console.log('JFK Submission result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error on JFK:', e);
  } finally {
    await browser.close();
  }
}

testJFK();
