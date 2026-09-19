import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const testLeads = [
  { id: 4478, name: 'Moore Bass', url: 'https://moorebass.com' },
  { id: 4480, name: 'Land Engineering', url: 'https://land.engineering' },
  { id: 4481, name: 'Falcon Design', url: 'https://falcondesignconsultants.com' },
  { id: 4482, name: 'SAM', url: 'https://sam.biz' },
  { id: 4483, name: 'Robinett', url: 'https://robinettconsulting.com' },
  { id: 4485, name: 'CMS', url: 'https://cmsnatl.com' },
  { id: 4486, name: 'DRMP', url: 'https://drmp.com' },
  { id: 4487, name: 'Mc Elhenny', url: 'https://mcengr.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of testLeads) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${lead.id} (${lead.name}): ${lead.url}`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Home load timeout/err:', e.message));
      
      const homeInfo = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: (a.innerText || '').trim(), href: a.href }));
        const contactLinks = links.filter(l => /contact|reach|touch|get-in-touch|talk/i.test(l.text || l.href));
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, id: i.id }))
        }));
        return { contactLinks: contactLinks.slice(0, 5), formsCount: forms.length, forms };
      });

      console.log('Homepage Forms:', homeInfo.formsCount);
      console.log('Contact links:', homeInfo.contactLinks.map(l => `${l.text} -> ${l.href}`));

      let contactUrl = homeInfo.contactLinks[0]?.href;
      if (contactUrl && contactUrl !== page.url()) {
        console.log(`Navigating to contact url: ${contactUrl}`);
        await page.goto(contactUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Contact load err:', e.message));
      }

      const pageDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          class: f.className,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }))
        }));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        const captchas = iframes.filter(src => /captcha|turnstile|recaptcha|hcaptcha|challenge/i.test(src));
        return {
          currentUrl: window.location.href,
          forms,
          captchas,
          bodySnippet: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 300)
        };
      });

      console.log('Current URL:', pageDetails.currentUrl);
      console.log('Forms found:', pageDetails.forms.length);
      for (const [i, f] of pageDetails.forms.entries()) {
        console.log(`Form #${i} (id="${f.id}", class="${f.class}"):`);
        for (const inp of f.inputs) {
          console.log(`  [${inp.tag}] type=${inp.type} name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" req=${inp.required} vis=${inp.visible}`);
        }
      }
      console.log('Captchas detected:', pageDetails.captchas);
    } catch (e) {
      console.log(`Error processing ${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
