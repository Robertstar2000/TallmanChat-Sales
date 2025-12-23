import { KnowledgeItem } from '../types';
import * as db from './db';

// A knowledge base for Tallman Equipment.
const DEFAULT_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // Company overview & ethos
  { content: "Tallman Equipment Co., Inc. — employee-owned; tools, rentals, testing for electric transmission & distribution; origins post-WWII Chicago; incorporated 1952.", timestamp: 1759147200000 },
  { content: "HQ: 6440 S International Dr, Columbus, IN 47201; branches: 136 W Official Rd, Addison, IL 60101; 2018 SW Main Blvd, Lake City, FL 32025.", timestamp: 1759147260000 },
  { content: "Hours: Mon–Fri 7–5 (EST/CST). Main: 877-860-5666. Email: sales@tallmanequipment.com.", timestamp: 1759147320000 },
  { content: "Markets: IOUs, munis, co-ops, EPCs, line contractors; telecom-adjacent, industrial where lines meet loads.", timestamp: 1759147380000 },
  { content: "Mission shorthand: quality + convenience + reliability; built for linemen, proven in the field.", timestamp: 1759147440000 },

  // Heritage & story
  { content: "Mid-1940s: John Tallman returns from WWII; tool & service outfit starts downtown Chicago. 1952: Warren incorporates Tallman Equipment.", timestamp: 1759147500000 },
  { content: "1970s: move to Bensenville, IL; barn + garage era; selling/renting tools, repairing stringing blocks.", timestamp: 1759147560000 },
  { content: "Innovation: Tallurine — proprietary stringing-block reline formula; still in use on select products.", timestamp: 1759147620000 },
  { content: "1995–1996: Lineman Tony Bozell joins, then acquires; grows lines & services; later President→CEO→Chairman (2023).", timestamp: 1759147680000 },
  { content: "2006–2008: Columbus, IN operations expand (old schoolhouse + new buildings) — running out of space became a verb: 'Tallman full.'", timestamp: 1759147740000 },
  { content: "2014: ESOP established; 2015–2017: new HQ on International Dr, Columbus — consolidates sales, rentals, operations under one roof.", timestamp: 1759147800000 },
  { content: "2016: Bradley Machining acquisition (Addison, IL); 2020: Bradley moves into 53k sq-ft facility; Illinois sales opens first showroom.", timestamp: 1759147860000 },
  { content: "Today: 11 departments (Sales, Rental, Shipping, Receiving, Stringing Block, Small Tool Repair, Cable Assembly & Prep, Rope, Fiberglass Tool Testing & Prep, Rubber Goods Lab, Stress Testing). Motto in lobby: 'Do the Right Thing.'", timestamp: 1759147920000 },
  { content: "DDIN line: 250+ field-proven tools; 'lineman-proofed' in development; pragmatic upgrades to legacy patterns.", timestamp: 1759147980000 },

  // Locations & logistics
  { content: "Columbus HQ: sales & rentals; jumpers/grounds build & repair; rope fab; fiberglass & rubber testing (NAIL for PET); tool repair.", timestamp: 1759148040000 },
  { content: "Addison, IL: sales counter; repair intake (work performed in Columbus); Bradley Machining nearby supports fab.", timestamp: 1759148100000 },
  { content: "Lake City, FL: sales + rentals; grounds/jumpers construction; repair intake; Southeast coverage & storm surge support.", timestamp: 1759148160000 },

  // Services
  { content: "Rentals: T&D specialty — tensioners, pullers, traveling grounds, capstans, dynos, stringing blocks.", timestamp: 1759148220000 },
  { content: "Tool repair: hydraulic/battery/manual cutters & presses; hoists/blocks/dynamometers; multi-brand; centralized QA.", timestamp: 1759148280000 },
  { content: "Grounds & jumpers: spec→build→test; ASTM-conforming; quick-turn assemblies matched to clamps/ferrules.", timestamp: 1759148340000 },
  { content: "Rope fabrication: double-braid & HMPE; transformer slings; winch lines for buckets/diggers; master splicing.", timestamp: 1759148400000 },
  { content: "Fiberglass: inspect→clean→refinish→dielectric; hot sticks, gins, ladders, arms; serialized outputs.", timestamp: 1759148460000 },
  { content: "Rubber goods: wash, visual, dielectric test for gloves/sleeves/blankets/hoods/hose/cover; stamp, label, quarantine on fail.", timestamp: 1759148520000 },
  { content: "Catalog & media hub: product catalog + videos + specs; old-school PDF catalog available.", timestamp: 1759148580000 },

  // Standards
  { content: "Standards breadcrumbs: ANSI C119.4 (connectors/crimps), ASTM F855 (temporary grounds), ASTM F1796 (capacitive voltage detectors), IEC 61481 (phasing comparators), IEEE 524 (conductor install).", timestamp: 1759148640000 },

  // Key brands
  { content: "Key brands: Hubbell/Chance, Hastings, BURNDY, Greenlee, Huskie, Jameson, Bashlin, Honeywell Salisbury, Bierer, HD Electric, Condux, Wagner-Smith, Sherman+Reilly, Samson, Yale Cordage, Fluke, Milwaukee.", timestamp: 1759148700000 },

  // Contractor tools — cryptic use + spec hints
  { content: "Compression (battery/hydraulic): terminate/connect; spec tonnage (6/11/12/15), die system (U/PU/dieless), head (C/H/inline), connector standard (ANSI C119.4).", timestamp: 1759148760000 },
  { content: "Cable cutters (bat/hyd/ratchet): clean sever Cu/Al/ACSR; spec max OD & material; head (guillotine vs scissor); rescue latch for live-side clearance.", timestamp: 1759148820000 },
  { content: "Hoists (strap/chain/lever): lift/position; spec WLL, take-up, handle radius; alloy grade; choker vs direct.", timestamp: 1759148880000 },
  { content: "Dynamometers: confirm pull/sag; spec capacity, resolution, wireless readout, proof cert.", timestamp: 1759148940000 },
  { content: "Grips: bite conductor; spec family/diameter, rating, lining (rod/serrated), swivel fit.", timestamp: 1759149000000 },
  { content: "Swivels: decouple torque; spec line size, SWL, bearing type; block throat fit.", timestamp: 1759149060000 },
  { content: "Stringing blocks: guide conductor/rope; spec groove bottom Ø & radius, lining (urethane/nylon/alum), angle rating, gate style.", timestamp: 1759149120000 },
  { content: "Capstan hoists: controlled pull; spec line-pull, capstan Ø, rope type/size; anchorage & lead path.", timestamp: 1759149180000 },
  { content: "Temporary grounds (TPG): equipotential & fault path; spec ASTM class, clamp geometry (C/Y/Duckbill), cable length/ferrule, X/R basis.", timestamp: 1759149240000 },
  { content: "Voltage detectors: presence/absence only; spec kV class, type (aud/vis/numeric), live-line interface; for phasing use comparator (IEC 61481).", timestamp: 1759149300000 },
  { content: "Handlines & slings: lift/rig; spec fiber (polyester/HMPE), construction (double-braid/round), WLL tag, termination (spliced eye + thimble), D/d limits.", timestamp: 1759149360000 },

  // How-to: size stringing blocks
  { content: "Blocks: start with conductor OD (Dc). Groove-bottom Ø (Db) matters more than outer OD. Heuristic: Db ≈ 28×Dc; groove radius Rg ≈ 0.55×Dc; groove depth ≈ 1.25×Dc. Lining protects strands/jackets.", timestamp: 1759149420000 },
  { content: "Tensioners: bullwheel bottom-of-groove ≈ 39×Dc; lined segments avoid marking; match conductor family (ACSR/ACSS/OPGW).", timestamp: 1759149480000 },
  { content: "Corner math: block resultant P = 2·T·sin(θ/2). 0°→≈0; 90°→~1.41·T; 120°→~1.73·T; 180° wrap→~2·T. Rate for P, not just line T.", timestamp: 1759149540000 },
  { content: "Spec line: declare Dc, tension envelope, max angle per structure, lining, gate style (side/top), frame (open/full), hardware (socket/clevis/hook).", timestamp: 1759149600000 },

  // How-to: spec lifting / pulling ropes
  { content: "Fiber pick: polyester for capstans (heat, low stretch, abrasion); HMPE when strength/low mass rules; contamination kills dielectric.", timestamp: 1759149660000 },
  { content: "Construction: double-braid for capstan/winch; roundslings for lifting; kernmantle for access/control; follow maker's splice specs.", timestamp: 1759149720000 },
  { content: "D/d heuristics (synthetic): braided over sheaves ≥~8:1; laid ≥~10:1; pins ≥~3:1 radius. Bigger bends → longer life.", timestamp: 1759149780000 },
  { content: "Capstan pairing: use listed rope Ø/type; polyester DB handles friction/heat; keep wrap count; retire on glaze/flat/hard spots.", timestamp: 1759149840000 },
  { content: "WLL math: choose MBS & safety factor per ASME B30.9 + employer policy; tag slings; use chafe/thimbles; avoid tight D/d on hooks.", timestamp: 1759149900000 },

  // Every Tallman category (URL + short desc + what it's used for)
  { content: "Bags, Backpacks & Tool Holders — https://tallmanequipment.com/product-category/canvas-bags-and-tool-holders/ — stow & stage; keep the bucket clean.; use: organize tools/parts aloft; transport kits.", timestamp: 1759149960000 },
  { content: "Battery Tools & Accessories — https://tallmanequipment.com/product-category/battery-tools-and-accessories/ — cordless cut/drive/saw/light kits.; use: fast drilling/cutting/lighting sans hoses.", timestamp: 1759150020000 },
  { content: "Cable Preparation — https://tallmanequipment.com/product-category/cable-preparation-2/ — strip/score/chamfer systems.; use: prep primary/secondary before splice/termination.", timestamp: 1759150080000 },
  { content: "Climbing Gear — https://tallmanequipment.com/product-category/climbing-gear/ — belts, climbers, harnesses, rescue.; use: ascend/position on wood safely.", timestamp: 1759150140000 },
  { content: "Cover Up — https://tallmanequipment.com/product-category/cover-up/ — temporary insulation/guards.; use: shield adjacent energized parts.", timestamp: 1759150200000 },
  { content: "Crimpers, Cutters, Compression Dies & Adapters — https://tallmanequipment.com/product-category/crimpers-and-cutters/ — force & shear families.; use: cut conductors; compress connectors to spec.", timestamp: 1759150260000 },
  { content: "Fiberglass Tools & Accessories — https://tallmanequipment.com/product-category/fiberglass-tools-and-accessories/ — live-line sticks, ladders, attachments.; use: switch/test/measure at distance.", timestamp: 1759150320000 },
  { content: "Gas Powered Tools & Accessories — https://tallmanequipment.com/product-category/gas-powered-tools-and-accessories/ — fuel-driven drills/drivers/saws.; use: work where batteries falter.", timestamp: 1759150380000 },
  { content: "Grips & Swivels — https://tallmanequipment.com/product-category/grips-and-swivels/ — conductor grips + anti-twist links.; use: pull/tension without strand damage.", timestamp: 1759150440000 },
  { content: "Grounding & Jumpering — https://tallmanequipment.com/product-category/grounding-and-jumpering/ — ground/jumper sets & parts.; use: equipotential zones; fault paths.", timestamp: 1759150500000 },
  { content: "Hand Tools — https://tallmanequipment.com/product-category/hand-tools/ — everyday iron: pliers/wrenches/etc.; use: fit/cut/torque/measure.", timestamp: 1759150560000 },
  { content: "Hoists — https://tallmanequipment.com/product-category/hoists/ — strap/chain/roller/capstan blocks.; use: lift/pull/hold with control.", timestamp: 1759150620000 },
  { content: "Hydraulic Tools & Accessories — https://tallmanequipment.com/product-category/hydraulic-tools-and-accessories/ — low-pressure utility hydraulics.; use: impact, tamp, punch, pump at spec flow.", timestamp: 1759150680000 },
  { content: "Job Site Safety — https://tallmanequipment.com/product-category/job-site-safety/ — tents, traffic, lighting, tags.; use: mark & harden the work zone.", timestamp: 1759150740000 },
  { content: "Meters & Instruments — https://tallmanequipment.com/product-category/instruments/ — meters, phasing, detection, location.; use: verify presence/absence, phase, load, location.", timestamp: 1759150800000 },
  { content: "Pole Pulling & Setting — https://tallmanequipment.com/product-category/pole-pulling-and-setting/ — frames, augers, tongs, slings.; use: plant/remove poles with control.", timestamp: 1759150860000 },
  { content: "PPE — https://tallmanequipment.com/product-category/ppe/ — rubber/leather/helm/eye/foot.; use: protect the human in the loop.", timestamp: 1759150920000 },
  { content: "Rigging & Lifting — https://tallmanequipment.com/product-category/rigging-and-lifting/ — slings, rope, blocks, hardware.; use: route safe load paths.", timestamp: 1759150980000 },
  { content: "Stringing Blocks — https://tallmanequipment.com/product-category/stringing-blocks/ — sheaves: standard→heli→grounded.; use: pay out & sag conductors cleanly. Also called stringing sheaves or conductor blocks.", timestamp: 1759151040000 },
  { content: "Tree Trimming — https://tallmanequipment.com/product-category/tree-trimming/ — saws & pruners across powerheads.; use: vegetation management along ROW.", timestamp: 1759151100000 },
  { content: "Truck Accessories — https://tallmanequipment.com/product-category/truck-accessories/ — covers, mats, pads, rescue, grounding.; use: outfit fleet; stabilize & protect.", timestamp: 1759151160000 },
  { content: "Underground Tools — https://tallmanequipment.com/product-category/underground-tools/ — feeders, rodders, pulling eyes, manhole aids.; use: pull/locate in duct & vault.", timestamp: 1759151220000 },
  { content: "Utility Staplers — https://tallmanequipment.com/product-category/utility-staplers/ — battery/pneumatic staplers & staples.; use: fasten wire/fence/tags to wood.", timestamp: 1759151280000 },

  // Sales & intake
  { content: "Quotes, rentals, repairs: 877-860-5666 or web forms; branch counters accept drop-offs; Columbus executes repairs.", timestamp: 1759151340000 },
  { content: "Inventory: utility staples held for surge/storm; nationwide shipping; project kitting on request.", timestamp: 1759151400000 },

  // Additional technical definitions
  { content: "A stringer block based on common terminology in the power utility industry is a type of pulley that is used to string lines between a pole or tower and another pole or tower.", timestamp: 1773000000000 },
];


const initializeKnowledgeBase = async () => {
  try {
    const count = await db.countItems();
    if (count === 0) {
      console.log('Knowledge base is empty. Populating with default data.');
      const promises = DEFAULT_KNOWLEDGE_BASE.map(item => db.addItem(item));
      await Promise.all(promises);
    }
  } catch (error) {
    console.error("Failed to initialize knowledge base:", error);
  }
};

const BACKUP_FILE_HANDLE_KEY = 'backupFileHandle';
const LAST_BACKUP_TIMESTAMP_KEY = 'lastBackupTimestamp';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const autoBackupKnowledgeBase = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) {
    return;
  }

  try {
    const fileHandle = await db.getState(BACKUP_FILE_HANDLE_KEY) as FileSystemFileHandle | undefined;
    if (!fileHandle) return;
    
    const permission = await fileHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      console.warn('Permission to write to backup file not granted. Skipping automatic backup.');
      return;
    }

    const lastBackupTimestamp = await db.getState(LAST_BACKUP_TIMESTAMP_KEY) as number | undefined;
    const now = Date.now();

    if (lastBackupTimestamp && (now - lastBackupTimestamp < SEVEN_DAYS_MS)) {
      return;
    }
    
    console.log('Performing automatic knowledge base backup...');
    const allKnowledge = await getAllKnowledge();
    const blob = new Blob([JSON.stringify(allKnowledge, null, 2)], { type: 'application/json' });

    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    await db.setState(LAST_BACKUP_TIMESTAMP_KEY, now);
    console.log('Automatic backup successful.');

  } catch (error) {
    console.error('Automatic backup failed:', error);
  }
};


export const addKnowledge = async (content: string): Promise<void> => {
  if (!content.trim()) return;
  const newItem: KnowledgeItem = {
    content,
    timestamp: Date.now(),
  };
  try {
    await db.addItem(newItem);
  } catch (error) {
    console.error("Failed to save new knowledge:", error);
    throw error;
  }
};

export const getAllKnowledge = async (): Promise<KnowledgeItem[]> => {
  return db.getAllItems();
};

export const clearAllKnowledge = async (): Promise<void> => {
    return db.clearKnowledgeBase();
};

export const bulkAddKnowledge = async (items: KnowledgeItem[]): Promise<void> => {
  return db.bulkAddItems(items);
};

export const clearAndReloadKnowledgeBase = async (): Promise<void> => {
  console.log('🗑️ Clearing existing knowledge base...');
  await clearAllKnowledge();

  console.log('📚 Reloading knowledge base from DEFAULT_KNOWLEDGE_BASE...');
  await bulkAddKnowledge(DEFAULT_KNOWLEDGE_BASE);

  const count = await db.countItems();
  console.log(`✅ Knowledge base reloaded with ${count} items`);
};

/**
 * An enhanced retrieval function that improves search for short phrases and single words
 * by using multiple search strategies and expanding the search space.
 * @param query The user's search query.
 * @returns An array of relevant document contents.
 */
export const retrieveContext = async (query: string): Promise<string[]> => {
  console.log('🔍 retrieveContext called with query:', query);
  const queryLower = query.toLowerCase().trim();

  // For very short queries, expand search terms
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

  if (queryWords.length === 0) {
    console.log('❌ No query words found');
    return [];
  }

  console.log('📝 Query words:', queryWords);
  const knowledgeBase = await db.getAllItems();
  console.log('📚 Knowledge base items:', knowledgeBase.length);

  // Debug: Check if we have stringing-related content
  const stringingContent = knowledgeBase.filter(item =>
    item.content.toLowerCase().includes('stringing') ||
    item.content.toLowerCase().includes('stringer')
  );
  console.log('🔎 Stringing-related items found:', stringingContent.length);
  stringingContent.forEach(item => {
    console.log('  -', item.content.substring(0, 100) + '...');
  });

  const scoredDocuments = knowledgeBase.map(doc => {
    const lowerContent = doc.content.toLowerCase();
    let score = 0;
    let searchReasons: string[] = [];

    console.log(`\n📄 Evaluating: "${doc.content.substring(0, 60)}..."`);

    // 1. EXACT MATCHES (highest priority)
    queryWords.forEach(word => {
      if (word.length > 0) {
        const wordLower = word.toLowerCase();
        // Check for exact word matches (word boundaries)
        const regex = new RegExp(`\\b${wordLower}\\b`, 'i');
        if (regex.test(lowerContent)) {
          score += 5; // Increased weight for exact word matches
          searchReasons.push(`✓ Exact match: "${word}" (+5)`);
        }
      }
    });

    // 2. BLOCK/INCLUDED PHRASE MATCHES
    queryWords.forEach(word => {
      if (word.length > 0) {
        const wordLower = word.toLowerCase();
        if (lowerContent.includes(wordLower)) {
          score += 3; // Good weight for substring matches
          searchReasons.push(`✓ Contains: "${word}" (+3)`);
        }
      }
    });

    // 3. MULTI-WORD PHRASE MATCHES (for longer queries)
    if (queryWords.length > 1) {
      const phraseLower = queryLower;
      if (lowerContent.includes(phraseLower)) {
        score += 8; // High weight for full phrase matches
        searchReasons.push(`✓ Full phrase match (+8)`);
      }
    }

    // 4. PARTIAL PHRASE MATCHES
    if (queryWords.length > 1) {
      // Check if content contains most words from query
      const contentWords = lowerContent.split(/\s+/);
      let matchedWords = 0;
      queryWords.forEach(qWord => {
        if (qWord.length > 1 && contentWords.some(cWord =>
          cWord.toLowerCase().includes(qWord.toLowerCase()) ||
          qWord.toLowerCase().includes(cWord.toLowerCase())
        )) {
          matchedWords++;
        }
      });

      if (matchedWords >= Math.max(1, queryWords.length * 0.5)) { // 50% of words match
        const points = matchedWords * 1;
        score += points;
        searchReasons.push(`✓ Partial phrase (${matchedWords}/${queryWords.length} words) (+${points})`);
      }
    }

    // 5. SYNONYM/VARIATION MATCHING (specific to power/utility)
    const synonyms: { [key: string]: string[] } = {
      'stringer': ['stringing', 'blocks', 'pulley', 'conductor'],
      'stringing': ['stringer', 'blocks', 'pulley', 'conductor'],
      'blocks': ['stringer', 'stringing', 'pulley', 'conductor'],
      'location': ['address', 'where', 'hq', 'headquarters', 'office'],
      'contact': ['phone', 'email', 'number', 'reach', 'call'],
      'rental': ['rent', 'lease', 'borrow', 'equipment rental'],
      'repair': ['fix', 'service', 'maintenance', 'tool repair'],
      'testing': ['test', 'certification', 'inspection', 'check'],
      'tools': ['equipment', 'products', 'items', 'supplies']
    };

    queryWords.forEach(word => {
      if (word.length > 1 && synonyms[word.toLowerCase()]) {
        const syns = synonyms[word.toLowerCase()];
        const matchedSyn = syns.find(syn => lowerContent.includes(syn));
        if (matchedSyn) {
          score += 2;
          searchReasons.push(`✓ Synonym "${word}" → "${matchedSyn}" (+2)`);
        }
      }
    });

    // 6. TOPIC-BASED BOOSTING
    const topicBoosters = [
      { topic: 'location', keywords: ['location', 'located', 'address', 'headquarters', 'hq', 'office', 'warehouse', 'columbus', 'indiana', 'florida', 'where', 'drive', 'dr', 'street', 'st', 'website', 'online', 'nationwide', 'usa', 'branches', 'addison', 'lake', 'city', 'tallman'], boost: 20 },
      { topic: 'contact', keywords: ['contact', 'phone', 'email', 'call', 'reach', 'support'], boost: 15 },
      { topic: 'products', keywords: ['products', 'tools', 'equipment', 'catalog', 'inventory'], boost: 12 },
      { topic: 'services', keywords: ['services', 'rental', 'repair', 'testing', 'certification'], boost: 12 },
      { topic: 'company', keywords: ['company', 'tallman', 'about', 'history', 'overview'], boost: 15 }
    ];

    topicBoosters.forEach(booster => {
      if (queryWords.some(word => booster.keywords.includes(word.toLowerCase()))) {
        const boostWeight = booster.keywords.filter(k => lowerContent.includes(k)).length;
        if (boostWeight > 0) {
          const boost = boostWeight * booster.boost;
          score += boost;
          searchReasons.push(`✓ Topic boost (${booster.topic}) (+${boost})`);
        }
      }
    });

    // Log scoring details
    searchReasons.forEach(reason => console.log(`  ${reason}`));
    console.log(`  📊 Final score: ${score}`);

    return { doc, score, reasons: searchReasons };
  });

  // Sort by score (desc), then by timestamp (desc) to prioritize newer/relevant info
  scoredDocuments.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Prioritize newer items (higher timestamp = more recent)
    return b.doc.timestamp - a.doc.timestamp;
  });

  // Improved filtering: Include items with even lower scores for short queries
  const minScore = queryWords.length > 2 ? 1 : 0; // Allow zero scores for very short queries
  let results = scoredDocuments
    .filter(item => item.score >= minScore)
    .slice(0, Math.min(8, queryWords.length > 2 ? 5 : 10)) // More results for short queries
    .map(item => item.doc.content);

  // If no results found for short queries, try a broader search
  if (results.length === 0 && queryWords.length <= 3) {
    console.log('🔄 No results found, trying broader search...');

    // For single word or very short queries, look for any content that might be related
    const broadResults = knowledgeBase.filter(doc => {
      const lowerContent = doc.content.toLowerCase();
      // Check if any word in the query appears anywhere in the content
      return queryWords.some(word =>
        lowerContent.includes(word.toLowerCase()) ||
        word.toLowerCase().includes(lowerContent) ||
        // For single characters, check if they start words
        (word.length === 1 && lowerContent.includes(word.toLowerCase()))
      );
    }).slice(0, 3).map(doc => doc.content);

    if (broadResults.length > 0) {
      results = broadResults;
      console.log('✅ Found results with broad search');
    }
  }

  console.log('✅ Returning results:', results.length, 'items');
  results.forEach((result, i) => {
    console.log(`  [${i + 1}] ${result.substring(0, 80)}${result.length > 80 ? '...' : ''}`);
  });

  return results;
};

// Initialize on module load
initializeKnowledgeBase().then(() => {
  console.log('🚀 Knowledge base initialized');
}).catch(error => {
  console.error('❌ Failed to initialize knowledge base:', error);
});

autoBackupKnowledgeBase();
