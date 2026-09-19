#!/usr/bin/env python3
"""
LeadFlow Google Maps Engineering Leads Extractor
Extracts US Engineering & Manufacturing companies from Google Maps and imports them into leads.db
"""

import os
import sys
import re
import json
import time
import sqlite3
import asyncio
import urllib.parse
from datetime import datetime
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "leads.db")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

US_STATES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
    "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
    "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY"
}

STATE_ABBREVS = set(US_STATES.values())

TARGET_QUERIES = [
    # Precision & Manufacturing Engineering (high invoice value)
    "precision engineering company in Houston TX",
    "precision engineering company in Chicago IL",
    "precision engineering company in Los Angeles CA",
    "precision engineering company in Detroit MI",
    "precision engineering company in Cleveland OH",
    "precision engineering company in Charlotte NC",
    "precision engineering company in Atlanta GA",
    "precision engineering company in Dallas TX",
    
    # Mechanical & Industrial Engineering Firms
    "mechanical engineering company in Houston TX",
    "mechanical engineering firm in Dallas TX",
    "mechanical engineering firm in Chicago IL",
    "industrial engineering company in Atlanta GA",
    "industrial engineering firm in Charlotte NC",
    "industrial engineering company in Phoenix AZ",
    
    # Civil & Structural Engineering Firms
    "civil engineering firm in Austin TX",
    "civil engineering firm in Denver CO",
    "civil engineering firm in Tampa FL",
    "structural engineering firm in Miami FL",
    "structural engineering firm in Houston TX",
    "structural engineering firm in New York NY",
    
    # MEP & Consulting Engineering
    "MEP engineering firm in Dallas TX",
    "MEP engineering firm in Atlanta GA",
    "engineering consulting firm in Chicago IL",
    "engineering consulting firm in Houston TX",
]

def clean_domain(url: str) -> str:
    if not url:
        return ""
    # Strip google redirect URL wrapper if present
    if "google.com/url?" in url:
        parsed = urllib.parse.urlparse(url)
        q = urllib.parse.parse_qs(parsed.query)
        if "q" in q:
            url = q["q"][0]
        elif "url" in q:
            url = q["url"][0]

    s = url.strip().lower()
    s = re.sub(r"^https?://", "", s)
    s = re.sub(r"^www\.", "", s)
    s = s.rstrip("/")
    s = s.split("/")[0].split("?")[0].split("#")[0]
    return s

def extract_state_from_address(addr: str, fallback_state: str = None) -> str:
    if not addr:
        return fallback_state
    # Check 2-letter state pattern e.g. "Houston, TX 77079"
    match = re.search(r",\s*([A-Z]{2})\s+\d{5}", addr)
    if match:
        st = match.group(1).upper()
        if st in STATE_ABBREVS:
            return st
    # Check full state name
    addr_lower = addr.lower()
    for state_name, abbrev in US_STATES.items():
        if f" {state_name}" in addr_lower or f",{state_name}" in addr_lower:
            return abbrev
    return fallback_state

def extract_city_from_address(addr: str, fallback_city: str = None) -> str:
    if not addr:
        return fallback_city
    parts = [p.strip() for p in addr.split(",") if p.strip()]
    if len(parts) >= 3:
        # e.g. ["11700 Katy Fwy #800", "Houston", "TX 77079", "United States"]
        return parts[-3]
    elif len(parts) == 2:
        return parts[0]
    return fallback_city

async def handle_consent(page):
    try:
        if "consent.google.com" in page.url:
            btn = page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Reject all")').first
            if await btn.count() > 0:
                await btn.click()
                await page.wait_for_url("**/maps/**", timeout=15000)
                await page.wait_for_timeout(2500)
    except Exception as e:
        print(f"  [Consent Note] {e}")

async def scrape_query(page, query: str, max_places: int = 30):
    print(f"\n[Scraping Query] '{query}'...")
    url = f"https://www.google.com/maps/search/{urllib.parse.quote(query)}?hl=en"
    
    # Infer fallback city and state from query
    fallback_city = None
    fallback_state = None
    for state_name, abbrev in US_STATES.items():
        if f" {abbrev}" in query.upper() or f" {state_name.upper()}" in query.upper():
            fallback_state = abbrev
            break
            
    parts = query.split(" in ")
    if len(parts) > 1:
        loc = parts[1].strip()
        fallback_city = loc.split()[0].replace(",", "")
        
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await page.wait_for_timeout(2000)
    await handle_consent(page)
    
    feed = page.locator('div[role="feed"]')
    if await feed.count() > 0:
        # Scroll to load more cards
        for _ in range(4):
            await feed.evaluate("e => e.scrollBy(0, 3000)")
            await page.wait_for_timeout(1500)
    else:
        await page.wait_for_timeout(3000)

    # Get place links
    links = page.locator('a[href*="/maps/place/"]')
    count = await links.count()
    print(f"  Found {count} place entries in feed.")
    
    results = []
    seen_names = set()
    
    for i in range(min(count, max_places)):
        link_el = links.nth(i)
        name = await link_el.get_attribute("aria-label")
        place_href = await link_el.get_attribute("href")
        
        if not name or name in seen_names:
            continue
        seen_names.add(name)
        
        # Click on place to open detail panel
        try:
            await link_el.click()
            await page.wait_for_timeout(2000)
            
            # Website
            web_btn = page.locator('a[data-tooltip*="website" i], a[aria-label*="Website:" i], a[data-item-id*="authority" i]')
            website = ""
            if await web_btn.count() > 0:
                website = await web_btn.first.get_attribute("href") or ""
                
            # Phone
            phone_btn = page.locator('button[data-tooltip*="phone" i], button[aria-label*="Phone:" i], button[data-item-id*="phone" i]')
            phone = ""
            if await phone_btn.count() > 0:
                phone_raw = await phone_btn.first.get_attribute("aria-label") or await phone_btn.first.inner_text()
                phone = phone_raw.replace("Phone:", "").strip()
                
            # Address
            addr_btn = page.locator('button[data-tooltip*="address" i], button[aria-label*="Address:" i], button[data-item-id*="address" i]')
            address = ""
            if await addr_btn.count() > 0:
                addr_raw = await addr_btn.first.get_attribute("aria-label") or await addr_btn.first.inner_text()
                address = addr_raw.replace("Address:", "").strip()
                
            # Rating & category
            cat_btn = page.locator('button[jsaction*="category" i]')
            category = ""
            if await cat_btn.count() > 0:
                category = await cat_btn.first.inner_text()
                
            rating_el = page.locator('div[jsaction*="pane.rating" i] span[aria-hidden="true"]')
            rating = ""
            if await rating_el.count() > 0:
                rating = await rating_el.first.inner_text()
                
            domain = clean_domain(website)
            if not domain:
                continue
                
            state = extract_state_from_address(address, fallback_state)
            city = extract_city_from_address(address, fallback_city)
            
            note_parts = []
            if category:
                note_parts.append(category)
            if rating:
                note_parts.append(f"{rating} stars")
            if address:
                note_parts.append(f"Address: {address}")
            note_parts.append("Scraped via Google Maps Engineering Extractor.")
            
            lead_obj = {
                "company_name": name.strip(),
                "website": domain,
                "city": city,
                "state": state,
                "phone": phone or None,
                "notes": ". ".join(note_parts),
                "raw_website": website,
                "address": address,
                "query": query
            }
            results.append(lead_obj)
            print(f"    ✓ [{len(results)}] {name} | {domain} | {city}, {state} | {phone or 'No phone'}")
            
        except Exception as e:
            # Continue on individual card error
            continue
            
    return results

async def main():
    print("=" * 65)
    print("LeadFlow Google Maps US Engineering Companies Extractor")
    print("=" * 65)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Open DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    existing_websites = set(
        r[0].lower().replace("www.", "") for r in cursor.execute("SELECT website FROM leads WHERE website IS NOT NULL").fetchall()
    )
    print(f"Current leads in DB: {len(existing_websites)}")
    
    all_extracted = []
    unique_new_leads = []
    seen_domains = set(existing_websites)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="en-US"
        )
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")
        page = await context.new_page()
        
        for q_idx, query in enumerate(TARGET_QUERIES):
            try:
                results = await scrape_query(page, query, max_places=25)
                for item in results:
                    all_extracted.append(item)
                    domain = item["website"]
                    if domain and domain not in seen_domains:
                        seen_domains.add(domain)
                        unique_new_leads.append(item)
            except Exception as err:
                print(f"  [Error scraping {query}]: {err}")
                
            # Brief pause between queries
            await asyncio.sleep(2)
            
        await browser.close()
        
    print("\n" + "=" * 65)
    print(f"Scraping Completed!")
    print(f"Total Companies Extracted: {len(all_extracted)}")
    print(f"Unique New Engineering Leads: {len(unique_new_leads)}")
    print("=" * 65)
    
    # Save raw backup JSON
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_json = os.path.join(OUTPUT_DIR, f"engineering_leads_{timestamp}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_extracted, f, indent=2)
    print(f"Saved raw scraped records to: {out_json}")
    
    # Insert new unique leads into leads.db
    if unique_new_leads:
        print(f"\nInserting {len(unique_new_leads)} new engineering leads into leads.db...")
        insert_sql = """
            INSERT OR IGNORE INTO leads (company_name, website, city, state, phone, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, 'not_contacted')
        """
        inserted_count = 0
        for lead in unique_new_leads:
            cursor.execute(insert_sql, (
                lead["company_name"],
                lead["website"],
                lead["city"],
                lead["state"],
                lead["phone"],
                lead["notes"]
            ))
            if cursor.rowcount > 0:
                inserted_count += 1
                
        conn.commit()
        print(f"✓ Successfully inserted {inserted_count} new leads into leads.db!")
        
    # Stats
    total_db_leads = cursor.execute("SELECT count(*) FROM leads").fetchone()[0]
    phone_count = cursor.execute("SELECT count(*) FROM leads WHERE phone IS NOT NULL").fetchone()[0]
    print(f"\nTotal leads now in leads.db: {total_db_leads}")
    print(f"Leads with phone: {phone_count} ({phone_count/total_db_leads*100:.1f}%)")
    
    print("\nTop States in leads.db:")
    state_breakdown = cursor.execute("SELECT state, count(*) c FROM leads GROUP BY state ORDER BY c DESC LIMIT 10").fetchall()
    for st, c in state_breakdown:
        print(f"  {st or 'Unknown'}: {c}")
        
    conn.close()
    print("\nAll done!")

if __name__ == "__main__":
    asyncio.run(main())
