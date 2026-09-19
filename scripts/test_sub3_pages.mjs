import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  
  // Test Reliable Welding contact page
  const page1 = await browser.newPage();
  await page1.goto('https://reliableweldingandsteelsupply.com/contact.html/', { waitUntil: 'networkidle2', timeout: 20000 });
  const rwInfo = await page1.evaluate(() => {
    return {
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName.toLowerCase(),
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder
      })),
      text: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Reliable Welding contact page:', JSON.stringify(rwInfo, null, 2));

  // Test Tampa Sheet Metal contact-us page
  const page2 = await browser.newPage();
  await page2.goto('https://www.tampasheetmetal.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
  const tsmInfo = await page2.evaluate(() => {
    return {
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName.toLowerCase(),
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        className: i.className
      })),
      text: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Tampa Sheet Metal contact-us page:', JSON.stringify(tsmInfo, null, 2));

  await browser.close();
})();
