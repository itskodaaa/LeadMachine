import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@northeastprecision.com',
  message: 'Hello, Northeast Precision Machinery is interested in exploring precision engineering design collaboration opportunities. Kindly arrange for a representative to contact us. Thank you.'
};

async function submit911() {
  console.log('Testing #911 with domcontentloaded...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://precisionengineeringpc.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector('input[name="your-name"]', { timeout: 15000 });

    await page.click('input[name="your-name"]');
    await page.type('input[name="your-name"]', OUTREACH.fullName, { delay: 30 });

    await page.click('input[name="your-email"]');
    await page.type('input[name="your-email"]', OUTREACH.email, { delay: 30 });

    await page.click('textarea[name="your-message"]');
    await page.type('textarea[name="your-message"]', OUTREACH.message, { delay: 10 });

    console.log('Clicking submit on #911...');
    await page.click('.wpcf7-submit, input[type="submit"]');

    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        const output = document.querySelector('.wpcf7-response-output')?.innerText;
        const match = text.match(/(thank you|message was sent|received|successfully)/i);
        return {
          output,
          hasMatch: !!match,
          matchSnippet: match ? match[0] : null
        };
      });
      console.log(`Sec ${i+1}:`, res);
      if (res.output || res.hasMatch) {
        console.log('✅ Confirmed submission on Lead #911!');
        break;
      }
    }

  } catch (err) {
    console.log('Error submitting #911:', err.message);
  } finally {
    await browser.close();
  }
}

submit911();
