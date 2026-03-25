/**
 * Expo Config Plugin: Patch SMS Native Libraries
 * 
 * Patches both react-native-get-sms-android and react-native-android-sms-listener
 * build.gradle files to be compatible with Gradle 9+ and AGP 8+.
 * 
 * Fixes:
 * - jcenter() → mavenCentral()
 * - Removes outdated buildscript blocks
 * - Adds namespace for AGP 8+
 * - Updates lintOptions → lint
 * 
 * This runs at EAS prebuild time automatically.
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchGetSmsAndroid(projectRoot) {
  const buildGradlePath = path.join(
    projectRoot,
    'node_modules',
    'react-native-get-sms-android',
    'android',
    'build.gradle'
  );

  if (!fs.existsSync(buildGradlePath)) {
    console.warn('[expo-plugin] ⚠ react-native-get-sms-android not found, skipping');
    return;
  }

  // Write a clean, modern build.gradle that works with Gradle 9 + AGP 8
  const modernBuildGradle = `
apply plugin: 'com.android.library'

def safeExtGet(prop, fallback) {
    rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

android {
    namespace 'com.react'
    compileSdkVersion safeExtGet('compileSdkVersion', 34)

    defaultConfig {
        minSdkVersion safeExtGet('minSdkVersion', 21)
        targetSdkVersion safeExtGet('targetSdkVersion', 34)
        versionCode 1
        versionName "1.0.0"
    }
    lint {
        abortOnError false
    }
}

repositories {
    google()
    mavenCentral()
    maven {
        url "$rootDir/../node_modules/react-native/android"
    }
}

dependencies {
    compileOnly "com.facebook.react:react-native:\${safeExtGet('reactNativeVersion', '+')}"
}
`;

  fs.writeFileSync(buildGradlePath, modernBuildGradle, 'utf-8');
  console.log('[expo-plugin] ✅ Patched react-native-get-sms-android build.gradle');

  // Strip package attribute from AndroidManifest.xml to comply with AGP 8+
  const manifestPath = path.join(
    projectRoot,
    'node_modules',
    'react-native-get-sms-android',
    'android',
    'src',
    'main',
    'AndroidManifest.xml'
  );

  if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    // Remove package attribute, e.g., package="com.react"
    manifestContent = manifestContent.replace(/\s*package="[^"]*"/g, '');
    fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
    console.log('[expo-plugin] ✅ Patched react-native-get-sms-android AndroidManifest.xml');
  }
}

function patchSmsListener(projectRoot) {
  const buildGradlePath = path.join(
    projectRoot,
    'node_modules',
    'react-native-android-sms-listener',
    'android',
    'build.gradle'
  );

  if (!fs.existsSync(buildGradlePath)) {
    console.warn('[expo-plugin] ⚠ react-native-android-sms-listener not found, skipping');
    return;
  }

  let content = fs.readFileSync(buildGradlePath, 'utf-8');

  // Add namespace if missing (required by AGP 8+)
  if (!content.includes('namespace')) {
    content = content.replace(
      /android\s*\{/,
      "android {\n    namespace 'com.centaurwarchief.smslistener'"
    );
  }

  // Replace jcenter() if present
  content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

  fs.writeFileSync(buildGradlePath, content, 'utf-8');
  console.log('[expo-plugin] ✅ Patched react-native-android-sms-listener build.gradle');

  // Strip package attribute from AndroidManifest.xml to comply with AGP 8+
  const manifestPath = path.join(
    projectRoot,
    'node_modules',
    'react-native-android-sms-listener',
    'android',
    'src',
    'main',
    'AndroidManifest.xml'
  );

  if (fs.existsSync(manifestPath)) {
    let manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    manifestContent = manifestContent.replace(/\s*package="[^"]*"/g, '');
    fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
    console.log('[expo-plugin] ✅ Patched react-native-android-sms-listener AndroidManifest.xml');
  }
}

function withSmsAndroidPatch(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      patchGetSmsAndroid(projectRoot);
      patchSmsListener(projectRoot);
      return config;
    },
  ]);
}

module.exports = withSmsAndroidPatch;
