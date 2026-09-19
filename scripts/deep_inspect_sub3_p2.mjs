import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 6. #4702 Woods Fab
  {
    console.log('\n--- 4702: Woods Fab ---');
    const page = await browser.newPage();
    await page.goto('https://www.woodsfabaz.com/contact', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      return {
        text: document.body ? document.body.innerText : '',
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input, textarea').length,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 7. #4703 Kent Metal Fab
  {
    console.log('\n--- 4703: Kent Metal Fabrication ---');
    const page = await browser.newPage();
    await page.goto('https://kentmetalfabrication.com/', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      return {
        text: document.body ? document.body.innerText : '',
        forms: document.querySelectorAll('form').length,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 8. #4704 Pit Buggy Welding
  {
    console.log('\n--- 4704: Pit Buggy Welding ---');
    const page = await browser.newPage();
    await page.goto('https://pitbuggy.com/', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      return Array.from(form.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id
      }));
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 9. #4705 Randy Ellis Design
  {
    console.log('\n--- 4705: Randy Ellis Design ---');
    const page = await browser.newPage();
    await page.goto('https://www.randyellisdesign.com/contact.html', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.wsite-form') || document.querySelector('form');
      if (!form) return 'No form';
      return Array.from(form.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id
      }));
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 10. #4706 Bunger Steel
  {
    console.log('\n--- 4706: Bunger Steel ---');
    const page = await browser.newPage();
    await page.goto('https://bungersteel.com/contact-us/', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('#gform_3');
      if (!form) return 'No gform_3';
      const fields = Array.from(form.querySelectorAll('li, .gfield')).map(f => {
        const label = f.querySelector('label') ? f.querySelector('label').innerText : '';
        const input = f.querySelector('input, textarea');
        return {
          label,
          tag: input ? input.tagName : null,
          name: input ? input.name : null,
          id: input ? input.id : null,
          placeholder: input ? input.placeholder : null
        };
      });
      return fields;
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  await browser.close();
}

run();
