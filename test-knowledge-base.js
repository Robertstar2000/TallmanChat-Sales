// Test script to check what's actually in the knowledge base
// and test the search functionality

// Simulate the exact search logic from knowledgeBase.ts
function testSearch() {
  console.log('🔍 Testing Knowledge Base Search Logic\n');

  // Test knowledge base entries that should exist
  const testEntries = [
    "Stringing Blocks — https://tallmanequipment.com/product-category/stringing-blocks/ — sheaves: standard→heli→grounded.; use: pay out & sag conductors cleanly. Also called stringing sheaves or conductor blocks.",
    "Stringing blocks: guide conductor/rope; spec groove bottom Ø & radius, lining (urethane/nylon/alum), angle rating, gate style.",
    "Rentals: T&D specialty — tensioners, pullers, traveling grounds, capstans, dynos, stringing blocks."
  ];

  // Test queries
  const queries = ['stringer', 'stringing', 'stringing block'];

  console.log('📚 Knowledge Base Entries:');
  testEntries.forEach((entry, i) => {
    console.log(`${i + 1}: "${entry}"`);
  });

  console.log('\n🔎 Testing Queries:');
  queries.forEach(query => {
    console.log(`\n--- Query: "${query}" ---`);

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    console.log(`Words: [${queryWords.join(', ')}]`);

    // Score each entry
    testEntries.forEach((content, index) => {
      const lowerContent = content.toLowerCase();
      const docWords = lowerContent.split(/\s+/);
      let score = 0;

      // Exact word matches (case-insensitive)
      for (const word of queryWords) {
        if (docWords.includes(word)) {
          score += 3;
          console.log(`  ✓ Exact match: "${word}"`);
        }
      }

      // Partial matches (substring search)
      for (const word of queryWords) {
        if (lowerContent.includes(word)) {
          score += 2;
          console.log(`  ✓ Partial match: "${word}"`);
        }

        // Check for variations
        if (word === 'stringer' && lowerContent.includes('stringing')) {
          score += 2;
          console.log(`  ✓ Variation match: stringer -> stringing`);
        }
        if (word === 'stringing' && lowerContent.includes('stringer')) {
          score += 2;
          console.log(`  ✓ Variation match: stringing -> stringer`);
        }
      }

      console.log(`Entry ${index + 1} Score: ${score}`);
      if (score > 0) {
        console.log(`✅ WOULD RETURN: "${content.substring(0, 80)}..."`);
      } else {
        console.log(`❌ NO MATCH`);
      }
    });
  });
}

testSearch();
