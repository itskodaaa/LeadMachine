import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkGodaddyForms() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const urls = [
    { id: 4044, name: 'RWS Engineering', url: 'https://rwsengineering.com/' },
    { id: 4048, name: 'Xpress Precision', url: 'https://xpressprecisionproducts.com/#8efe47f0-19f2-42b9-a08c-2fd26527d4d6' }
  ];

  for (const item of urls) {
    console.log(`\n========================================\nChecking #${item.id} ${item.name}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      const formDetails = await page.evaluate(() => {
        const form = document.querySelector('form[data-ux="Form"]') || document.querySelector('form');
        if (!form) return null;
        
        // Find every input field and its surrounding labels / text
        const inputs = Array.from(form.querySelectorAll('input, textarea')).map(input => {
          const container = input.closest('div') || input.parentElement;
          const label = container ? container.innerText : '';
          return {
            tag: input.tagName,
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            ariaLabel: input.getAttribute('aria-label'),
            dataAid: input.getAttribute('data-aid'),
            containerText: label.replace(/\s+/g, ' ').trim()
          };
        });

        const submitBtn = form.querySelector('button[type="submit"], [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

        return {
          inputs,
          button: submitBtn ? { text: submitBtn.innerText, dataAid: submitBtn.getAttribute('data-aid') } : null
        };
      });

      console.log('Form details:', JSON.stringify(formDetails, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkGodaddyForms();
