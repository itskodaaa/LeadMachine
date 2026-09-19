import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Dynabal form HTML
  console.log('--- Dynabal (4433) Form HTML ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dynabal.com/contact.html', { waitUntil: 'domcontentloaded' });
    const dynaHtml = await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"]');
      let parent = btn ? btn.parentElement : null;
      let formEl = btn ? btn.closest('form') : null;
      return {
        hasFormParent: !!formEl,
        formOuter: formEl ? formEl.outerHTML.slice(0, 500) : null,
        submitParentHtml: parent ? parent.innerHTML.slice(0, 500) : null,
        allHtmlWithFormTag: document.documentElement.outerHTML.match(/<form[^>]*>/gi)
      };
    });
    console.log('Dynabal form debug:', dynaHtml);
    await page.close();
  } catch (e) {
    console.log('Dynabal err:', e.message);
  }

  // 2. Precision Measurements (4436)
  console.log('--- Precision Measurements (4436) HTML ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://precision-measurements.com/pm-home-contact.php', { waitUntil: 'domcontentloaded' });
    const pmHtml = await page.evaluate(() => {
      const container = document.querySelector('#docContainer') || document.querySelector('form');
      return container ? container.innerHTML : 'No container';
    });
    console.log('PM HTML snippet around regex6:', pmHtml.slice(pmHtml.indexOf('regex6') - 200, pmHtml.indexOf('regex6') + 400));
    await page.close();
  } catch (e) {
    console.log('PM err:', e.message);
  }

  // 3. ICE (4429) homepage
  console.log('--- ICE (4429) Homepage Form ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://iceagents.com/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const iceDetails = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      return {
        action: form?.action,
        innerHTML: form?.innerHTML
      };
    });
    console.log('ICE form action:', iceDetails.action);
    console.log('ICE form innerHTML snippet:', iceDetails.innerHTML?.slice(0, 1000));
    await page.close();
  } catch (e) {
    console.log('ICE err:', e.message);
  }

  // 4. Paradigm (4430)
  console.log('--- Paradigm (4430) form structure ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://paradigmeng.net/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const godaddyForm = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML : 'No form';
    });
    console.log('Paradigm form HTML:', godaddyForm);
    await page.close();
  } catch (e) {
    console.log('Paradigm err:', e.message);
  }

  // 5. Thomas & Hutton (4437)
  console.log('--- Thomas & Hutton (4437) text & contact details ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.thomasandhutton.com/contact/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const thText = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.slice(0, 1000),
        allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, id: i.id })),
        allLinks: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => a.href.includes('mailto:') || a.href.includes('tel:'))
      };
    });
    console.log('TH details:', thText);
    await page.close();
  } catch (e) {
    console.log('TH err:', e.message);
  }

  await browser.close();
}

run();
