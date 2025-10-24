/**
 * Configuration for VLDB-Toolkits npm package
 */

const path = require('path');
const os = require('os');

// Version (read from package.json to avoid drift)
let VERSION = '0.0.0';
try {
  // When packaged, lib/ sits next to package.json
  // eslint-disable-next-line import/no-dynamic-require, global-require
  VERSION = require('../package.json').version || VERSION;
} catch (_) {
  // keep default
}

// GitHub repository
const GITHUB_REPO = 'Qingbolan/VLDB-Toolkits'; // TODO: Update with your repo
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Local installation paths
const HOME_DIR = os.homedir();
const INSTALL_DIR = path.join(HOME_DIR, '.vldb-toolkits');
const BINARY_DIR = path.join(INSTALL_DIR, 'bin');
const VERSION_FILE = path.join(INSTALL_DIR, 'version.txt');

// Platform-specific binary names and configurations
// Note: For Linux, multiple formats are available (AppImage, DEB, RPM).
// This wrapper uses AppImage for maximum compatibility across distributions.
// For DEB/RPM installation, download directly from GitHub Releases.
//
// For Windows, NSIS installer is preferred as it includes smart detection
// and can launch existing installations without reinstalling.
const PLATFORM_BINARIES = {
  'darwin_arm64': {
    assetName: 'VLDB-Toolkits_macos_aarch64.app.tar.gz',
    executablePath: 'VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits',
    isBundle: true,
    description: 'macOS Apple Silicon (M1/M2/M3)'
  },
  'darwin_x64': {
    assetName: 'VLDB-Toolkits_macos_x86_64.app.tar.gz',
    executablePath: 'VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits',
    isBundle: true,
    description: 'macOS Intel'
  },
  'linux_x64': {
    assetName: 'VLDB-Toolkits_linux_x86_64.AppImage',
    executablePath: 'vldb-toolkits',
    isBundle: false,
    description: 'Linux (AppImage - universal format)',
    alternatives: [
      'VLDB-Toolkits_linux_x86_64.deb (Debian/Ubuntu)',
      'VLDB-Toolkits_linux_x86_64.rpm (Fedora/RHEL)'
    ]
  },
  'win32_x64': {
    // Prefer NSIS installer (has smart detection and launch capabilities)
    assetName: 'VLDB-Toolkits_windows_x86_64_setup.exe',
    assetNameFallback: 'VLDB-Toolkits_windows_x86_64.msi',
    executablePath: 'VLDB-Toolkits.exe',
    isBundle: false,
    description: 'Windows 10/11 (64-bit)',
    installerType: 'nsis' // or 'msi' for fallback
  }
};

module.exports = {
  VERSION,
  GITHUB_REPO,
  GITHUB_API_URL,
  HOME_DIR,
  INSTALL_DIR,
  BINARY_DIR,
  VERSION_FILE,
  PLATFORM_BINARIES
};
