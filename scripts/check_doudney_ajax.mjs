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
  
  page.on('response', async res => {
    if (res.url().includes('feedback') || res.url().includes('wp-json/contact-form-7')) {
      console.log('CF7 AJAX URL:', res.url());
      try {
        const json = await res.json();
        console.log('CF7 AJAX Response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('CF7 AJAX Text:', await res.text());
      }
    }
  });

  await page.goto('https://doudney.com/get-quote/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  await page.type('input[name="your-name"]', 'Pamela Jameson');
  await page.type('input[name="your-business"]', 'Northeast Precision Machinery');
  await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="you-phone"]', '708-568-3708');
  await page.type('input[name="job-address"]', '100 Main St');
  await page.type('input[name="job-city"]', 'Miami');
  await page.type('input[name="job-st"]', 'FL');
  await page.type('input[name="job-zip"]', '33146');
  
  await page.click('input[name="job-type[]"]');
  await page.select('select[name="location"]', 'Miami');
  await page.select('select[name="template"]', 'no');
  await page.select('select[name="field-measure"]', 'no');

  await page.type('textarea[name="your-message"]', 'Hello, looking to connect regarding custom sheet metal fabrication projects.');

  const submitBtn = await page.$('input[type="submit"]');
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
}

run();
