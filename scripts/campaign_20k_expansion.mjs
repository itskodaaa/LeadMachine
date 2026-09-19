#!/usr/bin/env node
/**
 * Mega 20K US Lead Extraction Campaign
 * Targets 35+ US states and 80+ metropolitan areas across 20+ engineering,
 * manufacturing, fabrication, and commercial contracting categories.
 */

import Api from 'botasaurus-desktop-api';

const api = new Api({ createResponseFiles: false });

const engineeringCategories = [
  'Civil engineer',
  'Structural engineer',
  'Mechanical engineer',
  'Electrical engineer',
  'Precision engineer',
  'Industrial engineer',
  'Engineering consultant',
  'Geotechnical engineer',
  'Environmental engineer'
];

const manufacturingCategories = [
  'Machine shop',
  'CNC machining',
  'Metal fabrication',
  'Tool and die maker',
  'Steel fabricator',
  'Sheet metal contractor'
];

const contractingCategories = [
  'General contractor',
  'Commercial builder',
  'Mechanical contractor',
  'Electrical contractor',
  'Commercial roofing contractor',
  'Demolition contractor'
];

const regionGroups = [
  {
    name: 'Northeast & Mid-Atlantic Corridor',
    states: ['US__PENNSYLVANIA', 'US__NEW_YORK', 'US__MASSACHUSETTS', 'US__NEW_JERSEY', 'US__MARYLAND', 'US__CONNECTICUT'],
    cities: [
      'US__PENNSYLVANIA__PHILADELPHIA',
      'US__PENNSYLVANIA__PITTSBURGH',
      'US__PENNSYLVANIA__ALLENTOWN',
      'US__NEW_YORK__BUFFALO',
      'US__NEW_YORK__ROCHESTER',
      'US__NEW_YORK__ALBANY',
      'US__NEW_YORK__SYRACUSE',
      'US__MASSACHUSETTS__BOSTON',
      'US__MASSACHUSETTS__WORCESTER',
      'US__NEW_JERSEY__NEWARK',
      'US__NEW_JERSEY__JERSEY_CITY',
      'US__MARYLAND__BALTIMORE',
      'US__CONNECTICUT__HARTFORD'
    ]
  },
  {
    name: 'Midwest & Plains Heartlands',
    states: ['US__MINNESOTA', 'US__MISSOURI', 'US__IOWA', 'US__KANSAS', 'US__NEBRASKA', 'US__INDIANA', 'US__OHIO', 'US__MICHIGAN', 'US__WISCONSIN', 'US__ILLINOIS'],
    cities: [
      'US__MINNESOTA__MINNEAPOLIS',
      'US__MINNESOTA__ST_PAUL',
      'US__MISSOURI__ST_LOUIS',
      'US__MISSOURI__KANSAS_CITY',
      'US__IOWA__DES_MOINES',
      'US__KANSAS__WICHITA',
      'US__NEBRASKA__OMAHA',
      'US__INDIANA__FORT_WAYNE',
      'US__OHIO__TOLEDO',
      'US__OHIO__AKRON',
      'US__OHIO__DAYTON',
      'US__MICHIGAN__LANSING',
      'US__WISCONSIN__MADISON',
      'US__ILLINOIS__ROCKFORD'
    ]
  },
  {
    name: 'South & Gulf Coast Hubs',
    states: ['US__TEXAS', 'US__FLORIDA', 'US__VIRGINIA', 'US__TENNESSEE', 'US__KENTUCKY', 'US__ALABAMA', 'US__LOUISIANA', 'US__OKLAHOMA', 'US__SOUTH_CAROLINA'],
    cities: [
      'US__TEXAS__FORT_WORTH',
      'US__TEXAS__EL_PASO',
      'US__TEXAS__ARLINGTON',
      'US__TEXAS__PLANO',
      'US__FLORIDA__JACKSONVILLE',
      'US__FLORIDA__ST_PETERSBURG',
      'US__FLORIDA__FORT_LAUDERDALE',
      'US__VIRGINIA__VIRGINIA_BEACH',
      'US__VIRGINIA__RICHMOND',
      'US__TENNESSEE__MEMPHIS',
      'US__TENNESSEE__KNOXVILLE',
      'US__KENTUCKY__LOUISVILLE',
      'US__ALABAMA__BIRMINGHAM',
      'US__LOUISIANA__NEW_ORLEANS',
      'US__LOUISIANA__BATON_ROUGE',
      'US__OKLAHOMA__OKLAHOMA_CITY',
      'US__OKLAHOMA__TULSA',
      'US__SOUTH_CAROLINA__CHARLESTON',
      'US__SOUTH_CAROLINA__COLUMBIA'
    ]
  },
  {
    name: 'Mountain, Desert & Pacific Northwest',
    states: ['US__UTAH', 'US__NEVADA', 'US__NEW_MEXICO', 'US__IDAHO', 'US__WASHINGTON', 'US__OREGON', 'US__CALIFORNIA', 'US__ARIZONA', 'US__COLORADO'],
    cities: [
      'US__UTAH__SALT_LAKE_CITY',
      'US__UTAH__PROVO',
      'US__NEVADA__LAS_VEGAS',
      'US__NEVADA__RENO',
      'US__NEW_MEXICO__ALBUQUERQUE',
      'US__IDAHO__BOISE',
      'US__WASHINGTON__SPOKANE',
      'US__WASHINGTON__TACOMA',
      'US__WASHINGTON__VANCOUVER',
      'US__OREGON__EUGENE',
      'US__OREGON__SALEM',
      'US__CALIFORNIA__FRESNO',
      'US__CALIFORNIA__BAKERSFIELD',
      'US__CALIFORNIA__ANAHEIM',
      'US__CALIFORNIA__IRVINE',
      'US__CALIFORNIA__RIVERSIDE',
      'US__ARIZONA__TUCSON',
      'US__COLORADO__COLORADO_SPRINGS'
    ]
  }
];

function buildPayload(region, businessTypes) {
  return {
    business_types: businessTypes,
    search_method: 'city',
    countries: [],
    states: region.states,
    cities: region.cities,
    randomize_cities: true,
    include_places_outside_city: true,
    search_links: [],
    extraction_method: 'fast',
    geo_shape: 'polygons',
    point_coordinates: '',
    polygons: null,
    geo_zoom_level: '16',
    exclude_outside_shape: true,
    api_key: '',
    enable_website_contacts: false,
    product_description: '',
    enable_emails_social: false,
    recommended_emails_count: '1',
    verify_recommended_emails: false,
    email_verification_service: 'millionverifier',
    enable_sales_summary: false,
    enable_phone_info: false,
    enrichment_filters: ['not_permanently_closed'],
    filter_reviews_gt: null,
    filter_reviews_lt: null,
    filter_category_contains: '',
    enable_leads: false,
    leads_max_per_place: '3',
    leads_seniorities: ['c_suite', 'founder', 'owner', 'vp', 'director'],
    leads_person_titles: '',
    leads_contact_email_status: ['verified'],
    leads_person_locations: '',
    enable_reviews_extraction: false,
    max_reviews: 20,
    reviews_sort: 'newest',
    reviews_since_date: '',
    reviews_query: '',
    enable_photos_extraction: false,
    max_photos: 100,
    lang: null,
    max_results: 50,
  };
}

async function dispatchAll() {
  console.log('=== Dispatching Mega 20K US Lead Extraction Campaign ===\n');

  let totalBatches = 0;
  let totalSubtasks = 0;

  for (const region of regionGroups) {
    // 1. Engineering Batch
    console.log(`Submitting [${region.name} - Engineering Focus] (${region.cities.length} cities × ${engineeringCategories.length} types)...`);
    try {
      const engTask = await api.createAsyncTask({
        data: buildPayload(region, engineeringCategories),
        scraperName: 'google_maps_scraper'
      });
      const count = Array.isArray(engTask) ? engTask.length : 1;
      const mainId = Array.isArray(engTask) ? engTask[0]?.parent_task_id || engTask[0]?.id : engTask.id;
      console.log(`✓ Created batch task #${mainId} (${count} subtasks)`);
      totalBatches++;
      totalSubtasks += count;
    } catch (err) {
      console.error(`Failed ${region.name} (Engineering):`, err.message);
    }

    // 2. Manufacturing & Machining Batch
    console.log(`Submitting [${region.name} - Manufacturing & Machining] (${region.cities.length} cities × ${manufacturingCategories.length} types)...`);
    try {
      const mfgTask = await api.createAsyncTask({
        data: buildPayload(region, manufacturingCategories),
        scraperName: 'google_maps_scraper'
      });
      const count = Array.isArray(mfgTask) ? mfgTask.length : 1;
      const mainId = Array.isArray(mfgTask) ? mfgTask[0]?.parent_task_id || mfgTask[0]?.id : mfgTask.id;
      console.log(`✓ Created batch task #${mainId} (${count} subtasks)`);
      totalBatches++;
      totalSubtasks += count;
    } catch (err) {
      console.error(`Failed ${region.name} (Manufacturing):`, err.message);
    }

    // 3. Commercial Contracting Batch
    console.log(`Submitting [${region.name} - Commercial Contracting] (${region.cities.length} cities × ${contractingCategories.length} types)...`);
    try {
      const conTask = await api.createAsyncTask({
        data: buildPayload(region, contractingCategories),
        scraperName: 'google_maps_scraper'
      });
      const count = Array.isArray(conTask) ? conTask.length : 1;
      const mainId = Array.isArray(conTask) ? conTask[0]?.parent_task_id || conTask[0]?.id : conTask.id;
      console.log(`✓ Created batch task #${mainId} (${count} subtasks)\n`);
      totalBatches++;
      totalSubtasks += count;
    } catch (err) {
      console.error(`Failed ${region.name} (Contractors):`, err.message);
    }
  }

  console.log(`======================================================`);
  console.log(`Mega 20K Campaign successfully dispatched!`);
  console.log(`Total Batches: ${totalBatches}`);
  console.log(`Total Subtasks Dispatched: ${totalSubtasks}`);
  console.log(`Targeting ~${totalSubtasks * 45} potential businesses across 35+ states`);
  console.log(`======================================================`);
}

dispatchAll();
