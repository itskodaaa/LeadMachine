import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkWebsite } from './reachability.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/leads.db');

// ==========================================================================
// Comprehensive US Commercial & Manufacturing Cities by State
// ==========================================================================
export const STATE_CITIES = {
  'Illinois': [
    'Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Elgin', 'Springfield', 'Peoria',
    'Waukegan', 'Champaign', 'Bloomington', 'Decatur', 'Evanston', 'Arlington Heights', 'Schaumburg',
    'Bolingbrook', 'Palatine', 'Skokie', 'Des Plaines', 'Orland Park', 'Tinley Park', 'Oak Lawn',
    'Berwyn', 'Mount Prospect', 'Wheaton', 'Normal', 'Hoffman Estates', 'Oak Park', 'Downers Grove',
    'Elmhurst', 'Lombard', 'DeKalb', 'Belleville', 'Moline', 'Buffalo Grove', 'Bartlett', 'Urbana',
    'Quincy', 'Crystal Lake', 'Carol Stream', 'Streamwood', 'Romeoville', 'Plainfield', 'Rock Island',
    'Hanover Park', 'Carpentersville', 'Wheeling', 'Park Ridge', 'Elk Grove Village', 'Addison',
    'St. Charles', 'Batavia', 'Geneva', 'Woodridge', 'Libertyville', 'Lake Zurich', 'Mundelein', 'Gurnee'
  ],
  'Texas': [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi',
    'Plano', 'Lubbock', 'Laredo', 'Irving', 'Garland', 'Frisco', 'McKinney', 'Amarillo', 'Grand Prairie',
    'Brownsville', 'Killeen', 'Pasadena', 'Mesquite', 'McAllen', 'Carrollton', 'Midland', 'Waco',
    'Denton', 'Abilene', 'Odessa', 'Beaumont', 'Round Rock', 'The Woodlands', 'Richardson', 'Pearland',
    'College Station', 'Wichita Falls', 'Lewisville', 'Tyler', 'San Angelo', 'League City', 'Allen',
    'Sugar Land', 'Edinburg', 'Mission', 'Longview', 'Bryan', 'Pharr', 'Baytown', 'Missouri City', 'Temple',
    'Conroe', 'New Braunfels', 'Grapevine', 'Waxahachie', 'Mansfield', 'Rowlett', 'Sherman', 'Burleson'
  ],
  'California': [
    'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland',
    'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Irvine', 'Stockton', 'Chula Vista', 'Fremont',
    'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 'Huntington Beach', 'Glendale',
    'Santa Clarita', 'Garden Grove', 'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Lancaster',
    'Elk Grove', 'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward', 'Escondido', 'Sunnyvale', 'Torrance',
    'Pasadena', 'Orange', 'Fullerton', 'Thousand Oaks', 'Visalia', 'Roseville', 'Concord', 'Simi Valley',
    'Santa Clara', 'Victorville', 'Vallejo', 'Berkeley', 'El Monte', 'Downey', 'Costa Mesa', 'Inglewood',
    'Carlsbad', 'Temecula', 'Murrieta', 'Burbank', 'San Mateo', 'Compton', 'South Gate', 'Carson', 'Santa Monica'
  ],
  'Florida': [
    'Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Port St. Lucie', 'Cape Coral',
    'Tallahassee', 'Fort Lauderdale', 'Pembroke Pines', 'Hollywood', 'Gainesville', 'Miramar', 'Coral Springs',
    'Clearwater', 'Palm Bay', 'Pompano Beach', 'West Palm Beach', 'Lakeland', 'Davie', 'Boca Raton',
    'Sunrise', 'Plantation', 'Miami Gardens', 'Deltona', 'Fort Myers', 'Palm Coast', 'Largo', 'Melbourne',
    'Boynton Beach', 'Deerfield Beach', 'Kissimmee', 'Homestead', 'Tamarac', 'Bradenton', 'Ocala',
    'Sanford', 'Sarasota', 'Pensacola', 'Bradenton', 'Pinellas Park', 'Daytona Beach', 'Winter Haven'
  ],
  'New York': [
    'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon',
    'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Freeport',
    'Valley Stream', 'Long Beach', 'Rome', 'Ithaca', 'Poughkeepsie', 'North Tonawanda', 'Jamestown', 'Elmira',
    'Newburgh', 'Middletown', 'Auburn', 'Watertown', 'Glen Cove', 'Kingston', 'Peekskill', 'Lockport'
  ],
  'Pennsylvania': [
    'Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Scranton', 'Bethlehem', 'Lancaster',
    'Harrisburg', 'York', 'Wilkes-Barre', 'Chester', 'Williamsport', 'Easton', 'Lebanon', 'Hazleton',
    'New Castle', 'Johnstown', 'McKeesport', 'Hermitage', 'Greensburg', 'Pottsville', 'Sharon', 'Butler',
    'State College', 'Norristown', 'Bethel Park', 'Monroeville', 'King of Prussia', 'Altoona', 'Upper Darby',
    'Lansdale', 'West Chester', 'Malvern', 'Exton', 'Horsham', 'Fort Washington', 'Warminster', 'Phoenixville',
    'Pottstown', 'Coatesville', 'Carlisle', 'Chambersburg', 'Hanover', 'Bloomsburg', 'Lewisburg', 'Sunbury',
    'Cranberry Township', 'Penn Hills', 'Mount Lebanon', 'North Huntingdon', 'Murrysville', 'Wexford', 'Bridgeville',
    'Radnor', 'Conshohocken', 'Wayne', 'Bryn Mawr', 'Doylestown', 'Quakertown', 'Perkasie', 'Sellersville',
    'Mechanicsburg', 'Camp Hill', 'Shippensburg', 'Waynesboro'
  ],
  'Ohio': [
    'Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown',
    'Lorain', 'Hamilton', 'Springfield', 'Kettering', 'Elyria', 'Lakewood', 'Cuyahoga Falls', 'Euclid',
    'Middletown', 'Mansfield', 'Newark', 'Mentor', 'Cleveland Heights', 'Beavercreek', 'Strongsville', 'Fairfield',
    'Findlay', 'Lima', 'Warren', 'Marion', 'Troy', 'Bowling Green', 'Zanesville', 'Massillon', 'Wooster',
    'Medina', 'Perrysburg', 'Westerville', 'Dublin', 'Mason', 'Reynoldsburg', 'Grove City', 'Delaware'
  ],
  'Michigan': [
    'Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Dearborn', 'Livonia',
    'Troy', 'Westland', 'Flint', 'Kalamazoo', 'Canton', 'Macomb', 'Clinton', 'Farmington Hills', 'Southfield',
    'Rochester Hills', 'Pontiac', 'Taylor', 'St. Clair Shores', 'Royal Oak', 'Novi', 'Dearborn Heights', 'Battle Creek',
    'Holland', 'Zeeland', 'Auburn Hills', 'Plymouth', 'Romulus', 'Wixom', 'Saginaw', 'Midland', 'Bay City',
    'Jackson', 'Muskegon', 'Port Huron', 'Monroe', 'Adrian', 'Ypsilanti', 'Waterford', 'Clarkston',
    'Shelby Township', 'Chesterfield', 'Traverse City', 'Marquette', 'Benton Harbor', 'St. Joseph', 'Coldwater',
    'Sturgis', 'Hastings', 'Ionia', 'Owosso', 'Mount Pleasant', 'Big Rapids', 'Cadillac', 'Alpena',
    'Escanaba', 'Sault Ste. Marie', 'Howell', 'Brighton', 'Saline', 'Southgate', 'Lincoln Park', 'Wyandotte',
    'Allen Park', 'Garden City', 'Inkster', 'Madison Heights', 'Hazel Park', 'Ferndale', 'Oak Park', 'Clawson'
  ],
  'North Carolina': [
    'Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington',
    'High Point', 'Concord', 'Asheville', 'Gastonia', 'Jacksonville', 'Apex', 'Huntersville', 'Chapel Hill',
    'Burlington', 'Kannapolis', 'Rocky Mount', 'Mooresville', 'Wake Forest', 'Wilson', 'Hickory', 'Statesville'
  ],
  'Georgia': [
    'Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'South Fulton',
    'Roswell', 'Johns Creek', 'Warner Robins', 'Albany', 'Alpharetta', 'Marietta', 'Stonecrest', 'Smyrna',
    'Valdosta', 'Dunwoody', 'Gainesville', 'Newnan', 'Peachtree Corners', 'Dalton', 'Rome', 'Woodstock'
  ],
  'Indiana': [
    'Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond',
    'Gary', 'Lafayette', 'Muncie', 'Noblesville', 'Terre Haute', 'Greenwood', 'Kokomo', 'Elkhart',
    'Mishawaka', 'Lawrence', 'Columbus', 'Jeffersonville', 'Westfield', 'Portage', 'Richmond', 'Anderson',
    'Warsaw', 'Goshen', 'Auburn', 'Crown Point', 'Valparaiso', 'La Porte', 'Marion', 'Seymour', 'Shelbyville'
  ],
  'Wisconsin': [
    'Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Eau Claire',
    'Oshkosh', 'Janesville', 'West Allis', 'La Crosse', 'Sheboygan', 'Wauwatosa', 'Fond du Lac', 'Brookfield',
    'Wausau', 'New Berlin', 'Beloit', 'Greenfield', 'Manitowoc', 'West Bend', 'Sun Prairie', 'Superior',
    'Stevens Point', 'Neenah', 'Menasha', 'Watertown', 'Marshfield', 'Wisconsin Rapids', 'Menomonee Falls'
  ],
  'New Jersey': [
    'Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Lakewood', 'Edison', 'Woodbridge', 'Toms River',
    'Hamilton Township', 'Trenton', 'Clifton', 'Camden', 'Brick', 'Cherry Hill', 'Passaic', 'Union City',
    'Middletown', 'Bayonne', 'East Orange', 'Old Bridge', 'Gloucester', 'Franklin', 'North Bergen', 'Vineland'
  ],
  'Virginia': [
    'Virginia Beach', 'Chesapeake', 'Norfolk', 'Richmond', 'Newport News', 'Alexandria', 'Hampton',
    'Roanoke', 'Portsmouth', 'Suffolk', 'Lynchburg', 'Harrisonburg', 'Charlottesville', 'Danville',
    'Manassas', 'Petersburg', 'Fredericksburg', 'Winchester', 'Salem', 'Staunton', 'Fairfax', 'Hopewell'
  ],
  'Washington': [
    'Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Spokane Valley',
    'Federal Way', 'Yakima', 'Bellingham', 'Kennewick', 'Auburn', 'Pasco', 'Marysville', 'Lakewood',
    'Redmond', 'Shoreline', 'Richland', 'Kirkland', 'Olympia', 'Sammamish', 'Lacey', 'Edmonds', 'Bremerton'
  ],
  'Arizona': [
    'Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise',
    'Yuma', 'Avondale', 'Flagstaff', 'Goodyear', 'Lake Havasu City', 'Buckeye', 'Casa Grande', 'Maricopa'
  ],
  'Colorado': [
    'Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster',
    'Pueblo', 'Greeley', 'Boulder', 'Longmont', 'Loveland', 'Broomfield', 'Castle Rock', 'Grand Junction'
  ],
  'Missouri': [
    'Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon',
    'St. Joseph', 'St. Charles', 'St. Peters', 'Blue Springs', 'Florissant', 'Joplin', 'Chesterfield', 'Jefferson City'
  ],
  'Tennessee': [
    'Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Johnson City',
    'Jackson', 'Hendersonville', 'Bartlett', 'Kingsport', 'Smyrna', 'Spring Hill', 'Collierville', 'Cleveland'
  ],
  'Minnesota': [
    'Minneapolis', 'St. Paul', 'Rochester', 'Bloomington', 'Duluth', 'Brooklyn Park', 'Plymouth', 'Woodbury',
    'Lakeville', 'Blaine', 'Maple Grove', 'St. Cloud', 'Eagan', 'Burnsville', 'Eden Prairie', 'Coon Rapids'
  ]
};

// ==========================================================================
// Comprehensive US Counties by State (Subdivision Grid Scraping)
// ==========================================================================
export const STATE_COUNTIES = {
  'Michigan': [
    'Wayne', 'Oakland', 'Macomb', 'Kent', 'Genesee', 'Washtenaw', 'Ingham', 'Ottawa', 'Kalamazoo', 'Saginaw',
    'Livingston', 'Muskegon', 'St. Clair', 'Jackson', 'Berrien', 'Monroe', 'Calhoun', 'Allegan', 'Eaton', 'Bay',
    'Midland', 'Lenawee', 'Grand Traverse', 'Lapeer', 'Shiawassee', 'Van Buren', 'Ionia', 'Clinton', 'Barry', 'Branch',
    'Cass', 'St. Joseph', 'Mecosta', 'Isabella', 'Montcalm', 'Tuscola', 'Huron', 'Sanilac', 'Gratiot', 'Newaygo'
  ],
  'Pennsylvania': [
    'Adams', 'Allegheny', 'Armstrong', 'Beaver', 'Bedford', 'Berks', 'Blair', 'Bradford', 'Bucks', 'Butler',
    'Cambria', 'Cameron', 'Carbon', 'Centre', 'Chester', 'Clarion', 'Clearfield', 'Clinton', 'Columbia', 'Crawford',
    'Cumberland', 'Dauphin', 'Delaware', 'Elk', 'Erie', 'Fayette', 'Forest', 'Franklin', 'Fulton', 'Greene',
    'Huntingdon', 'Indiana', 'Jefferson', 'Juniata', 'Lackawanna', 'Lancaster', 'Lawrence', 'Lebanon', 'Lehigh', 'Luzerne',
    'Lycoming', 'McKean', 'Mercer', 'Mifflin', 'Monroe', 'Montgomery', 'Montour', 'Northampton', 'Northumberland', 'Perry',
    'Philadelphia', 'Pike', 'Potter', 'Schuylkill', 'Snyder', 'Somerset', 'Sullivan', 'Susquehanna', 'Tioga', 'Union',
    'Venango', 'Warren', 'Washington', 'Wayne', 'Westmoreland', 'Wyoming', 'York'
  ],
  'Illinois': [
    'Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry', 'Winnebago', 'Madison', 'St. Clair', 'Champaign',
    'Sangamon', 'Peoria', 'McLean', 'Rock Island', 'Tazewell', 'Kankakee', 'DeKalb', 'Macon', 'Vermilion', 'Adams',
    'Whiteside', 'Jackson', 'LaSalle', 'Kendall', 'Grundy', 'Boone', 'Stephenson', 'Knox', 'Christian', 'Macoupin'
  ],
  'Texas': [
    'Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis', 'Collin', 'Denton', 'Hidalgo', 'Fort Bend', 'El Paso',
    'Montgomery', 'Williamson', 'Cameron', 'Nueces', 'Brazoria', 'Bell', 'Galveston', 'Lubbock', 'Webb', 'Jefferson',
    'McLennan', 'Smith', 'Brazos', 'Hays', 'Johnson', 'Ellis', 'Ector', 'Midland', 'Guadalupe', 'Taylor',
    'Comal', 'Wichita', 'Gregg', 'Potter', 'Parker', 'Randall', 'Tom Green', 'Kaufman', 'Bowie', 'Rockwall'
  ],
  'California': [
    'Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino', 'Santa Clara', 'Alameda', 'Sacramento',
    'Contra Costa', 'Fresno', 'Kern', 'San Francisco', 'Ventura', 'San Mateo', 'San Joaquin', 'Stanislaus',
    'Sonoma', 'Tulare', 'Solano', 'Monterey', 'Santa Barbara', 'Placer', 'San Luis Obispo', 'Santa Cruz', 'Merced',
    'Marin', 'Butte', 'Yolo', 'Shasta', 'El Dorado', 'Imperial', 'Kings', 'Madera', 'Napa', 'Humboldt'
  ],
  'Ohio': [
    'Franklin', 'Cuyahoga', 'Hamilton', 'Summit', 'Montgomery', 'Lucas', 'Butler', 'Stark', 'Lorain', 'Warren',
    'Lake', 'Mahoning', 'Delaware', 'Clermont', 'Trumbull', 'Wood', 'Medina', 'Licking', 'Clark', 'Greene',
    'Fairfield', 'Richland', 'Wayne', 'Miami', 'Allen', 'Columbiana', 'Ashtabula', 'Geauga', 'Muskingum', 'Portage'
  ],
  'Indiana': [
    'Marion', 'Lake', 'Allen', 'Hamilton', 'St. Joseph', 'Elkhart', 'Tippecanoe', 'Vanderburgh', 'Porter', 'Hendricks',
    'Johnson', 'Monroe', 'Madison', 'Clark', 'Delaware', 'Laporte', 'Vigo', 'Bartholomew', 'Howard', 'Kosciusko'
  ],
  'Wisconsin': [
    'Milwaukee', 'Dane', 'Waukesha', 'Brown', 'Racine', 'Outagamie', 'Winnebago', 'Kenosha', 'Rock', 'Marathon',
    'Washington', 'Sheboygan', 'La Crosse', 'Fond du Lac', 'Ozaukee', 'Eau Claire', 'St. Croix', 'Walworth', 'Manitowoc', 'Dodge'
  ],
  'New York': [
    'New York', 'Kings', 'Queens', 'Bronx', 'Richmond', 'Nassau', 'Suffolk', 'Westchester', 'Erie', 'Monroe',
    'Onondaga', 'Orange', 'Rockland', 'Albany', 'Dutchess', 'Saratoga', 'Oneida', 'Niagara', 'Broome', 'Ulster'
  ],
  'Florida': [
    'Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange', 'Pinellas', 'Duval', 'Lee', 'Polk', 'Brevard',
    'Volusia', 'Pasco', 'Seminole', 'Sarasota', 'Manatee', 'Collier', 'Marion', 'Osceola', 'Lake', 'Escambia'
  ]
};

// ==========================================================================
// Regional Neighboring State Spillover Mappings
// Used when statewide capacity for specialized niches is completely reached
// ==========================================================================
export const REGIONAL_EXPANSIONS = {
  'Michigan': ['Ohio', 'Indiana', 'Illinois', 'Wisconsin', 'Pennsylvania'],
  'Pennsylvania': ['New Jersey', 'New York', 'Ohio', 'Maryland', 'Delaware'],
  'Illinois': ['Indiana', 'Wisconsin', 'Michigan', 'Missouri', 'Iowa'],
  'Texas': ['Oklahoma', 'Louisiana', 'New Mexico', 'Arkansas'],
  'California': ['Nevada', 'Arizona', 'Oregon', 'Washington'],
  'Ohio': ['Pennsylvania', 'Michigan', 'Indiana', 'Kentucky', 'West Virginia'],
  'New York': ['New Jersey', 'Connecticut', 'Pennsylvania', 'Massachusetts'],
  'Florida': ['Georgia', 'Alabama'],
  'North Carolina': ['South Carolina', 'Virginia', 'Tennessee', 'Georgia'],
  'Georgia': ['Florida', 'Alabama', 'Tennessee', 'North Carolina', 'South Carolina'],
  'Indiana': ['Illinois', 'Ohio', 'Kentucky', 'Michigan'],
  'Wisconsin': ['Illinois', 'Minnesota', 'Iowa', 'Michigan'],
  'New Jersey': ['New York', 'Pennsylvania', 'Delaware', 'Connecticut']
};

// ==========================================================================
// Nationwide Manufacturing Hubs (Tier 6 Maximum Quota Expansion)
// ==========================================================================
export const NATIONWIDE_METROS = [
  { city: 'Chicago', state: 'Illinois' },
  { city: 'Houston', state: 'Texas' },
  { city: 'Los Angeles', state: 'California' },
  { city: 'Detroit', state: 'Michigan' },
  { city: 'Dallas', state: 'Texas' },
  { city: 'Cleveland', state: 'Ohio' },
  { city: 'Philadelphia', state: 'Pennsylvania' },
  { city: 'Atlanta', state: 'Georgia' },
  { city: 'Minneapolis', state: 'Minnesota' },
  { city: 'Phoenix', state: 'Arizona' },
  { city: 'Indianapolis', state: 'Indiana' },
  { city: 'Milwaukee', state: 'Wisconsin' },
  { city: 'Cincinnati', state: 'Ohio' },
  { city: 'Charlotte', state: 'North Carolina' },
  { city: 'St. Louis', state: 'Missouri' },
  { city: 'Kansas City', state: 'Missouri' },
  { city: 'Pittsburgh', state: 'Pennsylvania' },
  { city: 'Denver', state: 'Colorado' },
  { city: 'Columbus', state: 'Ohio' },
  { city: 'Seattle', state: 'Washington' },
  { city: 'Tampa', state: 'Florida' },
  { city: 'Nashville', state: 'Tennessee' },
  { city: 'Orlando', state: 'Florida' },
  { city: 'San Diego', state: 'California' },
  { city: 'San Antonio', state: 'Texas' },
  { city: 'Newark', state: 'New Jersey' },
  { city: 'Fort Worth', state: 'Texas' },
  { city: 'Grand Rapids', state: 'Michigan' },
  { city: 'Elkhart', state: 'Indiana' },
  { city: 'Greenville', state: 'South Carolina' },
  { city: 'Dayton', state: 'Ohio' },
  { city: 'Rockford', state: 'Illinois' },
  { city: 'Akron', state: 'Ohio' },
  { city: 'Allentown', state: 'Pennsylvania' },
  { city: 'Erie', state: 'Pennsylvania' }
];

// ==========================================================================
// Smart Root Noun Extractor
// ==========================================================================
export function cleanRootNoun(rawQuery) {
  if (!rawQuery) return '';
  let q = String(rawQuery).trim();
  q = q.replace(/\b(services|service|manufacturers|manufacturer|manufacturing|companies|company|solutions|solution|specialists|specialist|supplies|suppliers|supplier|fabrication|fabricators|fabricator|shops|shop|contractors|contractor|co|inc|llc|corp)\b/gi, '').trim();
  q = q.replace(/\s+/g, ' ');
  return q || rawQuery.trim();
}

// ==========================================================================
// Comprehensive 50-Category Real-World Google Maps Thesaurus
// Maps industry categories to authentic, high-yielding search queries
// ==========================================================================
export const INDUSTRY_EXPANSIONS = {
  // Sector 1: CNC & Precision Machining (8)
  'CNC Milling & Turning': [
    'CNC Machining', 'Precision CNC Milling', 'CNC Lathe Turning', 'Machine Shop',
    'Prototype Machining', '5 Axis Machining', 'Precision Turning', 'Custom CNC Parts', 'Milling and Turning'
  ],
  'CNC Swiss Machining': [
    'CNC Swiss Machining', 'Swiss Screw Machine', 'Precision Turning', 'Micro Machining',
    'CNC Lathe Parts', 'Precision Screw Machine Products', 'Swiss Turn Machining', 'Medical Pin Machining'
  ],
  '5-Axis Aerospace Machining': [
    'Aerospace Machining', '5-Axis CNC Milling', 'Aircraft Precision Parts', 'AS9100 Machine Shop',
    'Titanium CNC Machining', 'Aerospace Components', 'Flight Hardware Machining', 'Aerospace Machine Shop'
  ],
  'Tool and Die Making': [
    'Tool and Die Maker', 'Stamping Dies', 'Progressive Dies', 'Toolroom Machining',
    'Die Maker', 'Injection Mold Tooling', 'Tool & Die Shop', 'Custom Tooling Manufacturer'
  ],
  'Wire EDM Services': [
    'Wire EDM Services', 'EDM Machining', 'Electrical Discharge Machining', 'Sinker EDM',
    'Wire Cut EDM', 'Precision EDM Tooling', 'Wire EDM Shop', 'EDM Wire Cutting'
  ],
  'Precision Grinding Services': [
    'Precision Grinding Services', 'Surface Grinding', 'Blanchard Grinding', 'Centerless Grinding',
    'OD ID Grinding', 'Precision Lapping', 'Industrial Grinding Shop', 'Cylindrical Grinding'
  ],
  'Custom Gear Manufacturing': [
    'Gear Manufacturing', 'Gear Hobbing', 'Spur Gears', 'Precision Gearboxes',
    'Gear Cutting Services', 'Custom Gears', 'Pinion Gear Manufacturer', 'Industrial Gears'
  ],
  'Jig and Fixture Tooling': [
    'Jig and Fixture Tooling', 'Workholding Fixtures', 'Assembly Jigs', 'Welding Fixtures',
    'Inspection Fixtures', 'Tooling and Fixtures', 'Custom Workholding Fixtures'
  ],

  // Sector 2: Sheet Metal & Structural (8)
  'Sheet Metal Fabrication': [
    'Sheet Metal Fabrication', 'Laser Cutting Services', 'Custom Metal Enclosures', 'Metal Stamping',
    'Precision Sheet Metal', 'Waterjet Cutting', 'Sheet Metal Shop', 'Custom Metal Fabrication'
  ],
  'Industrial Laser Cutting': [
    'Industrial Laser Cutting', 'Laser Cutting Services', 'Fiber Laser Cutting', 'Tube Laser Cutting',
    'Sheet Metal Laser Cutting', 'Steel Plate Laser Cutting', 'Laser Cutting Shop'
  ],
  'Structural Steel Fabrication': [
    'Structural Steel Fabrication', 'Steel Fabricator', 'Structural Steel Framing', 'Steel Beams and Trusses',
    'AISC Steel Fabricator', 'Steel Fabrication Shop', 'Structural Metal Building'
  ],
  'Custom Metal Stamping': [
    'Metal Stamping', 'Progressive Die Stamping', 'Precision Metal Stamping', 'Deep Draw Stamping',
    'High Volume Stamping', 'Metal Stamping Shop', 'Custom Metal Stamping'
  ],
  'Contract Welding Fabrication': [
    'Contract Welding Fabrication', 'Robotic Welding', 'Certified Welding Services', 'TIG and MIG Welding',
    'Custom Welding Fabrication', 'Welding Shop', 'Metal Welding Fabricator'
  ],
  'Tube Bending and Fabrication': [
    'Tube Bending and Fabrication', 'Mandrel Tube Bending', 'Pipe Bending Services', 'Hydroforming Services',
    'Custom Exhaust Tubing', 'Tubular Fabrication', 'Precision Tube Bending'
  ],
  'Waterjet Cutting Services': [
    'Waterjet Cutting Services', 'Abrasive Waterjet Cutting', 'Precision Waterjet Cutting',
    'Custom Waterjet Cutting', 'Waterjet Cutting Shop', 'Waterjet Metal Cutting'
  ],
  'Architectural Metal Fabrication': [
    'Architectural Metal Fabrication', 'Ornamental Metalwork', 'Architectural Railings',
    'Custom Metal Cladding', 'Decorative Metal Fabrication', 'Ornamental Iron Shop'
  ],

  // Sector 3: Aerospace, Defense & Transportation (7)
  'Aerospace Components Manufacturing': [
    'Aerospace Components Manufacturing', 'Aircraft Parts Manufacturer', 'Aerospace Flight Hardware',
    'AS9100 Aerospace Machine Shop', 'Aerospace Brackets', 'Aircraft Precision Components'
  ],
  'Defense Contract Machining': [
    'Defense Contract Machining', 'ITAR Machine Shop', 'Military Spec Machining',
    'Tactical Hardware Manufacturer', 'Defense Contractor Machining', 'Military Precision Parts'
  ],
  'Automotive Parts Manufacturing': [
    'Automotive Parts Manufacturing', 'Tier 1 Automotive Supplier', 'Automotive Stamping',
    'Chassis Components Manufacturer', 'Automotive Machine Shop', 'Auto Parts Fabricator'
  ],
  'EV Battery Enclosure Manufacturing': [
    'EV Battery Enclosure Manufacturing', 'Aluminum Cold Plates', 'Battery Pack Enclosures',
    'Electric Vehicle Components', 'EV Hardware Fabrication', 'Battery Enclosure Fabricator'
  ],
  'Marine Hardware Manufacturing': [
    'Marine Hardware Manufacturing', 'Boat Hardware Supplier', 'Stainless Marine Fittings',
    'Propeller Shaft Machining', 'Marine Metal Fabrication', 'Boat Parts Manufacturer'
  ],
  'Commercial Truck Body Manufacturing': [
    'Commercial Truck Body Manufacturing', 'Truck Body Builders', 'Utility Truck Bodies',
    'Dump Body Fabrication', 'Trailer Manufacturing', 'Custom Truck Equipment'
  ],
  'Aircraft Interior Manufacturing': [
    'Aircraft Interior Manufacturing', 'Aircraft Cabin Equipment', 'FAA Interior Components',
    'Aircraft Seating Hardware', 'Aviation Interiors', 'Cabin Interior Composites'
  ],

  // Sector 4: Electronics, Medical & High-Tech (6)
  'Medical Device Manufacturing': [
    'Medical Device Manufacturing', 'ISO 13485 Medical Machining', 'Surgical Instruments Manufacturer',
    'Medical Implants Manufacturing', 'Medical Tooling', 'Cleanroom Medical Device Manufacturer'
  ],
  'PCB Assembly Services': [
    'PCB Assembly Services', 'Printed Circuit Board Assembly', 'Electronics Manufacturing Services',
    'SMT Assembly Services', 'Contract Electronics Manufacturer', 'Circuit Board Assembly',
    'Cable and Wire Harness Assembly', 'Box Build Assembly', 'Electronic Contract Manufacturing'
  ],
  'Semiconductor Equipment Machining': [
    'Semiconductor Equipment Machining', 'Semiconductor Tooling', 'Cleanroom Equipment Manufacturing',
    'Wafer Handling Equipment', 'Vacuum Chamber Machining', 'Semiconductor Parts Fabrication'
  ],
  'Electromechanical Assembly Contract': [
    'Electromechanical Assembly', 'Box Build Assembly', 'Control Panel Builders',
    'Wiring Harness Assembly', 'Contract Electromechanical Manufacturer', 'Turnkey Box Builds'
  ],
  'Precision Optical Machining': [
    'Precision Optical Machining', 'Optomechanics Fabrication', 'Laser Housing Machining',
    'Optical Lens Cells', 'Photonics Hardware Manufacturer', 'Optical Component Machining'
  ],
  'Cleanroom Injection Molding': [
    'Cleanroom Injection Molding', 'Class 8 Cleanroom Molding', 'Medical Plastic Molding',
    'Cleanroom Thermoplastics', 'Sterile Medical Plastic Parts', 'Medical Injection Molding'
  ],
  'Electronic Heat Sink Manufacturing': [
    'Electronic Heat Sink Manufacturing', 'Thermal Management Solutions', 'Extruded Heat Sinks',
    'Aluminum Heat Sinks', 'EMI Shielding Fabrication', 'Thermal Heat Sinks'
  ],

  // Sector 5: Plastics, Rubber & Composites (7)
  'Plastic Injection Molding': [
    'Plastic Injection Molding', 'Custom Injection Molding', 'Thermoplastic Injection Molding',
    'Plastic Parts Manufacturer', 'Injection Molded Plastics', 'Custom Plastic Molders'
  ],
  'Industrial Blow Molding': [
    'Industrial Blow Molding', 'Plastic Bottle Manufacturer', 'Custom Blow Molding',
    'Plastic Drums and Containers', 'HDPE Blow Molding', 'Plastic Container Manufacturer'
  ],
  'Custom Rubber Molding': [
    'Custom Rubber Molding', 'Rubber Gaskets and O-Rings', 'Silicone Molding Services',
    'Vibration Isolators Manufacturer', 'EPDM Rubber Parts', 'Molded Rubber Products'
  ],
  'Carbon Fiber Manufacturing': [
    'Carbon Fiber Manufacturing', 'Composite Material Fabricators', 'Carbon Fiber Parts',
    'Autoclave Composite Molding', 'Lightweight Composite Structures', 'Advanced Composites'
  ],
  'Plastic Thermoforming Services': [
    'Plastic Thermoforming Services', 'Vacuum Forming Services', 'Heavy Gauge Thermoforming',
    'Plastic Trays and Packaging', 'Custom Thermoformed Parts', 'Thermoformed Packaging'
  ],
  'Plastic Profile Extrusion': [
    'Plastic Profile Extrusion', 'Custom Plastic Extrusions', 'PVC Profile Manufacturer',
    'Plastic Tubing Extrusion', 'Weatherstripping Manufacturer', 'Plastic Extruders'
  ],
  'Custom Urethane Casting': [
    'Custom Urethane Casting', 'Polyurethane Rollers and Wheels', 'Urethane Molded Parts',
    'Cast Polyurethane Products', 'Industrial Urethane Bumpers', 'Cast Urethane'
  ],

  // Sector 6: Industrial Machinery & Power Equipment (7)
  'Hydraulic Cylinder Manufacturing': [
    'Hydraulic Cylinder Manufacturing', 'Hydraulic Valve Machining', 'Fluid Power Equipment',
    'Custom Hydraulic Cylinders', 'Hydraulic Cylinder Repair', 'Hydraulic Components'
  ],
  'Industrial Pump Manufacturing': [
    'Industrial Pump Manufacturing', 'Centrifugal Pump Manufacturer', 'Chemical Pumps',
    'Fluid Transfer Pumps', 'Industrial Pump Repair', 'Commercial Water Pumps'
  ],
  'Electric Motor Manufacturing': [
    'Electric Motor Manufacturing', 'Custom Electric Motors', 'Stators and Rotors Manufacturer',
    'Industrial Motor Repair', 'Electric Motor Windings', 'Electric Generators'
  ],
  'Conveyor System Manufacturing': [
    'Conveyor System Manufacturing', 'Material Handling Equipment', 'Roller Conveyor Manufacturer',
    'Belt Conveyor Systems', 'Warehouse Automation Conveyors', 'Industrial Conveyors'
  ],
  'Heat Exchanger Manufacturing': [
    'Heat Exchanger Manufacturing', 'Shell and Tube Heat Exchanger', 'ASME Pressure Vessels',
    'Industrial Boilers', 'Steam Heat Exchanger Manufacturer', 'Plate Heat Exchangers'
  ],
  'Solar Mounting Hardware Manufacturing': [
    'Solar Mounting Hardware Manufacturing', 'Solar Racking Systems', 'Ground Mount Solar Hardware',
    'Solar Tracker Linkages', 'Renewable Energy Hardware', 'Solar Hardware Fabricators'
  ],
  'Oilfield Equipment Manufacturing': [
    'Oilfield Equipment Manufacturing', 'API Wellhead Valves', 'Drilling Tools Manufacturer',
    'Subsea Flanges and Manifolds', 'Oil & Gas Equipment', 'Oilfield Tool Manufacturer'
  ],

  // Sector 7: Food, Packaging & Commercial Trades (6)
  'Food Processing Equipment Manufacturing': [
    'Food Processing Equipment Manufacturing', 'Sanitary Stainless Steel Mixers', 'Food Machinery Manufacturer',
    'Commercial Food Equipment', '3-A Sanitary Conveyors', 'Food Packaging Machinery'
  ],
  'Corrugated Packaging Manufacturing': [
    'Corrugated Box Manufacturer', 'Packaging Company', 'Packaging Supplies', 'Custom Box Manufacturer',
    'Cardboard Box Manufacturer', 'Paper Box Manufacturer', 'Shipping Box Supplier', 'Industrial Packaging',
    'Carton Manufacturer', 'Packaging Solutions', 'Corrugated Containers', 'Packaging Materials',
    'Contract Packaging', 'Protective Packaging', 'Cardboard Boxes', 'Folding Cartons'
  ],
  'Commercial HVAC Contractors': [
    'Commercial HVAC Contractor', 'Commercial Heating and Cooling', 'Sheet Metal Ductwork Fabrication',
    'Industrial Chillers and RTU', 'Commercial Refrigeration Contractor', 'Mechanical Piping Contractor'
  ],
  'Commercial Roofing Contractors': [
    'Commercial Roofing Contractor', 'Industrial Flat Roofing', 'TPO Roofing Contractors',
    'EPDM Membrane Roofing', 'Commercial Roofers', 'Architectural Sheet Metal Roofing'
  ],
  'Commercial Plumbing Contractors': [
    'Commercial Plumbing Contractor', 'Commercial Pipefitting', 'Industrial Plumbing Contractor',
    'Process Piping Fabrication', 'Backflow Prevention Contractors', 'Commercial Plumber'
  ],
  'Commercial Electrical Contractors': [
    'Commercial Electrical Contractor', 'Industrial Electrical Contractor', '3-Phase Power Contractors',
    'Electrical Switchgear Installation', 'Motor Control Center Contractors', 'Commercial Electrician'
  ]
};

// Aliases and category name normalizations
export const RELATED_QUERIES = INDUSTRY_EXPANSIONS;

// ==========================================================================
// Semantic B2B Industrial Query Expander
// ==========================================================================
export function getSemanticExpansions(rawQuery) {
  if (!rawQuery) return [];
  const clean = rawQuery.trim();

  // Direct lookup
  if (INDUSTRY_EXPANSIONS[clean]) {
    return INDUSTRY_EXPANSIONS[clean];
  }

  // Case-insensitive lookup
  const lower = clean.toLowerCase();
  for (const [k, list] of Object.entries(INDUSTRY_EXPANSIONS)) {
    if (k.toLowerCase() === lower) return list;
  }

  // Partial match against known categories (e.g. "Corrugated Packaging" matching "Corrugated Packaging Manufacturing")
  for (const [k, list] of Object.entries(INDUSTRY_EXPANSIONS)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) {
      return list;
    }
  }

  // Fallback to smart root noun generation
  const root = cleanRootNoun(clean);
  const expansions = [
    clean,
    `${root} Manufacturer`,
    `${root} Company`,
    `${root} Supplies`,
    `${root} Supplier`,
    `Custom ${root}`,
    `Industrial ${root}`,
    `${root} Products`,
    `${root} Fabrication`,
    `${root} Services`
  ];

  return Array.from(new Set(expansions.filter(Boolean)));
}

// ==========================================================================
// Direct Google Maps Internal RPC API Client
// Ultra-fast HTTP/2 fetch with protobuf offset pagination (!8i${offset}!)
// Extracts 20 places per request in ~300ms without Puppeteer browser overhead.
// ==========================================================================
export async function fetchGoogleMapsPlaces(query, offset = 0, options = {}) {
  const zoom = options.zoom || 18;
  const lat = options.lat || 0;
  const lon = options.lon || 0;
  const hl = options.hl || 'en';
  const gl = options.gl || 'us';

  const pb = `!4m12!1m3!1d3826.902183192154!2d${typeof lon === 'number' ? lon.toFixed(4) : lon}!3d${typeof lat === 'number' ? lat.toFixed(4) : lat}!2m3!1f0!2f0!3f0!3m2!1i600!2i800!4f${zoom}!7i20!8i${offset}!10b1!12m22!1m3!18b1!30b1!34e1!2m3!5m1!6e2!20e3!4b0!10b1!12b1!13b1!16b1!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0!96b1!19m4!2m3!1i360!2i120!4i8`;

  const searchParams = new URLSearchParams({
    tbm: 'map',
    authuser: '0',
    hl,
    gl,
    q: query,
    pb
  });

  const url = `https://maps.google.com/search?${searchParams.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }
  });

  if (!res.ok) {
    throw new Error(`Google Maps HTTP ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  let clean = text.trim();

  // Strip anti-hijacking protection prefixes
  for (const prefix of ['/*""*/', ")]}'"]) {
    if (clean.startsWith(prefix)) clean = clean.slice(prefix.length).trimStart();
  }
  if (clean.endsWith('/*""*/')) clean = clean.slice(0, -6).trimEnd();

  let data;
  try {
    data = JSON.parse(clean);
  } catch (err) {
    console.warn(`[Lead Hunter] Google Maps JSON parse error for "${query}":`, err.message);
    return [];
  }

  const placesContainer = data?.[0]?.[1] || [];
  const results = [];

  for (const entry of placesContainer) {
    const item = entry?.[14];
    if (!item) continue;

    const name = item[11];
    if (!name || typeof name !== 'string') continue;

    const website = item[7]?.[0] || '';
    const phone = item[178]?.[0]?.[0] || '';
    const categories = Array.isArray(item[13]) ? item[13].map(String) : [];
    const mainCategory = categories[0] || '';
    const address = Array.isArray(item[2]) ? item[2].join(', ') : (item[2] || '');
    const lat = item[9]?.[2] || null;
    const lon = item[9]?.[3] || null;
    const kgmid = item[89] || '';
    const rating = item[4]?.[7] || null;
    const reviews = item[4]?.[8] || 0;

    results.push({
      name: name.trim(),
      website: website.trim(),
      phone: phone.trim(),
      categories,
      mainCategory,
      address,
      latitude: lat,
      longitude: lon,
      kgmid,
      rating,
      reviews
    });
  }

  return results;
}

// ==========================================================================
// Lead Hunter Orchestrator (Multi-Task Dynamic Grid Engine)
// ==========================================================================
export class LeadHunter {
  constructor() {
    this.status = 'idle'; // idle, running, completed, stopped, error
    this.targetLimit = 1000;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.duplicatesCount = 0;
    this.noWebsiteCount = 0;
    this.unreachableCount = 0;
    this.tasks = [];
    this.currentTaskIndex = 0;
    this.currentTier = 1;
    this.currentTierName = 'Primary Cities';
    this.recentLeads = [];
    this.abortRequested = false;
    this.startTime = null;
    this.endTime = null;
    this.errorMessage = null;
  }

  getStatus() {
    const elapsedSeconds = this.getElapsedSeconds();
    const leadsPerMinute = elapsedSeconds > 0
      ? Math.round((this.reachableCount / elapsedSeconds) * 60)
      : 0;

    return {
      status: this.status,
      limit: this.targetLimit,
      discovered: this.discoveredCount,
      reachable: this.reachableCount,
      skipped: this.skippedCount,
      breakdown: {
        duplicates: this.duplicatesCount,
        noWebsite: this.noWebsiteCount,
        unreachable: this.unreachableCount
      },
      currentTaskIndex: this.currentTaskIndex,
      totalTasks: this.tasks.length,
      currentTier: this.currentTier,
      currentTierName: this.currentTierName,
      activeTask: this.tasks[this.currentTaskIndex] || null,
      tasks: this.tasks.slice(Math.max(0, this.currentTaskIndex - 5), this.currentTaskIndex + 45).map(t => ({
        id: t.id,
        query: t.query,
        city: t.city,
        state: t.state,
        tier: t.tier || 1,
        tierName: t.tierName || '',
        status: t.status,
        found: t.found || 0
      })),
      leadsPerMinute,
      elapsedSeconds,
      recentLeads: this.recentLeads.slice(0, 30),
      error: this.errorMessage
    };
  }

  getElapsedSeconds() {
    if (!this.startTime) return 0;
    const end = this.endTime ? this.endTime : Date.now();
    return Math.max(0, Math.round((end - this.startTime) / 1000));
  }

  stopHunting() {
    this.abortRequested = true;
    this.status = 'stopped';
    this.endTime = Date.now();
  }

  /**
   * Generates a multi-tier task queue with geographic & synonym expansion.
   */
  generateTierTasks({ tier = 1, query, state, city, limit = 1000, existingTasks = [] }) {
    const tasks = [];
    const existingQueries = new Set(existingTasks.map(t => (t.query || '').toLowerCase().trim()));
    const stateCities = STATE_CITIES[state] || [state];
    const stateCounties = STATE_COUNTIES[state] || [];
    const expansions = getSemanticExpansions(query);

    const addTask = (q, taskCity, taskState, meta = {}) => {
      const cleanQ = (q || '').trim();
      const lower = cleanQ.toLowerCase();
      if (!cleanQ || existingQueries.has(lower)) return;
      existingQueries.add(lower);

      tasks.push({
        id: `task-${existingTasks.length + tasks.length + 1}`,
        query: cleanQ,
        baseQuery: meta.baseQuery || query,
        city: taskCity || '',
        state: taskState || state,
        tier: meta.tier || tier,
        tierName: meta.tierName || this.currentTierName,
        status: 'pending',
        found: 0
      });
    };

    if (city && city.trim()) {
      const cleanCity = city.trim();
      if (tier === 1) {
        this.currentTierName = `City Focus: ${cleanCity}`;
        for (const q of expansions.slice(0, 4)) {
          addTask(`${q} in ${cleanCity}, ${state}`, cleanCity, state, { baseQuery: q, tier: 1, tierName: this.currentTierName });
        }
      } else if (tier === 2) {
        this.currentTierName = `Metro Corridors: ${cleanCity} Area`;
        for (const q of expansions.slice(0, 3)) {
          for (const c of stateCities.slice(0, 25)) {
            addTask(`${q} in ${c}, ${state}`, c, state, { baseQuery: q, tier: 2, tierName: this.currentTierName });
          }
        }
      } else if (tier === 3) {
        this.currentTierName = `County Subdivisions: ${state}`;
        for (const q of expansions.slice(0, 3)) {
          for (const co of stateCounties.slice(0, 35)) {
            addTask(`${q} in ${co} County, ${state}`, co, state, { baseQuery: q, tier: 3, tierName: this.currentTierName });
          }
        }
      } else if (tier === 4) {
        this.currentTierName = `Statewide Industrial Expansion: ${state}`;
        for (const q of expansions.slice(3, 10)) {
          for (const c of stateCities.slice(0, 30)) {
            addTask(`${q} in ${c}, ${state}`, c, state, { baseQuery: q, tier: 4, tierName: this.currentTierName });
          }
        }
      } else if (tier === 5) {
        this.currentTierName = `Regional Corridor Spillover`;
        const neighbors = REGIONAL_EXPANSIONS[state] || [];
        for (const neighborState of neighbors) {
          const neighborCities = (STATE_CITIES[neighborState] || []).slice(0, 20);
          for (const q of expansions.slice(0, 3)) {
            for (const nc of neighborCities) {
              addTask(`${q} in ${nc}, ${neighborState}`, nc, neighborState, { baseQuery: q, tier: 5, tierName: `Regional (${neighborState})` });
            }
          }
        }
      } else if (tier >= 6) {
        this.currentTierName = `Nationwide Enterprise Grid`;
        for (const metro of NATIONWIDE_METROS) {
          for (const q of expansions.slice(0, 3)) {
            addTask(`${q} in ${metro.city}, ${metro.state}`, metro.city, metro.state, { baseQuery: q, tier: 6, tierName: 'Nationwide' });
          }
        }
      }
    } else {
      // Statewide Multi-Tier Geographic & Synonym Expansion
      if (tier === 1) {
        // Tier 1: Primary Manufacturing & Commercial Hubs
        this.currentTierName = `Primary Cities (${state})`;
        const primaryCities = stateCities.slice(0, 35);
        const queriesToUse = limit <= 1000 ? expansions.slice(0, 2) : expansions.slice(0, 4);
        for (const q of queriesToUse) {
          for (const c of primaryCities) {
            addTask(`${q} in ${c}, ${state}`, c, state, { baseQuery: q, tier: 1, tierName: `Primary Cities (${state})` });
          }
        }
      } else if (tier === 2) {
        // Tier 2: Extended Cities & Industrial Corridors
        this.currentTierName = `Extended Townships & Corridors (${state})`;
        const extendedCities = stateCities.length > 35 ? stateCities.slice(35) : stateCities.slice(15);
        const queriesToUse = expansions.slice(0, 4);
        for (const q of queriesToUse) {
          for (const c of extendedCities) {
            addTask(`${q} in ${c}, ${state}`, c, state, { baseQuery: q, tier: 2, tierName: `Extended Townships (${state})` });
          }
        }
      } else if (tier === 3) {
        // Tier 3: County Subdivisions (Catches industrial parks outside city borders)
        this.currentTierName = `County Subdivisions (${state})`;
        const queriesToUse = expansions.slice(0, 3);
        for (const q of queriesToUse) {
          for (const co of stateCounties) {
            addTask(`${q} in ${co} County, ${state}`, co, state, { baseQuery: q, tier: 3, tierName: `County Subdivisions (${state})` });
          }
        }
      } else if (tier === 4) {
        // Tier 4: Deep B2B Industry Synonyms across Top Hubs
        this.currentTierName = `Deep Industry Synonyms (${state})`;
        const deepSynonyms = expansions.slice(4, 14);
        const topHubs = stateCities.slice(0, 25);
        for (const q of deepSynonyms) {
          for (const c of topHubs) {
            addTask(`${q} in ${c}, ${state}`, c, state, { baseQuery: q, tier: 4, tierName: `Deep Synonyms (${state})` });
          }
        }
      } else if (tier === 5) {
        // Tier 5: Regional Neighboring State Expansion
        this.currentTierName = `Regional Great Lakes / Midwest Corridor`;
        const neighbors = REGIONAL_EXPANSIONS[state] || [];
        for (const neighborState of neighbors) {
          const neighborCities = (STATE_CITIES[neighborState] || []).slice(0, 25);
          for (const q of expansions.slice(0, 3)) {
            for (const nc of neighborCities) {
              addTask(`${q} in ${nc}, ${neighborState}`, nc, neighborState, { baseQuery: q, tier: 5, tierName: `Regional (${neighborState})` });
            }
          }
        }
      } else if (tier >= 6) {
        // Tier 6: Nationwide Manufacturing Hubs
        this.currentTierName = `Nationwide Enterprise Metros`;
        for (const metro of NATIONWIDE_METROS) {
          for (const q of expansions.slice(0, 3)) {
            addTask(`${q} in ${metro.city}, ${metro.state}`, metro.city, metro.state, { baseQuery: q, tier: 6, tierName: 'Nationwide' });
          }
        }
      }
    }

    return tasks;
  }

  generateSubTasks(opts) {
    return this.generateTierTasks({ tier: 1, ...opts });
  }

  async startHunting({ query = 'Manufacturing', state = 'Illinois', city = '', limit = 1000, onEvent = null }) {
    if (this.status === 'running') {
      throw new Error('A lead hunting session is already currently active.');
    }

    this.status = 'running';
    this.abortRequested = false;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.duplicatesCount = 0;
    this.noWebsiteCount = 0;
    this.unreachableCount = 0;
    this.targetLimit = Math.max(1, Math.min(100000, Number(limit) || 1000));
    this.recentLeads = [];
    this.startTime = Date.now();
    this.endTime = null;
    this.errorMessage = null;
    this.currentTier = 1;
    this.currentTierName = city && city.trim() ? `City Focus: ${city.trim()}` : `Primary Cities (${state})`;

    this.tasks = this.generateTierTasks({ tier: 1, query, state, city, limit: this.targetLimit, existingTasks: [] });
    this.currentTaskIndex = 0;

    const emit = (type, data) => {
      if (onEvent) onEvent({ type, ...data });
    };

    emit('hunter_started', {
      query,
      state,
      city,
      tier: this.currentTier,
      tierName: this.currentTierName,
      limit: this.targetLimit,
      totalTasks: this.tasks.length,
      tasks: this.tasks.slice(0, 50)
    });

    let db;
    try {
      db = new Database(dbPath);
    } catch (e) {
      this.status = 'error';
      this.errorMessage = 'Database connection failed: ' + e.message;
      emit('hunter_error', { error: this.errorMessage });
      throw new Error(this.errorMessage);
    }

    // Exact domain boundary & company name match (prevents false-positive substring collisions)
    const checkExistingStmt = db.prepare(`
      SELECT id FROM leads 
      WHERE LOWER(company_name) = LOWER(?)
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) = ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
         OR LOWER(website) LIKE ?
      LIMIT 1
    `);
    const insertLeadStmt = db.prepare(`
      INSERT INTO leads (company_name, website, city, state, phone, email, notes, contact_person, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
    `);

    const seenDomains = new Set();
    const seenNames = new Set();

    try {
      for (let i = 0; i < this.tasks.length; i++) {
        if (this.reachableCount >= this.targetLimit || this.abortRequested) break;

        this.currentTaskIndex = i;
        const task = this.tasks[i];
        task.status = 'running';

        emit('task_started', {
          taskIndex: i + 1,
          totalTasks: this.tasks.length,
          tier: task.tier || this.currentTier,
          tierName: task.tierName || this.currentTierName,
          task
        });

        let consecutiveEmptyBatches = 0;
        let taskLeadsCount = 0;

        // Offset pagination stepping by 20: 0, 20, 40, 60... up to 200
        for (let offset = 0; offset <= 200; offset += 20) {
          if (this.reachableCount >= this.targetLimit || this.abortRequested) break;

          let rawPlaces = [];
          try {
            rawPlaces = await fetchGoogleMapsPlaces(task.query, offset);
          } catch (fetchErr) {
            console.warn(`[Lead Hunter] RPC fetch warning on ${task.query} offset ${offset}:`, fetchErr.message);
            break;
          }

          if (!rawPlaces || rawPlaces.length === 0) {
            consecutiveEmptyBatches++;
            if (consecutiveEmptyBatches >= 1) break; // End of listings for this location/query
            continue;
          }

          consecutiveEmptyBatches = 0;

          // Filter candidates and extract websites
          const candidatesToVerify = [];
          for (const item of rawPlaces) {
            if (this.reachableCount >= this.targetLimit || this.abortRequested) break;
            if (!item.name || seenNames.has(item.name.toLowerCase())) continue;
            seenNames.add(item.name.toLowerCase());
            this.discoveredCount++;

            let cleanUrl = item.website;
            if (cleanUrl && cleanUrl.includes('google.com/url?q=')) {
              try {
                const u = new URL(cleanUrl);
                cleanUrl = u.searchParams.get('q') || cleanUrl;
              } catch (_) {}
            }

            if (!cleanUrl) {
              this.noWebsiteCount++;
              this.skippedCount++;
              continue;
            }

            const lowerUrl = cleanUrl.toLowerCase();
            if (
              lowerUrl.includes('facebook.com') ||
              lowerUrl.includes('yelp.com') ||
              lowerUrl.includes('instagram.com') ||
              lowerUrl.includes('yellowpages.com') ||
              lowerUrl.includes('linkedin.com') ||
              lowerUrl.includes('mapquest.com')
            ) {
              this.noWebsiteCount++;
              this.skippedCount++;
              continue;
            }

            let normalized = cleanUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
            if (!normalized.includes('.') || seenDomains.has(normalized)) {
              this.duplicatesCount++;
              this.skippedCount++;
              continue;
            }

            // Check database duplicate (Exact domain boundary match - avoids substring collisions)
            const existing = checkExistingStmt.get(
              item.name,
              normalized,
              `http://${normalized}`,
              `https://${normalized}`,
              `https://www.${normalized}`,
              `http://${normalized}/%`,
              `https://${normalized}/%`,
              `http://www.${normalized}/%`,
              `https://www.${normalized}/%`
            );
            if (existing) {
              this.duplicatesCount++;
              this.skippedCount++;
              continue;
            }

            seenDomains.add(normalized);
            candidatesToVerify.push({
              item,
              cleanUrl,
              normalized
            });
          }

          // Asynchronous HTTP reachability verification with 12s timeout
          if (candidatesToVerify.length > 0) {
            const batchPromises = candidatesToVerify.map(async ({ item, cleanUrl, normalized }) => {
              if (this.reachableCount >= this.targetLimit || this.abortRequested) return;

              let isReachable = false;
              try {
                const check = await checkWebsite(cleanUrl, 12000);
                isReachable = check.reachable;
              } catch (_) {
                isReachable = false;
              }

              if (!isReachable) {
                this.skippedCount++;
                this.unreachableCount++;
                return;
              }

              // Verified reachable: insert into database
              try {
                const info = insertLeadStmt.run(
                  item.name,
                  cleanUrl,
                  task.city || state,
                  task.state || state,
                  item.phone || '',
                  '', // email
                  `Google Maps Hunter: ${task.query}`,
                  '', // contact_person
                );

                this.reachableCount++;
                taskLeadsCount++;

                const leadEntry = {
                  id: info.lastInsertRowid,
                  name: item.name,
                  website: cleanUrl,
                  phone: item.phone || '',
                  city: task.city || state,
                  state: task.state || state,
                  verified: true,
                  timestamp: new Date().toISOString()
                };

                this.recentLeads.unshift(leadEntry);
                if (this.recentLeads.length > 100) this.recentLeads.pop();

                emit('lead_found', leadEntry);
              } catch (dbErr) {
                if (dbErr.message && dbErr.message.includes('UNIQUE')) {
                  this.duplicatesCount++;
                  this.skippedCount++;
                } else {
                  console.error('[Lead Hunter] DB Insert error:', dbErr.message);
                }
              }
            });

            await Promise.all(batchPromises);
          }

          emit('task_progress', {
            taskIndex: i + 1,
            totalTasks: this.tasks.length,
            tier: task.tier || this.currentTier,
            tierName: task.tierName || this.currentTierName,
            offset,
            batchCount: rawPlaces.length,
            taskFound: taskLeadsCount,
            discovered: this.discoveredCount,
            reachable: this.reachableCount,
            skipped: this.skippedCount,
            breakdown: {
              duplicates: this.duplicatesCount,
              noWebsite: this.noWebsiteCount,
              unreachable: this.unreachableCount
            }
          });

          // Polite pacing delay between offset pagination requests
          await new Promise(r => setTimeout(r, 250));
        }

        task.status = 'completed';
        task.found = taskLeadsCount;

        emit('task_finished', {
          taskIndex: i + 1,
          totalTasks: this.tasks.length,
          tier: task.tier || this.currentTier,
          tierName: task.tierName || this.currentTierName,
          task
        });

        // DYNAMIC TASK REPLENISHMENT:
        // When nearing the end of current tasks, automatically expand to next geographic/synonym tier
        if (i === this.tasks.length - 1 && this.reachableCount < this.targetLimit && !this.abortRequested) {
          const nextTier = this.currentTier + 1;
          if (nextTier <= 6) {
            const nextTierTasks = this.generateTierTasks({
              tier: nextTier,
              query,
              state,
              city,
              limit: this.targetLimit - this.reachableCount,
              existingTasks: this.tasks
            });

            if (nextTierTasks && nextTierTasks.length > 0) {
              this.currentTier = nextTier;
              this.tasks.push(...nextTierTasks);
              console.log(`[Lead Hunter] Dynamic Replenishment: Enqueued Tier ${nextTier} (${this.currentTierName}) with ${nextTierTasks.length} sub-tasks. Total tasks now: ${this.tasks.length}`);
              emit('tier_replenished', {
                tier: this.currentTier,
                tierName: this.currentTierName,
                addedTasks: nextTierTasks.length,
                totalTasks: this.tasks.length,
                reachable: this.reachableCount,
                targetLimit: this.targetLimit
              });
            } else {
              console.log(`[Lead Hunter] All geographic and synonym tiers exhausted for ${state}.`);
            }
          }
        }

        // Pacing delay between geographic sub-tasks
        await new Promise(r => setTimeout(r, 400));
      }

      this.status = this.abortRequested ? 'stopped' : 'completed';
      this.endTime = Date.now();

      emit('hunter_finished', {
        discovered: this.discoveredCount,
        reachable: this.reachableCount,
        skipped: this.skippedCount,
        totalTasks: this.tasks.length,
        elapsedSeconds: this.getElapsedSeconds(),
        isSaturated: this.reachableCount < this.targetLimit && !this.abortRequested
      });

    } catch (err) {
      this.status = 'error';
      this.errorMessage = err.message;
      this.endTime = Date.now();
      emit('hunter_error', { error: err.message });
      console.error('[Lead Hunter] Multi-task error:', err);
    } finally {
      if (db) {
        try { db.close(); } catch (_) {}
      }
    }

    return this.getStatus();
  }
}

export const leadHunter = new LeadHunter();
