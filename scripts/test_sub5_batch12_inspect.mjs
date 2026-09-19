import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4489, name: 'Point to Point Environmental', url: 'https://p2penvironmental.com', altUrl: 'http://p2penvironmental.com' },
  { id: 4490, name: 'Newsome Engineering & Consulting, Inc.', url: 'https://newsomeengineering.com' },
  { id: 4491, name: 'PGH Wong Engineering', url: 'https://pghwong.com', altUrl: 'http://pghwong.com' },
  { id: 4492, name: 'Barnett Consulting Engineers', url: 'https://bce-eng.com' },
  { id: 4493, name: 'Zoltan Consulting Inc', url: 'https://zoltanconsultinginc.com' },
  { id: 4494, name: 'Cobb Tool, Inc.', url: 'https://cobbtool.com' },
  { id: 4496, name: 'Arbiser Machine Inc.', url: 'https://arbisermachine.com' },
  { id: 4497, name: 'MachineShop ATL', url: 'https://machineshopatl.com' },
  { id: 4498, name: 'PF CNC Machining', url: 'https://pfcncmachining.com' },
];

async function inspectLead(browser, lead) {
  console.log(`\n========================================`);
  console.log(`Analyzing #${lead.id}: ${lead.name} (${lead.url})`);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    let resp;
    try {
      resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.log(`  Initial goto failed: ${e.message}`);
      if (lead.altUrl) {
        console.log(`  Trying altUrl: ${lead.altUrl}`);
        resp = await page.goto(lead.altUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
    }

    console.log(`  Final URL: ${page.url()}`);
    console.log(`  Response Status: ${resp ? resp.status() : 'N/A'}`);

    await new Promise(r => setTimeout(r, 2000));

    const contactLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .map(a => ({ href: a.href, text: (a.innerText || '').trim() }))
        .filter(a => /contact|reach|quote|touch|estimate/i.test(a.text) || /contact|quote/i.test(a.href))
        .map(a => `${a.text} -> ${a.href}`);
    });
    console.log(`  Contact links found (${contactLinks.length}):`, [...new Set(contactLinks)].slice(0, 8));

    const forms = await getForms(page);
    console.log(`  Forms on current page (${forms.length}):`);
    for (const f of forms) {
      console.log(`    Form #${f.idx} (id: ${f.id}, class: ${f.className}, action: ${f.action})`);
      for (const inp of f.inputs) {
        console.log(`      [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" req=${inp.required} visible=${inp.visible}`);
      }
    }

    if (forms.length === 0 && contactLinks.length > 0) {
      const distinctUrls = [...new Set(contactLinks.map(l => l.split(' -> ')[1]))].filter(u => u && u.startsWith('http') && u !== page.url());
      for (const cUrl of distinctUrls.slice(0, 3)) {
        console.log(`  Navigating to contact page: ${cUrl}`);
        try {
          await page.goto(cUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          const subForms = await getForms(page);
          console.log(`    Subpage Forms (${subForms.length}):`);
          for (const f of subForms) {
            console.log(`      Form #${f.idx} (id: ${f.id}, class: ${f.className}, action: ${f.action})`);
            for (const inp of f.inputs) {
              console.log(`        [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" req=${inp.required} visible=${inp.visible}`);
            }
          }
          if (subForms.length > 0) break;
        } catch (subErr) {
          console.log(`    Subpage navigation failed: ${subErr.message}`);
        }
      }
    }

  } catch (err) {
    console.log(`  Error: ${err.message}`);
  } finally {
    try { await page.close(); } catch(e){}
  }
}

async function getForms(page) {
  return await page.evaluate(() => {
    const isVisible = (elem) => {
      if (!elem) return false;
      const style = window.getComputedStyle(elem);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = elem.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    return Array.from(document.querySelectorAll('form')).map((f, i) => ({
      idx: i,
      action: f.action,
      method: f.method,
      id: f.id,
      className: f.className,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
        tag: inp.tagName.toLowerCase(),
        type: inp.type || '',
        name: inp.name || '',
        id: inp.id || '',
        placeholder: inp.placeholder || '',
        required: inp.required,
        visible: isVisible(inp)
      }))
    }));
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors']
  });

  for (const lead of leads) {
    await inspectLead(browser, lead);
  }

  await browser.close();
})();
