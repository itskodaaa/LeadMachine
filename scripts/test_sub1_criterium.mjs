import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkCriterium() {
  console.log('--- Inspecting #4423 HubSpot Form ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://info.criterium-engineers.com/criterium-engineers-learn-more-form', { waitUntil: 'networkidle2', timeout: 30000 });

    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form.hs-form input, form.hs-form select, form.hs-form textarea'));
      return inputs.map(inp => {
        const label = inp.closest('.hs-form-field')?.querySelector('label')?.innerText.trim();
        return {
          name: inp.name,
          type: inp.type,
          id: inp.id,
          required: inp.required || inp.getAttribute('aria-required') === 'true',
          label: label || ''
        };
      });
    });

    console.log('Criterium HubSpot Fields:', JSON.stringify(fields, null, 2));

    // Also check if there is an invisible reCAPTCHA or challenge
    const hasRecaptcha = await page.evaluate(() => {
      return !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]');
    });
    console.log('Has reCAPTCHA on Criterium:', hasRecaptcha);

  } catch (e) {
    console.error('Error on #4423:', e.message);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

checkCriterium();
