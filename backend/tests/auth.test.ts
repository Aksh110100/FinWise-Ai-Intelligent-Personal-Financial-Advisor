const runTests = async () => {
  console.log('Starting Integration Tests...');
  const baseUrl = 'http://127.0.0.1:5000/api/auth';
  
  let accessToken = '';
  let cookie = '';
  const email = `test_${Date.now()}@example.com`;

  try {
    // 1. Test Registration
    const resReg = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
    });
    if (!resReg.ok) throw new Error('Registration failed');
    console.log('✅ Registration: Success');
    const regData = await resReg.json();
    cookie = resReg.headers.get('set-cookie') || '';
    
    // 2. Test Invalid Login
    const resLoginFail = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong' })
    });
    if (resLoginFail.ok) throw new Error('Login should have failed');
    console.log('✅ Invalid Login: Rejected properly');

    // 3. Test Valid Login
    const resLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', rememberMe: true })
    });
    if (!resLogin.ok) throw new Error('Valid login failed');
    console.log('✅ Valid Login: Success (Remember Me: true)');
    const loginData = await resLogin.json();
    accessToken = loginData.accessToken;
    cookie = resLogin.headers.get('set-cookie') || cookie;

    // 4. Test /me
    const resMe = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resMe.ok) throw new Error('/me failed');
    console.log('✅ /me Profile: Success');

    // 5. Test Refresh
    const resRefresh = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    if (!resRefresh.ok) throw new Error('Refresh failed');
    console.log('✅ Refresh Token: Success');

    // 6. Test Logout
    const resLogout = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resLogout.ok) throw new Error('Logout failed');
    console.log('✅ Logout: Success');

    // 7. Test Refresh after Logout (should fail)
    const resRefresh2 = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    if (resRefresh2.ok) throw new Error('Refresh should have failed after logout');
    console.log('✅ Session Revocation: Successfully rejected old refresh token');

    console.log('\nAll integration tests passed successfully! 🎉');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

runTests();
