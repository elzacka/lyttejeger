/**
 * Device and browser detection utilities for PWA install instructions
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'unknown';

export interface DeviceInfo {
  deviceType: DeviceType;
  os: OperatingSystem;
  browser: Browser;
  isStandalone: boolean;
  canInstall: boolean;
}

/**
 * Detect if the app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  // Check display-mode media query (works on most browsers)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS Safari standalone mode
  if (
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  ) {
    return true;
  }

  // Android TWA or PWA
  if (document.referrer.includes('android-app://')) {
    return true;
  }

  return false;
}

/**
 * Detect operating system
 */
export function detectOS(): OperatingSystem {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua) || (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // Android
  if (/android/.test(ua)) {
    return 'android';
  }

  // macOS (non-touch)
  if (/mac/.test(platform) && navigator.maxTouchPoints <= 1) {
    return 'macos';
  }

  // Windows
  if (/win/.test(platform)) {
    return 'windows';
  }

  // Linux
  if (/linux/.test(platform)) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Detect device type (mobile, tablet, desktop)
 */
export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();

  // Check for mobile devices
  if (/iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)) {
    return 'mobile';
  }

  // Check for tablets
  if (
    /ipad|android(?!.*mobile)|tablet/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'tablet';
  }

  // Check screen size as fallback
  if (window.innerWidth <= 768 && 'ontouchstart' in window) {
    return window.innerWidth <= 480 ? 'mobile' : 'tablet';
  }

  return 'desktop';
}

/**
 * Detect browser
 */
export function detectBrowser(): Browser {
  const ua = navigator.userAgent.toLowerCase();

  // Samsung Internet
  if (/samsungbrowser/.test(ua)) {
    return 'samsung';
  }

  // Opera
  if (/opr\/|opera/.test(ua)) {
    return 'opera';
  }

  // Edge (Chromium-based)
  if (/edg\//.test(ua)) {
    return 'edge';
  }

  // Chrome (must check after Edge since Edge contains 'chrome')
  if (/chrome|chromium|crios/.test(ua) && !/edg\//.test(ua)) {
    return 'chrome';
  }

  // Firefox
  if (/firefox|fxios/.test(ua)) {
    return 'firefox';
  }

  // Safari (must check after Chrome since Chrome on iOS reports Safari)
  if (/safari/.test(ua) && !/chrome|chromium|crios/.test(ua)) {
    return 'safari';
  }

  return 'unknown';
}

/**
 * Check if the device can install the PWA
 */
export function canInstallPWA(): boolean {
  const os = detectOS();
  const browser = detectBrowser();

  // iOS: Only Safari supports PWA installation
  if (os === 'ios') {
    return browser === 'safari';
  }

  // Android: Chrome, Samsung, Edge, Opera support installation
  if (os === 'android') {
    return ['chrome', 'samsung', 'edge', 'opera'].includes(browser);
  }

  // Desktop: Chrome, Edge support installation
  return ['chrome', 'edge'].includes(browser);
}

/**
 * Get complete device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    deviceType: detectDeviceType(),
    os: detectOS(),
    browser: detectBrowser(),
    isStandalone: isStandalone(),
    canInstall: canInstallPWA(),
  };
}
