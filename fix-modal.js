const fs = require('fs');
let f = fs.readFileSync('client/src/pages/LeadsPage.jsx', 'utf8');
f = f.replace("alignItems: 'center', justifyContent: 'center', padding: '20px',", "alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto',");
f = f.replace("maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',", "maxWidth: '600px', marginBottom: '40px',");
fs.writeFileSync('client/src/pages/LeadsPage.jsx', f);
console.log('Done');
