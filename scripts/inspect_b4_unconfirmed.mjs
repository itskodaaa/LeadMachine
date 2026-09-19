import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'We are interested in your services and would like to request that a representative contact us to discuss potential collaboration and upcoming project quotes. Thank you.'
};

const SITES = [
  { id: 5119, company: 'MNS Engineers',        url: 'https://mnsengineers.com' },
  { id: 5124, company: 'AC Manufacturing',      url: 'https://acmanufacturing.com/contact/' },
  { id: 5125, company: 'Advanced Tek Machining',url: 'https://advtekmachining.com' },
  { id: 5126, company: 'NTL Precision Machining',url: 'https://ntlprecision.com' },
  { id: 5127, company: 'A1J Technologies',       url: 'https://a1jt.com/contact/' },
  { id: 5128, company: 'Halcyon Manufacturing',  url: 'https://www.halcyonmfg.com/contact' }
];

const CONFIRM = /thank\s*you|message\s*received|we.{0,10}received|in\s*touch|inquiry\s*submitted|sent\s*successfully|success[^ful]{0,5}[!\s]|will\s*contact|get\s*back|form\s*submitted/i;

async function typeInField(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (!el) return false;
    await el.click({clickCount: 3});
    await el.type(value, {delay: 40});
    return true;
  } catch(e) { return false; }
}

async function inspect(browser, site) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  page.setDefaultTimeout(15000);
  const t0 = Date.now();

  try {
    console.log(`\n--- #${site.id} ${site.company} ---`);
    await page.goto(site.url, {waitUntil: 'networkidle2', timeout: 20000});
    const url0 = page.url();
    console.log(`  URL: ${url0} | Title: ${await page.title()}`);

    let forms = await page.$$('form');
    console.log(`  Forms on landing: ${forms.length}`);

    if (forms.length === 0) {
      const links = await page.$$eval('a', as =>
        as.filter(a => /contact/i.test(a.href + a.textContent) && a.href && !a.href.startsWith('mailto') && !a.href.startsWith('tel'))
          .map(a => a.href)
      );
      if (links.length > 0) {
        console.log(`  → Navigating to contact: ${links[0]}`);
        await page.goto(links[0], {waitUntil: 'networkidle2', timeout: 15000});
        forms = await page.$$('form');
        console.log(`  Forms after nav: ${forms.length}`);
      }
    }

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasCaptcha = /captcha|recaptcha|hcaptcha/i.test(bodyText);
    const mailtoLinks = await page.$$eval('a[href^="mailto:"]', as => as.map(a => a.href));
    console.log(`  CAPTCHA: ${hasCaptcha} | Mailto: [${mailtoLinks.join(', ')}]`);

    if (forms.length === 0) {
      return { id: site.id, confirmed: false, hasCaptcha, mailtoOnly: mailtoLinks.length > 0, forms: 0, note: mailtoLinks.length > 0 ? 'mailto-only contact' : 'No form found', elapsed: ((Date.now()-t0)/1000).toFixed(1) };
    }

    // Get form fields
    const formDetails = await page.$$eval('form', fs => fs.slice(0,1).map(f => ({
      action: f.action, method: f.method,
      fields: [...f.querySelectorAll('input,textarea,select')].map(e => ({
        tag: e.tagName, type: e.type||'', name: e.name||'', id: e.id||'',
        placeholder: e.placeholder||'', required: e.required
      }))
    })));
    
    const fd = formDetails[0];
    console.log(`  Form action: ${fd.action}`);
    console.log(`  Fields: ${JSON.stringify(fd.fields.map(f => `${f.tag}[name=${f.name}|id=${f.id}|type=${f.type}]`))}`);

    // Fill each field
    for (const f of fd.fields) {
      if (['hidden','submit','button','checkbox','radio','file'].includes(f.type)) continue;
      const lc = (f.name + f.id + f.placeholder).toLowerCase();
      let val = null;
      if (f.tag === 'TEXTAREA' || lc.includes('message') || lc.includes('comment') || lc.includes('notes')) val = PROFILE.message;
      else if (lc.includes('email')) val = PROFILE.email;
      else if (lc.includes('phone') || lc.includes('tel') || lc.includes('fax')) val = PROFILE.phone;
      else if (lc.includes('company') || lc.includes('organ') || lc.includes('business') || lc.includes('firm')) val = PROFILE.company;
      else if (lc.includes('first') || lc.includes('fname')) val = 'Pamela';
      else if (lc.includes('last') || lc.includes('lname') || lc.includes('surname')) val = 'Jameson';
      else if (lc.includes('name')) val = PROFILE.name;
      else if (lc.includes('subject') || lc.includes('topic')) val = 'Collaboration Inquiry';
      if (!val) continue;
      const sel = f.id ? `#${CSS.escape(f.id)}` : f.name ? `[name="${f.name}"]` : null;
      if (sel) {
        const ok = await typeInField(page, sel, val);
        console.log(`    Fill ${sel}: ${ok ? 'OK' : 'FAIL'}`);
      }
    }

    // Submit
    const btn = await page.$([
      'form button[type=submit]','form input[type=submit]',
      'form .wpcf7-submit','form .submit-btn','form button.btn',
      'form .gform_button','form button:not([type])'
    ].join(','));

    if (!btn) {
      console.log(`  No submit button found`);
      return { id: site.id, confirmed: false, hasCaptcha, forms: 1, note: 'Form found but no submit button', elapsed: ((Date.now()-t0)/1000).toFixed(1) };
    }

    const btnText = await page.evaluate(b => b.textContent.trim(), btn);
    console.log(`  Submit button text: "${btnText}"`);

    await Promise.all([
      page.waitForNavigation({timeout: 8000, waitUntil: 'networkidle2'}).catch(() => {}),
      btn.click()
    ]);

    await new Promise(r => setTimeout(r, 3000));

    const postText = await page.evaluate(() => document.body.innerText);
    const postUrl = page.url();
    const urlChanged = postUrl !== url0;
    const confirmed = CONFIRM.test(postText);

    console.log(`  Post-submit URL: ${postUrl} (changed: ${urlChanged})`);
    console.log(`  Confirmed by DOM: ${confirmed}`);

    if (confirmed) {
      const match = postText.match(CONFIRM);
      console.log(`  ✅ Confirmation text: "${match?.[0]}"  context: ${postText.substring(Math.max(0, postText.indexOf(match?.[0]||'')-30), postText.indexOf(match?.[0]||'')+150)}`);
    }

    return {
      id: site.id, confirmed, urlChanged, hasCaptcha, postUrl,
      forms: 1, confirmSnippet: confirmed ? postText.substring(0,300) : '',
      note: confirmed ? 'Form submitted with confirmation' : urlChanged ? `Submitted; redirected to ${postUrl}` : 'Submitted but no confirmation detected',
      elapsed: ((Date.now()-t0)/1000).toFixed(1)
    };

  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
    return { id: site.id, confirmed: false, error: e.message, elapsed: ((Date.now()-t0)/1000).toFixed(1) };
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800']
  });

  const results = [];
  for (const s of SITES) {
    const r = await inspect(browser, s);
    results.push(r);
  }

  await browser.close();

  console.log('\n\n========== FINAL RESULTS ==========');
  console.table(results.map(r => ({id: r.id, confirmed: r.confirmed, urlChanged: r.urlChanged, hasCaptcha: r.hasCaptcha, note: r.note, elapsed: r.elapsed})));
  console.log('\nJSON:' + JSON.stringify(results));
})();
