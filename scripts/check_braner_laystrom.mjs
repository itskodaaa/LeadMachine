import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkBranerAndLaystrom() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of [
    { id: 1600, name: 'Braner USA', url: 'https://www.braner.com/contact' },
    { id: 1606, name: 'Laystrom', url: 'https://www.laystrom.com/contact/' }
  ]) {
    const page = await browser.newPage();
    console.log(`Checking ${item.name} at ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 25000 });
      console.log(`Title: ${await page.title()}`);
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            id: i.id,
            type: i.type,
            placeholder: i.placeholder
          }))
        }));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile')).map(e => e.outerHTML.slice(0, 100));
        return { forms, captchas, text: document.body.innerText.slice(0, 400) };
      });
      console.log('Result:', JSON.stringify(info, null, 2));
    } catch (e) {
      console.log(`Error navigating to ${item.url}:`, e.message);
    }
    await page.close();
  }
  await browser.close();
}

checkBranerAndLaystrom();
