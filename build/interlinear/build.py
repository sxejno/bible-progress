#!/usr/bin/env python3
"""Build the KJV interlinear data packs for the in-app Bible reader.

Run from anywhere:   python3 build/interlinear/build.py
Standard library only. No pip install needed.

Sources (downloaded into build/interlinear/cache/ on first run):
  * STEPBible TAHOT + TAGNT  - every Hebrew/Aramaic/Greek word with
    transliteration, gloss, disambiguated Strong's number and morphology.
    Tyndale House, Cambridge. CC BY 4.0.  https://github.com/STEPBible/STEPBible-Data
  * CrossWire KJV (OSIS)      - the 1769 KJV with Strong's numbers on every
    phrase, via the @metaxia/scriptures-source-crosswire-kjv npm package
    (MIT packaging; the text itself is public domain).
  * Open Scriptures Strong's  - Strong's Hebrew & Greek dictionaries with
    lemma, transliteration, pronunciation, definition and KJV usage.
    Public domain text; JSON conversion CC BY-SA.

Outputs (committed):
  content/interlinear/<book-slug>.json   one file per book, fetched on demand
  content/interlinear/lexicon-he.json    Strong's Hebrew + STEP prefix codes
  content/interlinear/lexicon-el.json    Strong's Greek
  content/interlinear/index.json         manifest with per-book stats
  content/interlinear/occurrences-*.json Strong's number -> verses that contain it
                                         (verse ids in kjv_bible.json order, delta-encoded)

Per verse the book files hold two arrays:
  words: original-language words in original order
         [surface, translit, gloss, strongs, morph]
         - Hebrew keeps STEP's "/" between prefix, stem and suffix so the
           reader can split a word into its parts; the client strips "/"
           for display. Greek has no "/" and no stored translit (the client
           derives it from the letters).
         - strongs: "9003/7225" - numbers only; the language is implied.
           Hebrew 9xxx numbers are STEP's codes for prefixes and suffixes.
         - morph: STEP/OSHB Hebrew codes ("HR/Ncfsa") or Robinson Greek
           codes ("V-AAI-3S").
  segs:  the KJV verse in KJV order, split where the Strong's tagging
         changes: [text, [wordIndex, ...]] with a trailing 1 when the KJV
         supplied the words (printed in italics).
"""
import io
import json
import os
import re
import ssl
import sys
import tarfile
import urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(ROOT, 'content', 'interlinear')

STEP_BASE = ('https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/'
             'Translators%20Amalgamated%20OT%2BNT/')
SOURCES = {
    'tahot1.txt': STEP_BASE + 'TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
    'tahot2.txt': STEP_BASE + 'TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
    'tahot3.txt': STEP_BASE + 'TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
    'tahot4.txt': STEP_BASE + 'TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
    'tagnt1.txt': STEP_BASE + 'TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
    'tagnt2.txt': STEP_BASE + 'TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
    'heb.js': 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js',
    'grk.js': 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js',
}
KJV_PACKAGE = 'https://registry.npmjs.org/@metaxia%2Fscriptures-source-crosswire-kjv'
KJV_TARBALL = 'kjv.tgz'

# (tracker book name, STEP code, CrossWire OSIS dir)
BOOKS = [
    ('Genesis', 'Gen', 'Gen'), ('Exodus', 'Exo', 'Exod'), ('Leviticus', 'Lev', 'Lev'),
    ('Numbers', 'Num', 'Num'), ('Deuteronomy', 'Deu', 'Deut'), ('Joshua', 'Jos', 'Josh'),
    ('Judges', 'Jdg', 'Judg'), ('Ruth', 'Rut', 'Ruth'), ('1 Samuel', '1Sa', '1Sam'),
    ('2 Samuel', '2Sa', '2Sam'), ('1 Kings', '1Ki', '1Kgs'), ('2 Kings', '2Ki', '2Kgs'),
    ('1 Chronicles', '1Ch', '1Chr'), ('2 Chronicles', '2Ch', '2Chr'), ('Ezra', 'Ezr', 'Ezra'),
    ('Nehemiah', 'Neh', 'Neh'), ('Esther', 'Est', 'Esth'), ('Job', 'Job', 'Job'),
    ('Psalms', 'Psa', 'Ps'), ('Proverbs', 'Pro', 'Prov'), ('Ecclesiastes', 'Ecc', 'Eccl'),
    ('Song of Solomon', 'Sng', 'Song'), ('Isaiah', 'Isa', 'Isa'), ('Jeremiah', 'Jer', 'Jer'),
    ('Lamentations', 'Lam', 'Lam'), ('Ezekiel', 'Ezk', 'Ezek'), ('Daniel', 'Dan', 'Dan'),
    ('Hosea', 'Hos', 'Hos'), ('Joel', 'Jol', 'Joel'), ('Amos', 'Amo', 'Amos'),
    ('Obadiah', 'Oba', 'Obad'), ('Jonah', 'Jon', 'Jonah'), ('Micah', 'Mic', 'Mic'),
    ('Nahum', 'Nam', 'Nah'), ('Habakkuk', 'Hab', 'Hab'), ('Zephaniah', 'Zep', 'Zeph'),
    ('Haggai', 'Hag', 'Hag'), ('Zechariah', 'Zec', 'Zech'), ('Malachi', 'Mal', 'Mal'),
    ('Matthew', 'Mat', 'Matt'), ('Mark', 'Mrk', 'Mark'), ('Luke', 'Luk', 'Luke'),
    ('John', 'Jhn', 'John'), ('Acts', 'Act', 'Acts'), ('Romans', 'Rom', 'Rom'),
    ('1 Corinthians', '1Co', '1Cor'), ('2 Corinthians', '2Co', '2Cor'), ('Galatians', 'Gal', 'Gal'),
    ('Ephesians', 'Eph', 'Eph'), ('Philippians', 'Php', 'Phil'), ('Colossians', 'Col', 'Col'),
    ('1 Thessalonians', '1Th', '1Thess'), ('2 Thessalonians', '2Th', '2Thess'),
    ('1 Timothy', '1Ti', '1Tim'), ('2 Timothy', '2Ti', '2Tim'), ('Titus', 'Tit', 'Titus'),
    ('Philemon', 'Phm', 'Phlm'), ('Hebrews', 'Heb', 'Heb'), ('James', 'Jas', 'Jas'),
    ('1 Peter', '1Pe', '1Pet'), ('2 Peter', '2Pe', '2Pet'), ('1 John', '1Jn', '1John'),
    ('2 John', '2Jn', '2John'), ('3 John', '3Jn', '3John'), ('Jude', 'Jud', 'Jude'),
    ('Revelation', 'Rev', 'Rev'),
]
OT_COUNT = 39


def slug(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


# ---------------------------------------------------------------- downloads

def fetch(url, dest):
    if os.path.exists(dest):
        return
    print(f'  downloading {os.path.basename(dest)} ...')
    ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)
    with urllib.request.urlopen(url, context=ctx, timeout=600) as r, open(dest, 'wb') as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)


def ensure_sources():
    os.makedirs(CACHE, exist_ok=True)
    for name, url in SOURCES.items():
        fetch(url, os.path.join(CACHE, name))
    tgz = os.path.join(CACHE, KJV_TARBALL)
    if not os.path.exists(tgz):
        ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)
        with urllib.request.urlopen(KJV_PACKAGE, context=ctx, timeout=120) as r:
            meta = json.load(r)
        latest = meta['dist-tags']['latest']
        fetch(meta['versions'][latest]['dist']['tarball'], tgz)
    kjv_dir = os.path.join(CACHE, 'kjv')
    if not os.path.isdir(kjv_dir):
        print('  extracting KJV package ...')
        with tarfile.open(tgz) as tf:
            members = [m for m in tf.getmembers() if '/data/crosswire-KJV/' in m.name]
            tf.extractall(kjv_dir, members=members)
    return kjv_dir


# ---------------------------------------------------------------- Strong's

def parse_js_dict(path):
    text = open(path, encoding='utf-8').read()
    return json.loads(text[text.index('{'):text.rindex('}') + 1])


STRONG_RE = re.compile(r'([HG])0*(\d+)([A-Za-z]?)')


def base_numbers(field):
    """All base Strong's numbers in a STEP dStrongs field, in order."""
    return [int(m.group(2)) for m in STRONG_RE.finditer(field)]


# Greek crasis / compound words: the KJV tags one number where STEP tags parts.
CRASIS = {
    2504: {1473, 2532}, 2548: {2532, 1565}, 2546: {2532, 1563}, 2547: {2532, 1564},
    2579: {2532, 1437}, 3379: {3361, 4218}, 3765: {3756, 2089}, 2444: {2443, 5101},
    1512: {1487, 4007}, 5240: {5228, 1537, 4057}, 3364: {3756, 3361}, 3362: {1437, 3361},
    3361: {3361}, 5100: {5100},
}


# ---------------------------------------------------------------- STEP parsing

HEB_STRIP = re.compile('[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]')
REF_RE = re.compile(
    r'^(?P<b>[1-3]?[A-Za-z]{2,3})\.(?P<c>\d+)\.(?P<v>\d+)'
    r'(?:\[(?P<kc>\d+)\.(?P<kv>\d+)\])?'      # KJV versification (TAGNT)
    r'(?:\([^)]*\))?(?:\{[^}]*\})?'           # NA / Hebrew / other versification
    r'#(?P<n>\d+)=(?P<t>\S*)$')


def clean_hebrew(s):
    s = s.replace('\\', '')
    s = HEB_STRIP.sub('', s)
    s = re.sub(r'\s+[\u05e1\u05e4]$', '', s)   # open/closed paragraph markers
    return s.strip()


def parse_tahot(path, store, prefix_gloss, lemma_gloss):
    """store[(code, ch, verse)] -> list of word rows."""
    with open(path, encoding='utf-8') as f:
        for line in f:
            if not line[:1].isalnum():
                continue
            cols = line.rstrip('\n').split('\t')
            m = REF_RE.match(cols[0])
            if not m or len(cols) < 6:
                continue
            kind = m.group('t')[:1]
            if kind not in ('L', 'Q', 'R'):
                continue   # K = ketiv variant, X = LXX-only text
            hebrew = clean_hebrew(cols[1])
            translit = cols[2].replace('/', '').strip()
            gloss = '/'.join(p.strip() for p in cols[3].split('/'))
            dstrong = cols[4].split('\\')[0]
            parts = [p for p in dstrong.split('/') if p]
            nums = []
            for p in parts:
                mm = STRONG_RE.search(p)
                if mm:
                    nums.append(int(mm.group(2)))
            grammar = re.sub(r'/+', '/', cols[5].split('\\')[0]).strip('/')
            if not hebrew or not nums:
                continue
            # Expanded tags carry per-part glosses: H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first}
            if len(cols) > 11:
                for tag in re.findall(r'\{?([HG]\d{4})[A-Z]?=([^=]+)=([^/{}]*)', cols[11]):
                    num = int(tag[0][1:])
                    g = tag[2].split('»')[0].split('@')[0].strip(' :_')
                    if num >= 9000:
                        prefix_gloss[num][(tag[1], g)] += 1
                    elif g:
                        lemma_gloss[('he', num)][g] += 1
            key = (m.group('b'), int(m.group('c')), int(m.group('v')))
            store[key].append([hebrew, translit, gloss, '/'.join(str(n) for n in nums), grammar,
                               [int(m.group('n')), 0]])


VARIANT_RE = re.compile(r'^(?P<w>.+?) \(T=[^)]*\) (?P<g>.*?) - (?P<s>G\d{4}[A-Za-z]?=[^ ]+(?: \+ G\d{4}[A-Za-z]?=[^ ]+)*) in: (?P<e>.*)$')


def greek_row(surface, gloss, sg):
    """surface, gloss, 'G0976=N-NSF' -> [surface, '', gloss, strongs, morph]."""
    nums, morphs = [], []
    for part in sg.split(' + '):
        if '=' not in part:
            continue
        s, g = part.split('=', 1)
        mm = STRONG_RE.search(s)
        if mm:
            nums.append(mm.group(2))
            morphs.append(g.strip())
    surface = surface.replace('¶', '').strip()
    return [surface, '', gloss.strip(), '/'.join(nums), '/'.join(morphs)]


def parse_tagnt(path, store, lemma_gloss, stats):
    with open(path, encoding='utf-8') as f:
        for line in f:
            if not line[:1].isalnum():
                continue
            cols = line.rstrip('\n').split('\t')
            m = REF_RE.match(cols[0])
            if not m or len(cols) < 6:
                continue
            kind = m.group('t')
            if 'k' not in kind.lower():
                continue   # not in the KJV's Greek at all
            surface = re.sub(r'\s*\([^)]*\)\s*$', '', cols[1]).strip()
            gloss = cols[2].strip()
            sg = cols[3]
            ch, vs = int(m.group('c')), int(m.group('v'))
            if m.group('kc'):
                ch, vs = int(m.group('kc')), int(m.group('kv'))
            key = (m.group('b'), ch, vs)
            rows = None
            if '(K)' in kind:
                # NA word here; the KJV's Greek is recorded as a meaning variant
                mv = VARIANT_RE.match(cols[6].strip()) if len(cols) > 6 else None
                if mv and re.search(r'(^|\+)TR', mv.group('e')):
                    words = mv.group('w').split()
                    tags = mv.group('s').split(' + ')
                    if len(words) == len(tags):
                        rows = [greek_row(w, mv.group('g') if i == 0 else '', t)
                                for i, (w, t) in enumerate(zip(words, tags))]
                    else:
                        rows = [greek_row(mv.group('w'), mv.group('g'), mv.group('s'))]
                    stats['variant_swapped'] += 1
                else:
                    stats['variant_kept'] += 1
            if rows is None:
                if '(k)' in kind and len(cols) > 7 and cols[7].strip():
                    # minor spelling difference: prefer the TR spelling when listed
                    for seg in cols[7].split(';'):
                        if ':' not in seg:
                            continue
                        eds, word = seg.split(':', 1)
                        if re.search(r'(^|\+|\s)TR\b', eds) and word.strip():
                            surface = word.strip()
                            stats['spelling_swapped'] += 1
                            break
                rows = [greek_row(surface, gloss, sg)]
            # "#11»12:G4190" links an article or particle to the word it belongs to
            own = int(m.group('n'))
            target = 0
            cj = re.match(r'#(\d+)[«»](\d+)', cols[10].strip()) if len(cols) > 10 else None
            if cj:
                target = int(cj.group(2))
            for r in rows:
                if r[3]:
                    store[key].append(r + [[own, target]])
            # dictionary form = gloss  -> short lexicon gloss
            if len(cols) > 4 and '=' in cols[4]:
                lemma, g = cols[4].split('=', 1)
                for n in base_numbers(sg.split(' + ')[0]):
                    lemma_gloss[('el', n)][g.strip()] += 1
                    lemma_gloss[('el-lemma', n)][lemma.strip()] += 1
                    break


# ---------------------------------------------------------------- KJV parsing

def kjv_segments(words):
    """CrossWire word list -> [{text, tags:[int], supplied:bool, split:id}]."""
    segs = []
    for w in words:
        meta = (w.get('metadata') or {}).get('type') or ''
        added = meta == 'added'
        tags = [int(s[1:]) for s in (w.get('strongs') or []) if s[1:].isdigit()]
        key = (w.get('lemma'), w.get('morph'), added, meta)
        if segs and segs[-1]['key'] == key and (tags or added or not segs[-1]['tags']):
            segs[-1]['words'].append(w['text'])
        else:
            segs.append({'key': key, 'words': [w['text']], 'tags': tags,
                         'supplied': added, 'split': meta if meta.startswith('x-split') else None})
    # A phrase the KJV splits ("should ... perish") is tagged on its last part only
    seen = {}
    for s in segs:
        if s['split']:
            seen.setdefault(s['split'], []).append(s)
    for group in seen.values():
        for s in group[:-1]:
            s['tags'] = []
    return segs


def restore_casing(segs, reference_text):
    """CrossWire lowercases LORD/GOD; take token casing from our KJV JSON."""
    flat = [t for s in segs for t in s['words']]
    ref = reference_text.split()
    if len(flat) == len(ref) and all(a.lower() == b.lower() for a, b in zip(flat, ref)):
        i = 0
        for s in segs:
            s['words'] = ref[i:i + len(s['words'])]
            i += len(s['words'])
        return True
    for s in segs:
        if 3068 in s['tags'] or 3069 in s['tags']:
            s['words'] = [re.sub(r'\b(Lord|God)\b', lambda m: m.group(1).upper(), t) for t in s['words']]
    return False


# ---------------------------------------------------------------- alignment

# Numbers the KJV tagging and STEP use for the same word: Strong's gives
# suppletive verb forms and pronoun cases their own numbers, STEP tags the lemma.
GROUPS = {
    'he': [
        {1980, 3212},            # halak / yalak "to go"
        {7122, 7125},            # qara "to meet"
        {3240, 5117},            # nuach "to rest"
        {2396, 3169},            # Hezekiah
        {3068, 3069},            # LORD / GOD
    ],
    'el': [
        {1473, 1683, 1691, 1698, 1699, 1700, 2248, 2249, 2254, 2257, 3165, 3427, 3450},  # I / me / we
        {4571, 4572, 4671, 4674, 4675, 4771, 5209, 5210, 5213, 5216},                   # thou / you
        {846, 1438},                                                                    # he / himself
        {3778, 5023, 5024, 5025, 5026, 5124, 5125, 5126, 5127, 5128, 5129, 5130},      # this / these
        {1510, 1488, 1498, 1511, 1526, 2070, 2071, 2075, 2076, 2077, 2252, 2258, 2468, 5600, 5607},  # to be
        {3004, 2036, 2046, 4483},                                                       # say / said
        {3708, 1492, 3700},                                                             # see / saw
        {756, 757}, {680, 681}, {3440, 3441}, {4412, 4413}, {3403, 3415},
    ],
}
CANON = {}
for _lang, _groups in GROUPS.items():
    for _group in _groups:
        for _n in _group:
            CANON[(_lang, _n)] = min(_group)


def canon(lang, n):
    return CANON.get((lang, n), n)


def matches(lang, tag, word_nums):
    if canon(lang, tag) in word_nums:
        return True
    parts = CRASIS.get(tag)
    return bool(parts) and {canon(lang, p) for p in parts} <= word_nums


GLOSS_SKIP = {'the', 'a', 'an', 'of', 'and', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'he', 'she',
              'they', 'them', 'his', 'her', 'their', 'him', 'i', 'we', 'you', 'me', 'us', 'my', 'our',
              'your', 'obj', 'obj.'}
WORD_RE = re.compile(r"[a-z']+")
DEBUG = {'miss': Counter(), 'unlinked': Counter(), 'conjoined': 0}


def gloss_pass(orig_words, segs, used, seg_of):
    """Link words the KJV tagging skipped (mostly Hebrew particles) by their
    STEP gloss: an unlinked word glossed "not" attaches to the nearby KJV
    segment that contains "not" and has no such word yet."""
    seg_tokens = [set(WORD_RE.findall(' '.join(s['words']).lower())) if not s['supplied'] else set()
                  for s in segs]
    for s in segs:
        pass
    for i, w in enumerate(orig_words):
        if used[i]:
            continue
        gloss = re.sub(r'[\[\]<>()]', ' ', w[2].lower())
        tokens = set(t for t in WORD_RE.findall(gloss) if len(t) > 1 and t not in GLOSS_SKIP)
        if not tokens:
            continue
        # expected KJV position: the segment of the nearest linked neighbour
        anchor = None
        for j in range(i - 1, -1, -1):
            if seg_of[j] is not None:
                anchor = seg_of[j]
                break
        if anchor is None:
            for j in range(i + 1, len(orig_words)):
                if seg_of[j] is not None:
                    anchor = max(0, seg_of[j] - 1)
                    break
        if anchor is None:
            anchor = 0
        for k in range(max(0, anchor - 2), min(len(segs), anchor + 5)):
            hit = seg_tokens[k] & tokens
            if hit:
                segs[k]['links'].append(i)
                seg_tokens[k] -= hit
                used[i] = True
                seg_of[i] = k
                break


# Hebrew has no conjoin data, so particles attach to the word that follows them:
# the object marker, prepositions, the relative, "for", "not", "behold", subject pronouns
HEB_ATTACH = ('To', 'R', 'Rd', 'Tr', 'Tc', 'Tn', 'Tj', 'Pp', 'C')


def hebrew_attaches(morph):
    parts = [p for p in morph[1:].split('/') if p and not p.startswith('S')]
    if not parts:
        return False
    head = parts[-1]
    return head[:2] in HEB_ATTACH or (head[:1] in ('R', 'C') and head[:2] not in HEB_POS_TWO)


HEB_POS_TWO = ('Rd',)


def conjoin_pass(lang, orig_words, segs, used, seg_of):
    """Attach words the KJV never tags on their own (articles, object markers,
    prepositions) to the KJV phrase of the word they belong to. Greek uses
    STEP's conjoin column; Hebrew attaches to the next word."""
    by_no = {w[5][0]: i for i, w in enumerate(orig_words) if len(w) > 5}
    added = 0
    for _round in range(3):
        progress = False
        for i, w in enumerate(orig_words):
            if used[i]:
                continue
            j = None
            if lang == 'el':
                target = w[5][1] if len(w) > 5 else 0
                j = by_no.get(target) if target else None
            elif hebrew_attaches(w[4]) and i + 1 < len(orig_words):
                j = i + 1
            if j is None or j == i or not used[j]:
                continue
            k = seg_of[j]
            segs[k]['links'].append(i)
            used[i] = True
            seg_of[i] = k
            added += 1
            progress = True
        if not progress:
            break
    return added


def align(lang, orig_words, segs):
    nums = [set(canon(lang, int(n)) for n in w[3].split('/')) for w in orig_words]
    used = [False] * len(orig_words)
    seg_of = [None] * len(orig_words)
    cursor = 0
    hits = misses = 0
    for si, s in enumerate(segs):
        s['links'] = []
        for tag in s['tags']:
            cands = [i for i in range(len(orig_words)) if not used[i] and matches(lang, tag, nums[i])]
            if not cands:
                misses += 1
                DEBUG['miss'][tag] += 1
                continue
            i = min(cands, key=lambda i: (i - cursor) if i >= cursor else (cursor - i) * 1.5 + 1)
            used[i] = True
            seg_of[i] = si
            s['links'].append(i)
            cursor = i + 1
            hits += 1
    gloss_pass(orig_words, segs, used, seg_of)
    DEBUG['conjoined'] += conjoin_pass(lang, orig_words, segs, used, seg_of)
    for s in segs:
        s['links'].sort()
    for i, w in enumerate(orig_words):
        if not used[i]:
            DEBUG['unlinked'][w[3]] += 1
    return hits, misses, sum(used)


# ---------------------------------------------------------------- main

def main():
    print('Interlinear build')
    kjv_dir = ensure_sources()
    kjv_root = os.path.join(kjv_dir, 'package', 'data', 'crosswire-KJV')
    if not os.path.isdir(kjv_root):
        sys.exit(f'KJV data not found under {kjv_root}')

    kjv_json = json.load(open(os.path.join(ROOT, 'kjv_bible.json'), encoding='utf-8'))
    kjv_text = {}
    for b in kjv_json:
        for c in b['chapters']:
            for v in c['verses']:
                kjv_text[(b['book'], c['chapter'], v['verse'])] = v['text']
    verse_counts = defaultdict(lambda: defaultdict(int))
    for (book, ch, vs) in kjv_text:
        verse_counts[book][ch] = max(verse_counts[book][ch], vs)
    verse_gid = {key: i for i, key in enumerate(kjv_text)}   # kjv_bible.json order
    occurrences = defaultdict(set)                            # (lang, number) -> verse ids

    print('Parsing STEP files ...')
    step = defaultdict(list)
    prefix_gloss = defaultdict(Counter)
    lemma_gloss = defaultdict(Counter)
    stats = Counter()
    for name in ('tahot1.txt', 'tahot2.txt', 'tahot3.txt', 'tahot4.txt'):
        parse_tahot(os.path.join(CACHE, name), step, prefix_gloss, lemma_gloss)
    for name in ('tagnt1.txt', 'tagnt2.txt'):
        parse_tagnt(os.path.join(CACHE, name), step, lemma_gloss, stats)
    print(f'  STEP verses: {len(step)}  Greek variants swapped to TR: {stats["variant_swapped"]}, '
          f'kept NA reading: {stats["variant_kept"]}, spellings swapped: {stats["spelling_swapped"]}')

    by_chapter = defaultdict(list)
    for (c2, ch2, vs2), rows in step.items():
        by_chapter[(c2, ch2)].append((vs2, rows))

    os.makedirs(OUT, exist_ok=True)
    manifest = {'books': {}, 'totals': Counter()}
    usage = Counter()
    casing_miss = 0
    for bi, (name, code, osis) in enumerate(BOOKS):
        lang = 'he' if bi < OT_COUNT else 'el'
        chapters = []
        book_stats = Counter()
        for ch in range(1, max(verse_counts[name]) + 1):
            verses = []
            nverses = verse_counts[name][ch]
            # STEP rows outside the KJV's verse range fold into the nearest verse
            pending = defaultdict(list)
            for vs2, rows in by_chapter.get((code, ch), []):
                target = min(max(vs2, 1), nverses)
                if vs2 != target:
                    pending[target].extend(rows)
            for vs in range(1, nverses + 1):
                orig = list(step.get((code, ch, vs), []))
                if vs in pending:
                    # verse 0 (psalm titles) goes in front; overflow verses go behind
                    front = [r for r in step.get((code, ch, 0), [])] if vs == 1 else []
                    back = [r for r in pending[vs] if r not in front]
                    orig = front + orig + back
                path = os.path.join(kjv_root, osis, str(ch), f'{vs}.json')
                try:
                    cw = json.load(open(path, encoding='utf-8'))
                    segs = kjv_segments(cw['words'])
                except FileNotFoundError:
                    segs = [{'words': kjv_text[(name, ch, vs)].split(), 'tags': [], 'supplied': False, 'split': None}]
                    book_stats['kjv_missing'] += 1
                if not restore_casing(segs, kjv_text[(name, ch, vs)]):
                    casing_miss += 1
                hits, misses, linked = align(lang, orig, segs)
                book_stats['words'] += len(orig)
                book_stats['linked'] += linked
                book_stats['tags'] += hits + misses
                book_stats['tag_hits'] += hits
                if not orig:
                    book_stats['empty'] += 1
                for w in orig:
                    for n in w[3].split('/'):
                        usage[(lang, int(n))] += 1
                    main = [n for n in w[3].split('/') if int(n) < 9000]
                    if main:
                        occurrences[(lang, int(main[-1]))].add(verse_gid[(name, ch, vs)])
                out_segs = []
                for s in segs:
                    seg = [' '.join(s['words']), s['links']]
                    if s['supplied']:
                        seg.append(1)
                    out_segs.append(seg)
                orig = [[w[0], w[2], w[3], w[4]] if lang == 'el' else w[:5] for w in orig]
                verses.append([orig, out_segs])
            chapters.append(verses)
        data = {'book': name, 'lang': lang, 'chapters': chapters}
        fname = slug(name) + '.json'
        with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        size = os.path.getsize(os.path.join(OUT, fname))
        pct = 100 * book_stats['linked'] / max(1, book_stats['words'])
        manifest['books'][name] = {
            'file': fname, 'lang': lang, 'words': book_stats['words'],
            'aligned': round(pct, 1), 'bytes': size,
        }
        for k, v in book_stats.items():
            manifest['totals'][k] += v
        flag = '' if pct >= 85 else '  <-- low alignment'
        print(f'  {name:18s} {book_stats["words"]:6d} words  {pct:5.1f}% aligned  '
              f'{size / 1024:7.0f} KB  empty verses {book_stats["empty"]}{flag}')

    # --- lexicons -----------------------------------------------------------
    print('Writing lexicons ...')
    heb = parse_js_dict(os.path.join(CACHE, 'heb.js'))
    grk = parse_js_dict(os.path.join(CACHE, 'grk.js'))

    def tidy(s):
        s = (s or '').strip()
        s = re.sub(r'^\{(.*)\}$', r'\1', s)
        return re.sub(r'\s+', ' ', s)

    lex_he = {}
    for key, e in heb.items():
        n = int(key[1:])
        entry = {'l': tidy(e.get('lemma')), 'x': tidy(e.get('xlit')), 'p': tidy(e.get('pron')),
                 'd': tidy(e.get('strongs_def')), 'k': tidy(e.get('kjv_def')), 'r': tidy(e.get('derivation'))}
        if lemma_gloss.get(('he', n)):
            entry['g'] = lemma_gloss[('he', n)].most_common(1)[0][0]
        if usage.get(('he', n)):
            entry['n'] = usage[('he', n)]
        lex_he[str(n)] = {k: v for k, v in entry.items() if v}
    for n, counter in prefix_gloss.items():
        (letters, g), _ = counter.most_common(1)[0]
        entry = {'g': g, 'd': f'prefix or suffix: {g}', 'n': usage.get(('he', n), 0)}
        if re.fullmatch(r'[\u0590-\u05ff]+', letters):
            entry['l'] = letters
        lex_he[str(n)] = entry
    lex_el = {}
    for key, e in grk.items():
        n = int(key[1:])
        entry = {'l': tidy(e.get('lemma')), 'x': tidy(e.get('translit')),
                 'd': tidy(e.get('strongs_def')), 'k': tidy(e.get('kjv_def')), 'r': tidy(e.get('derivation'))}
        if lemma_gloss.get(('el', n)):
            entry['g'] = lemma_gloss[('el', n)].most_common(1)[0][0]
        if usage.get(('el', n)):
            entry['n'] = usage[('el', n)]
        lex_el[str(n)] = {k: v for k, v in entry.items() if v}
    # STEP words whose number has no Strong's entry (extended numbers) still get a lemma + gloss
    for (lang, n), count in usage.items():
        lex = lex_he if lang == 'he' else lex_el
        if str(n) not in lex and lemma_gloss.get((lang, n)):
            entry = {'g': lemma_gloss[(lang, n)].most_common(1)[0][0], 'n': count}
            if lemma_gloss.get((lang + '-lemma', n)):
                entry['l'] = lemma_gloss[(lang + '-lemma', n)].most_common(1)[0][0]
            lex[str(n)] = entry
    for fname, lex in (('lexicon-he.json', lex_he), ('lexicon-el.json', lex_el)):
        with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as f:
            json.dump(lex, f, ensure_ascii=False, separators=(',', ':'))
        print(f'  {fname}: {len(lex)} entries, {os.path.getsize(os.path.join(OUT, fname)) / 1024:.0f} KB')

    # --- occurrence index: Strong's number -> verses (delta-encoded verse ids) --
    for lang, fname in (('he', 'occurrences-he.json'), ('el', 'occurrences-el.json')):
        index = {}
        for (l, n), ids in occurrences.items():
            if l != lang:
                continue
            ordered = sorted(ids)
            index[str(n)] = [ordered[0]] + [b - a for a, b in zip(ordered, ordered[1:])]
        with open(os.path.join(OUT, fname), 'w', encoding='utf-8') as f:
            json.dump(index, f, separators=(',', ':'))
        print(f'  {fname}: {len(index)} numbers, {os.path.getsize(os.path.join(OUT, fname)) / 1024:.0f} KB')

    t = manifest['totals']
    manifest['totals'] = dict(t)
    manifest['sources'] = [
        'STEPBible TAHOT/TAGNT (Tyndale House, CC BY 4.0) - github.com/STEPBible/STEPBible-Data',
        'CrossWire KJV with Strong\'s (public domain) - crosswire.org',
        'Open Scriptures Strong\'s dictionaries (public domain) - github.com/openscriptures/strongs',
    ]
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    total_bytes = sum(b['bytes'] for b in manifest['books'].values())
    print(f'\nTotal: {t["words"]} original words, {100 * t["linked"] / t["words"]:.1f}% aligned to a KJV phrase; '
          f'{100 * t["tag_hits"] / max(1, t["tags"]):.1f}% of KJV tags found their word; '
          f'{t["empty"]} verses without original words; {t.get("kjv_missing", 0)} KJV verses missing from CrossWire; '
          f'{casing_miss} verses where CrossWire and kjv_bible.json tokenise differently.')
    print(f'Book files: {total_bytes / 1024 / 1024:.1f} MB; {DEBUG["conjoined"]} particles attached to their head word')
    with open(os.path.join(CACHE, 'align-debug.json'), 'w') as f:
        json.dump({k: (v.most_common(300) if isinstance(v, Counter) else v) for k, v in DEBUG.items()}, f, indent=0)


if __name__ == '__main__':
    main()
