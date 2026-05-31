#!/usr/bin/env python3
"""
tools/translate_to_kn.py
Translate English keys in `js/i18n.js` to Kannada using Google Cloud Translation API v2.

Usage:
  python tools/translate_to_kn.py --key YOUR_API_KEY
  # or set env var and run
  $env:GOOGLE_API_KEY = 'YOUR_API_KEY'
  python tools/translate_to_kn.py

Options:
  --dry    Dry run (don't write files)
  --js     Path to i18n.js (defaults to repository `js/i18n.js`)

Notes:
- The script creates a backup `js/i18n.js.bak.TIMESTAMP` before writing.
- Google Cloud Translation v2 billing must be enabled for your project.
- This script sends UI strings to Google's servers.
"""

import os
import re
import json
import time
import argparse
import requests
from pathlib import Path


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)


def backup_file(path):
    ts = time.strftime('%Y%m%d_%H%M%S')
    bak = f"{path}.bak.{ts}"
    content = read_file(path)
    write_file(bak, content)
    return bak


def parse_en_block(js_text):
    # Find the 'en' block between 'en': { ... }, 'kn':
    m = re.search(r"('en'\s*:\s*\{)(.*?)(\}\s*,\s*'kn'\s*:\s*\{)", js_text, re.S)
    if not m:
        # try with double quotes
        m = re.search(r'("en"\s*:\s*\{)(.*?)(\}\s*,\s*"kn"\s*:\s*\{)', js_text, re.S)
    if not m:
        raise RuntimeError("Could not locate 'en' block in js/i18n.js")
    en_inner = m.group(2)
    # capture simple key: 'key': 'value', pairs
    pairs = re.findall(r"'([a-z0-9_]+)'\s*:\s*'((?:\\'|[^'])*)'\s*,?", en_inner, re.S)
    en_map = {k: v.replace("\\'", "'") for k, v in pairs}
    return en_map


def find_kn_block_bounds(js_text):
    m = re.search(r"('kn'\s*:\s*\{)(.*?)(\n\s*\}\s*(,|\n))", js_text, re.S)
    if not m:
        m = re.search(r'(\"kn\"\s*:\s*\{)(.*?)(\n\s*\}\s*(,|\n))', js_text, re.S)
    if not m:
        raise RuntimeError("Could not locate 'kn' block in js/i18n.js")
    start = m.start(2)
    end = m.end(2)
    return start, end


def build_kn_block(en_map, kn_map):
    # Preserve en_map order
    lines = []
    for k, v in en_map.items():
        val = kn_map.get(k, v)
        # escape single quotes
        val = val.replace("'", "\\'")
        lines.append(f"        '{k}': '{val}',")
    return '\n'.join(lines) + '\n'


def translate_batch(api_key, texts, src='en', target='kn'):
    url = f'https://translation.googleapis.com/language/translate/v2?key={api_key}'
    payload = {'q': texts, 'source': src, 'target': target, 'format': 'text'}
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    translations = data.get('data', {}).get('translations', [])
    return [t.get('translatedText', '') for t in translations]


def translate_map(api_key, en_map, batch_size=40):
    items = list(en_map.items())
    out = {}
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        keys = [k for k, _ in batch]
        texts = [v for _, v in batch]
        translated = translate_batch(api_key, texts)
        if len(translated) != len(batch):
            raise RuntimeError('Unexpected translation response length')
        for k, t in zip(keys, translated):
            out[k] = t
    return out


def main():
    parser = argparse.ArgumentParser(description='Translate i18n en->kn using Google Translate v2')
    parser.add_argument('--key', help='Google API key (v2)', default=os.environ.get('GOOGLE_API_KEY'))
    parser.add_argument('--js', help='Path to i18n.js', default=os.path.join(os.getcwd(), 'js', 'i18n.js'))
    parser.add_argument('--dry', action='store_true', help='Dry run (do not modify files)')
    args = parser.parse_args()

    if not args.key:
        print('Error: provide --key or set GOOGLE_API_KEY environment variable.')
        return

    js_path = Path(args.js)
    if not js_path.exists():
        print('Error: i18n.js not found at', js_path)
        return

    print('Reading', js_path)
    js_text = read_file(js_path)

    print('Parsing English keys...')
    en_map = parse_en_block(js_text)
    print(f'Found {len(en_map)} keys in English block')

    print('Requesting translations (Google Translate)...')
    kn_map = translate_map(args.key, en_map)
    print(f'Received {len(kn_map)} translated entries')

    print('Backing up original file...')
    bak = backup_file(js_path)
    print('Backup written to', bak)

    # replace kn block
    start, end = find_kn_block_bounds(js_text)
    new_kn_block = build_kn_block(en_map, kn_map)
    new_js = js_text[:start] + '\n' + new_kn_block + js_text[end:]

    if args.dry:
        print('Dry run: no file written. Exiting.')
        return

    write_file(js_path, new_js)
    print('Wrote updated', js_path)

if __name__ == '__main__':
    main()
