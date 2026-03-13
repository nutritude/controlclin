
/**
 * CacheManager Service
 * 
 * Este serviço cuida do gerenciamento de versões e limpeza de cache do lado do cliente (App-level cache).
 * Ele garante que, após uma atualização de código ou mudança estrutural, o navegador do usuário
 * limpe estados antigos que possam causar inconsistências visuais ou bugs de lógica.
 */

// Versão atual do Software (Incremental)
// Agora usamos a flag injetada pelo Vite build ou um default local
// @ts-ignore
export const CURRENT_VERSION = import.meta.env?.VITE_APP_VERSION || 'v3.2.0-light-manager';

const VERSION_KEY = 'CONTROLCLIN_VERSION';
const TRANSIENT_KEYS = [
    'chakra-ui-color-mode', // Exemplo de cache de UI
    'firebase:host:controclin-602b6.firebaseio.com',
    'loglevel',
    'ui_active_tab', // Histórico de abas
    'ui_search_history', // Histórico de busca
    'ui_modal_shown', // Modais que não devem reaparecer
];

export const CacheManager = {
    /**
     * Verifica se o navegador está rodando uma versão obsoleta comparada ao servidor.
     */
    checkForUpdates: async () => {
        try {
            const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.version && data.version !== CURRENT_VERSION) {
                    console.warn(`[CacheManager] Nova versão disponível: ${data.version}. Atualizando...`);
                    CacheManager.checkAndPurge(data.version);
                }
            }
        } catch (e) {
            console.warn("[CacheManager] Falha ao verificar atualizações.");
        }
    },

    /**
     * Verifica e limpa cache se necessário.
     */
    checkAndPurge: (newVersionDetected?: string) => {
        const savedVersion = localStorage.getItem(VERSION_KEY);
        const targetVersion = newVersionDetected || CURRENT_VERSION;

        // Só executa se houver divergência real
        if (savedVersion !== targetVersion) {
            // Evita Loop Infinito: se não detectamos versão nova do servidor e a versão do código 
            // é igual à salva, não faz nada.
            if (!newVersionDetected && savedVersion === CURRENT_VERSION) return;

            console.log(`[CacheManager] Limpeza: ${savedVersion || 'Novo'} -> ${targetVersion}`);

            TRANSIENT_KEYS.forEach(key => localStorage.removeItem(key));
            localStorage.setItem(VERSION_KEY, targetVersion);

            if (savedVersion) {
                console.warn("[CacheManager] Reload disparado.");
                setTimeout(() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', targetVersion);
                    window.location.href = url.toString();
                }, 500);
            } else {
                console.log("[CacheManager] Salvando primeira vez:", targetVersion);
            }
        }
    },

    /**
     * Força uma limpeza total.
     */
    forceGlobalReset: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
};
