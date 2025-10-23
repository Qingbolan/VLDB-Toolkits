"""Configuration for VLDB-Toolkits"""

from pathlib import Path

# Version
VERSION = "0.1.0"

# GitHub repository
GITHUB_REPO = "Qingbolan/VLDB-Toolkits"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"

# Local installation paths
HOME_DIR = Path.home()
INSTALL_DIR = HOME_DIR / ".vldb-toolkits"
BINARY_DIR = INSTALL_DIR / "bin"
VERSION_FILE = INSTALL_DIR / "version.txt"

# Platform-specific binary names
PLATFORM_BINARIES = {
    "darwin_arm64": {
        "asset_name": "VLDB-Toolkits_macos_aarch64.app.tar.gz",
        "executable_path": "VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits",
        "is_bundle": True
    },
    "darwin_x86_64": {
        "asset_name": "VLDB-Toolkits_macos_x86_64.app.tar.gz",
        "executable_path": "VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits",
        "is_bundle": True
    },
    "linux_x86_64": {
        "asset_name": "VLDB-Toolkits_linux_x86_64.AppImage",
        "executable_path": "vldb-toolkits",
        "is_bundle": False
    },
    "windows_x86_64": {
        "asset_name": "VLDB-Toolkits_windows_x86_64.msi",
        "executable_path": "VLDB-Toolkits.exe",
        "is_bundle": False
    }
}

def ensure_dirs():
    """Ensure installation directories exist"""
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    BINARY_DIR.mkdir(parents=True, exist_ok=True)
