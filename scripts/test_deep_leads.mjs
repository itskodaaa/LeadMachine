import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you.'
};

async function testLead(id, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    console.log(`\n==============================================`);
    console.log(`Deep Testing Lead #${id}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Landed at:', page.url());

    // Check contact links if needed
    const contactHref = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find(el => /contact/i.test(el.innerText) || /contact/i.test(el.href));
      return a ? a.href : null;
    });

    if (contactHref && !page.url().includes('contact')) {
      console.log('Going to contact page:', contactHref);
      await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log('Contact URL:', page.url());
    }

    // Inspect all form fields and text on page
    const pageData = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => ({ text: l.innerText, for: l.getAttribute('for') }));
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
        tag: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        placeholder: i.placeholder,
        value: i.value
      }));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
      return { labels, inputs, iframes, buttons };
    });

    console.log('Page Data:', JSON.stringify(pageData, null, 2));

  } catch (e) {
    console.log('Error testing lead:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testLead(3547, 'https://capconsultingeng.com');
  await testLead(3548, 'https://spireconsultinggroup.com');
  await testLead(3553, 'https://www.corsairus.com/contact-us');
  await testLead(3555, 'https://www.acuren.com/contact-us/');
}

run();
