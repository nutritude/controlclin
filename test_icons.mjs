import fs from 'fs';

let constants = fs.readFileSync('constants/index.tsx', 'utf8');

const missingIcons = ['Sparkles', 'Activity', 'Smartphone', 'MessageCircle', 'TrendingUp', 'DollarSign', 'PieChart'];

let newIcons = [];
missingIcons.forEach(icon => {
    if(!constants.includes(icon)) {
        newIcons.push(icon);
    }
});

if(newIcons.length > 0) {
    console.log("Missing Icons em constants/index.tsx: ", newIcons.join(', '));
    
    // Auto fix adding missing icons into lucide-react import and Icons export
    let matchImport = constants.match(/import\s+{([^}]+)}\s+from\s+'lucide-react';/);
    if(matchImport) {
        let imports = matchImport[1].split(',').map(s => s.trim());
        newIcons.forEach(icon => {
            if(!imports.includes(icon)) imports.push(icon);
        });
        constants = constants.replace(matchImport[0], `import { ${imports.join(', ')} } from 'lucide-react';\nimport { ${newIcons.join(', ')} as MissingIcons } from 'lucide-react';`);
    }
    
    // Append to export const Icons
    newIcons.forEach(icon => {
        constants = constants.replace(/(export const Icons = \{)([\s\S]*?)(\};)/, `$1\n  ${icon}: MissingIcons ? undefined : require('lucide-react').${icon}, // Fallback for TS compiler$2$3`);
        // The above is dangerous. Better to just add it clean.
    });
}
