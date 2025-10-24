"""Binary downloader for VLDB-Toolkits"""

import os
import sys
import platform
import urllib.request
import json
import tarfile
import zipfile
import shutil
from pathlib import Path
from typing import Optional, Tuple

from .config import (
    GITHUB_API_URL,
    BINARY_DIR,
    VERSION_FILE,
    PLATFORM_BINARIES,
    ensure_dirs,
)


def _find_macos_app_binary(base_dir: Path) -> Optional[Path]:
    """Best-effort search for the executable inside any .app bundle.

    This is robust to variations in archive structure or binary naming.
    Returns the first plausible binary found under *.app/Contents/MacOS/.
    """
    try:
        # Search recursively for any .app bundle
        for app_dir in base_dir.rglob("*.app"):
            macos_dir = app_dir / "Contents" / "MacOS"
            if macos_dir.is_dir():
                # Prefer files with executable bit set; fallback to any file
                executables = []
                others = []
                for child in macos_dir.iterdir():
                    if child.is_file():
                        mode = child.stat().st_mode
                        if mode & 0o111:
                            executables.append(child)
                        else:
                            others.append(child)
                if executables:
                    return executables[0]
                if others:
                    return others[0]
    except Exception:
        # On any unexpected error, fall back to default logic
        pass
    return None


def get_platform_key() -> str:
    """Get the platform key for current system"""
    system = platform.system().lower()
    machine = platform.machine().lower()

    # Normalize machine architecture
    if machine in ("x86_64", "amd64"):
        machine = "x86_64"
    elif machine in ("aarch64", "arm64"):
        machine = "arm64"

    platform_key = f"{system}_{machine}"

    # Map to supported platforms
    platform_map = {
        "darwin_arm64": "darwin_arm64",
        "darwin_x86_64": "darwin_x86_64",
        "linux_x86_64": "linux_x86_64",
        "windows_x86_64": "windows_x86_64"
    }

    if platform_key not in platform_map:
        raise RuntimeError(
            f"Unsupported platform: {system} {machine}\n"
            f"Supported platforms: macOS (Intel/ARM), Windows (x64), Linux (x64)"
        )

    return platform_map[platform_key]


def get_binary_path() -> Path:
    """Get the path to the executable for current platform.

    For macOS bundles, if the expected path does not exist, search for any
    app bundle's MacOS binary to be resilient to naming/packaging variations.
    """
    platform_key = get_platform_key()
    config = PLATFORM_BINARIES[platform_key]

    # Direct path from configuration
    expected_path = BINARY_DIR / config["executable_path"]

    if config["is_bundle"]:
        # If expected path exists, return it; otherwise attempt discovery
        if expected_path.exists():
            return expected_path

        # Fallback: discover any .app/Contents/MacOS/* binary
        discovered = _find_macos_app_binary(BINARY_DIR)
        if discovered is not None:
            return discovered

        # As a last resort, return the expected path (will fail later with a clear error)
        return expected_path

    # Non-bundle platforms
    return expected_path


def is_installed() -> bool:
    """Check if binary is already installed.

    For macOS bundles, treat presence of any discovered bundle binary as installed.
    """
    try:
        binary_path = get_binary_path()
        if binary_path.exists() and binary_path.is_file():
            return True

        # If expected path didn't exist for a bundle, also check for any .app
        platform_key = get_platform_key()
        if PLATFORM_BINARIES[platform_key]["is_bundle"]:
            discovered = _find_macos_app_binary(BINARY_DIR)
            return discovered is not None and discovered.exists()

        return False
    except Exception:
        # Be conservative on errors; treat as not installed to trigger install flow
        return False


def get_installed_version() -> Optional[str]:
    """Get the currently installed version"""
    if VERSION_FILE.exists():
        return VERSION_FILE.read_text().strip()
    return None


def download_with_progress(url: str, dest: Path):
    """Download file with progress bar"""
    print(f"Downloading from: {url}")

    def reporthook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(downloaded * 100 / total_size, 100)
            size_mb = total_size / (1024 * 1024)
            downloaded_mb = downloaded / (1024 * 1024)
            sys.stdout.write(
                f"\rProgress: {percent:.1f}% ({downloaded_mb:.1f}/{size_mb:.1f} MB)"
            )
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(url, dest, reporthook=reporthook)
        print("\nDownload complete!")
    except Exception as e:
        raise RuntimeError(f"Download failed: {e}")


def extract_archive(archive_path: Path, extract_dir: Path):
    """Extract downloaded archive"""
    print(f"Extracting to: {extract_dir}")

    if archive_path.suffix == ".gz" and archive_path.stem.endswith(".tar"):
        # tar.gz
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(extract_dir)
    elif archive_path.suffix == ".zip":
        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)
    elif archive_path.suffix in (".AppImage", ".exe"):
        # Single executable, just move it
        shutil.move(str(archive_path), extract_dir / archive_path.name)
    elif archive_path.suffix == ".msi":
        # For Windows MSI, we need to extract it or run installer
        # For simplicity, we'll note that MSI handling is complex
        print("Note: MSI installer detected. Manual installation may be required.")
        shutil.copy(str(archive_path), extract_dir / archive_path.name)
    else:
        raise RuntimeError(f"Unsupported archive format: {archive_path.suffix}")

    print("Extraction complete!")


def get_download_url() -> Tuple[str, str]:
    """Get download URL from GitHub releases"""
    platform_key = get_platform_key()
    asset_name = PLATFORM_BINARIES[platform_key]["asset_name"]

    print("Fetching latest release information...")

    try:
        # Fetch latest release info
        req = urllib.request.Request(GITHUB_API_URL)
        req.add_header("Accept", "application/vnd.github.v3+json")

        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())

        # Find matching asset
        for asset in data.get("assets", []):
            if asset["name"] == asset_name:
                return asset["browser_download_url"], data["tag_name"]

        raise RuntimeError(
            f"No matching binary found for platform: {platform_key}\n"
            f"Looking for: {asset_name}"
        )

    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise RuntimeError(
                "No releases found. Please ensure binaries are published to GitHub Releases.\n"
                f"Repository: {GITHUB_API_URL}"
            )
        raise RuntimeError(f"Failed to fetch release info: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to get download URL: {e}")


def download_and_install():
    """Download and install the binary for current platform"""
    ensure_dirs()

    # Check if already installed
    if is_installed():
        installed_version = get_installed_version()
        print(f"VLDB-Toolkits is already installed (version: {installed_version})")

        response = input("Do you want to reinstall? (y/N): ").strip().lower()
        if response not in ("y", "yes"):
            return

        # Clean up existing installation
        print("Removing existing installation...")
        if BINARY_DIR.exists():
            shutil.rmtree(BINARY_DIR)
        BINARY_DIR.mkdir(parents=True, exist_ok=True)

    # Get download URL
    download_url, version = get_download_url()

    # Download binary
    platform_key = get_platform_key()
    asset_name = PLATFORM_BINARIES[platform_key]["asset_name"]
    download_path = BINARY_DIR / asset_name

    download_with_progress(download_url, download_path)

    # Extract if needed
    if PLATFORM_BINARIES[platform_key]["is_bundle"] or download_path.suffix in (".gz", ".zip"):
        extract_archive(download_path, BINARY_DIR)
        download_path.unlink()  # Remove archive after extraction

    # Make executable on Unix-like systems
    if platform.system() != "Windows":
        binary_path = get_binary_path()
        if binary_path.exists():
            os.chmod(binary_path, 0o755)

    # Save version
    VERSION_FILE.write_text(version)

    print(f"\nVLDB-Toolkits {version} installed successfully!")
    print(f"Installation directory: {BINARY_DIR}")


def check_and_install():
    """Check if binary is installed, download if not"""
    if not is_installed():
        print("VLDB-Toolkits is not installed yet.")
        print("This will download the application (~50-150 MB depending on platform)")
        print()
        download_and_install()
        print()
