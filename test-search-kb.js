// Simple test to check what's actually in the knowledge base
// Run this to see what knowledge items exist

// This simulates what happens when we call retrieveContext
const testKnowledgeBase = async () => {
  console.log('🧪 Testing knowledge base contents...\n');

  // This would normally be imported from the database
  // For now, let's check what should be there from the initialize function

  console.log('📚 Knowledge Base Preview (first few entries):');
  const DEFAULT_KNOWLEDGE_BASE = [
    { content: "Tallman Equipment Co., Inc. — employee-owned; tools, rentals, testing for electric transmission & distribution;", timestamp: 0 },
    { content: "HQ: 6440 S International Dr, Columbus, IN 47201;", timestamp: 0 },
    { content: "Stringing Blocks — https://tallmanequipment.com/product-category/stringing-blocks/ — sheaves: standard→heli→grounded.; use: pay out & sag conductors cleanly. Also called stringing sheaves or conductor blocks.", timestamp: 0 }
  ];

  // Show what should match "stringer" queries
  const matchingEntries = DEFAULT_KNOWLEDGE_BASE.filter(item =>
    item.content.toLowerCase().includes('string')
  );

  console.log('🔍 Entries containing "string":', matchingEntries.length);
  matchingEntries.forEach((entry, i) => console.log(`  ${i+1}: ${entry.content.substring(0, 100)}...`));

  console.log('\n🎯 Test Search Query: "stringer block"');

  const query = 'stringer block';
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  console.log('Query words:', queryWords);

  const scoredDocuments = matchingEntries.map(doc => {
    const lowerContent = doc.content.toLowerCase();
    const docWords = new Set(lowerContent.split(/\s+/));
    let score = 0;

    // Exact word matches (case-insensitive)
    for (const word of queryWords) {
      if (docWords.has(word.toLowerCase())) {
        score += 3;
        console.log(`  ✓ Exact match: "${word}" (+3)`);
      }
    }

    // Partial matches (substring search)
    for (const word of queryWords) {
      const wordLower = word.toLowerCase();
      if (lowerContent.includes(wordLower)) {
        score += 2;
        console.log(`  ✓ Partial match: "${wordLower}" (+2)`);
      }

      // Check for variations
      if (wordLower === 'stringer' && lowerContent.includes('stringing')) {
        score += 2;
        console.log(`  ✓ Variation: stringer -> stringing (+2)`);
      }
      if (wordLower === 'stringing' && lowerContent.includes('stringer')) {
        score += 2;
        console.log(`  ✓ Variation: stringing -> stringer (+2)`);
      }
      if (wordLower.includes('string') && lowerContent.includes('stringing')) {
        score += 1;
        console.log(`  ✓ String related (+1)`);
      }
    }

    return { doc, score };
  });

  // Sort by score
  scoredDocuments.sort((a, b) => b.score - a.score);

  // Show results
  const results = scoredDocuments
    .filter(item => item.score > 0)
    .slice(0, 5)
    .map(item => item.doc.content);

  console.log(`\n✅ Search Results: ${results.length} items found`);
  results.forEach(result => console.log(`  - ${result.substring(0, 80)}...`));

  if (results.length === 0) {
    console.log('❌ Why no matches?: Check if knowledge base has "string" related content');
  }
};

testKnowledgeBase();
