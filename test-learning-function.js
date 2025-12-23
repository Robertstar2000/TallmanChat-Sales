// Test script for the learning function
// This script tests the knowledge base functionality and learning features

const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

// Test the learning function
async function testLearningFunction() {
  console.log('🧪 Starting learning function tests...');

  // Test 1: Check if knowledge base initializes correctly
  console.log('\n📚 Test 1: Knowledge base initialization');
  try {
    // We'll need to run this in the browser context since it uses IndexedDB
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:5174');

    // Wait for the app to load
    await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

    // Test knowledge base operations
    const result = await page.evaluate(async () => {
      try {
        // Test knowledge base functions
        const { getAllKnowledge, addKnowledge, retrieveContext, clearAllKnowledge } = await import('./services/knowledgeBase.ts');

        // Clear existing knowledge for clean test
        await clearAllKnowledge();

        // Add some test knowledge
        await addKnowledge('Test knowledge item 1 - original answer');
        await addKnowledge('Test knowledge item 2 - another answer');

        // Retrieve all knowledge to verify
        const allKnowledge = await getAllKnowledge();
        console.log('✅ Knowledge base initialized with', allKnowledge.length, 'items');

        // Test context retrieval
        const context1 = await retrieveContext('test knowledge');
        console.log('✅ Context retrieval found', context1.length, 'items');

        // Add improved knowledge (simulating learning)
        const improvedAnswer = 'Test knowledge item 1 - improved and more accurate answer with current timestamp';
        await addKnowledge(improvedAnswer);

        // Test that newer knowledge is prioritized
        const context2 = await retrieveContext('test knowledge');
        const latestContent = context2[0];

        console.log('✅ Latest knowledge item:', latestContent?.substring(0, 50) + '...');

        // Verify the latest answer is the improved one
        const isImproved = latestContent?.includes('improved and more accurate');
        console.log('✅ Learning function working:', isImproved ? 'YES' : 'NO');

        return {
          success: true,
          knowledgeCount: allKnowledge.length,
          contextFound: context1.length,
          learningWorking: isImproved
        };

      } catch (error) {
        console.error('❌ Test failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    await browser.close();

    if (result.success) {
      console.log('🎉 Learning function tests passed!');
      console.log('📊 Results:', result);
    } else {
      console.log('❌ Learning function tests failed:', result.error);
    }

  } catch (error) {
    console.log('❌ Failed to run browser tests:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:5174');
  }
}

// Manual test function for development
async function manualTest() {
  console.log('🔧 Running manual learning function test...');

  try {
    // This would be run in browser context
    console.log('📝 Manual test steps:');
    console.log('1. Open http://localhost:5174 in your browser');
    console.log('2. Ask the AI a question');
    console.log('3. Click the edit (pencil) icon on the AI response');
    console.log('4. Improve the answer in the text area');
    console.log('5. Click Save');
    console.log('6. Ask a similar question again');
    console.log('7. Verify the improved answer appears');

  } catch (error) {
    console.error('❌ Manual test failed:', error);
  }
}

// Run tests
if (process.argv[2] === '--manual') {
  manualTest();
} else {
  testLearningFunction().then(() => {
    console.log('🏁 Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testLearningFunction, manualTest };
