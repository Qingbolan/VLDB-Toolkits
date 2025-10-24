"""Command-line interface for VLDB-Toolkits"""

import sys
import os
import subprocess
import platform
from .downloader import check_and_install, get_binary_path, is_installed
from .config import VERSION


def print_usage():
    """Print usage information"""
    print(f"""
VLDB-Toolkits v{VERSION}
Paper Management Platform for VLDB

Usage:
  vldb-toolkits           Launch the application
  vldb-toolkits --help    Show this help message
  vldb-toolkits --version Show version information
  vldb-toolkits --install Force reinstall the binary
  vldb-toolkits --path    Show binary installation path

Examples:
  vldb-toolkits          # Start the application
    """)


def main():
    """Main entry point for CLI"""
    args = sys.argv[1:]

    # Handle special commands
    if "--help" in args or "-h" in args:
        print_usage()
        return 0

    if "--version" in args or "-v" in args:
        print(f"VLDB-Toolkits v{VERSION}")
        return 0

    if "--install" in args:
        from .downloader import download_and_install
        try:
            download_and_install()
            return 0
        except Exception as e:
            print(f"Installation failed: {e}", file=sys.stderr)
            return 1

    if "--path" in args:
        if is_installed():
            print(f"Binary path: {get_binary_path()}")
            print(f"Installed: Yes")
        else:
            print("Binary not installed yet. Run 'vldb-toolkits' to install.")
        return 0

    # Check and install if needed
    try:
        check_and_install()
    except Exception as e:
        print(f"Error during installation check: {e}", file=sys.stderr)
        return 1

    # Get binary path
    binary_path = get_binary_path()

    if not binary_path.exists():
        print(f"Error: Binary not found at {binary_path}", file=sys.stderr)
        print("Try running 'vldb-toolkits --install' to reinstall", file=sys.stderr)
        return 1

    # Optional Linux runtime checks
    def _linux_runtime_check():
        missing = []
        # Check critical shared libs via ldconfig
        def has_lib(name: str) -> bool:
            try:
                out = subprocess.run(["ldconfig", "-p"], capture_output=True, text=True, check=False)
                return name in out.stdout
            except Exception:
                return False
        # WebKitGTK (prefer 4.1, fallback 4.0)
        if not (has_lib("libwebkit2gtk-4.1.so.0") or has_lib("libwebkit2gtk-4.0.so.37")):
            missing.append("WebKitGTK")
        # GTK3 runtime
        if not has_lib("libgtk-3.so.0"):
            missing.append("GTK3")
        # AppIndicator (tray) library variants
        if not (has_lib("libayatana-appindicator3.so.1") or has_lib("libappindicator3.so") or has_lib("libappindicator-gtk3.so")):
            missing.append("AppIndicator3")
        # FUSE v2 for AppImage runtime
        fuse_missing = not (has_lib("libfuse.so.2"))
        if fuse_missing:
            missing.append("FUSE (libfuse2)")
        # GUI session check
        if not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
            missing.append("GUI session (X11/Wayland)")
        return missing, fuse_missing

    if platform.system() == "Linux":
        missing, fuse_missing = _linux_runtime_check()
        if missing:
            # Try to give distro-specific suggestions
            distro = ""
            try:
                with open("/etc/os-release", "r", encoding="utf-8") as f:
                    data = f.read()
                def _get(field: str) -> str:
                    import re
                    m = re.search(rf"^{field}=(.*)$", data, re.MULTILINE)
                    return m.group(1).strip().strip('"') if m else ""
                distro = (_get("ID_LIKE") or _get("ID")).lower()
            except Exception:
                pass

            print("Missing Linux runtime dependencies:", file=sys.stderr)
            for item in missing:
                print(f"  - {item}", file=sys.stderr)

            print("\nInstall suggestions:", file=sys.stderr)
            if "debian" in distro or "ubuntu" in distro:
                print("  sudo apt update && sudo apt install -y libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 libfuse2", file=sys.stderr)
            elif "fedora" in distro or "rhel" in distro or "centos" in distro:
                print("  sudo dnf install -y webkit2gtk4.1 gtk3 libappindicator-gtk3 fuse", file=sys.stderr)
            elif "arch" in distro or "manjaro" in distro:
                print("  sudo pacman -S --needed webkit2gtk-4.1 gtk3 libappindicator-gtk3 fuse2", file=sys.stderr)
            elif "suse" in distro or "opensuse" in distro:
                print("  sudo zypper install -y libwebkit2gtk-4_1-0 gtk3-tools libappindicator3-1 libfuse2", file=sys.stderr)
            else:
                print("  Install WebKitGTK 4.1+, GTK3, AppIndicator3, and libfuse2 via your package manager.", file=sys.stderr)

            # If only FUSE is missing, we can still try to run by extracting AppImage
            if missing == ["FUSE (libfuse2)"]:
                print("\nFUSE missing: will attempt extraction-run fallback.", file=sys.stderr)
            else:
                print("\nAborting launch due to missing dependencies.", file=sys.stderr)
                return 1

    # Launch the application
    try:
        print(f"Launching VLDB-Toolkits...")

        # On macOS with .app bundle, use 'open' command
        if platform.system() == "Darwin" and binary_path.suffix == "":
            app_bundle = binary_path.parent.parent.parent

            # Remove macOS quarantine attribute to prevent "damaged" error
            try:
                subprocess.run(
                    ["xattr", "-dr", "com.apple.quarantine", str(app_bundle)],
                    capture_output=True,
                    check=False  # Don't fail if xattr doesn't exist
                )
            except Exception:
                pass  # Silently ignore if xattr command fails

            subprocess.run(["open", str(app_bundle)] + args, check=True)
        else:
            # On Linux, if FUSE is missing, try extract-and-run fallback for AppImage
            env = os.environ.copy()
            if platform.system() == "Linux":
                try:
                    out = subprocess.run(["ldconfig", "-p"], capture_output=True, text=True, check=False)
                    fuse_missing = "libfuse.so.2" not in out.stdout
                except Exception:
                    fuse_missing = False
                if fuse_missing:
                    env["APPIMAGE_EXTRACT_AND_RUN"] = "1"
            subprocess.run([str(binary_path)] + args, check=True, env=env)

        return 0

    except KeyboardInterrupt:
        print("\nApplication closed by user")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Application exited with error: {e.returncode}", file=sys.stderr)
        return e.returncode
    except Exception as e:
        print(f"Failed to launch application: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
