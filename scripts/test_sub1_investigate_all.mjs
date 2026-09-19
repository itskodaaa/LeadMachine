import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3651, name: 'Atom Engineering', url: 'https://atomengineers.com' },
  { id: 3652, name: 'Architect Builder Group', url: 'https://architectbuildergroup.com' },
  { id: 3653, name: 'Capstone Civil Engineering', url: 'https://capstonecivilengineering.com' },
  { id: 3654, name: 'REI Engineers', url: 'https://reiengineers.com' },
  { id: 3655, name: 'Lynch Mykins', url: 'https://lynchmykins.com' },
  { id: 3656, name: 'Falcone Crawl Space', url: 'https://falconecrawlspace.com' },
  { id: 3658, name: 'Ordcha Engineering', url: 'https://ordcha.com' },
  { id: 3659, name: 'Barnhart Crane', url: 'https://barnhartcrane.com' },
  { id: 3660, name: 'Charlotte Mechanical', url: 'https://charlottemechanical.com' },
  { id: 3661, name: 'RMF Engineering', url: 'https://rmf.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const l of leads) {
    console.log(`\n========================================\n[INSPECT] #${l.id} ${l.name} (${l.url})`);
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      
      const tryUrls = [
        l.url,
        l.url.replace('https://', 'https://www.'),
        l.url.replace('https://', 'http://'),
        l.url.replace('https://', 'http://www.')
      ];

      let loaded = false;
      for (const u of tryUrls) {
        try {
          await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
          console.log(`Loaded: ${u} -> final url: ${page.url()}`);
          break;
        } catch (e) {
          // ignore and try next
        }
      }

      if (!loaded) {
        console.log(`STATUS: Totally inaccessible across all URL variants`);
        await page.close();
        continue;
      }

      const title = await page.title();
      const bodySnippet = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
      console.log(`Title: "${title}" | Body snippet: ${JSON.stringify(bodySnippet.replace(/\s+/g, ' '))}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim().replace(/\s+/g, ' '), href: a.href }))
          .filter(a => /contact|inquir|quote|get-in-touch|reach/i.test(a.text) || /contact|inquir|quote|get-in-touch|reach/i.test(a.href))
          .slice(0, 10);
      });
      console.log(`Contact links:`, JSON.stringify(links));

      // Inspect forms on this page
      const checkForms = async (p) => {
        return await p.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map((f, i) => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
              tag: inp.tagName.toLowerCase(),
              type: inp.type,
              name: inp.name,
              id: inp.id,
              placeholder: inp.placeholder,
              required: inp.required
            }));
            const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
            const hasTurnstile = !!f.querySelector('.cf-turnstile, iframe[src*="turnstile"], [data-sitekey]');
            const hasRecaptcha = !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
            const hasHcaptcha = !!f.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
            return {
              index: i,
              action: f.action,
              id: f.id,
              className: f.className,
              inputCount: inputs.length,
              inputs,
              buttons,
              hasTurnstile,
              hasRecaptcha,
              hasHcaptcha
            };
          });
        });
      };

      let forms = await checkForms(page);
      console.log(`Page forms count: ${forms.length}`);
      if (forms.length > 0) {
        console.log(`Forms detail:`, JSON.stringify(forms, null, 2));
      }

      // If no form with >= 2 inputs or if there's a dedicated contact link, also check the contact link
      const validForm = forms.find(f => f.inputs.filter(inp => inp.type !== 'hidden').length >= 2);
      if (!validForm && links.length > 0) {
        const cUrl = links[0].href;
        console.log(`Navigating to contact link: ${cUrl}`);
        try {
          await page.goto(cUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          const cForms = await checkForms(page);
          console.log(`Contact page forms count: ${cForms.length}`);
          if (cForms.length > 0) {
            console.log(`Contact page forms:`, JSON.stringify(cForms, null, 2));
          } else {
            const cBody = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
            console.log(`Contact page body snippet: ${JSON.stringify(cBody.replace(/\s+/g, ' '))}`);
          }
        } catch (ce) {
          console.log(`Failed to navigate to contact link: ${ce.message}`);
        }
      }

      await page.close();
    } catch (err) {
      console.log(`Error processing #${l.id}: ${err.message}`);
      if (page) {
        try { await page.close(); } catch (_) {}
      }
    }
  }

  await browser.close();
}

run();
