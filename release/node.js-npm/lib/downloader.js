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
 * Get the path to the executable for current platform
 */
function getBinaryPath() {
  const platformKey = getPlatformKey();
  const config = PLATFORM_BINARIES[platformKey];

  if (config.isBundle) {
    return path.join(BINARY_DIR, config.executablePath);
  } else {
    return path.join(BINARY_DIR, config.executablePath);
  }
}

/**
 * Check if binary is already installed
 */
function isInstalled() {
  const binaryPath = getBinaryPath();
  return fs.existsSync(binaryPath);
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
    // MSI installer - for simplicity, just copy it
    console.log('Note: MSI installer detected. Manual installation may be required.');
    const destPath = path.join(extractDir, path.basename(archivePath));
    fs.copyFileSync(archivePath, destPath);
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

  // Extract if needed
  const config = PLATFORM_BINARIES[platformKey];
  if (config.isBundle || path.extname(downloadPath) === '.gz') {
    await extractArchive(downloadPath, BINARY_DIR);
    fs.unlinkSync(downloadPath); // Remove archive after extraction
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
