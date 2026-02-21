
/**
 * Serviço Mock para Sincronização de Catálogo de Alimentos
 * Em produção, isso verificaria um endpoint /version e baixaria um JSON novo.
 */

const LOCAL_STORAGE_VERSION_KEY = 'CONTROLCLIN_FOOD_DB_VERSION';
const CURRENT_APP_VERSION = '1.0.0';

export const CatalogSync = {
  /**
   * Verifica se há atualizações na base de alimentos.
   * Simula um delay de rede.
   */
  checkAndSync: async (): Promise<boolean> => {
    // Simula verificação assíncrona
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const localVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);
    
    if (localVersion !== CURRENT_APP_VERSION) {
      console.log(`[CatalogSync] Atualizando base de alimentos de ${localVersion} para ${CURRENT_APP_VERSION}...`);
      // Aqui faríamos o fetch real do JSON
      // Como estamos usando const no código, apenas atualizamos a flag
      localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, CURRENT_APP_VERSION);
      return true; // Atualizado
    }
    
    return false; // Já estava atualizado
  },

  getVersion: () => {
    return localStorage.getItem(LOCAL_STORAGE_VERSION_KEY) || 'Unknown';
  }
};
