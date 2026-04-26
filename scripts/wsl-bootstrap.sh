#!/bin/bash
# scripts/wsl-bootstrap.sh
#
# One-shot environment setup for a Windows + WSL2 Ubuntu host that needs to
# build Magnolia OS via build_full_os.sh. Idempotent — safe to re-run.
#
# Run inside WSL as root:
#     sudo bash ./scripts/wsl-bootstrap.sh
# Then `wsl --shutdown` from PowerShell so /etc/wsl.conf takes effect.
#
# Why this exists:
#   build_full_os.sh's Phase 3 invokes Buildroot's `make`, which refuses to run
#   if PATH contains spaces. WSL's default interop appends Windows paths
#   (`C:\Program Files\...`) to PATH. We disable that here.
#   We also pre-install a wget shim with a read-timeout, because Buildroot's
#   default wget invocation has --connect-timeout=10 but no --read-timeout,
#   so a slow GNU mirror can wedge the build for hours.

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "Run as root: sudo bash $0" >&2
    exit 1
fi

echo "=== /etc/wsl.conf — disable Windows PATH interop ==="
cat > /etc/wsl.conf <<'EOF'
[interop]
appendWindowsPath = false

# NOTE: do NOT enable systemd here. Magnolia's build daemon runs as root and
# WSL's systemd-logind times out creating root user sessions, killing the
# daemon (CreateLoginSession:2766: Timed out waiting for user session for uid=0).
EOF
cat /etc/wsl.conf
echo

echo "=== /usr/local/bin/wget — shim with --read-timeout ==="
cat > /usr/local/bin/wget <<'EOF'
#!/bin/bash
# Buildroot calls wget with --connect-timeout=10 but no --read-timeout, so a
# slow mirror that accepts the connection then stalls mid-transfer will hang
# the build forever. Inject --read-timeout=60 unless the caller already set one.
HAS_READ_TIMEOUT=0
for arg in "$@"; do
    case "$arg" in
        --read-timeout*|-T) HAS_READ_TIMEOUT=1; break ;;
    esac
done
if [ $HAS_READ_TIMEOUT -eq 0 ]; then
    exec /usr/bin/wget --read-timeout=60 --tries=5 "$@"
else
    exec /usr/bin/wget "$@"
fi
EOF
chmod +x /usr/local/bin/wget
echo "wget shim installed:"
which -a wget

echo
echo "=== done ==="
echo "Now run from PowerShell on the Windows host:"
echo "    wsl --shutdown"
echo "Then re-enter WSL and run scripts/build_full_os.sh."
