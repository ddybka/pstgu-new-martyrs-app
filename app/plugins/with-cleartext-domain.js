const fs = require('fs');
const path = require('path');

const { AndroidConfig, withAndroidManifest, withDangerousMod, withInfoPlist } = require('expo/config-plugins');

/**
 * Разрешает обычный HTTP к перечисленным доменам, а не ко всем сразу.
 *
 * API базы (api.nmbook.ru), карта (map.nmbook.ru) и снимки (img.nmbook.ru)
 * берутся по https, а при его отказе — по http. Такие запросы iOS (App
 * Transport Security) и Android молча режут, и в приложении это выглядит как
 * «нет связи с сервером».
 *
 * Правится через плагин, а не в ios/ и android/: они генерируются `prebuild`
 * и в git не лежат.
 */

const CONFIG_NAME = 'network_security_config';

const releaseXml = (domains) => `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
${domains.map((domain) => `        <domain includeSubdomains="false">${domain}</domain>\n`).join('')}    </domain-config>
</network-security-config>
`;

const debugXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

const DEBUG_VARIANTS = ['debug', 'debugOptimized'];

function writeXml(projectRoot, variant, contents) {
    const dir = path.join(projectRoot, 'app', 'src', variant, 'res', 'xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${CONFIG_NAME}.xml`), contents);
}

function withIosException(config, domains) {
    return withInfoPlist(config, (config) => {
        const ats = (config.modResults.NSAppTransportSecurity ??= {});
        ats.NSExceptionDomains = {
            ...ats.NSExceptionDomains,
            ...Object.fromEntries(domains.map((domain) => [domain, { NSExceptionAllowsInsecureHTTPLoads: true }])),
        };
        return config;
    });
}

function withAndroidException(config, domains) {
    config = withAndroidManifest(config, (config) => {
        const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
        app.$['android:networkSecurityConfig'] = `@xml/${CONFIG_NAME}`;
        return config;
    });

    return withDangerousMod(config, [
        'android',
        (config) => {
            const root = config.modRequest.platformProjectRoot;
            writeXml(root, 'main', releaseXml(domains));
            DEBUG_VARIANTS.forEach((variant) => writeXml(root, variant, debugXml));
            return config;
        },
    ]);
}

module.exports = function withCleartextDomain(config, { domains } = {}) {
    if (!domains?.length) throw new Error('with-cleartext-domain: не указаны domains');

    return withAndroidException(withIosException(config, domains), domains);
};
