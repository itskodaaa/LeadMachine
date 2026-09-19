import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testMetalFlorida() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('wix-forms') || url.includes('submit')) {
      console.log(`[API Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[API Body] ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://www.metal-florida.com/ ...');
    await page.goto('https://www.metal-florida.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill form
    await page.type('#input_comp-lmj4drye', 'Pamela', { delay: 40 });
    await page.type('#input_comp-lmj4drzb', 'Jameson', { delay: 40 });
    await page.type('#input_comp-lmj4drzo', 'pamela.jameson@northeastprecision.com', { delay: 40 });
    await page.type('#input_comp-lmj4ds00', '7085683708', { delay: 40 });
    await page.type('#textarea_comp-lmj4ds0b', 'Hello, Northeast Precision Machinery specializes in precision machining, custom metal fabrication, and equipment solutions. We would welcome the opportunity to connect regarding potential machining and fabrication requirements. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });

    const submitBtn = await page.evaluateHandle(() => {
      const form = document.querySelector('#comp-lmj4dry0');
      if (!form) return null;
      const btns = Array.from(form.querySelectorAll('button, [data-testid="buttonElement"]'));
      return btns.find(b => /enviar|send|submit/i.test(b.innerText)) || btns[0];
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking Wix submit button...');
      await submitBtn.asElement().click();
      await new Promise(r => setTimeout(r, 6000));

      const pageText = await page.evaluate(() => document.body.innerText);
      const isSuccess = /gracias|thank you|recibido|submitted|success/i.test(pageText);
      console.log('DOM confirmation check:', isSuccess);

      const wixMsg = await page.evaluate(() => {
        const msgEl = document.querySelector('[data-testid="messageline"], [id*="notifications"]');
        return msgEl ? msgEl.innerText : null;
      });
      console.log('Wix msg element:', wixMsg);
    } else {
      console.log('Submit button not found');
    }
  } catch (e) {
    console.error('Error on Metal Florida:', e);
  } finally {
    await browser.close();
  }
}

testMetalFlorida();
