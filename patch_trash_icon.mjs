import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Trash2')) {
  content = content.replace('import { ', 'import { Trash2, ');
  fs.writeFileSync(file, content);
}
