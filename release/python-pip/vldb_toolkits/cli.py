"""Command-line interface for VLDB-Toolkits"""

import sys
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
            subprocess.run([str(binary_path)] + args, check=True)

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
