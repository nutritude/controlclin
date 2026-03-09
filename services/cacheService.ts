
/**
 * CacheManager Service
 * 
 * Este serviço cuida do gerenciamento de versões e limpeza de cache do lado do cliente (App-level cache).
 * Ele garante que, após uma atualização de código ou mudança estrutural, o navegador do usuário
 * limpe estados antigos que possam causar inconsistências visuais ou bugs de lógica.
 */

// Versão atual do Software (Incremental)
// Ao mudar o layout ou lógica crítica, suba este número.
export const CURRENT_VERSION = '1.0.8';

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
     * Útil para profissionais que deixam a aba aberta por dias.
     */
    checkForUpdates: async () => {
        try {
            // Fetch version with a timestamp to bypass proxy/CDN cache
            const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.version && data.version !== CURRENT_VERSION) {
                    console.warn(`[CacheManager] Nova versão disponível no servidor: ${data.version}. Atualizando...`);
                    CacheManager.checkAndPurge(data.version); // Pass the new version to purge
                }
            }
        } catch (e) {
            console.warn("[CacheManager] Falha ao verificar atualizações automáticas.");
        }
    },

    /**
     * Verifica se houve mudança de versão enviada (via update) ou salva localmente.
     */
    checkAndPurge: (newVersionDetected?: string) => {
        const savedVersion = localStorage.getItem(VERSION_KEY);
        const targetVersion = newVersionDetected || CURRENT_VERSION;

        if (savedVersion !== targetVersion) {
            console.log(`[CacheManager] Executando limpeza estrutural: ${savedVersion || 'Nova Instalação'} -> ${targetVersion}`);

            // 1. Limpa chaves obsoletas (preservando o DB principal)
            TRANSIENT_KEYS.forEach(key => localStorage.removeItem(key));

            // 2. Registra a nova versão
            localStorage.setItem(VERSION_KEY, targetVersion);

            // 3. Force hard reload para pegar novos assets (JS/CSS) do servidor
            if (savedVersion) {
                console.warn("[CacheManager] Forçando recarregamento com cache-busting...");
                setTimeout(() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', targetVersion);
                    window.location.href = url.toString();
                }, 300);
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
