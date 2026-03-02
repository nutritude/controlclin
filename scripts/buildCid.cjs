const fs = require('fs');
const { cid10SubcategoriesStream } = require('br-cid10-csv');

async function buildDb() {
    const cids = [];
    cid10SubcategoriesStream()
        .on('data', (row) => {
            // row = { subcat: 'A000', nome: 'Colera ...', ... }
            // Formatting to have something like "codigo: A00.0"
            const codigoStr = row.SUBCAT.slice(0, 3) + '.' + row.SUBCAT.slice(3);
            cids.push({
                codigo: codigoStr,
                nome: row.NOME
            });
        })
        .on('end', () => {
            fs.writeFileSync('./public/cid10.json', JSON.stringify(cids));
            console.log(`Saved ${cids.length} CIDs to public/cid10.json`);
        })
        .on('error', (err) => {
            console.error("Error generating CID DB:", err);
        });
}

buildDb();
