const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let recordId = '';
let accountId = '';

// Test helper function
async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`${method} ${url}`);
    
    const response = await axios(config);
    console.log(`✅ Success: ${response.status} ${response.statusText}`);
    console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status} ${error.response?.statusText}`);
    console.log(`📄 Error Response:`, JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting SHARE Project API Tests...\n');
  
  try {
    // 1. Health Check
    await testEndpoint('Health Check', 'GET', '/health');
    
    // 2. Register User
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123',
      age: 25,
      interests: ['finance', 'technology']
    };
    await testEndpoint('Register User', 'POST', '/api/users/register', registerData);
    
    // 3. Login User
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePass123'
    };
    const loginResponse = await testEndpoint('Login User', 'POST', '/api/users/login', loginData);
    authToken = loginResponse.token;
    
    // 4. Get User Profile
    await testEndpoint('Get User Profile', 'GET', '/api/users/me', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // 5. Create Financial Record
    const financeData = {
      type: 'output',
      amount: 50.00,
      description: 'Grocery shopping',
      date: new Date().toISOString()
    };
    const financeResponse = await testEndpoint('Create Financial Record', 'POST', '/api/finance', financeData, {
      'Authorization': `Bearer ${authToken}`
    });
    recordId = financeResponse._id;
    
    // 6. Get User Financial Records
    await testEndpoint('Get User Financial Records', 'GET', '/api/finance', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // 7. Create Shared Account
    const accountData = {
      name: 'Test Shared Account',
      memberIds: []
    };
    const accountResponse = await testEndpoint('Create Shared Account', 'POST', '/api/shared-accounts', accountData, {
      'Authorization': `Bearer ${authToken}`
    });
    accountId = accountResponse._id;
    
    // 8. Get User's Shared Accounts
    await testEndpoint('Get User Shared Accounts', 'GET', '/api/shared-accounts', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // 9. Get Shared Account Details
    await testEndpoint('Get Shared Account Details', 'GET', `/api/shared-accounts/${accountId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // 10. Send Invitation
    const inviteData = {
      sharedAccountId: accountId,
      recipientEmail: 'friend@example.com',
      recipientPhone: '+1234567890'
    };
    await testEndpoint('Send Invitation', 'POST', '/api/invites/send', inviteData, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // 11. List Invitations
    await testEndpoint('List Invitations', 'GET', '/api/invites/list?status=pending', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health Check');
    console.log('✅ User Registration');
    console.log('✅ User Login');
    console.log('✅ User Profile');
    console.log('✅ Financial Record Creation');
    console.log('✅ Financial Records Retrieval');
    console.log('✅ Shared Account Creation');
    console.log('✅ Shared Accounts Retrieval');
    console.log('✅ Shared Account Details');
    console.log('✅ Invitation Sending');
    console.log('✅ Invitation Listing');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
}

// Run the tests
runTests();
