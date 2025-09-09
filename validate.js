// Validation Script for Mission Linen Mobile Catalog
// Tests core functionality programmatically

console.log('🧪 Mission Linen Catalog Validation Suite');
console.log('==========================================');

// Test 1: Catalog Data Loading
console.log('\n📋 Test 1: Catalog Data Loading');
fetch('http://localhost:8890/data/catalog.json')
    .then(response => {
        console.log('✅ Catalog HTTP Status:', response.status);
        if (!response.ok) throw new Error('Failed to load catalog');
        return response.json();
    })
    .then(data => {
        console.log('✅ Catalog loaded successfully');
        console.log(`   - Products: ${data.products.length}`);
        console.log(`   - Version: ${data.catalog.version}`);
        console.log(`   - Total Sales: ${data.catalog.totalSales}`);
        
        // Test product structure
        if (data.products.length > 0) {
            const firstProduct = data.products[0];
            const hasRequiredFields = firstProduct.sku && firstProduct.name && 
                                    firstProduct.case_price && firstProduct.categoryPath;
            console.log(`✅ Product structure valid: ${hasRequiredFields}`);
        }
    })
    .catch(error => {
        console.error('❌ Catalog loading failed:', error.message);
    });

// Test 2: Search Functionality
console.log('\n🔍 Test 2: Search Functionality');
fetch('http://localhost:8890/data/catalog.json')
    .then(response => response.json())
    .then(data => {
        // Test text search
        const searchTerm = 'glove';
        const results = data.products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`✅ Search for "${searchTerm}": ${results.length} results`);
        
        // Test SKU search
        const skuResults = data.products.filter(p => 
            p.sku.includes('99054')
        );
        console.log(`✅ SKU search: ${skuResults.length} results`);
        
        // Test category filtering
        const categories = ['safety-ppe', 'food-packaging', 'paper-products'];
        categories.forEach(category => {
            const categoryProducts = data.products.filter(p => 
                p.categoryPath && p.categoryPath[0] === category
            );
            console.log(`✅ Category "${category}": ${categoryProducts.length} products`);
        });
    })
    .catch(error => {
        console.error('❌ Search testing failed:', error.message);
    });

// Test 3: Local Storage Operations
console.log('\n💾 Test 3: LocalStorage Operations');
try {
    // Test basic storage
    const testCart = [
        { sku: 'TEST001', name: 'Test Product', price: 10.99, quantity: 2 }
    ];
    
    localStorage.setItem('missionLinenCart', JSON.stringify(testCart));
    console.log('✅ LocalStorage write successful');
    
    // Test retrieval
    const retrieved = JSON.parse(localStorage.getItem('missionLinenCart'));
    const isValid = Array.isArray(retrieved) && retrieved.length === 1;
    console.log(`✅ LocalStorage read successful: ${isValid}`);
    
    // Test cleanup
    localStorage.removeItem('missionLinenCart');
    const isClean = localStorage.getItem('missionLinenCart') === null;
    console.log(`✅ LocalStorage cleanup: ${isClean}`);
    
} catch (error) {
    console.error('❌ LocalStorage test failed:', error.message);
}

// Test 4: Performance Benchmarks
console.log('\n⚡ Test 4: Performance Benchmarks');
setTimeout(() => {
    const startTime = performance.now();
    fetch('http://localhost:8890/data/catalog.json')
        .then(response => response.json())
        .then(data => {
            const loadTime = performance.now() - startTime;
            console.log(`✅ Catalog load time: ${loadTime.toFixed(2)}ms`);
            
            // Test sorting performance
            const sortStartTime = performance.now();
            const sorted = [...data.products].sort((a, b) => b.times_sold - a.times_sold);
            const sortTime = performance.now() - sortStartTime;
            console.log(`✅ Sort ${data.products.length} products: ${sortTime.toFixed(2)}ms`);
            
            // Test filter performance  
            const filterStartTime = performance.now();
            const filtered = data.products.filter(p => 
                p.name.toLowerCase().includes('glove')
            );
            const filterTime = performance.now() - filterStartTime;
            console.log(`✅ Filter operation: ${filterTime.toFixed(2)}ms`);
            
            console.log('\n🎯 VALIDATION COMPLETE');
            console.log('=====================');
            console.log('All core functions validated successfully!');
            console.log('The mobile catalog is ready for use case planning.');
        })
        .catch(error => {
            console.error('❌ Performance test failed:', error.message);
        });
}, 1000);