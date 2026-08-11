#!/usr/bin/env python3
"""Build content/packs/*.json and content/roads.json for the Lamp Room.

Gists come from the site's existing bible_chapter_summaries_concise.json.
Anchor (key-verse) text comes verbatim from kjv_bible.json (public domain KJV).
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content")
PACKS = os.path.join(OUT, "packs")

ABBR = {
 "Genesis":"Gen","Exodus":"Exo","Leviticus":"Lev","Numbers":"Num","Deuteronomy":"Deu",
 "Joshua":"Jos","Judges":"Jdg","Ruth":"Rut","1 Samuel":"1Sa","2 Samuel":"2Sa","1 Kings":"1Ki",
 "2 Kings":"2Ki","1 Chronicles":"1Ch","2 Chronicles":"2Ch","Ezra":"Ezr","Nehemiah":"Neh","Esther":"Est",
 "Job":"Job","Psalms":"Psa","Proverbs":"Pro","Ecclesiastes":"Ecc","Song of Solomon":"Sng",
 "Isaiah":"Isa","Jeremiah":"Jer","Lamentations":"Lam","Ezekiel":"Eze","Daniel":"Dan",
 "Hosea":"Hos","Joel":"Joe","Amos":"Amo","Obadiah":"Oba","Jonah":"Jon","Micah":"Mic","Nahum":"Nah",
 "Habakkuk":"Hab","Zephaniah":"Zep","Haggai":"Hag","Zechariah":"Zec","Malachi":"Mal",
 "Matthew":"Mat","Mark":"Mrk","Luke":"Luk","John":"Jhn","Acts":"Act","Romans":"Rom",
 "1 Corinthians":"1Co","2 Corinthians":"2Co","Galatians":"Gal","Ephesians":"Eph","Philippians":"Php",
 "Colossians":"Col","1 Thessalonians":"1Th","2 Thessalonians":"2Th","1 Timothy":"1Ti","2 Timothy":"2Ti",
 "Titus":"Tit","Philemon":"Phm","Hebrews":"Heb","James":"Jas","1 Peter":"1Pe","2 Peter":"2Pe",
 "1 John":"1Jn","2 John":"2Jn","3 John":"3Jn","Jude":"Jud","Revelation":"Rev",
}

ORDER = list(ABBR.keys())

PACK_OF = {
 "ot-law": ("Law", ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy"]),
 "ot-history": ("History", ["Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings",
                            "1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther"]),
 "ot-poetry": ("Poetry & Wisdom", ["Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon"]),
 "ot-major": ("Major Prophets", ["Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel"]),
 "ot-minor": ("Minor Prophets", ["Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
                                 "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"]),
}
NT_SECTIONS = [
 ("Gospels & Acts", ["Matthew","Mark","Luke","John","Acts"]),
 ("Epistles", ["Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians",
               "Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus",
               "Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude"]),
 ("Revelation", ["Revelation"]),
]

EXPECTED = {"ot-law":187,"ot-history":249,"ot-poetry":243,"ot-major":183,"ot-minor":67,"nt":260}

# Curated key verses, one per chapter at most. (book, chapter, verse) or (book, chapter, (v1,v2))
ANCHORS = {
 "Genesis":{1:1,3:15,12:3,15:6,22:8,50:20},
 "Exodus":{3:14,12:13,14:14,20:3,33:14},
 "Leviticus":{17:11,19:18},
 "Numbers":{6:24,14:18,23:19},
 "Deuteronomy":{6:4,8:3,29:29,31:6},
 "Joshua":{1:8,24:15},
 "Judges":{21:25},
 "Ruth":{1:16},
 "1 Samuel":{15:22,16:7,17:47},
 "2 Samuel":{7:16,22:2},
 "1 Kings":{8:27,18:21,19:12},
 "2 Kings":{6:16},
 "1 Chronicles":{16:11,29:11},
 "2 Chronicles":{7:14,16:9,20:15},
 "Ezra":{7:10},
 "Nehemiah":{8:10},
 "Esther":{4:14},
 "Job":{1:21,13:15,19:25,23:10,38:4,42:5},
 "Psalms":{1:1,8:4,19:1,22:1,23:1,27:1,32:1,34:8,37:4,42:1,46:1,51:10,73:25,84:10,90:12,91:1,
           100:4,103:12,110:1,118:24,119:105,121:1,127:1,130:3,133:1,139:14,145:8,150:6},
 "Proverbs":{1:7,3:5,4:23,9:10,16:9,22:6,27:17,31:30},
 "Ecclesiastes":{3:1,12:13},
 "Song of Solomon":{8:7},
 "Isaiah":{1:18,6:8,7:14,9:6,26:3,40:31,41:10,43:2,45:22,53:5,55:8,61:1,64:6,66:2},
 "Jeremiah":{1:5,17:9,29:11,31:33,33:3},
 "Lamentations":{3:22},
 "Ezekiel":{33:11,36:26,37:5},
 "Daniel":{2:44,3:17,6:10,12:3},
 "Hosea":{6:6},
 "Joel":{2:28},
 "Amos":{5:24,8:11},
 "Obadiah":{1:15},
 "Jonah":{2:9},
 "Micah":{5:2,6:8},
 "Nahum":{1:7},
 "Habakkuk":{2:4,3:18},
 "Zephaniah":{3:17},
 "Haggai":{1:5},
 "Zechariah":{4:6,9:9,14:9},
 "Malachi":{3:10,4:2},
 "Matthew":{1:21,5:16,6:33,7:7,11:28,16:18,18:20,22:37,24:35,28:19},
 "Mark":{8:36,10:45,12:30,16:15},
 "Luke":{1:37,2:11,9:23,15:7,19:10,23:34,24:6},
 "John":{1:1,3:16,6:35,8:32,10:10,11:25,14:6,15:5,17:3,20:31},
 "Acts":{1:8,2:38,4:12,16:31,17:11},
 "Romans":{1:16,3:23,5:8,6:23,8:28,10:9,12:1,15:13},
 "1 Corinthians":{1:18,6:19,10:13,13:13,15:57},
 "2 Corinthians":{5:17,9:7,12:9},
 "Galatians":{2:20,5:22,6:9},
 "Ephesians":{2:8,3:20,4:32,6:11},
 "Philippians":{1:6,2:5,3:14,4:13},
 "Colossians":{1:17,3:2},
 "1 Thessalonians":{4:16,5:18},
 "2 Thessalonians":{3:3},
 "1 Timothy":{2:5,4:12,6:6},
 "2 Timothy":{1:7,2:15,3:16,4:7},
 "Titus":{3:5},
 "Philemon":{1:6},
 "Hebrews":{1:3,4:12,6:19,9:27,10:25,11:1,12:1,13:8},
 "James":{1:22,2:17,4:7,5:16},
 "1 Peter":{2:9,3:15,5:7},
 "2 Peter":{1:21,3:9},
 "1 John":{1:9,3:1,4:8,5:13},
 "2 John":{1:6},
 "3 John":{1:4},
 "Jude":{1:24},
 "Revelation":{1:8,3:20,12:11,19:16,21:4,22:20},
}

ROADS = {
 "roman": {
   "id":"roman","title":"The Roman Road",
   "blurb":"Six stops from Romans, the oldest path from sin to salvation.",
   "stops":[
     ("Romans",3,10,"None righteous"),
     ("Romans",3,23,"All have sinned"),
     ("Romans",5,8,"God commendeth his love"),
     ("Romans",6,23,"Wages and gift"),
     ("Romans",10,9,"Confess and believe"),
     ("Romans",10,13,"Whosoever shall call"),
   ]},
 "comfort": {
   "id":"comfort","title":"Comfort Ye",
   "blurb":"Five anchors for a fearful heart — the assurance road.",
   "stops":[
     ("Isaiah",41,10,"Fear thou not"),
     ("John",10,28,"None shall pluck"),
     ("Romans",8,(38,39),"Nor any other creature"),
     ("1 Peter",5,7,"Casting all your care"),
     ("Hebrews",13,5,"Never leave thee"),
   ]},
 "grace": {
   "id":"grace","title":"The Doctrines of Grace",
   "blurb":"Six stops on the work God begins, keeps, and finishes himself.",
   "stops":[
     ("John",6,37,"All that the Father giveth"),
     ("John",6,44,"No man can come"),
     ("John",10,(27,28,29),"My sheep hear my voice"),
     ("Romans",9,16,"Not of him that willeth"),
     ("Ephesians",2,(8,9),"By grace are ye saved"),
     ("Philippians",1,6,"He which hath begun"),
   ]},
}


def main():
    sums = json.load(open(os.path.join(ROOT, "bible_chapter_summaries_concise.json")))
    kjv = json.load(open(os.path.join(ROOT, "kjv_bible.json")))

    verses = {}   # (book, ch, v) -> text
    for b in kjv:
        for c in b["chapters"]:
            for v in c["verses"]:
                verses[(b["book"], c["chapter"], v["verse"])] = v["text"].strip()

    gists = collections.defaultdict(dict)
    for s in sums:
        gists[s["book"]][s["chapter"]] = s["summary"].strip()

    def verse_text(book, ch, v):
        if isinstance(v, tuple):
            return " ".join(verses[(book, ch, x)] for x in v)
        return verses[(book, ch, v)]

    def cv(ch, v):
        # v[-1], not v[1] — a range may span more than two verses (John 10:27-29)
        return f"{ch}:{v[0]}-{v[-1]}" if isinstance(v, tuple) else f"{ch}:{v}"

    def build_book(name, section):
        n = len(gists[name])
        g = [gists[name][i] for i in range(1, n + 1)]
        anchors = []
        for ch in sorted(ANCHORS.get(name, {})):
            v = ANCHORS[name][ch]
            anchors.append({"cv": cv(ch, v), "text": verse_text(name, ch, v)})
        return {"id": ABBR[name], "name": name, "section": section,
                "gists": g, "anchors": anchors}

    os.makedirs(PACKS, exist_ok=True)
    total = 0
    manifest = []

    for pack_id, (section, books) in PACK_OF.items():
        pack = {"version": 1, "id": pack_id, "testament": "OT",
                "sections": [section],
                "books": [build_book(b, section) for b in books]}
        n = sum(len(b["gists"]) for b in pack["books"])
        assert n == EXPECTED[pack_id], f"{pack_id}: {n} != {EXPECTED[pack_id]}"
        pack["chapters"] = n
        json.dump(pack, open(os.path.join(PACKS, pack_id + ".json"), "w"),
                  ensure_ascii=False, separators=(",", ":"))
        manifest.append({"id": pack_id, "section": section, "chapters": n})
        total += n

    nt_books = []
    for section, books in NT_SECTIONS:
        for b in books:
            nt_books.append(build_book(b, section))
    nt = {"version": 1, "id": "nt", "testament": "NT",
          "sections": [s for s, _ in NT_SECTIONS], "books": nt_books}
    n = sum(len(b["gists"]) for b in nt_books)
    assert n == EXPECTED["nt"], f"nt: {n} != 260"
    nt["chapters"] = n
    json.dump(nt, open(os.path.join(PACKS, "nt.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))
    manifest.append({"id": "nt", "section": "New Testament", "chapters": n})
    total += n

    assert total == 1189, total
    print("total chapters:", total)
    print("anchors:", sum(len(v) for v in ANCHORS.values()))

    roads = {"version": 1, "roads": []}
    for rid, r in ROADS.items():
        stops = []
        for book, ch, v, hint in r["stops"]:
            stops.append({"ref": f"{book} {cv(ch, v)}", "book": book, "cv": cv(ch, v),
                          "hint": hint, "text": verse_text(book, ch, v)})
        roads["roads"].append({"id": r["id"], "title": r["title"],
                               "blurb": r["blurb"], "stops": stops})
    json.dump(roads, open(os.path.join(OUT, "roads.json"), "w"),
              ensure_ascii=False, indent=1)

    for m in manifest:
        print(f"  {m['id']:<12} {m['chapters']:>5}  {m['section']}")
    for f in sorted(os.listdir(PACKS)):
        print(f, os.path.getsize(os.path.join(PACKS, f)))
    print("roads.json", os.path.getsize(os.path.join(OUT, "roads.json")))


if __name__ == "__main__":
    main()
