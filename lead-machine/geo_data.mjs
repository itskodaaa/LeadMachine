/**
 * Lead Machine Enterprise Geographic & Regional Territory Data
 * Covers all 50 US States (+ DC), Europe (strictly excluding the UK),
 * North America, China, and India.
 */

// ==========================================================================
// 1. ALL 50 UNITED STATES + DISTRICT OF COLUMBIA
// ==========================================================================
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

export const US_STATE_CITIES = {
  'Alabama': ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery', 'Tuscaloosa', 'Hoover', 'Auburn', 'Decatur', 'Dothan', 'Madison', 'Florence', 'Gadsden'],
  'Alaska': ['Anchorage', 'Fairbanks', 'Juneau', 'Wasilla', 'Sitka', 'Ketchikan', 'Kenai', 'Palmer', 'Kodiak', 'Bethel'],
  'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise', 'Yuma', 'Avondale', 'Flagstaff', 'Goodyear', 'Lake Havasu City', 'Buckeye', 'Casa Grande'],
  'Arkansas': ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Rogers', 'Conway', 'North Little Rock', 'Bentonville', 'Pine Bluff', 'Benton', 'Hot Springs'],
  'California': [
    'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland',
    'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Irvine', 'Stockton', 'Chula Vista', 'Fremont',
    'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 'Huntington Beach', 'Glendale',
    'Santa Clarita', 'Garden Grove', 'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Lancaster',
    'Elk Grove', 'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward', 'Escondido', 'Sunnyvale', 'Torrance',
    'Pasadena', 'Orange', 'Fullerton', 'Thousand Oaks', 'Visalia', 'Roseville', 'Concord', 'Simi Valley',
    'Santa Clara', 'Victorville', 'Vallejo', 'Berkeley', 'El Monte', 'Downey', 'Costa Mesa', 'Carlsbad'
  ],
  'Colorado': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster', 'Pueblo', 'Greeley', 'Boulder', 'Longmont', 'Loveland', 'Broomfield', 'Grand Junction'],
  'Connecticut': ['Bridgeport', 'Stamford', 'New Haven', 'Hartford', 'Waterbury', 'Norwalk', 'Danbury', 'New Britain', 'West Hartford', 'Greenwich', 'Hamden', 'Meriden', 'Bristol', 'Milford'],
  'Delaware': ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Milford', 'Seaford', 'Georgetown', 'Elsmere', 'New Castle'],
  'District of Columbia': ['Washington'],
  'Florida': [
    'Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Port St. Lucie', 'Cape Coral',
    'Tallahassee', 'Fort Lauderdale', 'Pembroke Pines', 'Hollywood', 'Gainesville', 'Miramar', 'Coral Springs',
    'Clearwater', 'Palm Bay', 'Pompano Beach', 'West Palm Beach', 'Lakeland', 'Davie', 'Boca Raton',
    'Sunrise', 'Plantation', 'Miami Gardens', 'Deltona', 'Fort Myers', 'Palm Coast', 'Largo', 'Melbourne',
    'Boynton Beach', 'Deerfield Beach', 'Kissimmee', 'Homestead', 'Tamarac', 'Bradenton', 'Ocala', 'Sarasota'
  ],
  'Georgia': [
    'Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'South Fulton',
    'Roswell', 'Johns Creek', 'Warner Robins', 'Albany', 'Alpharetta', 'Marietta', 'Stonecrest', 'Smyrna',
    'Valdosta', 'Dunwoody', 'Gainesville', 'Newnan', 'Peachtree Corners', 'Dalton', 'Rome', 'Woodstock'
  ],
  'Hawaii': ['Honolulu', 'East Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Kaneohe', 'Mililani', 'Kahului', 'Kapolei'],
  'Idaho': ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Caldwell', 'Pocatello', 'Coeur d\'Alene', 'Twin Falls', 'Post Falls', 'Lewiston'],
  'Illinois': [
    'Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Elgin', 'Springfield', 'Peoria',
    'Waukegan', 'Champaign', 'Bloomington', 'Decatur', 'Evanston', 'Arlington Heights', 'Schaumburg',
    'Bolingbrook', 'Palatine', 'Skokie', 'Des Plaines', 'Orland Park', 'Tinley Park', 'Oak Lawn',
    'Berwyn', 'Mount Prospect', 'Wheaton', 'Normal', 'Hoffman Estates', 'Oak Park', 'Downers Grove',
    'Elmhurst', 'Lombard', 'DeKalb', 'Belleville', 'Moline', 'Buffalo Grove', 'Bartlett', 'Urbana',
    'Quincy', 'Crystal Lake', 'Carol Stream', 'Streamwood', 'Romeoville', 'Plainfield', 'Rock Island',
    'Elk Grove Village', 'Addison', 'St. Charles', 'Batavia', 'Geneva', 'Woodridge', 'Libertyville'
  ],
  'Indiana': [
    'Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond',
    'Gary', 'Lafayette', 'Muncie', 'Noblesville', 'Terre Haute', 'Greenwood', 'Kokomo', 'Elkhart',
    'Mishawaka', 'Lawrence', 'Columbus', 'Jeffersonville', 'Westfield', 'Portage', 'Richmond', 'Anderson'
  ],
  'Iowa': ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Ames', 'West Des Moines', 'Council Bluffs', 'Ankeny', 'Dubuque', 'Urbandale'],
  'Kansas': ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence', 'Shawnee', 'Manhattan', 'Lenexa', 'Salina', 'Hutchinson'],
  'Kentucky': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond', 'Georgetown', 'Florence', 'Hopkinsville', 'Nicholasville', 'Elizabethtown'],
  'Louisiana': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City', 'Monroe', 'Alexandria', 'Houma', 'New Iberia'],
  'Maine': ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford', 'Sanford', 'Saco', 'Westbrook', 'Augusta'],
  'Maryland': ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Hagerstown', 'Annapolis', 'College Park', 'Salisbury', 'Laurel', 'Greenbelt', 'Cumberland'],
  'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Quincy', 'Lynn', 'New Bedford', 'Fall River', 'Newton', 'Lawrence', 'Somerville', 'Framingham', 'Haverhill'],
  'Michigan': [
    'Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Dearborn', 'Livonia',
    'Troy', 'Westland', 'Flint', 'Kalamazoo', 'Canton', 'Macomb', 'Clinton', 'Farmington Hills', 'Southfield',
    'Rochester Hills', 'Pontiac', 'Taylor', 'St. Clair Shores', 'Royal Oak', 'Novi', 'Dearborn Heights', 'Battle Creek',
    'Holland', 'Zeeland', 'Auburn Hills', 'Plymouth', 'Romulus', 'Wixom', 'Saginaw', 'Midland', 'Bay City', 'Jackson'
  ],
  'Minnesota': ['Minneapolis', 'St. Paul', 'Rochester', 'Bloomington', 'Duluth', 'Brooklyn Park', 'Plymouth', 'Woodbury', 'Lakeville', 'Blaine', 'Maple Grove', 'St. Cloud', 'Eagan', 'Burnsville', 'Eden Prairie', 'Coon Rapids'],
  'Mississippi': ['Jackson', 'Gulfport', 'Southaven', 'Biloxi', 'Hattiesburg', 'Olive Branch', 'Tupelo', 'Meridian', 'Greenville', 'Clinton', 'Horn Lake', 'Pearl'],
  'Missouri': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon', 'St. Joseph', 'St. Charles', 'St. Peters', 'Blue Springs', 'Florissant', 'Joplin', 'Chesterfield', 'Jefferson City'],
  'Montana': ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell', 'Havre', 'Anaconda', 'Miles City'],
  'Nebraska': ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Hastings', 'Norfolk', 'Columbus', 'Papillion'],
  'Nevada': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Fernley', 'Elko', 'Mesquite', 'Boulder City'],
  'New Hampshire': ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester', 'Salem', 'Merrimack', 'Hudson', 'Londonderry', 'Keene', 'Portsmouth'],
  'New Jersey': [
    'Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Lakewood', 'Edison', 'Woodbridge', 'Toms River',
    'Hamilton Township', 'Trenton', 'Clifton', 'Camden', 'Brick', 'Cherry Hill', 'Passaic', 'Union City',
    'Middletown', 'Bayonne', 'East Orange', 'Old Bridge', 'Gloucester', 'Franklin', 'North Bergen', 'Vineland'
  ],
  'New Mexico': ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis', 'Hobbs', 'South Valley', 'Carlsbad', 'Gallup'],
  'New York': [
    'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon',
    'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Freeport',
    'Valley Stream', 'Long Beach', 'Rome', 'Ithaca', 'Poughkeepsie', 'North Tonawanda', 'Jamestown', 'Elmira'
  ],
  'North Carolina': [
    'Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington',
    'High Point', 'Concord', 'Asheville', 'Gastonia', 'Jacksonville', 'Apex', 'Huntersville', 'Chapel Hill',
    'Burlington', 'Kannapolis', 'Rocky Mount', 'Mooresville', 'Wake Forest', 'Wilson', 'Hickory', 'Statesville'
  ],
  'North Dakota': ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston', 'Dickinson', 'Mandan', 'Jamestown', 'Wahpeton'],
  'Ohio': [
    'Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown',
    'Lorain', 'Hamilton', 'Springfield', 'Kettering', 'Elyria', 'Lakewood', 'Cuyahoga Falls', 'Euclid',
    'Middletown', 'Mansfield', 'Newark', 'Mentor', 'Cleveland Heights', 'Beavercreek', 'Strongsville', 'Fairfield',
    'Findlay', 'Lima', 'Warren', 'Marion', 'Troy', 'Bowling Green', 'Zanesville', 'Massillon', 'Wooster'
  ],
  'Oklahoma': ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore', 'Midwest City', 'Enid', 'Stillwater', 'Muskogee', 'Bartlesville'],
  'Oregon': ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend', 'Medford', 'Springfield', 'Corvallis', 'Albany', 'Tigard', 'Lake Oswego', 'Keizer'],
  'Pennsylvania': [
    'Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Scranton', 'Bethlehem', 'Lancaster',
    'Harrisburg', 'York', 'Wilkes-Barre', 'Chester', 'Williamsport', 'Easton', 'Lebanon', 'Hazleton',
    'New Castle', 'Johnstown', 'McKeesport', 'Hermitage', 'Greensburg', 'Pottsville', 'Sharon', 'Butler',
    'State College', 'Norristown', 'Bethel Park', 'Monroeville', 'King of Prussia', 'Altoona', 'West Chester'
  ],
  'Rhode Island': ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence', 'Woonsocket', 'Coventry', 'Cumberland', 'North Providence', 'South Kingstown'],
  'South Carolina': ['Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville', 'Summerville', 'Sumter', 'Hilton Head Island', 'Florence', 'Spartanburg', 'Myrtle Beach'],
  'South Dakota': ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre', 'Huron', 'Spearfish'],
  'Tennessee': [
    'Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Johnson City',
    'Jackson', 'Hendersonville', 'Bartlett', 'Kingsport', 'Smyrna', 'Spring Hill', 'Collierville', 'Cleveland'
  ],
  'Texas': [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi',
    'Plano', 'Lubbock', 'Laredo', 'Irving', 'Garland', 'Frisco', 'McKinney', 'Amarillo', 'Grand Prairie',
    'Brownsville', 'Killeen', 'Pasadena', 'Mesquite', 'McAllen', 'Carrollton', 'Midland', 'Waco',
    'Denton', 'Abilene', 'Odessa', 'Beaumont', 'Round Rock', 'The Woodlands', 'Richardson', 'Pearland',
    'College Station', 'Wichita Falls', 'Lewisville', 'Tyler', 'San Angelo', 'League City', 'Allen', 'Sugar Land'
  ],
  'Utah': ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'St. George', 'Ogden', 'Layton', 'South Jordan', 'Lehi', 'Millcreek', 'Taylorsville', 'Logan', 'Murray'],
  'Vermont': ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier', 'Winooski', 'St. Albans', 'Newport', 'Vergennes', 'Brattleboro'],
  'Virginia': [
    'Virginia Beach', 'Chesapeake', 'Norfolk', 'Richmond', 'Newport News', 'Alexandria', 'Hampton',
    'Roanoke', 'Portsmouth', 'Suffolk', 'Lynchburg', 'Harrisonburg', 'Charlottesville', 'Danville',
    'Manassas', 'Petersburg', 'Fredericksburg', 'Winchester', 'Salem', 'Staunton', 'Fairfax'
  ],
  'Washington': [
    'Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Spokane Valley',
    'Federal Way', 'Yakima', 'Bellingham', 'Kennewick', 'Auburn', 'Pasco', 'Marysville', 'Lakewood',
    'Redmond', 'Shoreline', 'Richland', 'Kirkland', 'Olympia', 'Sammamish', 'Lacey', 'Edmonds', 'Bremerton'
  ],
  'West Virginia': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling', 'Weirton', 'Fairmont', 'Martinsburg', 'Beckley', 'Clarksburg'],
  'Wisconsin': [
    'Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Eau Claire',
    'Oshkosh', 'Janesville', 'West Allis', 'La Crosse', 'Sheboygan', 'Wauwatosa', 'Fond du Lac', 'Brookfield',
    'Wausau', 'New Berlin', 'Beloit', 'Greenfield', 'Manitowoc', 'West Bend', 'Sun Prairie', 'Superior'
  ],
  'Wyoming': ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan', 'Evanston', 'Green River', 'Jackson', 'Riverton']
};

// ==========================================================================
// 2. EUROPE (STRICTLY EXCLUDING THE UNITED KINGDOM)
// ==========================================================================
export const EUROPE_COUNTRIES = [
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Sweden',
  'Belgium', 'Austria', 'Switzerland', 'Norway', 'Denmark', 'Finland',
  'Ireland', 'Portugal', 'Greece', 'Czech Republic', 'Romania', 'Hungary',
  'Slovakia', 'Bulgaria', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia',
  'Estonia', 'Luxembourg', 'Cyprus', 'Malta', 'Iceland'
];

export const EUROPE_CITIES = {
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Dusseldorf', 'Cologne', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg', 'Mannheim'],
  'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Etienne', 'Le Havre', 'Grenoble'],
  'Italy': ['Milan', 'Rome', 'Turin', 'Bologna', 'Naples', 'Florence', 'Venice', 'Verona', 'Genoa', 'Padua', 'Brescia', 'Modena', 'Parma', 'Bergamo', 'Trieste'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Cordoba', 'Valladolid', 'Vigo', 'Gijon', 'A Coruna'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen', 'Enschede', 'Haarlem', 'Arnhem'],
  'Poland': ['Warsaw', 'Krakow', 'Lodz', 'Wroclaw', 'Poznan', 'Gdansk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Bialystok', 'Katowice', 'Gdynia', 'Czestochowa'],
  'Sweden': ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala', 'Vasteras', 'Orebro', 'Linkoping', 'Helsingborg', 'Jonkoping', 'Norrkoping', 'Lund', 'Umea'],
  'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liege', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen'],
  'Austria': ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Polten', 'Dornbirn'],
  'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel/Bienne'],
  'Norway': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromso', 'Sarpsborg'],
  'Denmark': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde'],
  'Finland': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyvaskyla', 'Lahti', 'Kuopio', 'Pori'],
  'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Bray', 'Navan'],
  'Portugal': ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setubal', 'Almada', 'Aveiro'],
  'Greece': ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Ioannina', 'Trikala', 'Chalcis', 'Serres'],
  'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Liberec', 'Olomouc', 'Ceske Budejovice', 'Hradec Kralove', 'Usti nad Labem', 'Pardubice'],
  'Romania': ['Bucharest', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Constanta', 'Craiova', 'Brasov', 'Galati', 'Ploiesti', 'Oradea'],
  'Hungary': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pecs', 'Gyor', 'Nyiregyhaza', 'Kecskemet', 'Szekesfehervar', 'Szombathely'],
  'Slovakia': ['Bratislava', 'Kosice', 'Presov', 'Zilina', 'Nitra', 'Banska Bystrica', 'Trnava', 'Martin', 'Trencin', 'Poprad'],
  'Bulgaria': ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven'],
  'Croatia': ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Slavonski Brod', 'Pula'],
  'Slovenia': ['Ljubljana', 'Maribor', 'Kranj', 'Celje', 'Koper', 'Novo Mesto'],
  'Lithuania': ['Vilnius', 'Kaunas', 'Klaipeda', 'Siauliai', 'Panevezys'],
  'Latvia': ['Riga', 'Daugavpils', 'Liepaja', 'Jelgava', 'Jurmala'],
  'Estonia': ['Tallinn', 'Tartu', 'Narva', 'Parnu', 'Kohtla-Jarve'],
  'Luxembourg': ['Luxembourg City', 'Esch-sur-Alzette', 'Differdange', 'Dudelange'],
  'Cyprus': ['Nicosia', 'Limassol', 'Larnaca', 'Paphos'],
  'Malta': ['Valletta', 'Birkirkara', 'Mosta', 'Qormi', 'Sliema'],
  'Iceland': ['Reykjavik', 'Kopavogur', 'Hafnarfjordur', 'Akureyri']
};

// ==========================================================================
// 3. NORTH AMERICA (USA, CANADA, MEXICO)
// ==========================================================================
export const NORTH_AMERICA_REGIONS = {
  'United States': US_STATES,
  'Canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador'],
  'Mexico': ['Mexico City', 'Jalisco', 'Nuevo Leon', 'Puebla', 'Guanajuato', 'State of Mexico', 'Chihuahua', 'Baja California', 'Coahuila', 'Queretaro', 'San Luis Potosi', 'Yucatan']
};

export const NORTH_AMERICA_CITIES = {
  ...US_STATE_CITIES,
  // Canada Provinces
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor'],
  'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Levis', 'Trois-Rivieres'],
  'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford', 'Coquitlam', 'Kelowna', 'Victoria'],
  'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'St. Albert', 'Medicine Hat', 'Grande Prairie'],
  'Manitoba': ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson'],
  'Saskatchewan': ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw'],
  'Nova Scotia': ['Halifax', 'Dartmouth', 'Sydney', 'Truro'],
  'New Brunswick': ['Moncton', 'Saint John', 'Fredericton'],
  'Newfoundland and Labrador': ['St. John\'s', 'Mount Pearl', 'Corner Brook'],
  // Mexico Regions
  'Mexico City': ['Mexico City', 'Iztapalapa', 'Gustavo A. Madero', 'Cuauhtemoc', 'Alvaro Obregon', 'Benito Juarez'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonala', 'Tlajomulco de Zuniga', 'Puerto Vallarta'],
  'Nuevo Leon': ['Monterrey', 'Guadalupe', 'Apodaca', 'San Nicolas de los Garza', 'General Escobedo', 'Santa Catarina', 'San Pedro Garza Garcia'],
  'Puebla': ['Puebla City', 'Tehuacan', 'San Martin Texmelucan', 'Cholula', 'Atlixco'],
  'Guanajuato': ['Leon', 'Irapuato', 'Celaya', 'Salamanca', 'Silao', 'Guanajuato City'],
  'State of Mexico': ['Ecatepec', 'Nezahualcoyotl', 'Naucalpan', 'Toluca', 'Tlalnepantla', 'Chimalhuacan'],
  'Chihuahua': ['Ciudad Juarez', 'Chihuahua City', 'Cuauhtemoc', 'Delicias', 'Hidalgo del Parral'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Rosarito', 'Tecate'],
  'Coahuila': ['Saltillo', 'Torreon', 'Monclova', 'Piedras Negras', 'Acuña'],
  'Queretaro': ['Santiago de Queretaro', 'San Juan del Rio', 'El Marques', 'Corregidora'],
  'San Luis Potosi': ['San Luis Potosi City', 'Soledad de Graciano Sanchez', 'Ciudad Valles', 'Matehuala'],
  'Yucatan': ['Merida', 'Kanasin', 'Valladolid', 'Tizimin', 'Progreso']
};

// ==========================================================================
// 4. CHINA (MAJOR INDUSTRIAL PROVINCES & MUNICIPALITIES)
// ==========================================================================
export const CHINA_PROVINCES = [
  'Guangdong', 'Jiangsu', 'Zhejiang', 'Shandong', 'Shanghai', 'Beijing',
  'Hebei', 'Henan', 'Sichuan', 'Hubei', 'Fujian', 'Tianjin',
  'Chongqing', 'Anhui', 'Hunan', 'Shaanxi', 'Liaoning', 'Jiangxi'
];

export const CHINA_CITIES = {
  'Guangdong': ['Shenzhen', 'Guangzhou', 'Dongguan', 'Foshan', 'Zhongshan', 'Huizhou', 'Zhuhai', 'Jiangmen', 'Shantou'],
  'Jiangsu': ['Suzhou', 'Wuxi', 'Nanjing', 'Changzhou', 'Nantong', 'Xuzhou', 'Yangzhou', 'Zhenjiang', 'Taizhou', 'Yancheng'],
  'Zhejiang': ['Hangzhou', 'Ningbo', 'Wenzhou', 'Jiaxing', 'Shaoxing', 'Jinhua', 'Taizhou', 'Huzhou'],
  'Shandong': ['Qingdao', 'Jinan', 'Yantai', 'Weifang', 'Zibo', 'Linyi', 'Jining', 'Weihai'],
  'Shanghai': ['Shanghai', 'Pudong', 'Minhang', 'Baoshan', 'Jiading', 'Songjiang'],
  'Beijing': ['Beijing', 'Chaoyang', 'Haidian', 'Daxing', 'Tongzhou', 'Changping'],
  'Hebei': ['Shijiazhuang', 'Tangshan', 'Baoding', 'Langfang', 'Cangzhou', 'Handan'],
  'Henan': ['Zhengzhou', 'Luoyang', 'Nanyang', 'Xinxiang', 'Anyang', 'Kaifeng'],
  'Sichuan': ['Chengdu', 'Mianyang', 'Deyang', 'Yibin', 'Nanchong', 'Luzhou'],
  'Hubei': ['Wuhan', 'Xiangyang', 'Yichang', 'Jingzhou', 'Huangshi', 'Xiaogan'],
  'Fujian': ['Xiamen', 'Fuzhou', 'Quanzhou', 'Zhangzhou', 'Putian'],
  'Tianjin': ['Tianjin', 'Binhai', 'Wuqing', 'Xiqing', 'Beichen'],
  'Chongqing': ['Chongqing', 'Yubei', 'Jiulongpo', 'Shapingba', 'Nan\'an', 'Jiangbei'],
  'Anhui': ['Hefei', 'Wuhu', 'Bengbu', 'Chuzhou', 'Ma\'anshan', 'Anqing'],
  'Hunan': ['Changsha', 'Zhuzhou', 'Xiangtan', 'Hengyang', 'Yueyang', 'Changde'],
  'Shaanxi': ['Xi\'an', 'Baoji', 'Xianyang', 'Weinan', 'Hanzhong'],
  'Liaoning': ['Shenyang', 'Dalian', 'Anshan', 'Fushun', 'Yingkou'],
  'Jiangxi': ['Nanchang', 'Ganzhou', 'Jiujiang', 'Yichun', 'Shangrao']
};

// ==========================================================================
// 5. INDIA (MAJOR COMMERCIAL & INDUSTRIAL STATES)
// ==========================================================================
export const INDIA_STATES = [
  'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Delhi NCR', 'Delhi',
  'Telangana', 'Haryana', 'Uttar Pradesh', 'West Bengal', 'Rajasthan',
  'Punjab', 'Andhra Pradesh', 'Kerala', 'Madhya Pradesh', 'Odisha', 'Bihar'
];

export const INDIA_CITIES = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Amravati'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Bharuch'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi'],
  'Delhi NCR': ['New Delhi', 'North Delhi', 'South Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Secunderabad'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat'],
  'Uttar Pradesh': ['Noida', 'Greater Noida', 'Kanpur', 'Lucknow', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Aligarh', 'Moradabad'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Kharagpur', 'Haldia'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur', 'Alappuzha', 'Palakkad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif']
};

// ==========================================================================
// 6. TERRITORY GROUP DEFINITIONS & RESOLVER
// ==========================================================================
export const TERRITORY_GROUPS = {
  'us': {
    name: 'United States',
    flag: '🇺🇸',
    defaultState: 'All States (Nationwide)',
    broadOption: 'All States (Nationwide)',
    items: US_STATES,
    cityMap: US_STATE_CITIES
  },
  'europe': {
    name: 'Europe (excl. UK)',
    flag: '🇪🇺',
    defaultState: 'All Europe (excl. UK)',
    broadOption: 'All Europe (excl. UK)',
    items: EUROPE_COUNTRIES,
    cityMap: EUROPE_CITIES
  },
  'north_america': {
    name: 'North America',
    flag: '🌎',
    defaultState: 'All North America',
    broadOption: 'All North America',
    items: ['United States', 'Canada', 'Mexico'],
    subItems: NORTH_AMERICA_REGIONS,
    cityMap: NORTH_AMERICA_CITIES
  },
  'china': {
    name: 'China',
    flag: '🇨🇳',
    defaultState: 'All China',
    broadOption: 'All China',
    items: CHINA_PROVINCES,
    cityMap: CHINA_CITIES
  },
  'india': {
    name: 'India',
    flag: '🇮🇳',
    defaultState: 'All India',
    broadOption: 'All India',
    items: INDIA_STATES,
    cityMap: INDIA_CITIES
  }
};

/**
 * Returns broad rotating geographic targets when searching broadly.
 * @param {string} territory - Region or state key
 * @returns {Array<{city: string, state: string, country: string}>}
 */
export function getBroadSearchMetros(territory = 'us') {
  const norm = (territory || '').toLowerCase().trim();

  // Europe (excluding UK)
  if (norm.includes('europe') || norm === 'eu') {
    const list = [];
    for (const country of EUROPE_COUNTRIES) {
      const cities = EUROPE_CITIES[country] || [country];
      for (const city of cities.slice(0, 3)) {
        list.push({ city, state: country, country });
      }
    }
    return list;
  }

  // North America
  if (norm.includes('north america') || norm === 'na') {
    const list = [];
    // Key US Metros
    const topUs = ['Chicago', 'Houston', 'Los Angeles', 'New York City', 'Dallas', 'Philadelphia', 'Atlanta', 'Detroit', 'Seattle', 'Phoenix'];
    for (const c of topUs) {
      list.push({ city: c, state: 'United States', country: 'United States' });
    }
    // Key Canada Metros
    const topCa = [
      { city: 'Toronto', state: 'Ontario' },
      { city: 'Montreal', state: 'Quebec' },
      { city: 'Vancouver', state: 'British Columbia' },
      { city: 'Calgary', state: 'Alberta' },
      { city: 'Ottawa', state: 'Ontario' }
    ];
    for (const ca of topCa) {
      list.push({ city: ca.city, state: ca.state, country: 'Canada' });
    }
    // Key Mexico Metros
    const topMx = [
      { city: 'Mexico City', state: 'Mexico City' },
      { city: 'Monterrey', state: 'Nuevo Leon' },
      { city: 'Guadalajara', state: 'Jalisco' },
      { city: 'Tijuana', state: 'Baja California' },
      { city: 'Puebla City', state: 'Puebla' }
    ];
    for (const mx of topMx) {
      list.push({ city: mx.city, state: mx.state, country: 'Mexico' });
    }
    return list;
  }

  // China
  if (norm.includes('china') || norm === 'cn') {
    const list = [];
    for (const prov of CHINA_PROVINCES) {
      const cities = CHINA_CITIES[prov] || [prov];
      for (const city of cities.slice(0, 3)) {
        list.push({ city, state: prov, country: 'China' });
      }
    }
    return list;
  }

  // India
  if (norm.includes('india') || norm === 'in') {
    const list = [];
    for (const st of INDIA_STATES) {
      const cities = INDIA_CITIES[st] || [st];
      for (const city of cities.slice(0, 3)) {
        list.push({ city, state: st, country: 'India' });
      }
    }
    return list;
  }

  // Default: United States (All 50 States + DC broad rotation)
  const usList = [];
  for (const st of US_STATES) {
    const cities = US_STATE_CITIES[st] || [st];
    for (const city of cities.slice(0, 2)) {
      usList.push({ city, state: st, country: 'United States' });
    }
  }
  return usList;
}

/**
 * Resolves cities for a specific state, country, or territory.
 * @param {string} stateOrTerritory
 * @returns {Array<string>}
 */
export function resolveTerritoryCities(stateOrTerritory) {
  if (!stateOrTerritory) return [];
  const target = stateOrTerritory.trim();

  if (US_STATE_CITIES[target]) return US_STATE_CITIES[target];
  if (EUROPE_CITIES[target]) return EUROPE_CITIES[target];
  if (NORTH_AMERICA_CITIES[target]) return NORTH_AMERICA_CITIES[target];
  if (CHINA_CITIES[target]) return CHINA_CITIES[target];
  if (INDIA_CITIES[target]) return INDIA_CITIES[target];

  return [target];
}
