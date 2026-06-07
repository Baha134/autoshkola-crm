const fs = require('fs');
let f = fs.readFileSync('client/src/pages/LeadsPage.jsx', 'utf8');
f = f.replace("padding: '40px 20px', overflowY: 'auto',", "padding: '40px 20px 40px', overflowY: 'scroll',");
fs.writeFileSync('client/src/pages/LeadsPage.jsx', f);
console.log('Done');
