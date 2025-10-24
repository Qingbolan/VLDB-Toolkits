#!/usr/bin/env node

/**
 * Command-line interface for VLDB-Toolkits
 */

const { spawn } = require('child_process');
const os = require('os');

const {
  checkAndInstall,
  getBinaryPath,
  isInstalled,
  downloadAndInstall
} = require('./downloader');

const { VERSION } = require('./config');

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
VLDB-Toolkits v${VERSION}
Paper Management Platform for VLDB

Usage:
  vldb-toolkits           Launch the application
  vldb-toolkits --help    Show this help message
  vldb-toolkits --version Show version information
  vldb-toolkits --install Force reinstall the binary
  vldb-toolkits --path    Show binary installation path

Examples:
  vldb-toolkits          # Start the application
  `);
}

function linuxRuntimeCheck() {
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    function hasLib(name) {
      try {
        const out = execSync('ldconfig -p', { encoding: 'utf8' });
        return out.includes(name);
      } catch {
        return false;
      }
    }
    const missing = [];
    const hasWebkit = hasLib('libwebkit2gtk-4.1.so.0') || hasLib('libwebkit2gtk-4.0.so.37');
    if (!hasWebkit) missing.push('WebKitGTK');
    if (!hasLib('libgtk-3.so.0')) missing.push('GTK3');
    if (!(hasLib('libayatana-appindicator3.so.1') || hasLib('libappindicator3.so') || hasLib('libappindicator-gtk3.so'))) {
      missing.push('AppIndicator3');
    }
    const fuseMissing = !hasLib('libfuse.so.2');
    if (fuseMissing) missing.push('FUSE (libfuse2)');
    if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) missing.push('GUI session (X11/Wayland)');

    if (!missing.length) return { ok: true, fuseMissing };

    let distro = '';
    try {
      const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
      const idLike = (osRelease.match(/^ID_LIKE=(.*)$/m)?.[1] || '').replace(/"/g, '').toLowerCase();
      const id = (osRelease.match(/^ID=(.*)$/m)?.[1] || '').replace(/"/g, '').toLowerCase();
      distro = idLike || id;
    } catch {}

    console.error('Missing Linux runtime dependencies:');
    for (const m of missing) console.error(`  - ${m}`);
    console.error('\nInstall suggestions:');
    if (distro.includes('debian') || distro.includes('ubuntu')) {
      console.error('  sudo apt update && sudo apt install -y libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 libfuse2');
    } else if (distro.includes('fedora') || distro.includes('rhel') || distro.includes('centos')) {
      console.error('  sudo dnf install -y webkit2gtk4.1 gtk3 libappindicator-gtk3 fuse');
    } else if (distro.includes('arch') || distro.includes('manjaro')) {
      console.error('  sudo pacman -S --needed webkit2gtk-4.1 gtk3 libappindicator-gtk3 fuse2');
    } else if (distro.includes('suse') || distro.includes('opensuse')) {
      console.error('  sudo zypper install -y libwebkit2gtk-4_1-0 gtk3-tools libappindicator3-1 libfuse2');
    } else {
      console.error('  Install WebKitGTK 4.1+, GTK3, AppIndicator3, and libfuse2 via your package manager.');
    }

    return { ok: missing.length === 1 && missing[0].startsWith('FUSE'), fuseMissing };
  } catch (e) {
    return { ok: true, fuseMissing: false };
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle special commands
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return 0;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`VLDB-Toolkits v${VERSION}`);
    return 0;
  }

  if (args.includes('--install')) {
    try {
      await downloadAndInstall(true);
      return 0;
    } catch (error) {
      console.error(`Installation failed: ${error.message}`);
      return 1;
    }
  }

  if (args.includes('--path')) {
    if (isInstalled()) {
      console.log(`Binary path: ${getBinaryPath()}`);
      console.log('Installed: Yes');
    } else {
      console.log('Binary not installed yet. Run "vldb-toolkits" to install.');
    }
    return 0;
  }

  // Check and install if needed
  try {
    await checkAndInstall();
  } catch (error) {
    console.error(`Error during installation check: ${error.message}`);
    return 1;
  }

  // Get binary path
  const binaryPath = getBinaryPath();

  if (!isInstalled()) {
    console.error(`Error: Binary not found at ${binaryPath}`);
    console.error('Try running "vldb-toolkits --install" to reinstall');
    return 1;
  }

  // Linux runtime checks
  let extraEnv = {};
  if (os.platform() === 'linux') {
    const { ok, fuseMissing } = linuxRuntimeCheck();
    if (!ok) return 1;
    if (fuseMissing) {
      console.error('\nFUSE missing: will attempt extraction-run fallback.');
      extraEnv = { APPIMAGE_EXTRACT_AND_RUN: '1' };
    }
  }

  // Launch the application
  console.log('Launching VLDB-Toolkits...');

  return new Promise((resolve) => {
    let command = binaryPath;
    let commandArgs = args;

    // On macOS with .app bundle, use 'open' command
    if (os.platform() === 'darwin' && binaryPath.includes('.app/')) {
      const appBundle = binaryPath.split('.app/')[0] + '.app';

      // Remove macOS quarantine attribute to prevent "damaged" error
      try {
        const { execSync } = require('child_process');
        execSync(`xattr -dr com.apple.quarantine "${appBundle}"`, {
          stdio: 'ignore'
        });
      } catch (error) {
        // Silently ignore if xattr command fails
      }

      command = 'open';
      commandArgs = [appBundle, ...args];
    }

    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      detached: false,
      env: { ...process.env, ...extraEnv }
    });

    child.on('error', (error) => {
      console.error(`Failed to launch application: ${error.message}`);
      resolve(1);
    });

    child.on('exit', (code) => {
      resolve(code || 0);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      child.kill('SIGINT');
      console.log('\nApplication closed by user');
      resolve(0);
    });
  });
}

// Run CLI
main()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
