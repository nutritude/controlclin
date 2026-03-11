import fs from 'fs';
const file = 'types.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  authorizationCode?: string; // Para convênios`;
const repl = `  authorizationCode?: string; // Para convênios\n  isDeleted?: boolean;\n  aiContextFlag?: boolean;`;

content = content.replace(targetStr, repl);
fs.writeFileSync(file, content);
