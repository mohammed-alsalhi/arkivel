export type InfoboxFieldType = "text" | "textarea" | "number" | "wikilink" | "list";

export type InfoboxFieldDef = {
  key: string;
  label: string;
  type: InfoboxFieldType;
  placeholder?: string;
};

export type InfoboxSchema = {
  fields: InfoboxFieldDef[];
};

/** Infobox field schemas keyed by category slug (root or subcategory) */
export const INFOBOX_SCHEMAS: Record<string, InfoboxSchema> = {
  // ─── People (root fallback) ───────────────────────────────────
  people: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Full legal or known name" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and/or place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date and/or place of death" },
      { key: "nationality", label: "Nationality", type: "text", placeholder: "Country or cultural identity" },
      { key: "occupation", label: "Occupation", type: "text", placeholder: "Primary occupation or role" },
      { key: "knownFor", label: "Known For", type: "text", placeholder: "Notable achievements" },
      { key: "residence", label: "Residence", type: "wikilink", placeholder: "Place of residence" },
      { key: "affiliation", label: "Affiliation", type: "wikilink", placeholder: "Organization or group" },
      { key: "title", label: "Title", type: "text", placeholder: "Official title or rank" },
      { key: "spouse", label: "Spouse", type: "wikilink", placeholder: "Spouse or partner" },
      { key: "children", label: "Children", type: "list", placeholder: "Children (comma-separated)" },
      { key: "parents", label: "Parents", type: "list", placeholder: "Parents (comma-separated)" },
    ],
  },
  leaders: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Full legal or regnal name" },
      { key: "title", label: "Title", type: "text", placeholder: "King, President, Emperor, etc." },
      { key: "reign", label: "Reign", type: "text", placeholder: "Start – end of rule" },
      { key: "coronation", label: "Coronation", type: "text", placeholder: "Date of coronation or inauguration" },
      { key: "predecessor", label: "Predecessor", type: "wikilink", placeholder: "Previous holder of title" },
      { key: "successor", label: "Successor", type: "wikilink", placeholder: "Next holder of title" },
      { key: "dynasty", label: "Dynasty/House", type: "wikilink", placeholder: "Royal house or dynasty" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date and place of death" },
      { key: "spouse", label: "Spouse", type: "wikilink", placeholder: "Consort or spouse" },
      { key: "children", label: "Children", type: "list", placeholder: "Heirs and children (comma-separated)" },
      { key: "parents", label: "Parents", type: "list", placeholder: "Parents (comma-separated)" },
      { key: "religion", label: "Religion", type: "text", placeholder: "Faith or belief system" },
      { key: "residence", label: "Residence", type: "wikilink", placeholder: "Palace or seat of power" },
    ],
  },
  artists: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Birth or stage name" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date and place of death" },
      { key: "nationality", label: "Nationality", type: "text", placeholder: "Country or culture" },
      { key: "medium", label: "Medium", type: "text", placeholder: "Painting, sculpture, music, etc." },
      { key: "style", label: "Movement/Style", type: "text", placeholder: "Artistic movement or style" },
      { key: "notableWorks", label: "Notable Works", type: "list", placeholder: "Key works (comma-separated)" },
      { key: "influencedBy", label: "Influenced By", type: "list", placeholder: "Mentors or inspirations (comma-separated)" },
      { key: "influenced", label: "Influenced", type: "list", placeholder: "Students or followers (comma-separated)" },
      { key: "patron", label: "Patron", type: "wikilink", placeholder: "Patron or sponsor" },
      { key: "awards", label: "Awards", type: "list", placeholder: "Honors and awards (comma-separated)" },
      { key: "training", label: "Training", type: "text", placeholder: "Education or apprenticeship" },
    ],
  },
  scientists: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Full name" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date and place of death" },
      { key: "nationality", label: "Nationality", type: "text", placeholder: "Country or culture" },
      { key: "fields", label: "Fields", type: "list", placeholder: "Areas of study (comma-separated)" },
      { key: "institutions", label: "Institutions", type: "list", placeholder: "Universities, academies (comma-separated)" },
      { key: "almaMater", label: "Alma Mater", type: "text", placeholder: "Where they studied" },
      { key: "knownFor", label: "Known For", type: "list", placeholder: "Key discoveries (comma-separated)" },
      { key: "doctoralAdvisor", label: "Doctoral Advisor", type: "wikilink", placeholder: "Teacher or mentor" },
      { key: "notableStudents", label: "Notable Students", type: "list", placeholder: "Students (comma-separated)" },
      { key: "awards", label: "Awards", type: "list", placeholder: "Honors and awards (comma-separated)" },
    ],
  },
  warriors: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Full name or epithet" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date, place, and cause of death" },
      { key: "allegiance", label: "Allegiance", type: "wikilink", placeholder: "Nation, lord, or faction" },
      { key: "service", label: "Service/Branch", type: "text", placeholder: "Army, navy, personal guard, etc." },
      { key: "rank", label: "Rank", type: "text", placeholder: "Highest rank attained" },
      { key: "unit", label: "Unit", type: "wikilink", placeholder: "Military unit or regiment" },
      { key: "commands", label: "Commands", type: "list", placeholder: "Units commanded (comma-separated)" },
      { key: "battles", label: "Battles", type: "list", placeholder: "Battles fought (comma-separated)" },
      { key: "awards", label: "Awards", type: "list", placeholder: "Decorations and honors (comma-separated)" },
      { key: "weapon", label: "Weapon", type: "wikilink", placeholder: "Signature weapon" },
    ],
  },
  merchants: {
    fields: [
      { key: "fullName", label: "Full Name", type: "text", placeholder: "Full name" },
      { key: "born", label: "Born", type: "text", placeholder: "Date and place of birth" },
      { key: "died", label: "Died", type: "text", placeholder: "Date and place of death" },
      { key: "nationality", label: "Nationality", type: "text", placeholder: "Country or culture" },
      { key: "occupation", label: "Occupation", type: "text", placeholder: "Trader, banker, shopkeeper, etc." },
      { key: "guild", label: "Guild", type: "wikilink", placeholder: "Trade guild or association" },
      { key: "trade", label: "Trade Goods", type: "list", placeholder: "Primary goods traded (comma-separated)" },
      { key: "routes", label: "Trade Routes", type: "list", placeholder: "Routes traveled (comma-separated)" },
      { key: "residence", label: "Residence", type: "wikilink", placeholder: "Base of operations" },
      { key: "wealth", label: "Wealth", type: "text", placeholder: "Estimated wealth or rank" },
      { key: "knownFor", label: "Known For", type: "text", placeholder: "Notable achievements or ventures" },
    ],
  },

  // ─── Places (root fallback) ───────────────────────────────────
  places: {
    fields: [
      { key: "location", label: "Location", type: "text", placeholder: "Region, country, or coordinates" },
      { key: "type", label: "Type", type: "text", placeholder: "City, region, landmark, etc." },
      { key: "population", label: "Population", type: "text", placeholder: "Approximate population" },
      { key: "area", label: "Area", type: "text", placeholder: "Size in km² or other units" },
      { key: "founded", label: "Founded", type: "text", placeholder: "Founding date" },
      { key: "government", label: "Government", type: "text", placeholder: "Type of governance" },
      { key: "leader", label: "Leader", type: "wikilink", placeholder: "Current ruler or leader" },
      { key: "climate", label: "Climate", type: "text", placeholder: "Climate description" },
    ],
  },
  cities: {
    fields: [
      { key: "country", label: "Country", type: "wikilink", placeholder: "Nation or sovereign state" },
      { key: "region", label: "Region", type: "wikilink", placeholder: "Province, state, or territory" },
      { key: "founded", label: "Founded", type: "text", placeholder: "Year or date of founding" },
      { key: "founder", label: "Founder", type: "wikilink", placeholder: "Who founded it" },
      { key: "population", label: "Population", type: "text", placeholder: "Number of inhabitants" },
      { key: "demonym", label: "Demonym", type: "text", placeholder: "What residents are called" },
      { key: "area", label: "Area", type: "text", placeholder: "Size in km² or other units" },
      { key: "elevation", label: "Elevation", type: "text", placeholder: "Height above sea level" },
      { key: "government", label: "Government", type: "text", placeholder: "Type of governance" },
      { key: "leader", label: "Leader", type: "wikilink", placeholder: "Mayor, governor, or lord" },
      { key: "climate", label: "Climate", type: "text", placeholder: "Climate or weather patterns" },
      { key: "knownFor", label: "Known For", type: "text", placeholder: "Notable features or exports" },
      { key: "landmarks", label: "Landmarks", type: "list", placeholder: "Notable landmarks (comma-separated)" },
    ],
  },
  regions: {
    fields: [
      { key: "country", label: "Country", type: "wikilink", placeholder: "Nation or sovereign state" },
      { key: "capital", label: "Capital", type: "wikilink", placeholder: "Capital city or seat" },
      { key: "area", label: "Area", type: "text", placeholder: "Size in km² or other units" },
      { key: "population", label: "Population", type: "text", placeholder: "Number of inhabitants" },
      { key: "borders", label: "Borders", type: "list", placeholder: "Bordering regions (comma-separated)" },
      { key: "government", label: "Government", type: "text", placeholder: "Type of governance" },
      { key: "leader", label: "Leader", type: "wikilink", placeholder: "Governor or ruler" },
      { key: "terrain", label: "Terrain", type: "text", placeholder: "Mountains, plains, forest, etc." },
      { key: "climate", label: "Climate", type: "text", placeholder: "Climate or weather patterns" },
      { key: "resources", label: "Resources", type: "list", placeholder: "Natural resources (comma-separated)" },
      { key: "majorCities", label: "Major Cities", type: "list", placeholder: "Key settlements (comma-separated)" },
    ],
  },
  landmarks: {
    fields: [
      { key: "location", label: "Location", type: "wikilink", placeholder: "City, region, or country" },
      { key: "type", label: "Type", type: "text", placeholder: "Mountain, river, forest, monument, etc." },
      { key: "elevation", label: "Elevation/Height", type: "text", placeholder: "Height or depth" },
      { key: "length", label: "Length/Span", type: "text", placeholder: "Length, width, or diameter" },
      { key: "builtBy", label: "Built By", type: "wikilink", placeholder: "Creator or natural origin" },
      { key: "built", label: "Date", type: "text", placeholder: "When built or formed" },
      { key: "material", label: "Material", type: "text", placeholder: "Stone, wood, natural, etc." },
      { key: "status", label: "Status", type: "text", placeholder: "Current condition" },
      { key: "significance", label: "Significance", type: "textarea", placeholder: "Historical or cultural importance" },
    ],
  },
  buildings: {
    fields: [
      { key: "location", label: "Location", type: "wikilink", placeholder: "City or settlement" },
      { key: "type", label: "Type", type: "text", placeholder: "Temple, fortress, palace, etc." },
      { key: "built", label: "Built", type: "text", placeholder: "Year or period of construction" },
      { key: "architect", label: "Architect", type: "wikilink", placeholder: "Designer or builder" },
      { key: "style", label: "Architectural Style", type: "text", placeholder: "Gothic, classical, etc." },
      { key: "material", label: "Material", type: "text", placeholder: "Stone, wood, marble, etc." },
      { key: "height", label: "Height", type: "text", placeholder: "Height of structure" },
      { key: "floors", label: "Floors", type: "text", placeholder: "Number of floors or levels" },
      { key: "purpose", label: "Purpose", type: "text", placeholder: "Original and current use" },
      { key: "owner", label: "Owner", type: "wikilink", placeholder: "Current owner or occupant" },
      { key: "status", label: "Status", type: "text", placeholder: "Active, ruined, restored, etc." },
    ],
  },

  // ─── Organizations (root fallback) ────────────────────────────
  organizations: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Guild, military, religious, etc." },
      { key: "founded", label: "Founded", type: "text", placeholder: "When it was established" },
      { key: "dissolved", label: "Dissolved", type: "text", placeholder: "When disbanded (if applicable)" },
      { key: "leader", label: "Leader", type: "wikilink", placeholder: "Current leader or head" },
      { key: "headquarters", label: "Headquarters", type: "wikilink", placeholder: "Base of operations" },
      { key: "members", label: "Members", type: "text", placeholder: "Membership count or description" },
      { key: "purpose", label: "Purpose", type: "text", placeholder: "Primary objective or mission" },
      { key: "allies", label: "Allies", type: "list", placeholder: "Allied organizations (comma-separated)" },
    ],
  },
  governments: {
    fields: [
      { key: "country", label: "Country", type: "wikilink", placeholder: "Nation governed" },
      { key: "type", label: "Type", type: "text", placeholder: "Monarchy, republic, theocracy, etc." },
      { key: "headOfState", label: "Head of State", type: "wikilink", placeholder: "King, president, emperor" },
      { key: "headOfGov", label: "Head of Government", type: "wikilink", placeholder: "Prime minister, chancellor" },
      { key: "legislature", label: "Legislature", type: "text", placeholder: "Parliament, senate, council" },
      { key: "founded", label: "Founded", type: "text", placeholder: "When established" },
      { key: "capital", label: "Capital", type: "wikilink", placeholder: "Seat of government" },
      { key: "ideology", label: "Ideology", type: "text", placeholder: "Governing philosophy" },
      { key: "territory", label: "Territory", type: "list", placeholder: "Controlled regions (comma-separated)" },
      { key: "currency", label: "Currency", type: "text", placeholder: "Official currency" },
      { key: "officialLanguage", label: "Official Language", type: "text", placeholder: "Language(s) of state" },
    ],
  },
  military: {
    fields: [
      { key: "country", label: "Country", type: "wikilink", placeholder: "Nation or allegiance" },
      { key: "branch", label: "Branch", type: "text", placeholder: "Army, navy, air force, etc." },
      { key: "founded", label: "Founded", type: "text", placeholder: "Year of establishment" },
      { key: "disbanded", label: "Disbanded", type: "text", placeholder: "Year disbanded (if applicable)" },
      { key: "headquarters", label: "Headquarters", type: "wikilink", placeholder: "Base or fortress" },
      { key: "commander", label: "Commander", type: "wikilink", placeholder: "Commanding officer" },
      { key: "strength", label: "Strength", type: "text", placeholder: "Number of troops or ships" },
      { key: "equipment", label: "Equipment", type: "list", placeholder: "Key weapons or gear (comma-separated)" },
      { key: "engagements", label: "Engagements", type: "list", placeholder: "Notable battles (comma-separated)" },
      { key: "motto", label: "Motto", type: "text", placeholder: "Unit motto or creed" },
      { key: "colors", label: "Colors", type: "text", placeholder: "Banner colors or insignia" },
    ],
  },
  religious: {
    fields: [
      { key: "religion", label: "Religion", type: "wikilink", placeholder: "Faith or belief system" },
      { key: "founded", label: "Founded", type: "text", placeholder: "When established" },
      { key: "founder", label: "Founder", type: "wikilink", placeholder: "Who founded it" },
      { key: "headquarters", label: "Headquarters", type: "wikilink", placeholder: "Main temple or seat" },
      { key: "leader", label: "Leader", type: "wikilink", placeholder: "High priest, pope, elder" },
      { key: "deity", label: "Deity", type: "wikilink", placeholder: "God or gods worshipped" },
      { key: "members", label: "Members", type: "text", placeholder: "Number of followers" },
      { key: "scripture", label: "Scripture", type: "wikilink", placeholder: "Holy text or canon" },
      { key: "holySites", label: "Holy Sites", type: "list", placeholder: "Sacred locations (comma-separated)" },
      { key: "practices", label: "Practices", type: "textarea", placeholder: "Rituals and observances" },
    ],
  },
  guilds: {
    fields: [
      { key: "trade", label: "Trade", type: "text", placeholder: "Craft, skill, or profession" },
      { key: "founded", label: "Founded", type: "text", placeholder: "When established" },
      { key: "headquarters", label: "Headquarters", type: "wikilink", placeholder: "Guild hall location" },
      { key: "guildmaster", label: "Guildmaster", type: "wikilink", placeholder: "Current leader" },
      { key: "members", label: "Members", type: "text", placeholder: "Number of members" },
      { key: "ranks", label: "Ranks", type: "list", placeholder: "Apprentice, journeyman, etc. (comma-separated)" },
      { key: "motto", label: "Motto", type: "text", placeholder: "Guild motto" },
      { key: "allies", label: "Allies", type: "list", placeholder: "Allied guilds (comma-separated)" },
      { key: "rivals", label: "Rivals", type: "list", placeholder: "Rival guilds (comma-separated)" },
      { key: "services", label: "Services", type: "textarea", placeholder: "What the guild provides" },
    ],
  },

  // ─── Events (root fallback) ───────────────────────────────────
  events: {
    fields: [
      { key: "date", label: "Date", type: "text", placeholder: "When it occurred" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it took place" },
      { key: "participants", label: "Participants", type: "list", placeholder: "Key participants (comma-separated)" },
      { key: "outcome", label: "Outcome", type: "text", placeholder: "Result or consequence" },
      { key: "cause", label: "Cause", type: "text", placeholder: "What triggered the event" },
      { key: "partOf", label: "Part Of", type: "wikilink", placeholder: "Larger event or conflict" },
      { key: "duration", label: "Duration", type: "text", placeholder: "How long it lasted" },
    ],
  },
  battles: {
    fields: [
      { key: "conflict", label: "Conflict", type: "wikilink", placeholder: "War or campaign this is part of" },
      { key: "date", label: "Date", type: "text", placeholder: "Date(s) of the battle" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it was fought" },
      { key: "result", label: "Result", type: "text", placeholder: "Victory, defeat, draw, etc." },
      { key: "side1", label: "Side 1", type: "list", placeholder: "First belligerent(s) (comma-separated)" },
      { key: "side2", label: "Side 2", type: "list", placeholder: "Second belligerent(s) (comma-separated)" },
      { key: "commander1", label: "Commanders (Side 1)", type: "list", placeholder: "Leaders of side 1 (comma-separated)" },
      { key: "commander2", label: "Commanders (Side 2)", type: "list", placeholder: "Leaders of side 2 (comma-separated)" },
      { key: "strength1", label: "Strength (Side 1)", type: "text", placeholder: "Troops, ships, etc." },
      { key: "strength2", label: "Strength (Side 2)", type: "text", placeholder: "Troops, ships, etc." },
      { key: "casualties1", label: "Casualties (Side 1)", type: "text", placeholder: "Killed, wounded, captured" },
      { key: "casualties2", label: "Casualties (Side 2)", type: "text", placeholder: "Killed, wounded, captured" },
    ],
  },
  ceremonies: {
    fields: [
      { key: "date", label: "Date", type: "text", placeholder: "When it takes place" },
      { key: "frequency", label: "Frequency", type: "text", placeholder: "Annual, monthly, one-time, etc." },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it takes place" },
      { key: "organizedBy", label: "Organized By", type: "wikilink", placeholder: "Institution or person" },
      { key: "purpose", label: "Purpose", type: "text", placeholder: "Why it is held" },
      { key: "participants", label: "Participants", type: "list", placeholder: "Who participates (comma-separated)" },
      { key: "duration", label: "Duration", type: "text", placeholder: "How long it lasts" },
      { key: "traditions", label: "Traditions", type: "textarea", placeholder: "Customs and rituals performed" },
      { key: "significance", label: "Significance", type: "text", placeholder: "Cultural or religious importance" },
    ],
  },
  discoveries: {
    fields: [
      { key: "date", label: "Date", type: "text", placeholder: "When it was discovered" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it was discovered" },
      { key: "discoverer", label: "Discoverer", type: "wikilink", placeholder: "Who made the discovery" },
      { key: "field", label: "Field", type: "text", placeholder: "Science, geography, magic, etc." },
      { key: "method", label: "Method", type: "text", placeholder: "How it was discovered" },
      { key: "significance", label: "Significance", type: "textarea", placeholder: "Impact and importance" },
      { key: "relatedTo", label: "Related To", type: "list", placeholder: "Related discoveries (comma-separated)" },
    ],
  },
  disasters: {
    fields: [
      { key: "date", label: "Date", type: "text", placeholder: "When it occurred" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it struck" },
      { key: "type", label: "Type", type: "text", placeholder: "Earthquake, flood, plague, etc." },
      { key: "cause", label: "Cause", type: "text", placeholder: "What caused it" },
      { key: "deaths", label: "Deaths", type: "text", placeholder: "Number of fatalities" },
      { key: "injuries", label: "Injuries", type: "text", placeholder: "Number of injured" },
      { key: "damage", label: "Damage", type: "text", placeholder: "Property and infrastructure damage" },
      { key: "area", label: "Area Affected", type: "text", placeholder: "Size of affected area" },
      { key: "aftermath", label: "Aftermath", type: "textarea", placeholder: "Long-term consequences" },
    ],
  },

  // ─── Things (root fallback) ───────────────────────────────────
  things: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Weapon, artifact, tool, etc." },
      { key: "creator", label: "Creator", type: "wikilink", placeholder: "Who made it" },
      { key: "origin", label: "Origin", type: "wikilink", placeholder: "Where it came from" },
      { key: "material", label: "Material", type: "text", placeholder: "What it's made of" },
      { key: "status", label: "Status", type: "text", placeholder: "Current condition or whereabouts" },
      { key: "owner", label: "Owner", type: "wikilink", placeholder: "Current or last known owner" },
      { key: "properties", label: "Properties", type: "textarea", placeholder: "Special abilities or features" },
    ],
  },
  weapons: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Sword, bow, axe, staff, etc." },
      { key: "origin", label: "Origin", type: "wikilink", placeholder: "Where it was made" },
      { key: "creator", label: "Creator/Smith", type: "wikilink", placeholder: "Who forged or crafted it" },
      { key: "created", label: "Date Created", type: "text", placeholder: "When it was made" },
      { key: "material", label: "Material", type: "text", placeholder: "Steel, enchanted iron, etc." },
      { key: "length", label: "Length", type: "text", placeholder: "Overall length" },
      { key: "weight", label: "Weight", type: "text", placeholder: "Weight of the weapon" },
      { key: "usedBy", label: "Used By", type: "list", placeholder: "Notable wielders (comma-separated)" },
      { key: "battles", label: "Battles", type: "list", placeholder: "Notable battles (comma-separated)" },
      { key: "owner", label: "Current Owner", type: "wikilink", placeholder: "Current or last owner" },
      { key: "status", label: "Status", type: "text", placeholder: "Intact, lost, destroyed, etc." },
      { key: "properties", label: "Properties", type: "textarea", placeholder: "Magical or special abilities" },
    ],
  },
  artifacts: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Amulet, ring, orb, relic, etc." },
      { key: "origin", label: "Origin", type: "wikilink", placeholder: "Where it was created" },
      { key: "creator", label: "Creator", type: "wikilink", placeholder: "Who made or enchanted it" },
      { key: "created", label: "Date Created", type: "text", placeholder: "When it was made" },
      { key: "material", label: "Material", type: "text", placeholder: "What it's made of" },
      { key: "age", label: "Age", type: "text", placeholder: "How old it is" },
      { key: "powers", label: "Powers", type: "textarea", placeholder: "Magical properties or abilities" },
      { key: "owner", label: "Owner", type: "wikilink", placeholder: "Current or last known owner" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it is kept" },
      { key: "previousOwners", label: "Previous Owners", type: "list", placeholder: "Past owners (comma-separated)" },
      { key: "status", label: "Status", type: "text", placeholder: "Intact, damaged, lost, etc." },
    ],
  },
  documents: {
    fields: [
      { key: "fullTitle", label: "Full Title", type: "text", placeholder: "Complete title of the work" },
      { key: "author", label: "Author", type: "wikilink", placeholder: "Who wrote it" },
      { key: "date", label: "Date Written", type: "text", placeholder: "When it was written" },
      { key: "language", label: "Language", type: "text", placeholder: "Language it's written in" },
      { key: "material", label: "Material", type: "text", placeholder: "Parchment, papyrus, stone, etc." },
      { key: "pages", label: "Pages/Length", type: "text", placeholder: "Number of pages or length" },
      { key: "subject", label: "Subject", type: "text", placeholder: "Topic or content" },
      { key: "location", label: "Location", type: "wikilink", placeholder: "Where it is kept" },
      { key: "copies", label: "Known Copies", type: "text", placeholder: "Number of surviving copies" },
      { key: "significance", label: "Significance", type: "textarea", placeholder: "Historical or cultural importance" },
      { key: "status", label: "Status", type: "text", placeholder: "Intact, fragmentary, lost, etc." },
    ],
  },
  tools: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Instrument, device, apparatus, etc." },
      { key: "origin", label: "Origin", type: "wikilink", placeholder: "Where it was made" },
      { key: "creator", label: "Creator", type: "wikilink", placeholder: "Who made it" },
      { key: "created", label: "Date Created", type: "text", placeholder: "When it was made" },
      { key: "material", label: "Material", type: "text", placeholder: "What it's made of" },
      { key: "usedFor", label: "Used For", type: "text", placeholder: "Primary function or purpose" },
      { key: "usedBy", label: "Used By", type: "list", placeholder: "Who uses it (comma-separated)" },
      { key: "owner", label: "Owner", type: "wikilink", placeholder: "Current owner" },
      { key: "status", label: "Status", type: "text", placeholder: "Working, broken, lost, etc." },
    ],
  },

  // ─── Concepts (root fallback) ─────────────────────────────────
  concepts: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Magic system, philosophy, law, etc." },
      { key: "domain", label: "Domain", type: "text", placeholder: "Field or area of knowledge" },
      { key: "origin", label: "Origin", type: "text", placeholder: "Where concept originated" },
      { key: "relatedTo", label: "Related To", type: "list", placeholder: "Related concepts (comma-separated)" },
      { key: "practitioners", label: "Practitioners", type: "text", placeholder: "Who uses or follows this" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Brief explanation" },
    ],
  },
  magic: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Arcane, divine, elemental, etc." },
      { key: "source", label: "Source", type: "text", placeholder: "Where the power comes from" },
      { key: "discoveredBy", label: "Discovered By", type: "wikilink", placeholder: "Who first practiced it" },
      { key: "practitioners", label: "Practitioners", type: "list", placeholder: "Known practitioners (comma-separated)" },
      { key: "requirements", label: "Requirements", type: "textarea", placeholder: "What is needed to use it" },
      { key: "limitations", label: "Limitations", type: "textarea", placeholder: "Weaknesses or restrictions" },
      { key: "relatedSchools", label: "Related Schools", type: "list", placeholder: "Related magic types (comma-separated)" },
      { key: "applications", label: "Applications", type: "list", placeholder: "Common uses (comma-separated)" },
      { key: "origin", label: "Origin", type: "text", placeholder: "Where or when it originated" },
    ],
  },
  religions: {
    fields: [
      { key: "type", label: "Type", type: "text", placeholder: "Monotheistic, polytheistic, animistic, etc." },
      { key: "founder", label: "Founder", type: "wikilink", placeholder: "Who founded it" },
      { key: "founded", label: "Founded", type: "text", placeholder: "When it was founded" },
      { key: "deities", label: "Deity/Deities", type: "list", placeholder: "Gods worshipped (comma-separated)" },
      { key: "holyText", label: "Holy Text", type: "wikilink", placeholder: "Sacred scripture" },
      { key: "followers", label: "Followers", type: "text", placeholder: "Number or group of followers" },
      { key: "holySites", label: "Holy Sites", type: "list", placeholder: "Sacred places (comma-separated)" },
      { key: "clergy", label: "Clergy", type: "text", placeholder: "Priests, monks, shamans, etc." },
      { key: "practices", label: "Practices", type: "textarea", placeholder: "Rituals, prayers, and customs" },
      { key: "beliefs", label: "Core Beliefs", type: "textarea", placeholder: "Central tenets and doctrines" },
    ],
  },
  laws: {
    fields: [
      { key: "enacted", label: "Enacted", type: "text", placeholder: "When it was enacted" },
      { key: "enactedBy", label: "Enacted By", type: "wikilink", placeholder: "Who created or passed it" },
      { key: "jurisdiction", label: "Jurisdiction", type: "wikilink", placeholder: "Where it applies" },
      { key: "type", label: "Type", type: "text", placeholder: "Criminal, civil, religious, etc." },
      { key: "purpose", label: "Purpose", type: "text", placeholder: "Why it was enacted" },
      { key: "penalties", label: "Penalties", type: "textarea", placeholder: "Punishments for violation" },
      { key: "status", label: "Status", type: "text", placeholder: "Active, repealed, amended, etc." },
      { key: "supersedes", label: "Supersedes", type: "wikilink", placeholder: "Previous law it replaced" },
      { key: "supersededBy", label: "Superseded By", type: "wikilink", placeholder: "Law that replaced it" },
      { key: "enforcedBy", label: "Enforced By", type: "wikilink", placeholder: "Who enforces it" },
    ],
  },
  languages: {
    fields: [
      { key: "family", label: "Language Family", type: "text", placeholder: "Language family or group" },
      { key: "speakers", label: "Speakers", type: "text", placeholder: "Number of speakers" },
      { key: "region", label: "Region", type: "list", placeholder: "Where it is spoken (comma-separated)" },
      { key: "writingSystem", label: "Writing System", type: "text", placeholder: "Alphabet, script, or glyphs" },
      { key: "officialStatus", label: "Official Status", type: "text", placeholder: "Official language of..." },
      { key: "ancestor", label: "Ancestor Language", type: "wikilink", placeholder: "Language it descended from" },
      { key: "relatedLanguages", label: "Related Languages", type: "list", placeholder: "Related languages (comma-separated)" },
      { key: "createdBy", label: "Created By", type: "wikilink", placeholder: "Creator (if constructed)" },
      { key: "era", label: "Era", type: "text", placeholder: "When it was spoken or created" },
    ],
  },
};

type CategoryInfo = { slug: string; parentId: string | null; id: string };

/**
 * Resolve the infobox schema for a category.
 * First checks for an exact subcategory match, then walks up the parent
 * chain to find a root category fallback.
 */
export function getInfoboxSchema(
  categorySlug: string,
  categories: CategoryInfo[]
): InfoboxSchema | null {
  const byId = new Map(categories.map((c) => [c.id, c]));

  let current = categories.find((c) => c.slug === categorySlug);
  while (current) {
    if (INFOBOX_SCHEMAS[current.slug]) {
      return INFOBOX_SCHEMAS[current.slug];
    }
    if (current.parentId) {
      current = byId.get(current.parentId);
    } else {
      break;
    }
  }
  return null;
}
