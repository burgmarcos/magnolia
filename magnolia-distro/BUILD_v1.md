# Magnolia v1.0 First ISO Build Guide (WSL2)

This guide provides the exact steps to build the first bootable Magnolia image on a Windows machine using WSL2 (Ubuntu 24.04 recommended).

## 1. Prerequisites
Install the required build dependencies in your WSL2 terminal:
```bash
sudo apt update
sudo apt install -y build-essential libncurses5-dev rsync cpio \
    unzip bc wget python3-distutils file git
```

## 2. Prepare Buildroot
Clone the Buildroot source and navigate to it:
```bash
git clone https://github.com/buildroot/buildroot.git
cd buildroot
```

## 3. Configure Magnolia Build
Run the following command to apply the Magnolia architecture configuration (pointing to our `magnolia-distro` directory):
```bash
# Assuming the Magnolia project is in /mnt/c/Users/burgm/OneDrive/Documentos/Magnolia
make BR2_EXTERNAL=/mnt/c/Users/burgm/OneDrive/Documentos/Magnolia/magnolia-distro magnolia_x86_64_defconfig
```

## 4. Execute Build
Initiate the compilation process (this will take 30-90 minutes depending on your CPU):
```bash
make -j$(nproc)
```

## 5. Retrieve Image
Once completed, the bootable disk image will be located at:
`output/images/Magnolia.img`

## 6. Verification
You can test the image immediately using the provided QEMU script:
```bash
bash /mnt/c/Users/burgm/OneDrive/Documentos/Magnolia/magnolia-distro/local_scripts/qemu-test.sh output/images/Magnolia.img
```
