with open("magnolia-core/src/system/api.rs", "r") as f:
    content = f.read()

content = content.replace("let (active_ssid, _signal_strength)", "let (active_ssid, signal_strength)")

with open("magnolia-core/src/system/api.rs", "w") as f:
    f.write(content)
