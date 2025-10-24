/**
 * Binary downloader for VLDB-Toolkits
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const tar = require('tar');
const os = require('os');

const {
  GITHUB_API_URL,
  BINARY_DIR,
  VERSION_FILE,
  PLATFORM_BINARIES,
  INSTALL_DIR
} = require('./config');

const streamPipeline = promisify(pipeline);

/**
 * Get platform key for current system
 */
function getPlatformKey() {
  const platform = os.platform();
  const arch = os.arch();

  // Map Node.js arch to our naming
  let normalizedArch = arch;
  if (arch === 'x64' || arch === 'ia32') {
    normalizedArch = 'x64';
  } else if (arch === 'arm64') {
    normalizedArch = 'arm64';
  }

  const platformKey = `${platform}_${normalizedArch}`;

  const platformMap = {
    'darwin_arm64': 'darwin_arm64',
    'darwin_x64': 'darwin_x64',
    'linux_x64': 'linux_x64',
    'win32_x64': 'win32_x64'
  };

  if (!platformMap[platformKey]) {
    throw new Error(
      `Unsupported platform: ${platform} ${arch}\n` +
      `Supported platforms: macOS (Intel/ARM), Windows (x64), Linux (x64)`
    );
  }

  return platformMap[platformKey];
}

/**
 * Try to discover installed Windows executable location.
 */
function findWindowsInstalledExe(productName = 'VLDB-Toolkits', exeName = 'VLDB-Toolkits.exe') {
  if (process.platform !== 'win32') return null;

  const candidates = [];
  const pf = process.env['ProgramFiles'];
  const pf86 = process.env['ProgramFiles(x86)'];
  const localApp = process.env['LOCALAPPDATA'];
  if (pf) candidates.push(path.join(pf, productName, exeName));
  if (pf86) candidates.push(path.join(pf86, productName, exeName));
  if (localApp) candidates.push(path.join(localApp, 'Programs', productName, exeName));

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  // Registry probe for DisplayIcon/InstallLocation
  try {
    const { execSync } = require('child_process');
    const roots = [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
    ];
    for (const root of roots) {
      try {
        const out = execSync(`reg query "${root}" /s`, { encoding: 'utf8' });
        const lines = out.split(/\r?\n/);
        let block = [];
        for (const line of lines) {
          if (/^HKEY/i.test(line)) {
            // process previous block
            if (block.length) {
              const blk = block.join('\n');
              if (/DisplayName\s+REG_\w+\s+.*VLDB-Toolkits/i.test(blk)) {
                const mIcon = blk.match(/DisplayIcon\s+REG_\w+\s+([^\r\n]+)/i);
                if (mIcon && mIcon[1]) {
                  const p = mIcon[1].split(',')[0].trim();
                  if (fs.existsSync(p)) return p;
                }
                const mInst = blk.match(/InstallLocation\s+REG_\w+\s+([^\r\n]+)/i);
                if (mInst && mInst[1]) {
                  const p = path.join(mInst[1].trim(), exeName);
                  if (fs.existsSync(p)) return p;
                }
              }
            }
            block = [line];
          } else if (line.trim()) {
            block.push(line);
          }
        }
        // final block
        if (block.length) {
          const blk = block.join('\n');
          if (/DisplayName\s+REG_\w+\s+.*VLDB-Toolkits/i.test(blk)) {
            const mIcon = blk.match(/DisplayIcon\s+REG_\w+\s+([^\r\n]+)/i);
            if (mIcon && mIcon[1]) {
              const p = mIcon[1].split(',')[0].trim();
              if (fs.existsSync(p)) return p;
            }
            const mInst = blk.match(/InstallLocation\s+REG_\w+\s+([^\r\n]+)/i);
            if (mInst && mInst[1]) {
              const p = path.join(mInst[1].trim(), exeName);
              if (fs.existsSync(p)) return p;
            }
          }
        }
      } catch (_) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }

  return null;
}

/**
 * Install MSI package (Windows) with user-level fallback.
 */
function installMsi(msiPath) {
  if (process.platform !== 'win32') return;
  const { spawnSync } = require('child_process');
  const logPath = path.join(BINARY_DIR, 'msi-install.log');
  const attempts = [
    ['msiexec', '/i', msiPath, '/qn', '/norestart', '/L*V', logPath, 'ALLUSERS=2', 'MSIINSTALLPERUSER=1'],
    ['msiexec', '/i', msiPath, '/passive', '/norestart', '/L*V', logPath, 'ALLUSERS=2', 'MSIINSTALLPERUSER=1'],
    ['msiexec', '/i', msiPath]
  ];
  for (const cmd of attempts) {
    try {
      console.log('Running:', cmd.join(' '));
      const res = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
      if (res.status === 0) return;
    } catch (_) { /* ignore */ }
  }
  console.warn('Warning: MSI installation may have failed. You might need to install manually.');
}

/**
 * Best-effort search for the executable inside any .app bundle.
 * Returns the first plausible binary found under *.app/Contents/MacOS/.
 */
function findMacOsAppBinary(baseDir) {
  try {
    // Recursively walk baseDir to find .app bundles
    const stack = [baseDir];
    while (stack.length) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.endsWith('.app')) {
            const macosDir = path.join(fullPath, 'Contents', 'MacOS');
            if (fs.existsSync(macosDir) && fs.statSync(macosDir).isDirectory()) {
              const files = fs.readdirSync(macosDir);
              // Prefer executable files
              const executables = [];
              const others = [];
              for (const f of files) {
                const p = path.join(macosDir, f);
                if (fs.statSync(p).isFile()) {
                  const mode = fs.statSync(p).mode;
                  if (mode & 0o111) executables.push(p);
                  else others.push(p);
                }
              }
              if (executables.length > 0) return executables[0];
              if (others.length > 0) return others[0];
            }
          } else {
            stack.push(fullPath);
          }
        }
      }
    }
  } catch (_) {
    // Ignore errors and fall back
  }
  return null;
}

/**
 * Get the path to the executable for current platform
 */
function getBinaryPath() {
  const platformKey = getPlatformKey();
  const config = PLATFORM_BINARIES[platformKey];

  const expectedPath = path.join(BINARY_DIR, config.executablePath);

  if (config.isBundle) {
    if (fs.existsSync(expectedPath)) return expectedPath;
    const discovered = findMacOsAppBinary(BINARY_DIR);
    if (discovered) return discovered;
    return expectedPath; // last resort; caller will error if missing
  }

  // Windows MSI installs to system dirs. Try to discover actual install location.
  if (platformKey === 'win32_x64') {
    const discovered = findWindowsInstalledExe();
    if (discovered) return discovered;
  }

  return expectedPath;
}

/**
 * Check if binary is already installed
 */
function isInstalled() {
  try {
    const platformKey = getPlatformKey();
    const config = PLATFORM_BINARIES[platformKey];
    const binaryPath = getBinaryPath();
    if (fs.existsSync(binaryPath)) return true;

    if (config.isBundle) {
      const discovered = findMacOsAppBinary(BINARY_DIR);
      return !!(discovered && fs.existsSync(discovered));
    }
    if (platformKey === 'win32_x64') {
      const discovered = findWindowsInstalledExe();
      return !!(discovered && fs.existsSync(discovered));
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Get the currently installed version
 */
function getInstalledVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    return fs.readFileSync(VERSION_FILE, 'utf8').trim();
  }
  return null;
}

/**
 * Ensure installation directories exist
 */
function ensureDirs() {
  if (!fs.existsSync(INSTALL_DIR)) {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  }
  if (!fs.existsSync(BINARY_DIR)) {
    fs.mkdirSync(BINARY_DIR, { recursive: true });
  }
}

/**
 * Download file with progress
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);

    https.get(url, {
      headers: {
        'User-Agent': 'vldb-toolkits-installer'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize) {
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          const downloadedMB = (downloaded / 1024 / 1024).toFixed(1);
          const totalMB = (totalSize / 1024 / 1024).toFixed(1);
          process.stdout.write(
            `\rProgress: ${percent}% (${downloadedMB}/${totalMB} MB)`
          );
        }
      });

      const fileStream = fs.createWriteStream(destPath);
      streamPipeline(response, fileStream)
        .then(() => {
          console.log('\nDownload complete!');
          resolve();
        })
        .catch(reject);
    }).on('error', reject);
  });
}

/**
 * Extract archive
 */
async function extractArchive(archivePath, extractDir) {
  console.log(`Extracting to: ${extractDir}`);

  const ext = path.extname(archivePath);

  if (ext === '.gz') {
    // tar.gz
    await tar.extract({
      file: archivePath,
      cwd: extractDir
    });
  } else if (ext === '.AppImage' || ext === '.exe') {
    // Single executable, just move it
    const destPath = path.join(extractDir, path.basename(archivePath));
    fs.renameSync(archivePath, destPath);
    // Make executable on Unix
    if (process.platform !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
  } else if (ext === '.msi') {
    // Copy for reference and attempt to install
    const destPath = path.join(extractDir, path.basename(archivePath));
    fs.copyFileSync(archivePath, destPath);
    try {
      installMsi(archivePath);
    } catch (_) {}
  } else {
    throw new Error(`Unsupported archive format: ${ext}`);
  }

  console.log('Extraction complete!');
}

/**
 * Get download URL from GitHub releases
 */
async function getDownloadUrl() {
  return new Promise((resolve, reject) => {
    const platformKey = getPlatformKey();
    const assetName = PLATFORM_BINARIES[platformKey].assetName;

    console.log('Fetching latest release information...');

    https.get(GITHUB_API_URL, {
      headers: {
        'User-Agent': 'vldb-toolkits-installer',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const release = JSON.parse(data);

          if (response.statusCode === 404) {
            reject(new Error(
              'No releases found. Please ensure binaries are published to GitHub Releases.\n' +
              `Repository: ${GITHUB_API_URL}`
            ));
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to fetch release info: HTTP ${response.statusCode}`));
            return;
          }

          // Find matching asset
          const asset = release.assets?.find(a => a.name === assetName);

          if (!asset) {
            reject(new Error(
              `No matching binary found for platform: ${platformKey}\n` +
              `Looking for: ${assetName}`
            ));
            return;
          }

          resolve({
            url: asset.browser_download_url,
            version: release.tag_name
          });
        } catch (error) {
          reject(new Error(`Failed to parse release info: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download and install the binary
 */
async function downloadAndInstall(force = false) {
  ensureDirs();

  // Check if already installed
  if (isInstalled() && !force) {
    const installedVersion = getInstalledVersion();
    console.log(`VLDB-Toolkits is already installed (version: ${installedVersion})`);
    return;
  }

  if (force && fs.existsSync(BINARY_DIR)) {
    console.log('Removing existing installation...');
    fs.rmSync(BINARY_DIR, { recursive: true, force: true });
    fs.mkdirSync(BINARY_DIR, { recursive: true });
  }

  // Get download URL
  const { url, version } = await getDownloadUrl();

  // Download binary
  const platformKey = getPlatformKey();
  const assetName = PLATFORM_BINARIES[platformKey].assetName;
  const downloadPath = path.join(BINARY_DIR, assetName);

  await downloadFile(url, downloadPath);

  // Extract/place if needed
  const config = PLATFORM_BINARIES[platformKey];
  const ext = path.extname(downloadPath);
  if (config.isBundle || ext === '.gz' || ext === '.zip') {
    await extractArchive(downloadPath, BINARY_DIR);
    // For archives and MSI we keep/remove accordingly inside extractArchive
    try { fs.unlinkSync(downloadPath); } catch (_) {}
  }

  // Rename AppImage to expected executable name
  if (ext === '.AppImage') {
    const expected = getBinaryPath();
    const src = path.join(BINARY_DIR, path.basename(downloadPath));
    try {
      if (fs.existsSync(src) && path.resolve(src) !== path.resolve(expected)) {
        try { fs.unlinkSync(expected); } catch (_) {}
        fs.renameSync(src, expected);
      }
      if (process.platform !== 'win32') {
        try { fs.chmodSync(expected, 0o755); } catch (_) {}
      }
    } catch (_) { /* ignore */ }
  }

  // Install MSI directly (download already in BINARY_DIR)
  if (ext === '.msi') {
    try { installMsi(downloadPath); } catch (_) {}
  }

  // Make executable on Unix-like systems
  if (process.platform !== 'win32') {
    const binaryPath = getBinaryPath();
    if (fs.existsSync(binaryPath)) {
      fs.chmodSync(binaryPath, 0o755);
    }
  }

  // Save version
  fs.writeFileSync(VERSION_FILE, version);

  console.log(`\nVLDB-Toolkits ${version} installed successfully!`);
  console.log(`Installation directory: ${BINARY_DIR}`);
}

/**
 * Check if binary is installed, download if not
 */
async function checkAndInstall() {
  if (!isInstalled()) {
    console.log('VLDB-Toolkits is not installed yet.');
    console.log('This will download the application (~50-150 MB depending on platform)');
    console.log();
    await downloadAndInstall();
    console.log();
  }
}

module.exports = {
  getPlatformKey,
  getBinaryPath,
  isInstalled,
  getInstalledVersion,
  downloadAndInstall,
  checkAndInstall
};
