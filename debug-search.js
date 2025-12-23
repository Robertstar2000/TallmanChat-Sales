// Debug script to test knowledge base search functionality
// This will help us understand why searches are failing

// Simulate the search functionality
async function debugSearch() {
  console.log('🔍 Debugging knowledge base search...');

  // Test data that should be in the knowledge base
  const testKnowledgeBase = [
    "Stringing Blocks — https://tallmanequipment.com/product-category/stringing-blocks/ — sheaves: standard→heli→grounded.; use: pay out & sag conductors cleanly. Also called stringing sheaves or conductor blocks.",
    "Stringing blocks: guide conductor/rope; spec groove bottom Ø & radius, lining (urethane/nylon/alum), angle rating, gate style.",
    "Rentals: T&D specialty — tensioners, pullers, traveling grounds, capstans, dynos, stringing blocks."
  ];

  // Test queries
  const testQueries = [
    'stringer',
    'stringing',
    'stringing block',
    'stringer block',
    'conductor block'
  ];

  console.log('\n📚 Test Knowledge Base:');
  testKnowledgeBase.forEach((item, index) => {
    console.log(`${index + 1}: ${item}`);
  });

  console.log('\n🔎 Testing Search Queries:');
  testQueries.forEach(query => {
    console.log(`\n--- Testing: "${query}" ---`);

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    console.log(`Query words: [${queryWords.join(', ')}]`);

    testKnowledgeBase.forEach((content, index) => {
      const lowerContent = content.toLowerCase();
      const docWords = lowerContent.split(/\s+/);
      let score = 0;

      // Exact word matches (case-insensitive)
      for (const word of queryWords) {
        if (docWords.includes(word.toLowerCase())) {
          score += 3;
        }
      }

      // Partial matches (substring search)
      for (const word of queryWords) {
        const wordLower = word.toLowerCase();
        if (lowerContent.includes(wordLower)) {
          score += 2;
        }

        // Check for variations (stringer vs stringing)
        if (wordLower === 'stringer' && lowerContent.includes('stringing')) {
          score += 2;
        }
        if (wordLower === 'stringing' && lowerContent.includes('stringer')) {
          score += 2;
        }
        if (wordLower.includes('string') && lowerContent.includes('stringing')) {
          score += 1;
        }
      }

      if (score > 0) {
        console.log(`✅ Match ${index + 1} (Score: ${score}): ${content.substring(0, 100)}...`);
      } else {
        console.log(`❌ No match ${index + 1}: ${content.substring(0, 100)}...`);
      }
    });
  });

  console.log('\n🎯 Expected Behavior:');
  console.log('- "stringer" should match "stringing" content');
  console.log('- "stringing" should match "stringer" content');
  console.log('- Both should return relevant results');
}

// Run the debug
debugSearch();
