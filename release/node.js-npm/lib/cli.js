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
      detached: false
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
