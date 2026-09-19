import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function launchBrowser() {
  return await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

const leads = [
  { id: 4395, name: 'Shields Engineering Group Inc', url: 'https://shieldseng.com' },
  { id: 4396, name: 'Sheats Structural Consulting', url: 'https://sheatsconsulting.com' },
  { id: 4397, name: 'EQUILIBRIUM', url: 'https://equilibrium-eq.com' },
  { id: 4398, name: 'DV+M Structural', url: 'https://dvmstructural.com' },
  { id: 4399, name: 'EUA', url: 'https://eua.com' },
  { id: 4402, name: 'CPL: Architecture – Engineering – Planning', url: 'https://cplteam.com' },
  { id: 4403, name: 'Atlanta Engineering and Manufacturing', url: 'https://atlantaem.com' },
  { id: 4404, name: 'BAA Mechanical Engineers Inc', url: 'https://baamechanical.com' },
  { id: 4405, name: 'Converge Engineering', url: 'https://convergeengineers.com' }
];

async function inspectLeads() {
  const browser = await launchBrowser();
  for (const lead of leads) {
    console.log(`\n=================== Inspecting #${lead.id} ${lead.name} (${lead.url}) ===================`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Loaded URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            tag: inp.tagName.toLowerCase(),
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder
          }));
          const action = f.getAttribute('action') || '';
          return { index: i, action, inputsCount: inputs.length, inputs };
        });

        const contactLinks = Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(a => a.href && (a.text.toLowerCase().includes('contact') || a.href.toLowerCase().includes('contact')));

        const textSample = document.body ? document.body.innerText.substring(0, 500).replace(/\s+/g, ' ') : '';

        return { forms, contactLinks, textSample };
      });

      console.log(`Forms found on root:`, JSON.stringify(info.forms, null, 2));
      console.log(`Contact links:`, JSON.stringify(info.contactLinks.slice(0, 5), null, 2));

      // If contact links exist, check the primary contact page
      if (info.contactLinks.length > 0) {
        const contactHref = info.contactLinks[0].href;
        if (contactHref !== page.url()) {
          console.log(`Navigating to contact page: ${contactHref}`);
          try {
            await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const cInfo = await page.evaluate(() => {
              const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
                const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
                  tag: inp.tagName.toLowerCase(),
                  type: inp.type,
                  name: inp.name,
                  id: inp.id,
                  placeholder: inp.placeholder
                }));
                return { index: i, action: f.getAttribute('action') || '', inputsCount: inputs.length, inputs };
              });
              const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => iframe.src);
              const textSample = document.body ? document.body.innerText.substring(0, 300).replace(/\s+/g, ' ') : '';
              return { forms, iframes, textSample };
            });
            console.log(`Contact page forms:`, JSON.stringify(cInfo.forms, null, 2));
            console.log(`Contact page iframes:`, cInfo.iframes);
            console.log(`Contact page text sample:`, cInfo.textSample);
          } catch (err) {
            console.log(`Failed loading contact page: ${err.message}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error visiting ${lead.url}:`, e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

inspectLeads();
