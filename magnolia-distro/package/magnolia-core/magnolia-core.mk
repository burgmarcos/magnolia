################################################################################
#
# magnolia-core
#
################################################################################

MAGNOLIA_CORE_VERSION = "rolling"
MAGNOLIA_CORE_SITE = "$(BR2_EXTERNAL_MAGNOLIA_PATH)/../magnolia-core"
MAGNOLIA_CORE_SITE_METHOD = local

# Build dependencies
MAGNOLIA_CORE_DEPENDENCIES = host-rustc buildroot-pkg-cargo openssl

# Package options
MAGNOLIA_CORE_CARGO_OPTS = --features "target-magnolia"

# Installation
define MAGNOLIA_CORE_INSTALL_TARGET_CMDS
	# Install the dashboard hub binary
	$(INSTALL) -D -m 0755 $(@D)/target/$(RUSTC_TARGET_NAME)/release/magnolia-core \
		$(TARGET_DIR)/sbin/magnolia-hub
endef

$(eval $(cargo-package))
