
// Mock localStorage for Node
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};

async function inspectJessyca() {
    const { db } = await import('./services/db.js');
    await db.loadFromRemote();

    const jessycas = db.patients.filter(p => p.name.toLowerCase().includes('jessyca melo'));
    console.log(`\nFound ${jessycas.length} Jessyca Melos:`);
    jessycas.forEach(p => {
        console.log(`ID: ${p.id} | PID: ${p.professionalId} | AnthroRecs: ${p.anthropometryHistory?.length || 0} | Notes: ${p.clinicalNotes?.length || 0}`);
    });

    const unassigned = db.patients.filter(p => !p.professionalId);
    console.log(`\nUnassigned Patients: ${unassigned.length}`);
    unassigned.forEach(p => console.log(`- ${p.name}`));
}

inspectJessyca().catch(console.error);
