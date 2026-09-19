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
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and explore potential collaboration and project quotes. Kindly have a representative contact us at your convenience. Thank you, Pamela Jameson.'
};

async function test4190() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://baysidemechanicalcontractors.com', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill the inputs directly
    const inputs = await page.evaluate((outreach) => {
      const all = Array.from(document.querySelectorAll('input, textarea'));
      const fields = [];
      for (const el of all) {
        const id = el.id.toLowerCase();
        const label = (el.closest('[data-testid]')?.innerText || el.getAttribute('aria-label') || '').toLowerCase();
        const combined = `${id} ${label}`;

        if (el.tagName === 'TEXTAREA' || combined.includes('help') || combined.includes('message')) {
          el.value = outreach.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fields.push('message');
        } else if (el.type === 'email' || combined.includes('email')) {
          el.value = outreach.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fields.push('email');
        } else if (combined.includes('phone')) {
          el.value = outreach.phone;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fields.push('phone');
        } else if (combined.includes('last')) {
          el.value = outreach.lastName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fields.push('lastName');
        } else if (combined.includes('first')) {
          el.value = outreach.firstName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fields.push('firstName');
        }
      }
      return fields;
    }, OUTREACH);
    console.log('Filled fields:', inputs);

    // Click submit
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'submit');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Submit clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const postState = await page.evaluate(() => {
      const formSection = document.querySelector('form') || document.body;
      const text = formSection.innerText;
      return {
        fullText: text,
        hasThanks: /thanks|thank you/i.test(text),
        hasError: /error|fix/i.test(text)
      };
    });
    console.log('Post state:', postState.hasThanks, postState.hasError);
    console.log('Form text snippet:', postState.fullText.slice(0, 500));

  } catch (e) {
    console.log('4190 error:', e.message);
  } finally {
    await page.close();
    await browser.close();
  }
}

test4190();
