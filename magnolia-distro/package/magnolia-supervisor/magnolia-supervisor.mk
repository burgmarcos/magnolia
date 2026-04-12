################################################################################
#
# magnolia-supervisor
#
################################################################################

MAGNOLIA_SUPERVISOR_VERSION = "rolling"
MAGNOLIA_SUPERVISOR_SITE = "$(BR2_EXTERNAL_MAGNOLIA_PATH)/../magnolia-supervisor"
MAGNOLIA_SUPERVISOR_SITE_METHOD = local

# Build dependencies
MAGNOLIA_SUPERVISOR_DEPENDENCIES = host-rustc

# Installation logic
# This process serves as PID 1, but we prefer to install it to /usr/bin
# and have post-build.sh or symlink handled appropriately.
define MAGNOLIA_SUPERVISOR_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/target/$(RUSTC_TARGET_NAME)/release/magnolia-supervisor \
		$(TARGET_DIR)/usr/bin/magnolia-supervisor
	
	# Create symlink to /sbin/init for boot process
	ln -sf /usr/bin/magnolia-supervisor $(TARGET_DIR)/sbin/init
endef

$(eval $(cargo-package))
