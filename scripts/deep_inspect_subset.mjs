import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  // 1. Inspect #1736: Cnc programming & machining
  console.log('\n--- Inspecting #1736 ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://cncprogramingmachining.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const wpformDetails = await page.evaluate(() => {
      const form = document.querySelector('form.wpforms-form');
      if (!form) return { hasForm: false };
      const fields = Array.from(form.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: el.closest('.wpforms-field')?.querySelector('label')?.innerText || ''
      }));
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      return {
        hasForm: true,
        action: form.action,
        fields,
        submitText: submitBtn ? submitBtn.innerText || submitBtn.value : null
      };
    });
    console.log('1736 Form:', JSON.stringify(wpformDetails, null, 2));
    await page.close();
  } catch (e) {
    console.log('1736 error:', e.message);
  }

  // 2. Inspect #1740: JH Precision on HTTP
  console.log('\n--- Inspecting #1740 ---');
  try {
    const page = await browser.newPage();
    await page.goto('http://jhpmi.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const jhpmiDetails = await page.evaluate(() => {
      const title = document.title;
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.action);
      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      return { title, links: links.slice(0, 10), forms, mailtos };
    });
    console.log('1740 Details:', JSON.stringify(jhpmiDetails, null, 2));
    await page.close();
  } catch (e) {
    console.log('1740 error:', e.message);
  }

  // 3. Inspect #1741: Z-Tech Machining
  console.log('\n--- Inspecting #1741 ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://ztechmachininginc.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const ztechDetails = await page.evaluate(() => {
      const title = document.title;
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.action);
      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      return { title, links, forms, mailtos };
    });
    console.log('1741 Details:', JSON.stringify(ztechDetails, null, 2));
    await page.close();
  } catch (e) {
    console.log('1741 error:', e.message);
  }

  // 4. Inspect #1735: Laserod Quote Page
  console.log('\n--- Inspecting #1735 Laserod ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://laserod.com/request-quote/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const laserodHtml = await page.evaluate(() => {
      const main = document.querySelector('main') || document.querySelector('#content') || document.body;
      return {
        innerSnippet: main.innerHTML.slice(0, 800),
        iframes: Array.from(document.querySelectorAll('iframe')).map(i => i.src),
        scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).filter(s => s.includes('form') || s.includes('quote') || s.includes('hubspot'))
      };
    });
    console.log('1735 Details:', JSON.stringify(laserodHtml, null, 2));
    await page.close();
  } catch (e) {
    console.log('1735 error:', e.message);
  }

  await browser.close();
}

main().catch(console.error);
