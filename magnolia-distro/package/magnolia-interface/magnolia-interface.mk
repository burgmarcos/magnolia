################################################################################
#
# magnolia-interface
#
################################################################################

MAGNOLIA_INTERFACE_VERSION = 1.0
MAGNOLIA_INTERFACE_SITE = $(BR2_EXTERNAL_MAGNOLIA_PATH)/../magnolia-interface
MAGNOLIA_INTERFACE_SITE_METHOD = local
MAGNOLIA_INTERFACE_DEPENDENCIES = host-nodejs

define MAGNOLIA_INTERFACE_BUILD_CMDS
	cd $(@D) && $(HOST_DIR)/bin/npm install && $(HOST_DIR)/bin/npm run build
endef

define MAGNOLIA_INTERFACE_INSTALL_TARGET_CMDS
	$(INSTALL) -d -m 0755 $(TARGET_DIR)/usr/share/magnolia/interface
	cp -r $(@D)/dist/* $(TARGET_DIR)/usr/share/magnolia/interface/
endef

$(eval $(generic-package))
