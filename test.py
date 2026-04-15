import urllib.request
import json
import os

url = 'https://api.github.com/repos/burgmarcos/magnolia/pulls/8'

headers = {
    'Accept': 'application/vnd.github.v3+json'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"PR state: {data['state']}")
        print(f"Mergeable: {data.get('mergeable')}")
        print(f"Mergeable state: {data.get('mergeable_state')}")
except Exception as e:
    print(f"Error: {e}")
