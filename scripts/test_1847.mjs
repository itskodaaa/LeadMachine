import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function test1847() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://psinternationalsupply.net/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Title:', await page.title());

    // In GoDaddy / Website Builder sites:
    // Let's inspect the second form
    const formInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      return Array.from(forms).map((f, i) => ({
        idx: i,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(el => ({
          tag: el.tagName,
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          ariaLabel: el.getAttribute('aria-label'),
          lbl: el.closest('div')?.innerText
        }))
      }));
    });
    console.log('Forms on 1847:', JSON.stringify(formInfo, null, 2));

    // Fill the contact form:
    // Name
    const nameInput = await page.$('input[id*="input45"], input[aria-label*="Name"], input[placeholder*="Name"]');
    // Email
    const emailInput = await page.$('input[id*="input46"], input[aria-label*="Email"], input[placeholder*="Email"]');
    // Message
    const msgInput = await page.$('textarea');

    console.log('Found inputs:', { hasName: !!nameInput, hasEmail: !!emailInput, hasMsg: !!msgInput });

    // Let's use evaluate to fill precisely:
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input[type="text"], form textarea'));
      for (const el of inputs) {
        const text = (el.id + ' ' + el.name + ' ' + el.placeholder + ' ' + (el.closest('label')?.innerText || '') + ' ' + (el.parentElement?.innerText || '')).toLowerCase();
        if (text.includes('name') && !text.includes('company')) {
          el.value = 'Pamela Jameson';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (text.includes('email')) {
          el.value = 'pamela.jameson@nortiheastprecision.com';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.tagName.toLowerCase() === 'textarea' || text.includes('message')) {
          el.value = 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience.';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    console.log('Values filled. Clicking Send...');
    const sendBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('send'));
      if (btn) {
        btn.click();
        return btn.innerText || btn.value;
      }
      return null;
    });
    console.log('Clicked button:', sendBtn);

    await new Promise(r => setTimeout(r, 6000));

    const postSubmit = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="alert"], [class*="success"], [class*="message"], [data-aid*="MESSAGE"]')).map(e => e.innerText);
      const body = document.body ? document.body.innerText : '';
      return { alerts, bodySnippet: body.slice(0, 500) };
    });
    console.log('Post submit:', postSubmit);

  } catch (err) {
    console.log('Error 1847:', err.message);
  } finally {
    await browser.close();
  }
}

test1847();
