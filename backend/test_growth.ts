async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_report_user@example.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
      console.log("LOGIN FAILED:", loginData);
      return;
  }
  const token = loginData.accessToken;

  // Add savings
  for (let i = 0; i < 3; i++) {
      const res = await fetch('http://localhost:5000/api/savings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: Math.floor(Math.random() * 5000) + 1000,
            name: `Test Savings ${i}`,
            type: 'PERSONAL',
            date: new Date().toISOString().split('T')[0],
            source: 'OTHER',
            note: 'Test'
          })
      });
      console.log(`CREATE ${i}:`, await res.json());
  }

  const ranges = ['7D', '1M', '3M', '6M', '1Y'];
  for (const r of ranges) {
    const growthRes = await fetch(`http://localhost:5000/api/savings/growth?range=${r}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const d = await growthRes.json();
    console.log(`RANGE ${r}:`, d.data.length, "items.", "First:", d.data[0]?.name, "Last:", d.data[d.data.length-1]?.name);
  }
}

run();
