import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Check 4702 Woods Fab
  {
    console.log('--- 4702 Woods Fab ---');
    const page = await browser.newPage();
    await page.goto('https://www.woodsfabaz.com/contact', { waitUntil: 'networkidle2' });
    const data = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText,
        htmlSnippet: document.querySelector('main') ? document.querySelector('main').innerHTML : document.body.innerHTML.substring(0, 1000)
      };
    });
    console.log('Woods Fab text:', data.bodyText);
    await page.close();
  }

  // Check 4706 Bunger Steel math question & honeypot
  {
    console.log('\n--- 4706 Bunger Steel form detail ---');
    const page = await browser.newPage();
    await page.goto('https://bungersteel.com/contact-us/', { waitUntil: 'networkidle2' });
    const gform = await page.evaluate(() => {
      const f = document.querySelector('#gform_3');
      if (!f) return null;
      return {
        html: f.innerHTML
      };
    });
    console.log('Bunger Steel HTML length:', gform ? gform.html.length : 0);
    // Print fields with class names and labels
    const fields = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('#gform_3 .gfield'));
      return items.map(el => ({
        className: el.className,
        label: el.querySelector('label') ? el.querySelector('label').innerText : '',
        subLabel: el.querySelector('.gfield_description') ? el.querySelector('.gfield_description').innerText : '',
        inputName: el.querySelector('input, textarea') ? el.querySelector('input, textarea').name : '',
        inputType: el.querySelector('input, textarea') ? el.querySelector('input, textarea').type : ''
      }));
    });
    console.log('Bunger fields:', JSON.stringify(fields, null, 2));
    await page.close();
  }

  await browser.close();
}

check();
