const fs = require('fs');
const token = fs.readFileSync('token.txt', 'utf8').trim();
fetch('http://localhost:5000/api/expenses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 1500,
    categoryName: 'Housing',
    date: '2026-09-20',
    paymentMethod: 'UPI',
    notes: 'Electricity bill'
  })
}).then(r => r.json()).then(d => console.log(d));
