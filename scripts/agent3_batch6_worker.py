import asyncio
import sqlite3
import time
import os
from playwright.async_api import async_playwright

CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
if not os.path.exists(CHROME_BIN):
    CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

OUTREACH_PROFILE = {
    'fullName': 'Pamela Jameson',
    'firstName': 'Pamela',
    'lastName': 'Jameson',
    'email': 'pamela.jameson@nortiheastprecision.com',
    'phone': '708-568-3708',
    'company': 'Northeast Precision Machinery, Inc.',
    'subject': 'Exploring Collaboration Opportunities',
    'address': '100 Main St',
    'city': 'Los Angeles',
    'state': 'CA',
    'zip': '90001',
    'message': """Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson"""
}

SUCCESS_SIGNALS = [
    'thank you',
    'thanks for contacting',
    'thanks for reaching out',
    'message has been sent',
    'we have received your',
    'we will contact you',
    'will get back to you',
    'submission was successful',
    'submitted successfully',
    'in touch shortly',
    'inquiry received',
    'form received',
    'successfully submitted',
    'your message was sent',
    'we will be in touch',
    'sent successfully',
    'request received',
    'quote requested'
]

def normalize_url(url):
    if not url:
        return None
    clean = url.strip()
    if not clean.startswith('http://') and not clean.startswith('https://'):
        clean = 'https://' + clean
    return clean

def save_lead_result(lead_id, status, note):
    conn = sqlite3.connect('data/leads.db')
    c = conn.cursor()
    c.execute('SELECT notes FROM leads WHERE id = ?', (lead_id,))
    row = c.fetchone()
    current_notes = row[0] if row and row[0] else ''
    new_notes = f"{current_notes} | {note}" if current_notes else note
    
    c.execute('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (new_notes, status, lead_id))
    action = 'sent' if status == 'contacted' else 'bounced'
    c.execute('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', (lead_id, action, note))
    conn.commit()
    conn.close()

async def process_single_lead(p, lead_id, company_name, raw_url):
    start_time = time.time()
    url = normalize_url(raw_url)
    print(f"\n[Agent-3] 🌐 Processing: #{lead_id} {company_name} ({url})")

    browser = None
    try:
        browser = await p.chromium.launch(
            executable_path=CHROME_BIN,
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--ignore-certificate-errors']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
            ignore_https_errors=True
        )
        page = await context.new_page()

        # 1. Navigate
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=18000)
        except Exception as e:
            if url.startswith('https://'):
                try:
                    http_url = url.replace('https://', 'http://')
                    await page.goto(http_url, wait_until='domcontentloaded', timeout=15000)
                except Exception:
                    elapsed = round(time.time() - start_time, 1)
                    print(f"[Agent-3] ❌ #{lead_id} Inaccessible ({elapsed}s)")
                    save_lead_result(lead_id, 'unable_to_reach', 'Site inaccessible / connection timeout')
                    await browser.close()
                    return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': 'Site Inaccessible'}
            else:
                elapsed = round(time.time() - start_time, 1)
                print(f"[Agent-3] ❌ #{lead_id} Inaccessible ({elapsed}s)")
                save_lead_result(lead_id, 'unable_to_reach', 'Site inaccessible / connection timeout')
                await browser.close()
                return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': 'Site Inaccessible'}

        await asyncio.sleep(2)
        current_url = page.url

        # Check WAF / Cloudflare block
        page_title = (await page.title()).lower()
        body_text = (await page.evaluate("() => document.body ? document.body.innerText : ''")).lower()
        if 'attention required' in page_title or 'just a moment' in page_title or 'checking your browser' in body_text or 'error: the request could not be satisfied' in body_text:
            elapsed = round(time.time() - start_time, 1)
            print(f"[Agent-3] ⚠️ #{lead_id} Blocked by Security WAF ({elapsed}s)")
            save_lead_result(lead_id, 'unable_to_reach', f'Checked {current_url}: Blocked by Security WAF')
            await browser.close()
            return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': 'Security WAF Block'}

        # Look for contact form or contact page link
        inputs_count = await page.evaluate("() => document.querySelectorAll('input:not([type=\"hidden\"]), textarea').length")
        contact_page_url = current_url

        if inputs_count < 2:
            contact_link = await page.evaluate("""() => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                const keywords = ['contact', 'get-in-touch', 'inquire', 'request-quote', 'quote', 'estimate'];
                for (const k of keywords) {
                    const match = links.find(a => {
                        const href = (a.getAttribute('href') || '').toLowerCase();
                        const text = (a.innerText || '').toLowerCase();
                        return (text.includes(k) || href.includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:');
                    });
                    if (match) return match.href;
                }
                return null;
            }""")
            
            if contact_link:
                try:
                    await page.goto(contact_link, wait_until='domcontentloaded', timeout=18000)
                    await asyncio.sleep(2)
                    contact_page_url = page.url
                except Exception:
                    pass

        # Check captcha & inputs
        detection = await page.evaluate("""() => {
            const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], input.Captcha3940957316__checkbox');
            let captchaName = null;
            if (captchas.length > 0) {
                const src = captchas[0].getAttribute('src') || '';
                const cls = captchas[0].className || '';
                if (src.includes('recaptcha') || cls.includes('recaptcha')) captchaName = 'Google reCAPTCHA';
                else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captchaName = 'hCaptcha';
                else if (src.includes('turnstile') || cls.includes('turnstile')) captchaName = 'Cloudflare Turnstile';
                else captchaName = 'Captcha Challenge';
            }
            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');
            return { hasInputs: inputs.length > 0, captchaName, count: inputs.length };
        }""")

        if not detection['hasInputs']:
            elapsed = round(time.time() - start_time, 1)
            print(f"[Agent-3] ℹ️ #{lead_id} No form found ({elapsed}s)")
            save_lead_result(lead_id, 'unable_to_reach', f'Checked {contact_page_url}: No online web form found')
            await browser.close()
            return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': 'No Web Form Found'}

        if detection['captchaName']:
            elapsed = round(time.time() - start_time, 1)
            print(f"[Agent-3] ⚠️ #{lead_id} Captcha: {detection['captchaName']} ({elapsed}s)")
            save_lead_result(lead_id, 'unable_to_reach', f'Contact form: {contact_page_url} (Autofilled; blocked by {detection["captchaName"]})')
            await browser.close()
            return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': f"Blocked by {detection['captchaName']}"}

        # Autofill form fields
        await page.evaluate("""(p) => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
            for (const el of inputs) {
                const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
                const name = (el.getAttribute('name') || '').toLowerCase();
                const id = (el.getAttribute('id') || '').toLowerCase();
                const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
                const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
                const combined = `${name} ${id} ${placeholder} ${labelText}`;

                if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes') || combined.includes('requirement')) {
                    el.value = p.message;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
                    el.value = p.email;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
                    el.value = p.phone;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('first') || combined.includes('fname')) {
                    el.value = p.firstName;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('last') || combined.includes('lname')) {
                    el.value = p.lastName;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('name') && !combined.includes('company')) {
                    el.value = p.fullName;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
                    el.value = p.company;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('subject') || combined.includes('topic') || combined.includes('title')) {
                    el.value = p.subject;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (combined.includes('address')) {
                    el.value = p.address;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (type === 'checkbox' && !combined.includes('captcha')) {
                    el.checked = true;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }""", OUTREACH_PROFILE)

        init_url = page.url

        # Click submit
        try:
            await page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
                const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', 'request a consultation'];
                for (const btn of buttons) {
                    const text = (btn.innerText || btn.value || '').toLowerCase().trim();
                    const type = (btn.getAttribute('type') || '').toLowerCase();
                    if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
                        btn.click();
                        return;
                    }
                }
                const form = document.querySelector('form');
                if (form) {
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.submit();
                }
            }""")
        except Exception:
            pass

        await asyncio.sleep(5)

        # Verification check
        verification = await page.evaluate("""(data) => {
            const signals = data.signals;
            const initUrl = data.initUrl;
            const body = document.body ? document.body.innerText.toLowerCase() : '';
            const current = window.location.href;
            const urlChanged = current !== initUrl && !current.includes('#');

            const successContainers = document.querySelectorAll(
                '.wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
                '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
                '.elementor-message-success, [data-testid="form-submitted"], [role="alert"], ' +
                '.alert-success, .success-message, .submitted-message, .hs-form-submitted, .nf-response-msg'
            );

            for (const el of successContainers) {
                const txt = (el.innerText || '').toLowerCase();
                for (const sig of signals) {
                    if (txt.includes(sig)) {
                        return { isSuccess: true, phrase: `Element: "${txt.trim()}"` };
                    }
                }
            }

            for (const sig of signals) {
                if (body.includes(sig)) {
                    return { isSuccess: true, phrase: sig };
                }
            }

            if (urlChanged && (current.includes('thank') || current.includes('success') || current.includes('confirm'))) {
                return { isSuccess: true, phrase: 'Redirected to confirmation page: ' + current };
            }

            return { isSuccess: false, phrase: '' };
        }""", {'signals': SUCCESS_SIGNALS, 'initUrl': init_url})

        elapsed = round(time.time() - start_time, 1)

        if verification['isSuccess']:
            print(f"[Agent-3] ✅ #{lead_id} SUBMISSION CONFIRMED: \"{verification['phrase']}\" ({elapsed}s)")
            save_lead_result(lead_id, 'contacted', f'Contact form: {contact_page_url} (Autofilled & verified: {verification["phrase"]})')
            await browser.close()
            return {'id': lead_id, 'company': company_name, 'status': 'contacted', 'time': elapsed, 'result': f"Confirmed: {verification['phrase']}"}
        else:
            print(f"[Agent-3] ⚠️ #{lead_id} Unconfirmed post-submission ({elapsed}s)")
            save_lead_result(lead_id, 'unable_to_reach', f'Contact form: {contact_page_url} (No explicit confirmation detected post-submission)')
            await browser.close()
            return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': 'No explicit confirmation detected post-submission'}

    except Exception as e:
        elapsed = round(time.time() - start_time, 1)
        print(f"[Agent-3] ❌ #{lead_id} Error: {str(e)} ({elapsed}s)")
        save_lead_result(lead_id, 'unable_to_reach', f'Error: {str(e).splitlines()[0]}')
        if browser:
            await browser.close()
        return {'id': lead_id, 'company': company_name, 'status': 'unable_to_reach', 'time': elapsed, 'result': f"Error: {str(e)}"}

async def main():
    lead_ids = [660, 661, 663, 665, 666, 668, 669, 670, 671, 674]
    conn = sqlite3.connect('data/leads.db')
    c = conn.cursor()
    placeholders = ','.join('?' for _ in lead_ids)
    c.execute(f'SELECT id, company_name, website FROM leads WHERE id IN ({placeholders}) ORDER BY id ASC', lead_ids)
    leads = c.fetchall()
    conn.close()

    print(f"\n🚀 [Agent-3] Starting Chromium Playwright Worker for Batch 6 ({len(leads)} leads): {lead_ids}...")
    
    async with async_playwright() as p:
        results = []
        for lead in leads:
            lead_id, company, website = lead
            res = await process_single_lead(p, lead_id, company, website)
            results.append(res)
            await asyncio.sleep(1)

    print(f"\n========================================")
    print(f"🏁 [Agent-3] Completed: {len(results)} Leads Processed")
    for r in results:
        print(f"Lead #{r['id']:<4} | {r['company'][:35]:<35} | {r['status']:<15} | {r['time']}s | {r['result']}")

if __name__ == '__main__':
    asyncio.run(main())
