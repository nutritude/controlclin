import fs from 'fs';

const filePath = './pages/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // backgrounds & borders
  [/bg-gray-800 border-gray-700/g, "isManagerMode ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-800 border-gray-700'"],
  [/bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6/g, "isManagerMode ? 'bg-white border-blue-100 shadow-sm rounded-xl border p-6' : 'bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6'"],
  
  // text colors
  [/isManagerMode \? 'text-white' : 'text-slate-800'/g, "isManagerMode ? 'text-slate-800' : 'text-slate-800'"],
  [/text-3xl font-bold mt-2 text-white/g, "text-3xl font-bold mt-2 ${isManagerMode ? 'text-slate-800' : 'text-white'}"],
  [/text-sm font-medium uppercase tracking-wider text-gray-400/g, "text-sm font-medium uppercase tracking-wider ${isManagerMode ? 'text-slate-500' : 'text-gray-400'}"],
  [/text-lg font-bold mb-6 text-white/g, "text-lg font-bold mb-6 ${isManagerMode ? 'text-slate-800' : 'text-white'}"],
  [/text-lg font-bold mb-4 text-white/g, "text-lg font-bold mb-4 ${isManagerMode ? 'text-slate-800' : 'text-white'}"],
  [/font-bold text-white text-sm/g, "font-bold ${isManagerMode ? 'text-slate-800' : 'text-white'} text-sm"],
  [/text-xs text-gray-400/g, "text-xs ${isManagerMode ? 'text-slate-400' : 'text-gray-400'}"],
  [/text-base font-normal text-gray-400/g, "text-base font-normal ${isManagerMode ? 'text-slate-400' : 'text-gray-400'}"],

  // Specific components
  [/bg-gray-700/g, "isManagerMode ? 'bg-blue-50' : 'bg-gray-700'"],
  [/bg-gray-700\/50/g, "isManagerMode ? 'bg-blue-100' : 'bg-gray-700/50'"],
  [/bg-indigo-900\/80 border-indigo-700 text-gray-100/g, "isManagerMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-indigo-900/80 border-indigo-700 text-gray-100'"],
  [/border-indigo-700/g, "isManagerMode ? 'border-blue-500/30' : 'border-indigo-700'"],
  [/text-purple-400/g, "isManagerMode ? 'text-blue-100' : 'text-purple-400'"],
  [/text-purple-300/g, "isManagerMode ? 'text-blue-50' : 'text-purple-300'"],
  [/bg-blue-900\/50/g, "isManagerMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/50'"],
  [/border-gray-700/g, "isManagerMode ? 'border-blue-50' : 'border-gray-700'"],
];

// We need to be careful with double replacement if we run multiple times, 
// so we'll do literal replaces for the blocks where isManagerMode is used as a prop.

// Fix the title area in return (...)
content = content.replace(
  "text-2xl md:text-3xl font-black uppercase tracking-tight ${isManagerMode ? 'text-white' : 'text-slate-800'}",
  "text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800"
);
content = content.replace(
  "mt-1 text-sm md:text-base ${isManagerMode ? 'text-gray-300' : 'text-slate-600'}",
  "mt-1 text-sm md:text-base ${isManagerMode ? 'text-slate-600' : 'text-slate-600'}"
);
content = content.replace(
  "text-sm font-black ${isManagerMode ? 'text-gray-200' : 'text-slate-700'}",
  "text-sm font-black text-slate-700"
);

// Fix ManagerDashboard cards
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>'
);
// replace remaining instances of that specific div line (there are 4 total)
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>'
);
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6 flex flex-col justify-between">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} rounded-xl shadow-sm border p-6 flex flex-col justify-between text-left transition-all hover:shadow-md`}>'
);
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 rounded-xl shadow-sm border p-6">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} rounded-xl shadow-sm border p-6 transition-all hover:shadow-md`}>'
);

// Fix large containers
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6 lg:col-span-2">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} shadow-sm rounded-xl border p-6 lg:col-span-2`}>'
);
content = content.replace(
  '<div className="bg-gray-800 border-gray-700 shadow-sm rounded-xl border p-6 flex flex-col h-full">',
  '<div className={`${isManagerMode ? \'bg-white border-blue-100 shadow-sm\' : \'bg-gray-800 border-gray-700\'} shadow-sm rounded-xl border p-6 flex flex-col h-full`}>'
);

// Final cleanup of text and inner elements
for (const [regex, repl] of replacements) {
  content = content.replace(regex, repl);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard colors updated.');
