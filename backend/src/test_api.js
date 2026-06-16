async function testApi() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bhargavvana80@gmail.com',
        password: 'Bhargav11@prasad'
      })
    });

    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in successfully, token retrieved.');

    const performanceRes = await fetch('http://localhost:5000/api/staff/performance', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!performanceRes.ok) {
      console.error('Failed to fetch performance:', await performanceRes.text());
      return;
    }

    const performanceData = await performanceRes.json();
    console.log('Performance Endpoint Response:', JSON.stringify(performanceData, null, 2));

  } catch (error) {
    console.error('API request failed:', error);
  }
}

testApi();
