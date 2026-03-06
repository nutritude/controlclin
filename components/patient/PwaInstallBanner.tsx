import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants';

export const PwaInstallBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

    useEffect(() => {
        // 1. Verificar se já está instalado (standalone)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) {
            setIsVisible(false);
            return;
        }

        // 2. Detectar plataforma
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
            setIsVisible(true);
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
            setIsVisible(true);
        } else {
            // No Desktop também podemos mostrar a sugestão de instalar via Chrome
            setIsVisible(true);
        }

        // Recuperar se o usuário já fechou o banner nesta sessão
        const hasDismissed = sessionStorage.getItem('pwa_banner_dismissed');
        if (hasDismissed) {
            setIsVisible(false);
        }
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="mx-6 mt-4 p-5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden animate-fadeIn">
            <button onClick={dismiss} className="absolute top-4 right-4 text-white/50 hover:text-white">
                <Icons.X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                        <Icons.Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">Instalar Aplicativo</h4>
                        <p className="text-[10px] text-indigo-100 font-bold opacity-80">Acesse mais rápido da sua tela inicial</p>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    {platform === 'ios' ? (
                        <div className="space-y-3">
                            <p className="text-xs font-medium leading-relaxed">No iPhone, siga estes passos para criar um atalho:</p>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter">
                                <div className="flex items-center gap-1">
                                    <span className="bg-white/20 rounded px-1.5 py-0.5">1º</span> Clique em <Icons.Share className="w-3 h-3 inline pb-0.5" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="bg-white/20 rounded px-1.5 py-0.5">2º</span> "Adicionar à Tela de Início"
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs font-medium leading-relaxed">Toque nos 3 pontinhos (⋮) do navegador e selecione <span className="font-black">"Instalar Aplicativo"</span>.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </div>
    );
};
