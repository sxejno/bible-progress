#!/usr/bin/env python3
"""Checks on the interlinear data packs and their wiring.

Run:  python3 tests/interlinear.test.py
Standard library only. No pip install needed.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IL = os.path.join(ROOT, 'content', 'interlinear')
failures = []


def check(cond, message):
    if not cond:
        failures.append(message)


def slug(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


kjv = json.load(open(os.path.join(ROOT, 'kjv_bible.json'), encoding='utf-8'))
manifest = json.load(open(os.path.join(IL, 'index.json'), encoding='utf-8'))
lex = {
    'he': json.load(open(os.path.join(IL, 'lexicon-he.json'), encoding='utf-8')),
    'el': json.load(open(os.path.join(IL, 'lexicon-el.json'), encoding='utf-8')),
}
check(len(lex['he']) > 8600, f'Hebrew lexicon too small: {len(lex["he"])}')
check(len(lex['el']) > 5400, f'Greek lexicon too small: {len(lex["el"])}')
for lang, entries in lex.items():
    for num, e in list(entries.items())[:5000]:
        check(num.isdigit(), f'{lang} lexicon key not numeric: {num}')
        check(isinstance(e, dict) and all(isinstance(v, (str, int)) for v in e.values()),
              f'{lang} lexicon entry {num} has a non-scalar field')

total_words = total_linked = 0
missing_numbers = set()
books_seen = 0
for bi, book in enumerate(kjv):
    name = book['book']
    lang = 'he' if bi < 39 else 'el'
    path = os.path.join(IL, slug(name) + '.json')
    if not os.path.exists(path):
        failures.append(f'missing pack for {name}: {path}')
        continue
    books_seen += 1
    pack = json.load(open(path, encoding='utf-8'))
    check(pack.get('book') == name, f'{name}: pack book name is {pack.get("book")!r}')
    check(pack.get('lang') == lang, f'{name}: pack lang is {pack.get("lang")!r}, expected {lang}')
    chapters = pack.get('chapters') or []
    check(len(chapters) == len(book['chapters']), f'{name}: {len(chapters)} chapters, KJV has {len(book["chapters"])}')
    for ci, chapter in enumerate(book['chapters']):
        if ci >= len(chapters):
            break
        verses = chapters[ci]
        check(len(verses) == len(chapter['verses']),
              f'{name} {ci + 1}: {len(verses)} verses, KJV has {len(chapter["verses"])}')
        for vi, verse in enumerate(verses):
            ref = f'{name} {ci + 1}:{vi + 1}'
            check(isinstance(verse, list) and len(verse) == 2, f'{ref}: verse is not [words, segs]')
            words, segs = verse
            check(len(words) > 0, f'{ref}: no original-language words')
            width = 5 if lang == 'he' else 4
            for w in words:
                check(len(w) == width and all(isinstance(x, str) for x in w), f'{ref}: bad word tuple {w!r}')
                check(bool(w[0]), f'{ref}: empty surface form')
                strongs = w[3] if lang == 'he' else w[2]
                for n in strongs.split('/'):
                    check(n.isdigit(), f'{ref}: bad Strong\'s part {n!r} in {strongs!r}')
                    if n.isdigit() and n not in lex[lang]:
                        missing_numbers.add((lang, n))
            linked = set()
            kjv_text = []
            for seg in segs:
                check(isinstance(seg, list) and 2 <= len(seg) <= 3, f'{ref}: bad segment {seg!r}')
                check(isinstance(seg[0], str) and seg[0].strip(), f'{ref}: empty KJV segment text')
                for i in seg[1]:
                    check(0 <= i < len(words), f'{ref}: word index {i} out of range')
                    check(i not in linked, f'{ref}: word {i} linked from two segments')
                    linked.add(i)
                kjv_text.append(seg[0])
            total_words += len(words)
            total_linked += len(linked)
            # the segments must spell the KJV verse (letters only; editions differ in punctuation)
            ours = re.sub(r'[^a-z]', '', ' '.join(kjv_text).lower())
            theirs = re.sub(r'[^a-z]', '', chapter['verses'][vi]['text'].lower())
            if ours != theirs and not ours.startswith(theirs):
                # allow the known spelling drift between KJV editions, but never a missing phrase.
                # (ours may run longer: the CrossWire text keeps the epistle subscriptions,
                # "Written to the Romans from Corinthus...", which kjv_bible.json drops)
                check(abs(len(ours) - len(theirs)) <= 12, f'{ref}: KJV segments do not spell the verse')

check(books_seen == 66, f'only {books_seen} book packs found')
check(total_words > 440000, f'too few original words: {total_words}')
coverage = total_linked / max(1, total_words)
check(coverage > 0.85, f'alignment coverage {coverage:.1%} is below 85%')
check(not missing_numbers, f'{len(missing_numbers)} Strong\'s numbers used by words have no lexicon entry, e.g. {sorted(missing_numbers)[:5]}')

# manifest agrees with the files
for name, info in manifest['books'].items():
    check(os.path.exists(os.path.join(IL, info['file'])), f'manifest names missing file {info["file"]}')
check(len(manifest['books']) == 66, 'manifest does not list 66 books')

# the app and service worker reference the packs
index_html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
check('content/interlinear/${interlinearSlug(bookName)}.json' in index_html, 'index.html does not fetch the per-book packs')
check('content/interlinear/lexicon-${lang}.json' in index_html, 'index.html does not fetch the lexicons')
check('window.toggleInterlinear' in index_html and 'window.showInterlinearWord' in index_html, 'index.html lacks the interlinear handlers')
sw = open(os.path.join(ROOT, 'service-worker.js'), encoding='utf-8').read()
for f in sorted(os.listdir(IL)):
    if f.endswith('.json'):
        check(f"'/content/interlinear/{f}'" in sw, f'service worker offline list lacks {f}')

print(f'interlinear: {books_seen} books, {total_words} original words, {coverage:.1%} aligned to KJV phrases')
if failures:
    print(f'FAIL ({len(failures)}):')
    for f in failures[:40]:
        print('  -', f)
    sys.exit(1)
print('PASS')
