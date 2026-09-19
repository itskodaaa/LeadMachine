import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your precision machining and tooling services. We would appreciate the opportunity to discuss upcoming project quotes and potential collaboration. Please have a representative contact us at your convenience. Thank you, Pamela Jameson'
};

async function testSubmit3573() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('\n--- Testing #3573 Fuson ---');
  const page = await browser.newPage();
  try {
    page.on('response', async res => {
      if (res.url().includes('contact-form-7') || res.url().includes('wp-json')) {
        try {
          console.log(`[3573 Response] ${res.status()} ${res.url()}:`, await res.text());
        } catch(e) {}
      }
    });

    await page.goto('https://www.fuson-cncmachining.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('input[name="your-name"]', PROFILE.name);
    await page.type('input[name="your-phone"]', PROFILE.phone);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('Fields typed. Submitting...');
    await Promise.all([
      page.click('input[type="submit"], button[type="submit"], .wpcf7-submit'),
      new Promise(r => setTimeout(r, 6000))
    ]);

    const resultText = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output');
      return resp ? resp.innerText : document.body.innerText;
    });
    console.log('Post-submit result text (snippet):', resultText.slice(0, 300));
  } catch (e) {
    console.error('Error in 3573:', e.message);
  } finally {
    await page.close();
  }

  console.log('\n--- Testing #3577 Texas CNC Innovations ---');
  const page2 = await browser.newPage();
  try {
    page2.on('response', async res => {
      if (res.url().includes('gravityforms') || res.url().includes('admin-ajax.php')) {
        try {
          console.log(`[3577 Response] ${res.status()} ${res.url()}:`, (await res.text()).slice(0, 200));
        } catch(e) {}
      }
    });

    await page2.goto('https://texascncinnovations.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    // Let's check labels for inputs 1..5
    const fieldInfo = await page2.evaluate(() => {
      return Array.from(document.querySelectorAll('#gform_1 label')).map(l => ({
        for: l.getAttribute('for'),
        text: l.innerText
      }));
    });
    console.log('Gform labels:', fieldInfo);

    // Fill form
    if (await page2.$('#input_1_1')) await page2.type('#input_1_1', PROFILE.name);
    if (await page2.$('#input_1_2')) await page2.type('#input_1_2', PROFILE.phone);
    if (await page2.$('#input_1_3')) await page2.type('#input_1_3', PROFILE.email);
    if (await page2.$('#input_1_5')) await page2.type('#input_1_5', PROFILE.company);
    if (await page2.$('#input_1_4')) await page2.type('#input_1_4', PROFILE.message);

    console.log('Gform fields typed. Submitting...');
    await Promise.all([
      page2.click('#gform_submit_button_1'),
      new Promise(r => setTimeout(r, 6000))
    ]);

    const gformResult = await page2.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
      const err = document.querySelector('.gform_validation_errors, .validation_error');
      return {
        confirmation: conf ? conf.innerText : null,
        error: err ? err.innerText : null,
        bodySnippet: document.body.innerText.slice(0, 300)
      };
    });
    console.log('Gform result:', gformResult);
  } catch (e) {
    console.error('Error in 3577:', e.message);
  } finally {
    await page2.close();
  }

  await browser.close();
}

testSubmit3573();
