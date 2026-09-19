import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(name, url, customFn) {
  console.log(`\n==============================================`);
  console.log(`Deep inspecting: ${name} (${url})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  page.on('dialog', async d => {
    console.log(`  [Dialog] ${d.type()}: ${d.message()}`);
    await d.dismiss();
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`  Page loaded: ${page.url()}`);
    if (customFn) {
      await customFn(page);
    }
  } catch (e) {
    console.log(`  Error loading ${url}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  // 1. #4600 SMW Contact Page
  await checkSite('4600 Scientific Machine & Welding', 'https://sm-w.com/Contact/Contact_Turnkey_Metal_Fabrication.aspx', async page => {
    const info = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder,
        label: document.querySelector(`label[for="${i.id}"]`)?.innerText || i.closest('tr')?.innerText || ''
      }));
      return { inputs, bodySnippet: document.body.innerText.slice(0, 500) };
    });
    console.log('  Inputs:', JSON.stringify(info.inputs, null, 2));
  });

  // 2. #4601 Lockhart
  await checkSite('4601 H J Lockhart Metal Services', 'https://lockhartmetalservice.com/', async page => {
    const info = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        name: i.name, id: i.id, placeholder: i.placeholder,
        label: i.parentElement?.innerText || ''
      }));
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.outerHTML);
      return { inputs, buttons };
    });
    console.log('  Form info:', info);
  });

  // 3. #4602 Smart Metal Studio
  await checkSite('4602 Smart Metal Studio', 'https://www.smartmetalstudio.com/', async page => {
    const info = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        formId: form?.id,
        submitBtn: document.querySelector('button[type="submit"], [data-testid="buttonElement"]')?.outerHTML,
        text: document.body.innerText.slice(0, 400)
      };
    });
    console.log('  Wix form info:', info);
  });

  // 4. #4604 MetalWork Austin
  await checkSite('4604 MetalWork Austin', 'https://metalworkaustin.com/', async page => {
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      const outputs = document.querySelectorAll('.wpcf7-response-output');
      const scripts = Array.from(document.querySelectorAll('script[src*="recaptcha"], script[src*="turnstile"]')).map(s => s.src);
      return { formFound: !!form, scripts, outputText: Array.from(outputs).map(o => o.innerText) };
    });
    console.log('  CF7 info:', info);
  });

  // 5. #4605 Supreme Custom Metalwork
  await checkSite('4605 Supreme Custom Metalwork', 'https://supremecustommetalwork.com/contact/', async page => {
    const info = await page.evaluate(() => {
      const form = document.querySelector('#form_contact-form');
      const fields = Array.from(document.querySelectorAll('.frm_form_field')).map(f => ({
        label: f.querySelector('label')?.innerText,
        input: f.querySelector('input, textarea')?.name
      }));
      return { formFound: !!form, fields };
    });
    console.log('  Formidable form info:', info);
  });

  // 6. #4606 Capitol Company
  await checkSite('4606 Capitol Company', 'https://capitolcompany.com/', async page => {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('  Capitol links:', links.slice(0, 10));
  });

  // 7. #4607 Steel House MFG
  await checkSite('4607 Steel House MFG', 'https://www.steelhousemfg.com/contact-1', async page => {
    const text = await page.evaluate(() => document.body.innerText);
    console.log('  Contact text snippet:', text.slice(0, 500).replace(/\n+/g, ' '));
  });

  // 8. #4608 Affinity Metalworks
  await checkSite('4608 Affinity Metalworks', 'https://www.affinitymetalworks.com/', async page => {
    const info = await page.evaluate(() => {
      const fields = Array.from(document.querySelectorAll('[data-testid="form-field"], .wixui-text-input, .wixui-text-area')).map(f => ({
        label: f.querySelector('label')?.innerText,
        inputName: f.querySelector('input, textarea')?.name,
        inputId: f.querySelector('input, textarea')?.id,
        placeholder: f.querySelector('input, textarea')?.placeholder
      }));
      return { fields };
    });
    console.log('  Wix fields:', info);
  });

  // 9. #4609 K & K Welding LLC
  await checkSite('4609 K & K Welding LLC', 'https://kkweldingllc.com/contact-us', async page => {
    const info = await page.evaluate(() => {
      const fields = Array.from(document.querySelectorAll('.form-group, .field, label')).map(l => l.innerText.trim());
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        name: i.name, id: i.id, label: i.closest('div')?.innerText?.trim()
      }));
      return { inputs };
    });
    console.log('  K & K inputs:', info);
  });
}

run();
