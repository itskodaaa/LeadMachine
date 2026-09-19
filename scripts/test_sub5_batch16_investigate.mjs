import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testLeads() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 4830, name: 'AG Electrical', url: 'https://agelectricalengineer.com/' },
    { id: 4831, name: 'Switchgear', url: 'https://switchgearflorida.com/' },
    { id: 4835, name: 'Becai Electric', url: 'https://www.becaielectric.com/' },
    { id: 4837, name: 'Piece-Makers', url: 'https://piece-makers.com/' },
    { id: 4838, name: 'Tool Place Corp', url: 'https://toolplacecorp.com/' },
    { id: 4828, name: 'JALRW', url: 'https://jalrw.com/' },
    { id: 4834, name: 'Labra Services', url: 'https://labraservices.com/' }
  ];

  for (const target of targets) {
    console.log(`\n========================================\nExamining #${target.id} ${target.name} (${target.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`HTTP Status: ${response?.status()}`);
      console.log(`Current URL: ${page.url()}`);

      // Check forms and inputs
      const formInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
          return {
            formIndex: i,
            action: f.action,
            method: f.method,
            id: f.id,
            className: f.className,
            inputs,
            buttons,
            hasRecaptcha
          };
        });

        const contactLinks = Array.from(document.querySelectorAll('a[href*="contact" i]')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        }));

        return { forms, contactLinks };
      });

      console.log('Form Info:', JSON.stringify(formInfo, null, 2));

    } catch (e) {
      console.log(`Error on ${target.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testLeads();
