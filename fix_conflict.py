with open('magnolia-core/src/system/api.rs', 'r') as f:
    content = f.read()

import re

new_content = re.sub(r'<<<<<<< HEAD\n    let \(active_ssid, _signal_strength\) = if let Some\(line\) = active_line \{\n=======\n    #\[allow\(unused_variables\)\]\n    let \(active_ssid, signal_strength\) = if let Some\(line\) = active_line \{\n>>>>>>> origin/main', r'    let (active_ssid, signal_strength) = if let Some(line) = active_line {', content)

with open('magnolia-core/src/system/api.rs', 'w') as f:
    f.write(new_content)

print("Fixed api.rs conflict")
