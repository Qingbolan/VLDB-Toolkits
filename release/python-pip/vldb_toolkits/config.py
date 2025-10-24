"""Configuration for VLDB-Toolkits"""

from pathlib import Path

# Version
VERSION = "0.1.2"

# GitHub repository
GITHUB_REPO = "Qingbolan/VLDB-Toolkits"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"

# Local installation paths
HOME_DIR = Path.home()
INSTALL_DIR = HOME_DIR / ".vldb-toolkits"
BINARY_DIR = INSTALL_DIR / "bin"
VERSION_FILE = INSTALL_DIR / "version.txt"

# Platform-specific binary names and configurations
# Note: For Linux, multiple formats are available (AppImage, DEB, RPM).
# This wrapper uses AppImage for maximum compatibility across distributions.
# For DEB/RPM installation, download directly from GitHub Releases.
#
# For Windows, NSIS installer is preferred as it includes smart detection
# and can launch existing installations without reinstalling.
PLATFORM_BINARIES = {
    "darwin_arm64": {
        "asset_name": "VLDB-Toolkits_macos_aarch64.app.tar.gz",
        "executable_path": "VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits",
        "is_bundle": True,
        "description": "macOS Apple Silicon (M1/M2/M3)"
    },
    "darwin_x86_64": {
        "asset_name": "VLDB-Toolkits_macos_x86_64.app.tar.gz",
        "executable_path": "VLDB-Toolkits.app/Contents/MacOS/VLDB-Toolkits",
        "is_bundle": True,
        "description": "macOS Intel"
    },
    "linux_x86_64": {
        "asset_name": "VLDB-Toolkits_linux_x86_64.AppImage",
        "executable_path": "vldb-toolkits",
        "is_bundle": False,
        "description": "Linux (AppImage - universal format)",
        "alternatives": [
            "VLDB-Toolkits_linux_x86_64.deb (Debian/Ubuntu)",
            "VLDB-Toolkits_linux_x86_64.rpm (Fedora/RHEL)"
        ]
    },
    "windows_x86_64": {
        # Prefer NSIS installer (has smart detection and launch capabilities)
        "asset_name": "VLDB-Toolkits_windows_x86_64_setup.exe",
        "asset_name_fallback": "VLDB-Toolkits_windows_x86_64.msi",
        "executable_path": "VLDB-Toolkits.exe",
        "is_bundle": False,
        "description": "Windows 10/11 (64-bit)",
        "installer_type": "nsis"  # or "msi" for fallback
    }
}

def ensure_dirs():
    """Ensure installation directories exist"""
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    BINARY_DIR.mkdir(parents=True, exist_ok=True)
