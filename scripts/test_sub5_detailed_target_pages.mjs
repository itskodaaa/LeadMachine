import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const targets = [
  { id: 4051, name: 'Fabri Equipment Corporation', url: 'https://fabriequipment.com' },
  { id: 4052, name: 'GPE Engineering & General Contractor Corp', url: 'https://gpeeng.com' },
  { id: 4053, name: 'Unlimited Electrical Solutions LLC', url: 'https://unlimitedelectricalsolutions.com/contact-us/' },
  { id: 4054, name: 'USA CNC Machining', url: 'https://www.usacncmachining.com/' },
  { id: 4055, name: 'Sigma Industrial Equipment USA Inc', url: 'https://www.sigmaequip.com/contact' },
  { id: 4056, name: 'Aerospace Center, Corp', url: 'https://www.acc.aero/aerospace-center-corp-contact-us-miami-israel' },
  { id: 4057, name: 'SAEG Engineering Group, LLC', url: 'https://saeg.daikinlatam.com/contacto/' },
  { id: 4058, name: 'Hanson Professional Services Inc.', url: 'https://www.hanson-inc.com/contact-us/' },
  { id: 4059, name: 'Airborne Maintenance And Engineering Services', url: 'https://www.airbornemx.com/contact-us' },
  { id: 4060, name: 'Dedienne Aerospace LLC', url: 'https://dedienne-aero.com/contact/' }
];

async function inspectSites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    ]
  });

  for (const t of targets) {
    console.log(`\n======================================================`);
    console.log(`[#${t.id}] ${t.name}: Testing ${t.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    page.on('dialog', async d => { console.log(`[#${t.id}] Dialog: ${d.message()}`); await d.dismiss(); });

    try {
      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[#${t.id}] Loaded: status ${resp ? resp.status() : 'null'}, url: ${page.url()}`);
      
      // Let any dynamic JS settle
      await new Promise(r => setTimeout(r, 2000));

      const analysis = await page.evaluate(() => {
        const title = document.title;
        const text = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const visibleInputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(inp => ({
            tag: inp.tagName,
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder,
            required: inp.required,
            visible: inp.offsetWidth > 0 && inp.offsetHeight > 0
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button')).map(b => ({
            tag: b.tagName,
            type: b.type,
            text: (b.innerText || b.value || '').trim()
          }));
          return {
            formIdx: i,
            id: f.id,
            className: f.className,
            action: f.action,
            visibleInputs,
            buttons
          };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          tag: c.tagName,
          src: c.getAttribute('src') || '',
          cls: c.className || '',
          sitekey: c.getAttribute('data-sitekey') || ''
        }));

        // check emails and phones mentioned in body
        const emails = Array.from(new Set((text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])));
        const phones = Array.from(new Set((text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])));

        return {
          title,
          formsCount: forms.length,
          forms,
          captchas,
          emails: emails.slice(0, 5),
          phones: phones.slice(0, 5)
        };
      });

      console.log(`[#${t.id}] Title: ${analysis.title}`);
      console.log(`[#${t.id}] Forms Count: ${analysis.formsCount}`);
      console.log(`[#${t.id}] Captchas:`, JSON.stringify(analysis.captchas));
      console.log(`[#${t.id}] Emails:`, analysis.emails);
      console.log(`[#${t.id}] Phones:`, analysis.phones);
      for (const f of analysis.forms) {
        console.log(`  -> Form #${f.formIdx} (${f.id || f.className}): ${f.visibleInputs.length} visible inputs, ${f.buttons.length} buttons`);
        for (const inp of f.visibleInputs) {
          console.log(`     - [${inp.tag} ${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" required=${inp.required}`);
        }
        for (const b of f.buttons) {
          console.log(`     - Button [${b.tag} ${b.type}]: "${b.text}"`);
        }
      }

    } catch (e) {
      console.log(`[#${t.id}] ERROR: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectSites();
