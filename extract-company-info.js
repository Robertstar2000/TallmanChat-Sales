const fs = require('fs');
const { bulkAddKnowledge } = require('./services/knowledgeBase');

// Company history, facts, and information about Tallman Equipment
const companyInfo = [
  {
    content: "COMPANY FACT: Tallman Equipment was founded in the mid-1940s by John Tallman after his return from World War II in Chicago, Illinois.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: The company was incorporated in 1952 as Tallman Equipment Co., Inc. under Warren Tallman's leadership.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: In the 1970s, Tallman Equipment moved operations to Bensenville, Illinois, starting in an old barn and garage where tools were sold, rented, and repaired.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment developed Tallurine, a proprietary stringing-block reline formula still used today on select products.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tony Bozell, a former lineman, joined Tallman Equipment in 1995-1996, became owner, and served as President, CEO, and Chairman until 2023.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: In 2006-2008, Tallman Equipment expanded to Columbus, Indiana, moving into an old schoolhouse and later adding new buildings.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: The phrase 'Tallman full' became a verb in the industry, describing when operations were running out of space due to growth.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment established an Employee Stock Ownership Plan (ESOP) in 2014 to become employee-owned.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: In 2015-2017, the company built its new headquarters at 6440 S International Dr, Columbus, IN 47201, consolidating all operations under one roof.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment acquired Bradley Machining in 2016 in Addison, Illinois, specializing in precision CNC milling and turning.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: In 2020, Bradley Machining moved into a new 53,000 square foot facility in Addison, Illinois.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment opened its first showroom in Illinois in 2020.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Today, Tallman Equipment employs approximately 150 people across three locations.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment operates 11 departments: Sales, Rental, Shipping, Receiving, Stringing Block, Small Tool Repair, Cable Assembly & Prep, Rope, Fiberglass Tool Testing & Prep, Rubber Goods Lab, and Stress Testing.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: The company motto displayed in the Columbus lobby is 'Do the Right Thing.'",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment is the exclusive distributor of the DDIN line, offering 250+ field-proven tools designed for utility work.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: DDIN tools are 'lineman-proofed' through rigorous in-house testing and development with pragmatic upgrades to legacy patterns.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment serves IOUs (Investor-Owned Utilities), munis (municipal utilities), co-ops, EPCs (Engineering Procurement Construction), and line contractors.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: The company's mission is summed up as 'quality + convenience + reliability' and is 'built for linemen, proven in the field.'",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment offers complete services including rentals, tool repair, Custom rope fabrication, fiberglass tool testing, rubber goods testing, and temporary grounds/jumpers building and repair.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: The company specializes in electric transmission and distribution equipment, with telecom-adjacent capabilities for industrial applications where lines meet loads.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment holds inventory of utility staples for surge/storm preparation and offers nationwide shipping and project kitting on request.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Contact information: Main phone 877-860-5666, email sales@tallmanequipment.com, hours Monday-Friday 7-5 EST/CST.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment has three locations: Columbus, IN (headquarters), Addison, IL (sales, repair intake, Bradley Machining), and Lake City, FL (sales, rentals, Southeast coverage).",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Columbus HQ handles sales and rentals, jumper/ground building and repair, rope fabrication, fiberglass and rubber testing, and tool repair.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Lake City, FL location provides Southeast coverage, storm surge support, and handles sales, rentals, grounds/jumpers construction, and repair intake.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Addison, IL location offers sales counter, repair intake for work performed in Columbus, and is near Bradley Machining's facility.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment's rental specialty is T&D equipment including tensioners, pullers, traveling grounds, capstans, dynamometers, and stringing blocks.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tool repair services are centralized with QA and cover hydraulic/battery/manual cutters and presses, hoists/blocks/dynamometers, and multi-brand equipment.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Grounds and jumpers are spec-built to order, ASTM-conforming, with quick-turn assemblies and matching clamps/ferrules.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Rope fabrication includes double-braid and HMPE construction, transformer slings, winch lines for buckets/diggers, and master splicing.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Fiberglass tool services include inspection, cleaning, refinishing, dielectric testing, hot sticks, gaffs, ladders, arms, with serialized outputs.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Rubber goods services use NAIL-certified testing for Personal Protective Equipment (PPE) including gloves, sleeves, blankets, hoods, hose, and cover.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment stocks key brands including Hubbell/Chance, Hastings, BURNDY, Greenlee, Huskie, Jameson, Bashlin, Honeywell Salisbury, Bierer, HD Electric, Condux, Wagner-Smith, Sherman+Reilly, Samson, Yale Cordage, Fluke, and Milwaukee.",
    timestamp: Date.now()
  },
  {
    content: "COMPANY FACT: Tallman Equipment adheres to industry standards including ANSI C119.4 for connectors/crimps, ASTM F855 for temporary grounds, ASTM F1796 for voltage detectors, IEC 61481 for phasing comparators, and IEEE 524 for conductor installation.",
    timestamp: Date.now()
  }
];

async function addCompanyInfo() {
  try {
    console.log(`Adding ${companyInfo.length} company information facts to knowledge base...`);

    // Save to backup file first
    fs.writeFileSync('company-info-backup.json', JSON.stringify(companyInfo, null, 2));
    console.log('✅ Saved backup to company-info-backup.json');

    // Add to knowledge base
    await bulkAddKnowledge(companyInfo);
    console.log('✅ Successfully added company information to knowledge base');

    // Verify
    const { getAllKnowledge } = require('./services/knowledgeBase');
    const all = await getAllKnowledge();
    console.log(`📊 Total items in knowledge base: ${all.length}`);

  } catch (error) {
    console.error('❌ Error adding company information:', error);
  }
}

addCompanyInfo();
