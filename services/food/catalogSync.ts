
/**
 * Serviço de Sincronização do Catálogo de Alimentos
 * Carrega o catálogo MASTER + Suplementos ao iniciar a aplicação.
 */

import { parseMasterCSV, parseIBGECSV } from './catalogLoader';
import { ScientificCatalog } from './foodCatalogScientific';

const LOCAL_STORAGE_VERSION_KEY = 'CONTROLCLIN_FOOD_DB_VERSION';
const CURRENT_APP_VERSION = '1.1.1'; // bump para forçar recarga incluindo IBGE e desduplicação

let _isSynced = false;

export const CatalogSync = {
  /**
   * Carrega o catálogo master + suplementos e inicializa o ScientificCatalog.
   * Chamado uma vez ao iniciar a aplicação (NutritionalPlanning useEffect).
   */
  checkAndSync: async (): Promise<boolean> => {
    if (_isSynced) return false;

    try {
      // 1. Carregar catálogo MASTER principal
      const masterRes = await fetch('/data/MASTER_ALIMENTOS_UID_DEDUP_PTBR.csv');
      if (masterRes.ok) {
        const masterCSV = await masterRes.text();
        const { records } = parseMasterCSV(masterCSV);
        ScientificCatalog.initMasterCatalog(records);
        console.log(`[CatalogSync] MASTER carregado: ${records.length} alimentos.`);
      } else {
        console.warn('[CatalogSync] Falha ao carregar MASTER CSV.');
      }

      // 2. Carregar Suplementos (merge ao catálogo existente)
      const supplRes = await fetch('/data/SUPLEMENTOS_MASTER.csv');
      if (supplRes.ok) {
        const supplCSV = await supplRes.text();
        const { records: supplRecords } = parseMasterCSV(supplCSV);
        // Adiciona ao catálogo sem limpar o que já foi carregado
        ScientificCatalog.initMasterCatalog([
          ...ScientificCatalog.getAll(999999), // preserva existentes
          ...supplRecords
        ]);
        console.log(`[CatalogSync] SUPLEMENTOS carregados: ${supplRecords.length} registros.`);
      } else {
        console.warn('[CatalogSync] Suplementos CSV não encontrado (opcional).');
      }

      // 3. Carregar Tabela IBGE (tabela_ibge_final.csv)
      const ibgeRes = await fetch('/data/tabela_ibge_final.csv');
      if (ibgeRes.ok) {
        const ibgeCSV = await ibgeRes.text();
        const { records: ibgeRecords } = parseIBGECSV(ibgeCSV);
        // Adiciona ao catálogo (append: true)
        ScientificCatalog.initMasterCatalog(ibgeRecords, true);
        console.log(`[CatalogSync] IBGE carregado: ${ibgeRecords.length} registros.`);
      } else {
        console.warn('[CatalogSync] Tabela IBGE não encontrada (tabela_ibge_final.csv).');
      }

      localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, CURRENT_APP_VERSION);
      _isSynced = true;
      return true;

    } catch (err) {
      console.error('[CatalogSync] Erro ao carregar catálogo:', err);
      return false;
    }
  },

  getVersion: () => {
    return localStorage.getItem(LOCAL_STORAGE_VERSION_KEY) || 'Unknown';
  }
};
