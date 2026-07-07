# Bible Explorer data pipeline
# pip install: none needed (stdlib only)
import json, re, gzip, base64, os, sys
from collections import Counter, defaultdict

RAW = "/sessions/confident-eager-pasteur/mnt/outputs/build/raw"
OUT = "/sessions/confident-eager-pasteur/mnt/outputs/build"

# canonical 66 books: (name, osis, kaiserlik_file, testament 0=OT 1=NT)
BOOKS = [
 ("Genesis","Gen","Gen",0),("Exodus","Exod","Exo",0),("Leviticus","Lev","Lev",0),
 ("Numbers","Num","Num",0),("Deuteronomy","Deut","Deu",0),("Joshua","Josh","Jos",0),
 ("Judges","Judg","Jdg",0),("Ruth","Ruth","Rth",0),("1 Samuel","1Sam","1Sa",0),
 ("2 Samuel","2Sam","2Sa",0),("1 Kings","1Kgs","1Ki",0),("2 Kings","2Kgs","2Ki",0),
 ("1 Chronicles","1Chr","1Ch",0),("2 Chronicles","2Chr","2Ch",0),("Ezra","Ezra","Ezr",0),
 ("Nehemiah","Neh","Neh",0),("Esther","Esth","Est",0),("Job","Job","Job",0),
 ("Psalms","Ps","Psa",0),("Proverbs","Prov","Pro",0),("Ecclesiastes","Eccl","Ecc",0),
 ("Song of Solomon","Song","Sng",0),("Isaiah","Isa","Isa",0),("Jeremiah","Jer","Jer",0),
 ("Lamentations","Lam","Lam",0),("Ezekiel","Ezek","Eze",0),("Daniel","Dan","Dan",0),
 ("Hosea","Hos","Hos",0),("Joel","Joel","Joe",0),("Amos","Amos","Amo",0),
 ("Obadiah","Obad","Oba",0),("Jonah","Jonah","Jon",0),("Micah","Mic","Mic",0),
 ("Nahum","Nah","Nah",0),("Habakkuk","Hab","Hab",0),("Zephaniah","Zeph","Zep",0),
 ("Haggai","Hag","Hag",0),("Zechariah","Zech","Zec",0),("Malachi","Mal","Mal",0),
 ("Matthew","Matt","Mat",1),("Mark","Mark","Mar",1),("Luke","Luke","Luk",1),
 ("John","John","Jhn",1),("Acts","Acts","Act",1),("Romans","Rom","Rom",1),
 ("1 Corinthians","1Cor","1Co",1),("2 Corinthians","2Cor","2Co",1),
 ("Galatians","Gal","Gal",1),("Ephesians","Eph","Eph",1),("Philippians","Phil","Phl",1),
 ("Colossians","Col","Col",1),("1 Thessalonians","1Thess","1Th",1),
 ("2 Thessalonians","2Thess","2Th",1),("1 Timothy","1Tim","1Ti",1),
 ("2 Timothy","2Tim","2Ti",1),("Titus","Titus","Tit",1),("Philemon","Phlm","Phm",1),
 ("Hebrews","Heb","Heb",1),("James","Jas","Jas",1),("1 Peter","1Pet","1Pe",1),
 ("2 Peter","2Pet","2Pe",1),("1 John","1John","1Jo",1),("2 John","2John","2Jo",1),
 ("3 John","3John","3Jo",1),("Jude","Jude","Jde",1),("Revelation","Rev","Rev",1),
]
EXPECT_CH = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22]
osis2idx = {b[1]: i for i, b in enumerate(BOOKS)}

TAG = re.compile(r"\[([HG]\d+)\]")

# ---------- 1. Load scrollmapper KJV (fallback / validation) ----------
sm = json.load(open(f"{RAW}/kjv_scrollmapper.json"))
sm_text = {}  # (b,c,v) -> text
for bi, bk in enumerate(sm["books"]):
    for ch in bk["chapters"]:
        for vs in ch["verses"]:
            sm_text[(bi, ch["chapter"], vs["verse"])] = vs["text"].strip()
print("scrollmapper verses:", len(sm_text))

# ---------- 2. Load kaiserlik tagged KJV (regex — some files have broken JSON in non-en langs) ----------
VERSE_RE = re.compile(r'"([A-Za-z0-9]+)\|(\d+)\|(\d+)":\s*\{\s*"en":\s*"((?:[^"\\]|\\.)*)"')
by_code = defaultdict(dict)  # code -> (c,v) -> en
for fn in os.listdir(f"{RAW}/kjvstrongs"):
    s = open(f"{RAW}/kjvstrongs/{fn}", encoding="utf-8").read()
    for m in VERSE_RE.finditer(s):
        code, c, v, en = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        en = en.replace('\\"', '"').replace("\\\\", "\\").replace("\\/", "/")
        by_code[code][(c, v)] = en.strip()
print("kaiserlik codes:", len(by_code), "total verses:", sum(len(v) for v in by_code.values()))

# map codes -> book index; validate by chapter count, fix swapped pairs by content
code2book = {}
for bi, (name, osis, kf, t) in enumerate(BOOKS):
    code2book[kf] = bi
# content check: expected chapters per book
for code, verses in sorted(by_code.items()):
    bi = code2book.get(code)
    nch = max(c for (c, v) in verses)
    if bi is None:
        print(f"UNKNOWN code {code}: {nch} chapters, {len(verses)} verses")
    elif nch != EXPECT_CH[bi]:
        print(f"MISMATCH {code}->{BOOKS[bi][0]}: has {nch} chapters, expect {EXPECT_CH[bi]}")
tagged = {}
for code, verses in by_code.items():
    bi = code2book.get(code)
    if bi is None: continue
    for (c, v), en in verses.items():
        # keep first seen; duplicates across files possible (Phm.json contains Phl too)
        tagged.setdefault((bi, c, v), en)
print("kaiserlik verses mapped:", len(tagged))

# ---------- 3. Build canonical verse table (scrollmapper structure = truth) ----------
# verse counts per chapter from scrollmapper
vc_per_ch = defaultdict(int)
for (b, c, v) in sm_text:
    vc_per_ch[(b, c)] = max(vc_per_ch[(b, c)], v)

books_out = []
text_out = []          # tagged text (or plain fallback), global vid order
vid_of = {}
filled_from_sm = 0
for bi, (name, osis, kf, t) in enumerate(BOOKS):
    nch = EXPECT_CH[bi]
    counts = []
    for c in range(1, nch + 1):
        nv = vc_per_ch[(bi, c)]
        counts.append(nv)
        for v in range(1, nv + 1):
            vid = len(text_out)
            vid_of[(bi, c, v)] = vid
            tt = tagged.get((bi, c, v))
            pt = sm_text.get((bi, c, v), "")
            if tt:
                # sanity: stripped tagged should resemble plain
                text_out.append(tt)
            else:
                text_out.append(pt)
                filled_from_sm += 1
    books_out.append({"n": name, "a": osis, "t": t, "c": counts})
print("total verses:", len(text_out), "filled from scrollmapper:", filled_from_sm)

# ---------- 3b. Repair truncated verse-final italics using scrollmapper ----------
def collapse(x): return re.sub(r"[^a-z]", "", x.lower())
EM0 = re.compile(r"</?em>")
repaired = 0; replaced = 0
for key, vid in vid_of.items():
    smt = sm_text.get(key)
    if not smt: continue
    kt = text_out[vid]
    ka = collapse(EM0.sub("", TAG.sub("", kt)))
    smc = collapse(smt)
    if ka == smc: continue
    if ka and smc.startswith(ka):
        need = len(ka); i = 0; cnt = 0
        while i < len(smt) and cnt < need:
            if smt[i].isalpha(): cnt += 1
            i += 1
        suffix = smt[i:].strip()
        if suffix:
            text_out[vid] = kt.rstrip() + " <em>" + suffix + "</em>"
            repaired += 1
    else:
        text_out[vid] = smt
        replaced += 1
print("repaired tails:", repaired, "fully replaced:", replaced)


# ---------- 3c. Restore casing from scrollmapper (kaiserlik lowercased LORD etc.) ----------
def restore_case(kt, smt):
    letters=[ch for ch in smt if ch.isalpha()]
    out=[]; j=0; i=0; L=len(kt)
    while i<L:
        ch=kt[i]
        if ch=='[':
            k=kt.find(']',i)
            if k==-1: out.append(ch); i+=1; continue
            out.append(kt[i:k+1]); i=k+1; continue
        if ch=='<':
            k=kt.find('>',i)
            if k==-1: out.append(ch); i+=1; continue
            out.append(kt[i:k+1]); i=k+1; continue
        if ch.isalpha():
            if j<len(letters) and letters[j].lower()==ch.lower():
                out.append(letters[j]); j+=1; i+=1; continue
            return None
        out.append(ch); i+=1
    if j!=len(letters): return None
    return ''.join(out)
AJ_FILES=["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1Samuel","2Samuel","1Kings","2Kings","1Chronicles","2Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","SongofSolomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1Corinthians","2Corinthians","Galatians","Ephesians","Philippians","Colossians","1Thessalonians","2Thessalonians","1Timothy","2Timothy","Titus","Philemon","Hebrews","James","1Peter","2Peter","1John","2John","3John","Jude","Revelation"]
aj_text={}
for bi,fn in enumerate(AJ_FILES):
    dd=json.load(open(f"{RAW}/aruljohn/{fn}.json"))
    for chd in dd["chapters"]:
        c=int(chd["chapter"])
        for vd in chd["verses"]:
            aj_text[(bi,c,int(vd["verse"]))]=vd["text"].strip()
print("aruljohn verses:", len(aj_text))
recased=0; case_skip=0
for key, vid in vid_of.items():
    ajt=aj_text.get(key)
    if not ajt: continue
    r=restore_case(text_out[vid], ajt)
    if r is None: case_skip+=1
    elif r!=text_out[vid]: text_out[vid]=r; recased+=1
print("recased:", recased, "case-skip:", case_skip)

# quick text-quality check: strip tags, compare a few random verses
import random
random.seed(1)
bad = 0
for (b, c, v) in random.sample(list(sm_text.keys()), 400):
    if (b, c, v) not in vid_of: continue
    stripped = re.sub(r"</?em>", "", TAG.sub("", text_out[vid_of[(b, c, v)]]))
    stripped = re.sub(r"\s+", " ", stripped).strip()
    a = re.sub(r"[^a-z]", "", stripped.lower())
    bb = re.sub(r"[^a-z]", "", sm_text[(b, c, v)].lower())
    if a[:60] != bb[:60]:
        bad += 1
        if bad <= 3: print("DIFF", BOOKS[b][0], c, v, "|", stripped[:70], "||", sm_text[(b,c,v)][:70])
print("text mismatches in sample:", bad, "/400")

# plain text (for stats) derived once
EM = re.compile(r"</?em>")
plain = [re.sub(r"\s+", " ", EM.sub("", TAG.sub("", t))).strip() for t in text_out]

# ---------- 4. Cross references ----------
def parse_ref(s):
    s = s.split("-")[0]  # range -> start
    p = s.split(".")
    return osis2idx.get(p[0]), int(p[1]), int(p[2])

pair_votes = Counter()          # (vid_a, vid_b) unordered verse pairs
skipped = 0
with open("/tmp/xr/cross_references.txt") as f:
    next(f)
    for line in f:
        cols = line.rstrip("\n").split("\t")
        if len(cols) < 3: continue
        try:
            fb = parse_ref(cols[0]); tb = parse_ref(cols[1])
            votes = int(cols[2])
        except Exception:
            skipped += 1; continue
        if fb[0] is None or tb[0] is None: skipped += 1; continue
        a = vid_of.get(fb); b = vid_of.get(tb)
        if a is None or b is None: skipped += 1; continue
        if a == b: continue
        key = (a, b) if a < b else (b, a)
        pair_votes[key] = max(pair_votes[key], votes)
print("xref pairs:", len(pair_votes), "skipped:", skipped)

# verse-level: top 14 per verse by votes (symmetric)
per_verse = defaultdict(list)
for (a, b), w in pair_votes.items():
    per_verse[a].append((w, b))
    per_verse[b].append((w, a))
xrefV = {}
for vid, lst in per_verse.items():
    lst.sort(reverse=True)
    xrefV[vid] = [b for w, b in lst[:14]]

# chapter-level arcs
# global chapter index
ch_index = {}
gc = 0
for bi, b in enumerate(books_out):
    for c in range(1, len(b["c"]) + 1):
        ch_index[(bi, c)] = gc; gc += 1
print("chapters:", gc)
vid2ch = [0] * len(text_out)
for (b, c, v), vid in vid_of.items():
    vid2ch[vid] = ch_index[(b, c)]
arc_w = Counter()
for (a, b), w in pair_votes.items():
    ca, cb = vid2ch[a], vid2ch[b]
    if ca == cb: continue
    key = (ca, cb) if ca < cb else (cb, ca)
    arc_w[key] += max(w, 1)
arcs = [[a, b, w] for (a, b), w in arc_w.items() if w >= 3]
arcs.sort(key=lambda x: -x[2])
arcs = arcs[:90000]
print("chapter arcs kept:", len(arcs))

# ---------- 5. Theographic people ----------
tv = json.load(open(f"{RAW}/theo_verses.json"))
rec2vid = {}
verse_people = {}  # vid -> [person recIDs]
for r in tv:
    f = r.get("fields", {})
    osr = f.get("osisRef")
    if not osr: continue
    try:
        ref = parse_ref(osr)
    except Exception:
        continue
    vid = vid_of.get(ref)
    if vid is None: continue
    rec2vid[r["id"]] = vid
    ppl = f.get("people")
    if ppl: verse_people[vid] = ppl
del tv
print("theo verses mapped:", len(rec2vid), "verses with people:", len(verse_people))

pj = json.load(open(f"{RAW}/theo_people.json"))
prec2idx = {}
people = []
for r in pj:
    f = r.get("fields", {})
    if not f.get("name"): continue
    prec2idx[r["id"]] = len(people)
    people.append(r)
print("people:", len(people))

def refs(f, key):
    return [prec2idx[x] for x in f.get(key, []) if x in prec2idx]

people_out = []
for r in people:
    f = r["fields"]
    vids = sorted({rec2vid[x] for x in f.get("verses", []) if x in rec2vid})
    p = {
        "n": f["name"],
        "dt": f.get("displayTitle") or f["name"],
        "g": {"Male": 1, "Female": 2}.get(f.get("gender"), 0),
        "vc": f.get("verseCount") or len(vids),
        "vs": vids[:120],
    }
    yr = f.get("minYear")
    if isinstance(yr, (int, float)): p["y"] = int(yr)
    fa = refs(f, "father"); mo = refs(f, "mother")
    ch = refs(f, "children"); sp = refs(f, "partners")
    if fa: p["f"] = fa[0]
    if mo: p["m"] = mo[0]
    if ch: p["ch"] = ch
    if sp: p["sp"] = sp
    ac = f.get("alsoCalled")
    if ac: p["ak"] = ac if isinstance(ac, str) else ", ".join(ac)
    people_out.append(p)

# co-occurrence edges (shared verses), weight>=2, via verse_people
co = Counter()
for vid, recs in verse_people.items():
    idxs = sorted({prec2idx[x] for x in recs if x in prec2idx})
    if len(idxs) > 12: continue  # genealogy list verses spam pairs
    for i in range(len(idxs)):
        for j in range(i + 1, len(idxs)):
            co[(idxs[i], idxs[j])] += 1
co_edges = [[a, b, w] for (a, b), w in co.items() if w >= 2]
co_edges.sort(key=lambda x: -x[2])
co_edges = co_edges[:30000]
print("co-occurrence edges kept:", len(co_edges))

# ---------- 6. Strong's dictionaries ----------
heb = json.load(open("/tmp/heb.json"))
grk = json.load(open("/tmp/grk.json"))
print("hebrew entries:", len(heb), "greek entries:", len(grk))

# which strong numbers actually appear in text?
used = set()
for t in text_out:
    used.update(TAG.findall(t))
print("strong numbers used in text:", len(used))

sdict = {}
for src in (heb, grk):
    for k, e in src.items():
        if k not in used: continue
        sdict[k] = {
            "l": e.get("lemma", ""),
            "t": e.get("xlit") or e.get("translit") or "",
            "d": (e.get("strongs_def") or "").strip(),
            "k": (e.get("kjv_def") or "").strip(),
        }
missing = [k for k in used if k not in sdict]
print("dict entries kept:", len(sdict), "missing:", len(missing), missing[:10])

# ---------- 7. Stats ----------
WORD = re.compile(r"[A-Za-z']+")
afinn = {}
for line in open(f"{RAW}/afinn.txt", encoding="utf-8"):
    w, s = line.rsplit("\t", 1)
    afinn[w] = int(s)

STOP = set("their there what who whom then upon the and of to that in he shall his unto for i a they be is him not them it with all thou your which my was have from as but are thy this will me you so out by were had when we she her or on no an if at also do can could would should did done was more".split())

themes = {
  "love": r"\blov(e|es|ed|est|eth|ing)\b|\bbeloved\b|lovingkindness",
  "fear": r"\bfear\w*|\bafraid\b|\bterror\w*|\bdread\w*",
  "death": r"\bdeath\b|\bdie(d|st|th)?\b|\bdying\b|\bdead\b|\bslain\b|\bslay\w*",
  "joy": r"\bjoy\w*|\brejoic\w*|\bglad\w*|\bmerry\b",
  "sin": r"\bsin(s|ned|nest|neth|ning|ner|ners|ful)?\b|\biniquit\w*|\btransgress\w*",
  "faith": r"\bfaith\w*|\bbeliev\w*|\btrust\w*",
  "prayer": r"\bpray(er|ers|ed|est|eth|ing)?\b|\bsupplicat\w*",
  "war": r"\bwar(s|red|reth|fare|rior)?\b|\bbattle\w*|\bsword\w*|\bfight\w*",
  "peace": r"\bpeace\w*",
  "blood": r"\bblood\w*",
  "fire": r"\bfire\b|\bfiery\b|\bflame\w*|\bburn\w*",
  "gold": r"\bgold(en)?\b|\bsilver\b|\btreasure\w*|\briches\b",
  "heart": r"\bheart(s|ed)?\b",
  "heaven": r"\bheaven(s|ly)?\b",
  "mercy": r"\bmerc(y|ies|iful|ifully)\b|\bcompassion\w*|\bgrace\b|\bgracious\b",
}
theme_re = {k: re.compile(v) for k, v in themes.items()}
gods = {"LORD": re.compile(r"\bLORD\b"), "God": re.compile(r"\bGod\b"),
        "Jesus": re.compile(r"\bJesus\b"), "Christ": re.compile(r"\bChrist\b"),
        "Spirit": re.compile(r"\bSpirit\b")}

book_stats = []
corpus_counter = Counter()
vid = 0
long_v = (0, 0); short_v = (10**9, 0)
total_words = 0
total_questions = 0
for bi, b in enumerate(books_out):
    nverses = sum(b["c"])
    words = 0; uniq = Counter(); q = 0
    tcounts = {k: 0 for k in themes}
    gcounts = {k: 0 for k in gods}
    sent_ch = []
    for c in range(1, len(b["c"]) + 1):
        ch_words = 0; ch_sent = 0
        for v in range(1, b["c"][c - 1] + 1):
            t = plain[vid]
            low = t.lower()
            ws = WORD.findall(low)
            n = len(ws)
            words += n; ch_words += n
            uniq.update(ws)
            q += t.count("?")
            wl = n
            if wl > long_v[0] and "?" not in "x": pass
            if n > long_v[0]: long_v = (n, vid)
            if 0 < n < short_v[0]: short_v = (n, vid)
            for k, rr in theme_re.items(): tcounts[k] += len(rr.findall(low))
            for k, rr in gods.items(): gcounts[k] += len(rr.findall(t))
            ch_sent += sum(afinn.get(w, 0) for w in ws)
            vid += 1
        sent_ch.append(round(ch_sent / max(ch_words, 1) * 100, 1))  # per 100 words
    corpus_counter.update(uniq)
    total_words += words; total_questions += q
    book_stats.append({
        "w": words, "u": len(uniq), "v": nverses, "q": q,
        "s": sent_ch, "th": [tcounts[k] for k in themes], "g": [gcounts[k] for k in gods],
    })
hapax = [w for w, c in corpus_counter.items() if c == 1]
top_words = [[w, c] for w, c in corpus_counter.most_common(400) if w not in STOP][:60]
top_all = corpus_counter.most_common(20)
# curated-ish hapax sample: longer, interesting words
hapax_sample = sorted([w for w in hapax if len(w) >= 9])[:0]  # placeholder
import random as _r
_r.seed(7)
cand = sorted([w for w in hapax if 7 <= len(w) <= 16 and "'" not in w])
hapax_sample = _r.sample(cand, min(48, len(cand)))

# longest/shortest chapters by words
ch_words_all = []
vid = 0
for bi, b in enumerate(books_out):
    for c in range(1, len(b["c"]) + 1):
        n = sum(len(WORD.findall(plain[vid + i])) for i in range(b["c"][c - 1]))
        ch_words_all.append((n, bi, c))
        vid += b["c"][c - 1]
ch_words_all.sort()
stats = {
    "themes": list(themes.keys()),
    "godNames": list(gods.keys()),
    "books": book_stats,
    "totalWords": total_words,
    "totalVerses": len(plain),
    "totalChapters": gc,
    "uniqueWords": len(corpus_counter),
    "hapaxCount": len(hapax),
    "hapaxSample": hapax_sample,
    "topWords": top_words,
    "topAll": top_all,
    "questions": total_questions,
    "longVerse": long_v[1], "shortVerse": short_v[1],
    "longChapter": [ch_words_all[-1][1], ch_words_all[-1][2], ch_words_all[-1][0]],
    "shortChapter": [ch_words_all[0][1], ch_words_all[0][2], ch_words_all[0][0]],
    "middleVerse": len(plain) // 2,
    "xrefCount": len(pair_votes),
    "peopleCount": len(people_out),
}


# ---------- 8. Bundle ----------
bundle = {
    "books": books_out,
    "text": text_out,
    "xrefV": {str(k): v for k, v in xrefV.items()},
    "arcs": arcs,
    "people": people_out,
    "coEdges": co_edges,
    "dict": sdict,
    "stats": stats,
}
raw = json.dumps(bundle, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
gz = gzip.compress(raw, 9)
b64 = base64.b64encode(gz).decode()
open(f"{OUT}/data.b64", "w").write(b64)
print(f"raw {len(raw)/1e6:.1f}MB gz {len(gz)/1e6:.1f}MB b64 {len(b64)/1e6:.1f}MB")
print("sample verse 0:", text_out[0][:100])
print("sample arc:", arcs[0])
print("longest verse:", plain[long_v[1]][:80], "words:", long_v[0])
print("shortest verse:", plain[short_v[1]])
print("done")
