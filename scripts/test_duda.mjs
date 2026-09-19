import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testDuda() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('dmform') || url.includes('submit') || url.includes('jsp')) {
      console.log(`[Duda Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[Duda Body] ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://www.jybaluminumworks.com/ ...');
    await page.goto('https://www.jybaluminumworks.com/', { waitUntil: 'networkidle2' });
    
    // Fill inputs using [id="..."]
    await page.type('[id="1501550755"]', 'Pamela Jameson', { delay: 30 });
    await page.type('[id="1661362449"]', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page.type('[id="1951676930"]', '7085683708', { delay: 30 });
    await page.type('[id="1518044571"]', 'Hello, Northeast Precision Machinery specializes in precision machining, custom metal fabrication, and equipment solutions. We would welcome the opportunity to discuss manufacturing requirements. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    console.log('Clicking submit button [id="1323949361"] ...');
    await page.click('[id="1323949361"]');
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const respEl = document.querySelector('.dm-form-response, .dmResponse, [id*="response"], .dmformsubmit');
      return {
        text: document.body.innerText.slice(0, 500),
        respHtml: respEl ? respEl.outerHTML : null
      };
    });

    console.log('Result HTML:', result.respHtml);
    const hasThankYou = /thank you|received|submitted|message has been sent/i.test(result.text);
    console.log('Has Thank You in page:', hasThankYou);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testDuda();
