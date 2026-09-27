const fs = require('fs');
const token = fs.readFileSync('token.txt', 'utf8').trim();
fetch('http://localhost:5000/api/expenses/summary', {
  headers: {
    'Authorization': 'Bearer ' + token,
  }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
