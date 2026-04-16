with open('magnolia-core/src/system/storage.rs', 'r') as f:
    content = f.read()

import re

new_content = re.sub(r'<<<<<<< HEAD\n                \.arg\(&format!\("/dev/\{\}", name\)\)\n=======\n                \.arg\(format!\("/dev/\{\}", name\)\)\n>>>>>>> origin/main', r'                .arg(format!("/dev/{}", name))', content)

with open('magnolia-core/src/system/storage.rs', 'w') as f:
    f.write(new_content)

print("Fixed storage.rs conflict")
