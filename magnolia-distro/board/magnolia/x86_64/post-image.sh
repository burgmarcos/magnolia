#!/bin/bash

# Magnolia - Post-Image Script

BOARD_DIR="$(dirname "$0")"
GENIMAGE_CFG="${BOARD_DIR}/genimage.cfg"
GENIMAGE_TMP="${BINARIES_DIR}/genimage.tmp"

# Sync EFI binary to top level for genimage
if [ -f "${BINARIES_DIR}/efi-part/EFI/BOOT/bootx64.efi" ]; then
    cp "${BINARIES_DIR}/efi-part/EFI/BOOT/bootx64.efi" "${BINARIES_DIR}/grub-x86_64.efi"
fi
cp "${BOARD_DIR}/grub.cfg" "${BINARIES_DIR}/grub.cfg"

# Generate image
genimage \
    --rootpath "${TARGET_DIR}" \
    --tmppath "${GENIMAGE_TMP}" \
    --inputpath "${BINARIES_DIR}" \
    --outputpath "${BINARIES_DIR}" \
    --config "${GENIMAGE_CFG}"

# Done
exit $?
