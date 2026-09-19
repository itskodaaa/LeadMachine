import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testAssocDirect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.assocmachine.com/contact-us/', { waitUntil: 'domcontentloaded' });

    await page.type('#et_pb_contact_name_0', 'Pamela Jameson');
    await page.type('#et_pb_contact_email_0', 'pamela.jameson@nortiheastprecision.com');
    await page.type('#et_pb_contact_phone_0', '708-568-3708');
    await page.type('#et_pb_contact_message_0', 'Exploring collaboration opportunities and quoting for upcoming projects.');

    console.log('Submitting Assoc form via click & wait for navigation or dom change...');
    
    // Listen to network responses
    page.on('response', res => {
      if (res.url().includes('assocmachine.com')) {
        console.log('Response:', res.status(), res.url());
      }
    });

    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' }).catch(e => {
        console.log('Nav wait caught:', e.message);
        return null;
      }),
      page.click('form.et_pb_contact_form button.et_pb_contact_submit')
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const pageContent = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('.et-pb-contact-message, .et_pb_contact_error_text, .et_pb_contact_form p')).map(p => p.innerText.trim()).filter(Boolean);
      return {
        url: window.location.href,
        messages,
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });

    console.log('Result after submit:', JSON.stringify(pageContent, null, 2));
  } catch (e) {
    console.error('Assoc direct error:', e.message);
  } finally {
    await browser.close();
  }
}

testAssocDirect();
