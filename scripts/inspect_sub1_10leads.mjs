import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3784, name: 'Anderson America Corp.', url: 'https://andersonamerica.com' },
  { id: 3786, name: 'IPD Company Inc', url: 'https://ipdcompany.com' },
  { id: 3787, name: 'Carolina Precision Machining', url: 'https://cpmmachining.com' },
  { id: 3788, name: 'Machining & Custom Design LLC', url: 'https://semitirecarrier.com' },
  { id: 3789, name: 'Components By Design, Inc', url: 'https://componentsbydesign.com' },
  { id: 3791, name: 'Advanced Engineering Consultants LLC', url: 'https://advanced-engineers.com' },
  { id: 3792, name: 'WRA Engineering', url: 'https://wraengineering.com' },
  { id: 3793, name: 'Beacon Civil Engineering', url: 'https://beaconcivil.com' },
  { id: 3794, name: 'Central Florida Civil Engineers', url: 'https://cfcengineers.com' },
  { id: 3796, name: 'Aurora Civil Engineering Inc', url: 'https://auroracivil.com' }
];

async function inspectForms(page) {
  return await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map((f, i) => {
      const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
        tag: inp.tagName.toLowerCase(),
        type: inp.type,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder,
        required: inp.required,
        value: inp.value
      }));
      const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
      const text = (f.innerText || '').slice(0, 300).replace(/\s+/g, ' ');
      const hasTurnstile = !!f.querySelector('.cf-turnstile, iframe[src*="turnstile"], [data-sitekey]');
      const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
      const hasHcaptcha = !!f.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
      return {
        index: i,
        action: f.action,
        id: f.id,
        className: f.className,
        inputCount: inputs.length,
        visibleInputs: inputs.filter(inp => inp.type !== 'hidden'),
        buttons,
        hasTurnstile,
        hasRecaptcha,
        hasHcaptcha,
        text
      };
    });
  });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n========================================\n[INSPECT] #${lead.id} ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    try {
      const tryUrls = [
        lead.url,
        lead.url.replace('https://', 'https://www.'),
        lead.url.replace('https://', 'http://'),
        lead.url.replace('https://', 'http://www.')
      ];

      let loaded = false;
      for (const u of tryUrls) {
        try {
          const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
          console.log(`Loaded ${u} -> status: ${resp?.status()}, final URL: ${page.url()}`);
          loaded = true;
          break;
        } catch (e) {
          // ignore
        }
      }

      if (!loaded) {
        console.log(`STATUS: INACCESSIBLE on all URL variants`);
        await page.close();
        continue;
      }

      await new Promise(r => setTimeout(r, 2000));
      const pageTitle = await page.title();
      console.log(`Title: ${pageTitle}`);

      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim().replace(/\s+/g, ' '), href: a.href }))
          .filter(a => /contact|reach|quote|touch|estimate/i.test(a.text) || /contact|reach|quote|touch|estimate/i.test(a.href))
          .slice(0, 10);
      });
      console.log(`Contact Links:`, JSON.stringify(contactLinks));

      let forms = await inspectForms(page);
      console.log(`Homepage forms count: ${forms.length}`);
      for (const f of forms) {
        console.log(`Form #${f.index}: action=${f.action}, id=${f.id}, class=${f.className}`);
        console.log(`  Visible inputs:`, JSON.stringify(f.visibleInputs));
        console.log(`  Buttons:`, f.buttons);
        console.log(`  CAPTCHA: Turnstile=${f.hasTurnstile}, reCAPTCHA=${f.hasRecaptcha}, hCaptcha=${f.hasHcaptcha}`);
      }

      // Check iframes
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(i => ({ src: i.src, id: i.id, name: i.name }));
      });
      if (iframes.length > 0) {
        console.log(`Iframes:`, JSON.stringify(iframes));
      }

      // If no valid form on homepage, check contact link
      const validForm = forms.find(f => f.visibleInputs.length >= 2);
      if (!validForm && contactLinks.length > 0) {
        const cUrl = contactLinks[0].href;
        console.log(`\nNavigating to contact page: ${cUrl}`);
        try {
          await page.goto(cUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          console.log(`Contact page title: ${await page.title()}`);
          const cForms = await inspectForms(page);
          console.log(`Contact page forms count: ${cForms.length}`);
          for (const f of cForms) {
            console.log(`Contact Form #${f.index}: action=${f.action}, id=${f.id}, class=${f.className}`);
            console.log(`  Visible inputs:`, JSON.stringify(f.visibleInputs));
            console.log(`  Buttons:`, f.buttons);
            console.log(`  CAPTCHA: Turnstile=${f.hasTurnstile}, reCAPTCHA=${f.hasRecaptcha}, hCaptcha=${f.hasHcaptcha}`);
          }
          const cBody = await page.evaluate(() => document.body?.innerText?.slice(0, 400).replace(/\s+/g, ' '));
          console.log(`Contact page text snippet: ${cBody}`);
        } catch (ce) {
          console.log(`Failed loading contact page: ${ce.message}`);
        }
      }

    } catch (err) {
      console.log(`Error on #${lead.id}: ${err.message}`);
    } finally {
      try { await page.close(); } catch (_) {}
    }
  }

  await browser.close();
  console.log(`\nDONE INSPECTING ALL 10 LEADS.`);
}

run();
