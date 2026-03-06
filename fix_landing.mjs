import fs from 'fs';

let content = fs.readFileSync('pages/Login.tsx', 'utf8');

// 1. Restaurar o botão de Login na Hero section que sumiu
content = content.replace(
    `<div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
            <button onClick={() => setView('REGISTER')} className="px-10 py-5 rounded-full text-lg font-black text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
                Experimente Grátis por 14 Dias
            </button>
          </div>`,
    `<div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
            <button onClick={() => setView('REGISTER')} className="px-10 py-5 rounded-full text-lg font-black text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
                Experimente Grátis por 14 Dias
            </button>
            <button onClick={() => setView('LOGIN')} className="px-10 py-5 rounded-full text-lg font-black text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                Acessar Minha Conta
            </button>
          </div>`
);

// 2. Corrigir React erro (provavelmente algum import faltando ou div desfechado no replace do regex)
// Como o Regex copiou Icons direto, garantir que ele esteja sendo utilizado certo e não tá undefined, mas ele está sendo importado.

if(!content.includes("import { Icons }")) {
    console.log("Imports ok");
}

fs.writeFileSync('pages/Login.tsx', content);
console.log("Botão de login restaurado");
