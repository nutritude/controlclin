import fs from 'fs';
const file = 'services/cacheService.ts';
let content = fs.readFileSync(file, 'utf8');

const tStr = `            if (savedVersion) {
                console.warn("[CacheManager] Reload disparado.");
                setTimeout(() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', targetVersion);
                    window.location.href = url.toString();
                }, 500);
            }`;

const nCode = `            if (savedVersion) {
                console.warn("[CacheManager] Reload disparado.");
                setTimeout(() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', targetVersion);
                    window.location.href = url.toString();
                }, 500);
            } else {
                 console.log("[CacheManager] Salvando primeira vez:", targetVersion);
            }`;
content = content.replace(tStr, nCode);
fs.writeFileSync(file, content);
