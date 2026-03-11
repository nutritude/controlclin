import fs from 'fs';
const file = 'pages/PatientDetails.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleGenerateReceipt(trans)}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        </div>`;

const newCode = `                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleGenerateReceipt(trans)}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                            {!trans.isDeleted && (
                                                                <button 
                                                                    onClick={() => handleDeleteTransaction(trans.id)}
                                                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                                                    title="Cancelar Lançamento"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>`;

content = content.replace(targetStr, newCode);

const tableRowStr = `                                                <tr key={trans.id} className="hover:bg-slate-50 transition-colors">`;
const newTableRowStr = `                                                <tr key={trans.id} className={\`hover:bg-slate-50 transition-colors \${trans.isDeleted ? 'opacity-50' : ''}\`}>`;

content = content.replace(tableRowStr, newTableRowStr);

fs.writeFileSync(file, content);
console.log('Done');
