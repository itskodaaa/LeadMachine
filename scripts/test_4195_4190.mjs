import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  cleanPhone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and explore potential collaboration and project quotes. Kindly have a representative contact us at your convenience. Thank you, Pamela Jameson.'
};

async function testSingle() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors'
    ]
  });

  // Check 4195
  console.log('--- Checking 4195 JM Gross ---');
  {
    const page = await browser.newPage();
    try {
      page.on('response', async res => {
        if (res.url().includes('form-u32827.php')) {
          console.log('4195 form-u32827 response status:', res.status());
          try {
            console.log('4195 form-u32827 response text:', await res.text());
          } catch(e){}
        }
      });
      await page.goto('https://jmgrossengineering.com', { waitUntil: 'networkidle2', timeout: 20000 });
      
      const formInfo = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? { action: form.action, method: form.method, html: form.outerHTML } : null;
      });
      console.log('4195 Form info:', formInfo ? formInfo.action : 'no form');

      // Check contact info on page
      const contacts = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          textSnippet: text.slice(0, 1000),
          emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
          phones: text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || []
        };
      });
      console.log('4195 page contacts:', contacts);

    } catch (e) {
      console.log('4195 err:', e.message);
    } finally {
      await page.close();
    }
  }

  // Check 4190 Bayside Wix form details
  console.log('\n--- Checking 4190 Bayside Wix Form ---');
  {
    const page = await browser.newPage();
    try {
      page.on('response', async res => {
        if (res.url().includes('wixapps.net') || res.url().includes('form')) {
          if (res.request().method() === 'POST') {
            console.log('4190 API:', res.status(), res.url());
            try {
              const txt = await res.text();
              console.log('4190 API response:', txt.slice(0, 200));
            } catch(e){}
          }
        }
      });
      await page.goto('https://baysidemechanicalcontractors.com', { waitUntil: 'networkidle2', timeout: 25000 });
      
      // Let's inspect the Wix form DOM specifically
      const wixForm = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;
        return {
          id: form.id,
          classes: form.className,
          fields: Array.from(form.querySelectorAll('[data-testid]')).map(el => ({
            testId: el.getAttribute('data-testid'),
            tag: el.tagName,
            text: el.innerText
          }))
        };
      });
      console.log('4190 wix form details:', JSON.stringify(wixForm, null, 2));

    } catch (e) {
      console.log('4190 err:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testSingle();
