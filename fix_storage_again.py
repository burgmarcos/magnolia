import re

with open("magnolia-core/src/system/storage.rs", "r") as f:
    content = f.read()

# Make sure the signature does not have `app_id: String` anymore if the conflict was because of it...
# Let's inspect the `archive_app` function in storage.rs right now
