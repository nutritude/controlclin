import fs from 'fs';

let tsx = fs.readFileSync('pages/Login.tsx', 'utf8');
let before = tsx;

// We imported Sparkles, Activity, Smartphone, MessageCircle, TrendingUp, DollarSign, PieChart from Icons but some might not exist.
// Wait, the error said "Minified React error #130; visit https://reactjs.org/docs/error-decoder.html?invariant=130"
// "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined."
// This happens EXACTLY when `Icons.Sparkles` is undefined.

let iconsContent = fs.readFileSync('constants/index.ts', 'utf8');

const missing = ['Sparkles', 'Activity', 'Smartphone', 'MessageCircle', 'TrendingUp', 'DollarSign', 'PieChart'];

let importsLine = iconsContent.match(/import \{([^}]+)\} from 'lucide-react';/);
if(importsLine) {
   let imports = importsLine[1].split(',').map(s=>s.trim());
   let needAppend = false;
   missing.forEach(m => {
       if(!imports.includes(m)) {
          imports.push(m);
          needAppend = true;
       }
   });
   
   if(needAppend) {
       iconsContent = iconsContent.replace(importsLine[0], `import { ${imports.join(', ')} } from 'lucide-react';`);
       
       let exportLine = iconsContent.match(/export const Icons = \{([\s\S]+?)\};/);
       if(exportLine) {
           let inside = exportLine[1];
           missing.forEach(m => {
               if(!inside.includes(`${m},`) && !inside.includes(`${m}:`)) {
                   inside += `  ${m},\n`;
               }
           });
           iconsContent = iconsContent.replace(exportLine[0], `export const Icons = {${inside}};`);
           fs.writeFileSync('constants/index.ts', iconsContent);
           console.log("Icons adicionados.")
       }
   }
}

