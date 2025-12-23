const https = require('https');
const { bulkAddKnowledge } = require('./services/knowledgeBase');

// Hard-coded product categories and descriptions from tallmanequipment.com
const websiteData = [
  {
    content: `PRODUCT CATEGORY: Bags, Backpacks & Tool Holders
URL: https://tallmanequipment.com/product-category/canvas-bags-and-tool-holders/
DESCRIPTION: Professional storage solutions for tools and equipment including bags, backpacks, and holders designed for linemen and utility workers. Stow & stage tools, keep bucket clean, organize tools/parts on aerial work.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Battery Tools & Accessories
URL: https://tallmanequipment.com/product-category/battery-tools-and-accessories/
DESCRIPTION: Cordless battery-powered tools including drills, drivers, saws, lights, and related accessories. Designed for efficient work without power cords in remote locations.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Crimpers, Cutters, Compression Dies & Adapters
URL: https://tallmanequipment.com/product-category/crimpers-and-cutters/
DESCRIPTION: Professional tool sets for crimping and cutting electrical connectors and cables. Includes hydraulic and manual options, compression dies, and adapters for precise electrical work.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Climbing Gear
URL: https://tallmanequipment.com/product-category/climbing-gear/
DESCRIPTION: Specialized climbing equipment for utility workers including body belts, climbers, harnesses, and rescue tools for safe and efficient pole climbing operations.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Cover Up
URL: https://tallmanequipment.com/product-category/cover-up/
DESCRIPTION: Temporary insulation and grounding covers for protecting energized electrical components during maintenance and repair work.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: FiberGlass Tools & Accessories
URL: https://tallmanequipment.com/product-category/fiberglass-tools-and-accessories/
DESCRIPTION: Non-conductive fiberglass tools including hot sticks, ladders, poles, and attachments for live-line work and aerial operations.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Gas Powered Tools & Accessories
URL: https://tallmanequipment.com/product-category/gas-powered-tools-and-accessories/
DESCRIPTION: Gasoline-powered tools and accessories suitable for remote work locations where electricity is unavailable, including drills, drivers, and saws.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Grounding & Jumpering
URL: https://tallmanequipment.com/product-category/grounding-and-jumpering/
DESCRIPTION: Temporary grounding and jumper assemblies, clamps, cables, and related equipment for electrical safety during maintenance and construction work.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Hand Tools
URL: https://tallmanequipment.com/product-category/hand-tools/
DESCRIPTION: Essential hand tools for electrical work including pliers, screwdrivers, wrenches, knives, and other manual hand-operated tools.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Hydraulic Tools & Accessories
URL: https://tallmanequipment.com/product-category/hydraulic-tools-and-accessories/
DESCRIPTION: Hydraulic power tools, pumps, hoses, and accessories for high-force applications including cutters, crimpers, impact tools, and breakers.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Meters & Instruments
URL: https://tallmanequipment.com/product-category/instruments/
DESCRIPTION: Electrical testing and measurement equipment including multimeters, voltage detectors, phase comparators, underground locators, and power quality analyzers.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Personal Protective Equipment (PPE)
URL: https://tallmanequipment.com/product-category/ppe/
DESCRIPTION: Safety equipment including arc-rated clothing, insulating gloves, face shields, safety glasses, rubber goods, and other protective gear for electrical workers.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Rigging & Lifting
URL: https://tallmanequipment.com/product-category/rigging-and-lifting/
DESCRIPTION: Lifting and rigging equipment including slings, ropes, blocks, hardware, handlines, and capstan hoists for material handling and installation.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Stringing Blocks
URL: https://tallmanequipment.com/product-category/stringing-blocks/
DESCRIPTION: Conductor stringing blocks, sheaves, and pulleys used for guiding and tensioning overhead electrical cables during installation and maintenance.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Tree Trimming
URL: https://tallmanequipment.com/product-category/tree-trimming/
DESCRIPTION: Vegetation management tools including saws, pruners, and powered equipment for maintaining right-of-way clearance around power lines.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Truck Accessories
URL: https://tallmanequipment.com/product-category/truck-accessories/
DESCRIPTION: Utility truck equipment including covers, mats, pads, rescue tools, and accessories for fleet vehicles used in electrical work.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Underground Tools
URL: https://tallmanequipment.com/product-category/underground-tools/
DESCRIPTION: Tools and equipment for underground cable work including feeders, rodders, pulling eyes, duct rodders, manhole equipment, and locating tools.`,
    timestamp: Date.now()
  },
  {
    content: `PRODUCT CATEGORY: Utility Staplers
URL: https://tallmanequipment.com/product-category/utility-staplers/
DESCRIPTION: Staplers and staples for securing cables, wires, and fencing to wood poles and structures in utility applications.`,
    timestamp: Date.now()
  },
  // Company information pages
  {
    content: `COMPANY PAGE: About Tallman Equipment
URL: https://tallmanequipment.com/about/
DESCRIPTION: Company history, mission, and employee-owned business information about Tallman Equipment Company.`,
    timestamp: Date.now()
  },
  {
    content: `COMPANY PAGE: Services Overview
URL: https://tallmanequipment.com/services/
DESCRIPTION: Rental services, tool repair, testing and certification, custom rope assemblies, and other professional services offered by Tallman Equipment.`,
    timestamp: Date.now()
  },
  {
    content: `COMPANY PAGE: DDIN Products
URL: https://tallmanequipment.com/ddin/
DESCRIPTION: Exclusive distributor information for DDIN products including the DDIN Reel Lifter and other specialized utility equipment.`,
    timestamp: Date.now()
  }
];

async function addWebsiteData() {
  try {
    console.log(`Adding ${websiteData.length} website data entries to knowledge base...`);

    // Create backup
    const fs = require('fs');
    fs.writeFileSync('website-data-backup.json', JSON.stringify(websiteData, null, 2));
    console.log('✅ Saved backup to website-data-backup.json');

    // Add to knowledge base
    await bulkAddKnowledge(websiteData);
    console.log('✅ Successfully added website data to knowledge base');

    // Verify
    const { getAllKnowledge } = require('./services/knowledgeBase');
    const all = await getAllKnowledge();
    console.log(`📊 Total items in knowledge base: ${all.length}`);

  } catch (error) {
    console.error('❌ Error adding website data:', error);
  }
}

addWebsiteData();
