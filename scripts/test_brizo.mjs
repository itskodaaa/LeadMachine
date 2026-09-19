import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.brizoconstruction.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

  const submitBtnInfo = await page.evaluate(() => {
    const f = document.querySelector('form');
    const btns = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
      tagName: b.tagName,
      type: b.type,
      className: b.className,
      value: b.value,
      innerText: b.innerText
    }));
    return btns;
  });
  console.log('Submit button info:', submitBtnInfo);

  // Type fields
  await page.type('#name-yui_3_17_2_1_1553888888520_3744-fname-field', 'Pamela');
  await page.type('#name-yui_3_17_2_1_1553888888520_3744-lname-field', 'Jameson');
  await page.type('#email-yui_3_17_2_1_1553888888520_3745-field', 'pamela.jameson@nortiheastprecision.com');
  await page.type('#textarea-yui_3_17_2_1_1553888888520_3747-field', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson');

  console.log('Clicking submit via DOM click...');
  await page.evaluate(() => {
    const f = document.querySelector('form');
    const btn = f.querySelector('button, input[type="submit"]');
    btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const success = document.querySelector('.form-submission-text, .form-submission-html');
    return {
      successText: success ? success.innerText : null,
      bodySnippet: document.body.innerText.slice(0, 600)
    };
  });
  console.log('Brizo Result:', result);

  await browser.close();
}

run().catch(console.error);
