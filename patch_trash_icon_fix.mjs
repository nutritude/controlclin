import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { Trash2, useParams", "import { useParams");

if (!content.includes('import { Trash2 } from "lucide-react";')) {
    content = content.replace("import { Trash2, ", "");
    content = 'import { Trash2 } from "lucide-react";\n' + content;
}
fs.writeFileSync(file, content);
