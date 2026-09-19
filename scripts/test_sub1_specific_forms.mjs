import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testForms() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  // 1. #3383 - Inspect Allana Buick fields
  console.log('\n--- Checking #3383 abbae.com ---');
  {
    const page = await browser.newPage();
    await page.goto('https://abbae.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const gform1 = await page.evaluate(() => {
      const f = document.querySelector('#gform_1');
      if (!f) return null;
      const items = Array.from(f.querySelectorAll('.gfield')).map(gf => {
        const label = gf.querySelector('.gfield_label')?.innerText.trim();
        const input = gf.querySelector('input, textarea, select');
        return {
          label,
          id: input?.id,
          name: input?.name,
          type: input?.type,
          options: input?.tagName === 'SELECT' ? Array.from(input.options).map(o => o.text) : undefined
        };
      });
      return items;
    });
    console.log('gform_1 fields:', JSON.stringify(gform1, null, 2));
    await page.close();
  }

  // 2. #3385 - Inspect Austin JotForm
  console.log('\n--- Checking #3385 JotForm options ---');
  {
    const page = await browser.newPage();
    await page.goto('https://form.jotform.com/212636253000037', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const jotDetails = await page.evaluate(() => {
      const companySelect = document.querySelector('#input_6');
      const topicSelect = document.querySelector('#input_7');
      return {
        companies: companySelect ? Array.from(companySelect.options).map(o => ({ value: o.value, text: o.text })) : [],
        topics: topicSelect ? Array.from(topicSelect.options).map(o => ({ value: o.value, text: o.text })) : []
      };
    });
    console.log('JotForm dropdown options:', JSON.stringify(jotDetails, null, 2));
    await page.close();
  }

  // 3. #3389 - Inspect Pardot form
  console.log('\n--- Checking #3389 Pardot form ---');
  {
    const page = await browser.newPage();
    await page.goto('https://go.industrial-ia.com/l/852843/2020-03-03/2g25', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const pardotDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        }));
        return { action: f.action, fields };
      });
      return { title: document.title, forms, text: document.body?.innerText?.slice(0, 300) };
    });
    console.log('Pardot details:', JSON.stringify(pardotDetails, null, 2));
    await page.close();
  }

  // 4. #3397 - Inspect Marketing360 form
  console.log('\n--- Checking #3397 Marketing360 form ---');
  {
    const page = await browser.newPage();
    await page.goto('https://forms.marketing360.com/formsv3/688d22b3a6e550d67007a392', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const m360Details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        }));
        return { action: f.action, fields };
      });
      return { title: document.title, forms, text: document.body?.innerText?.slice(0, 300) };
    });
    console.log('Marketing360 details:', JSON.stringify(m360Details, null, 2));
    await page.close();
  }

  await browser.close();
}

testForms();
