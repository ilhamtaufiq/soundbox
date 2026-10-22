// Config plugin Expo: menambahkan KeepAliveService (foreground service) dan
// modul native KeepAlive ke build Android. Kotlin disalin dari plugins/native/.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PACKAGE = 'com.cianjur.soundbox';
const NATIVE_DIR = path.join(__dirname, 'native');
const KOTLIN_FILES = ['KeepAliveService.kt', 'KeepAliveModule.kt', 'KeepAlivePackage.kt'];

function withKotlinSources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dest = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE.split('.'),
      );
      fs.mkdirSync(dest, { recursive: true });
      for (const file of KOTLIN_FILES) {
        const source = fs.readFileSync(path.join(NATIVE_DIR, file), 'utf8');
        fs.writeFileSync(path.join(dest, file), source);
      }
      return cfg;
    },
  ]);
}

function withServiceDeclaration(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.service = app.service ?? [];
    const name = `${PACKAGE}.KeepAliveService`;
    if (!app.service.some((s) => s.$?.['android:name'] === name)) {
      app.service.push({
        $: {
          'android:name': name,
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
    }
    return cfg;
  });
}

function withPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    const marker = 'PackageList(this).packages.apply {';
    const line = `add(${PACKAGE}.KeepAlivePackage())`;
    if (!cfg.modResults.contents.includes(line)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        marker,
        `${marker}\n          ${line}`,
      );
    }
    return cfg;
  });
}

module.exports = function withKeepAlive(config) {
  config = withKotlinSources(config);
  config = withServiceDeclaration(config);
  config = withPackageRegistration(config);
  return config;
};
