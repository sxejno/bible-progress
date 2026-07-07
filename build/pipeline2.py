# Bible Explorer v2 additions: places, journeys, basemap, timeline data
# pip install: none needed (stdlib only)
import json, gzip, base64, re
from collections import defaultdict

RAW="/sessions/confident-eager-pasteur/mnt/outputs/build/raw"
OUT="/sessions/confident-eager-pasteur/mnt/outputs/build"

d = json.loads(gzip.decompress(base64.b64decode(open(f"{OUT}/data.b64").read())))
print("loaded bundle:", len(d["text"]), "verses")

# rebuild vid_of from bundle
osis2b = {b["a"]: i for i,b in enumerate(d["books"])}
vid_of={}; vid=0
for bi,b in enumerate(d["books"]):
    for c,nv in enumerate(b["c"],1):
        for v in range(1,nv+1):
            vid_of[(bi,c,v)]=vid; vid+=1

def ref2vid(s):  # "Exod 14:2"
    m=re.match(r"(\S+)\s+(\d+):(\d+)$",s)
    b=osis2b[m.group(1)]
    return vid_of[(b,int(m.group(2)),int(m.group(3)))]

# rec -> vid from theographic verses
rec2vid={}
tv=json.load(open(f"{RAW}/theo_verses.json"))
for r in tv:
    f=r.get("fields",{})
    o=f.get("osisRef")
    if not o: continue
    p=o.split("-")[0].split(".")
    bi=osis2b.get(p[0])
    if bi is None: continue
    key=(bi,int(p[1]),int(p[2]))
    if key in vid_of: rec2vid[r["id"]]=vid_of[key]
del tv
print("rec2vid:", len(rec2vid))

# ---------- places ----------
pj=json.load(open(f"{RAW}/theo_places.json"))
places=[]
for r in pj:
    f=r.get("fields",{})
    lat=f.get("latitude") or f.get("openBibleLat")
    lng=f.get("longitude") or f.get("openBibleLong")
    name=f.get("kjvName") or f.get("displayTitle")
    if not lat or not lng or not name: continue
    try: lat=float(lat); lng=float(lng)
    except: continue
    vids=sorted({rec2vid[x] for x in f.get("verses",[]) if x in rec2vid})
    places.append({"n":name.strip(),"la":round(lat,4),"lo":round(lng,4),
                   "vc":f.get("verseCount") or len(vids),"vs":vids[:60],
                   "ft":f.get("featureType") or ""})
places.sort(key=lambda p:-p["vc"])
print("places:", len(places), "| top:", [p["n"] for p in places[:6]])

def find_place(name, la, lo):
    nl=name.lower(); best=None; bd=9
    for i,p in enumerate(places):
        if p["n"].lower()==nl:
            dd=abs(p["la"]-la)+abs(p["lo"]-lo)
            if dd<bd: bd=dd; best=i
    if best is not None and bd<4: return best
    return None

# ---------- journeys ----------
def J(name,color,stations):
    legs=[]
    for st in stations:
        label,la,lo,ref=st
        pi=find_place(label.split("(")[0].strip(),la,lo)
        if pi is not None: la,lo=places[pi]["la"],places[pi]["lo"]
        legs.append({"n":label,"la":la,"lo":lo,"p":pi,"v":(ref2vid(ref) if ref else None)})
    return {"n":name,"c":color,"legs":legs}

journeys=[
 J("Abraham's Journey","#b48ead",[
   ("Ur of the Chaldees",30.96,46.10,"Gen 11:31"),("Haran",36.87,39.03,"Gen 11:31"),
   ("Shechem",32.21,35.28,"Gen 12:6"),("Bethel",31.93,35.22,"Gen 12:8"),
   ("Egypt",30.00,31.20,"Gen 12:10"),("Bethel (return)",31.93,35.22,"Gen 13:3"),
   ("Hebron — Mamre",31.53,35.10,"Gen 13:18")]),
 J("The Exodus","#d8ab4e",[
   ("Rameses",30.80,31.83,"Exod 12:37"),("Succoth",30.55,32.10,"Exod 12:37"),
   ("Etham",30.30,32.30,"Exod 13:20"),("Red Sea crossing",29.90,32.55,"Exod 14:2"),
   ("Marah",29.60,32.70,"Exod 15:23"),("Elim",29.20,33.10,"Exod 15:27"),
   ("Wilderness of Sin",29.00,33.30,"Exod 16:1"),("Rephidim",28.70,33.50,"Exod 17:1"),
   ("Mount Sinai",28.54,33.97,"Exod 19:1"),("Kadesh-barnea",30.69,34.49,"Num 13:26"),
   ("Mount Hor",30.32,35.41,"Num 20:22"),("Plains of Moab",31.77,35.65,"Num 22:1"),
   ("Mount Nebo",31.77,35.73,"Deut 34:1"),("Jordan crossing — Gilgal",31.87,35.44,"Josh 4:19")]),
 J("Paul — First Journey","#4fd6be",[
   ("Antioch of Syria",36.21,36.18,"Acts 13:1"),("Seleucia",36.12,35.93,"Acts 13:4"),
   ("Salamis (Cyprus)",35.18,33.90,"Acts 13:5"),("Paphos",34.77,32.42,"Acts 13:6"),
   ("Perga",36.96,30.85,"Acts 13:13"),("Antioch of Pisidia",38.31,31.19,"Acts 13:14"),
   ("Iconium",37.87,32.49,"Acts 13:51"),("Lystra",37.58,32.45,"Acts 14:6"),
   ("Derbe",37.35,33.35,"Acts 14:20"),("Attalia",36.88,30.70,"Acts 14:25"),
   ("Antioch (return)",36.21,36.18,"Acts 14:26")]),
 J("Paul — Second Journey","#7aa2f7",[
   ("Antioch of Syria",36.21,36.18,"Acts 15:35"),("Derbe & Lystra",37.45,32.90,"Acts 16:1"),
   ("Troas",39.75,26.16,"Acts 16:8"),("Neapolis",40.94,24.41,"Acts 16:11"),
   ("Philippi",41.01,24.29,"Acts 16:12"),("Amphipolis",40.82,23.84,"Acts 17:1"),
   ("Thessalonica",40.64,22.94,"Acts 17:1"),("Berea",40.52,22.20,"Acts 17:10"),
   ("Athens",37.97,23.72,"Acts 17:16"),("Corinth",37.91,22.88,"Acts 18:1"),
   ("Cenchrea",37.88,22.99,"Acts 18:18"),("Ephesus",37.94,27.34,"Acts 18:19"),
   ("Caesarea",32.50,34.89,"Acts 18:22"),("Jerusalem",31.78,35.23,"Acts 18:22"),
   ("Antioch (return)",36.21,36.18,"Acts 18:22")]),
 J("Paul — Third Journey","#9ece6a",[
   ("Antioch of Syria",36.21,36.18,"Acts 18:23"),("Ephesus (3 years)",37.94,27.34,"Acts 19:1"),
   ("Philippi — Macedonia",41.01,24.29,"Acts 20:1"),("Corinth — Greece",37.91,22.88,"Acts 20:2"),
   ("Philippi",41.01,24.29,"Acts 20:6"),("Troas",39.75,26.16,"Acts 20:6"),
   ("Assos",39.49,26.34,"Acts 20:13"),("Mitylene",39.11,26.55,"Acts 20:14"),
   ("Miletus",37.53,27.28,"Acts 20:15"),("Rhodes",36.44,28.22,"Acts 21:1"),
   ("Patara",36.26,29.31,"Acts 21:1"),("Tyre",33.27,35.20,"Acts 21:3"),
   ("Ptolemais",32.92,35.07,"Acts 21:7"),("Caesarea",32.50,34.89,"Acts 21:8"),
   ("Jerusalem",31.78,35.23,"Acts 21:17")]),
 J("Paul — Voyage to Rome","#f7768e",[
   ("Caesarea",32.50,34.89,"Acts 27:1"),("Sidon",33.56,35.37,"Acts 27:3"),
   ("Myra",36.26,29.98,"Acts 27:5"),("Fair Havens (Crete)",34.92,24.73,"Acts 27:8"),
   ("Melita — shipwreck",35.89,14.44,"Acts 28:1"),("Syracuse",37.06,15.29,"Acts 28:12"),
   ("Rhegium",38.11,15.65,"Acts 28:13"),("Puteoli",40.83,14.12,"Acts 28:13"),
   ("Appii Forum",41.33,13.03,"Acts 28:15"),("Rome",41.89,12.49,"Acts 28:16")]),
]
for j in journeys:
    matched=sum(1 for l in j["legs"] if l["p"] is not None)
    print(f"  {j['n']}: {len(j['legs'])} stops, {matched} matched to places")

# ---------- basemap crop ----------
LON0,LON1,LAT0,LAT1 = 7.0,52.0,23.0,46.5
def clip_ring(ring):
    # Sutherland-Hodgman against bbox
    def clip_edge(pts, inside, inter):
        out=[]
        for i in range(len(pts)):
            a=pts[i-1]; b=pts[i]
            ia,ib=inside(a),inside(b)
            if ib:
                if not ia: out.append(inter(a,b))
                out.append(b)
            elif ia: out.append(inter(a,b))
        return out
    p=ring
    p=clip_edge(p, lambda q:q[0]>=LON0, lambda a,b:(LON0, a[1]+(b[1]-a[1])*(LON0-a[0])/(b[0]-a[0])))
    if not p: return []
    p=clip_edge(p, lambda q:q[0]<=LON1, lambda a,b:(LON1, a[1]+(b[1]-a[1])*(LON1-a[0])/(b[0]-a[0])))
    if not p: return []
    p=clip_edge(p, lambda q:q[1]>=LAT0, lambda a,b:(a[0]+(b[0]-a[0])*(LAT0-a[1])/(b[1]-a[1]), LAT0))
    if not p: return []
    p=clip_edge(p, lambda q:q[1]<=LAT1, lambda a,b:(a[0]+(b[0]-a[0])*(LAT1-a[1])/(b[1]-a[1]), LAT1))
    return p
def thin(pts, eps=0.015):
    out=[]
    for q in pts:
        if not out or abs(q[0]-out[-1][0])+abs(q[1]-out[-1][1])>eps: out.append(q)
    return out
def flat(pts): 
    a=[]
    for q in pts: a+=[round(q[0],2),round(q[1],2)]
    return a

def polys(geo):
    g=geo.get("geometry")
    if not g: return []
    t=g["type"]; cs=g["coordinates"]
    if t=="Polygon": return [cs]
    if t=="MultiPolygon": return cs
    return []
def lines(geo):
    g=geo.get("geometry")
    if not g: return []
    t=g["type"]; cs=g["coordinates"]
    if t=="LineString": return [cs]
    if t=="MultiLineString": return cs
    return []

land=[]
for f in json.load(open(f"{RAW}/ne_land.json"))["features"]:
    for poly in polys(f):
        for ring in poly[:1]:  # outer ring only
            c=thin(clip_ring([tuple(q) for q in ring]))
            if len(c)>=8: land.append(flat(c))
lakes=[]
lake_names=[]
for f in json.load(open(f"{RAW}/ne_lakes.json"))["features"]:
    nm=(f.get("properties") or {}).get("name") or ""
    for poly in polys(f):
        for ring in poly[:1]:
            c=thin(clip_ring([tuple(q) for q in ring]), 0.005)
            if len(c)>=6: lakes.append(flat(c)); lake_names.append(nm)
rivers=[]
for f in json.load(open(f"{RAW}/ne_rivers.json"))["features"]:
    for ln in lines(f):
        run=[]
        for q in ln:
            if LON0<=q[0]<=LON1 and LAT0<=q[1]<=LAT1: run.append(tuple(q))
            else:
                if len(run)>=3: rivers.append(flat(thin(run,0.01)))
                run=[]
        if len(run)>=3: rivers.append(flat(thin(run,0.01)))
print("land rings:",len(land),"lakes:",len(lakes),lake_names[:12],"rivers:",len(rivers))
# ensure Sea of Galilee present (small; 50m may omit) — add if no lake near 32.8N,35.6E
import math
def lake_near(la,lo):
    for arr in lakes:
        for i in range(0,len(arr),2):
            if abs(arr[i]-lo)<0.3 and abs(arr[i+1]-la)<0.3: return True
    return False
if not lake_near(32.83,35.58):
    cx,cy,rx,ry=35.58,32.83,0.10,0.18
    lakes.append(flat([(cx+rx*math.cos(a*math.pi/8), cy+ry*math.sin(a*math.pi/8)) for a in range(16)]))
    print("added Sea of Galilee manually")
if not lake_near(31.45,35.48):
    cx,cy,rx,ry=35.49,31.45,0.08,0.38
    lakes.append(flat([(cx+rx*math.cos(a*math.pi/8), cy+ry*math.sin(a*math.pi/8)) for a in range(16)]))
    print("added Dead Sea manually")

# ---------- timeline data ----------
people=d["people"]
def pidx(name, ymin=None, ymax=None):
    best=-1; bvc=-1
    for i,p in enumerate(people):
        if p["n"]==name:
            if ymin is not None and p.get("y") is not None and not (ymin-80 <= p["y"] <= (ymax or ymin)+80): continue
            if p["vc"]>bvc: bvc=p["vc"]; best=i
    return best

theo_by_name={}
for r in json.load(open(f"{RAW}/theo_people.json")):
    f=r.get("fields",{})
    if f.get("name") and f.get("birthYear") and f.get("deathYear"):
        try: theo_by_name.setdefault(f["name"],(int(f["birthYear"]),int(f["deathYear"])))
        except: pass
USSHER=[("Adam",-4004,-3074),("Seth",-3874,-2962),("Enos",-3769,-2864),("Cainan",-3679,-2769),
 ("Mahalaleel",-3609,-2714),("Jared",-3544,-2582),("Enoch",-3382,-3017),("Methuselah",-3317,-2348),
 ("Lamech",-3130,-2353),("Noah",-2948,-1998),("Shem",-2446,-1846),("Arphaxad",-2346,-1908),
 ("Salah",-2311,-1878),("Eber",-2281,-1817),("Peleg",-2247,-2008),("Reu",-2217,-1978),
 ("Serug",-2185,-1955),("Nahor",-2155,-2007),("Terah",-2126,-1921),("Abraham",-1996,-1821),
 ("Isaac",-1896,-1716),("Jacob",-1836,-1689),("Joseph",-1745,-1635)]
pats=[]
used_theo=0
for n,b,dd in USSHER:
    tb=theo_by_name.get(n)
    if tb and abs(tb[0]-b)<200: b,dd=tb; used_theo+=1
    pats.append({"n":n,"b":b,"d":dd,"p":pidx(n)})
print("patriarch years from theographic:",used_theo,"/23")

KJ=[("Rehoboam",-931,-913),("Abijah",-913,-911),("Asa",-911,-870),("Jehoshaphat",-873,-848),
 ("Jehoram",-848,-841),("Ahaziah",-841,-841),("Athaliah",-841,-835),("Joash",-835,-796),
 ("Amaziah",-796,-767),("Uzziah",-792,-740),("Jotham",-750,-735),("Ahaz",-735,-715),
 ("Hezekiah",-715,-686),("Manasseh",-697,-642),("Amon",-642,-640),("Josiah",-640,-609),
 ("Jehoahaz",-609,-609),("Jehoiakim",-609,-598),("Jehoiachin",-598,-597),("Zedekiah",-597,-586)]
KI=[("Jeroboam",-931,-910),("Nadab",-910,-909),("Baasha",-909,-886),("Elah",-886,-885),
 ("Zimri",-885,-885),("Omri",-885,-874),("Ahab",-874,-853),("Ahaziah",-853,-852),
 ("Joram",-852,-841),("Jehu",-841,-814),("Jehoahaz",-814,-798),("Jehoash",-798,-782),
 ("Jeroboam II",-793,-753),("Zechariah",-753,-753),("Shallum",-752,-752),("Menahem",-752,-742),
 ("Pekahiah",-742,-740),("Pekah",-752,-732),("Hoshea",-732,-722)]
KU=[("Saul",-1050,-1010),("David",-1010,-970),("Solomon",-970,-931)]
PR=[("Samuel",-1070,-1015),("Nathan",-1005,-965),("Elijah",-870,-848),("Elisha",-848,-797),
 ("Jonah",-785,-770),("Amos",-760,-750),("Hosea",-755,-715),("Isaiah",-740,-681),
 ("Micah",-735,-700),("Zephaniah",-635,-625),("Nahum",-655,-645),("Jeremiah",-627,-580),
 ("Habakkuk",-609,-598),("Daniel",-605,-536),("Ezekiel",-593,-571),("Obadiah",-586,-580),
 ("Haggai",-520,-518),("Zechariah",-520,-480),("Malachi",-435,-425)]
def klist(lst):
    return [{"n":n.replace(" II",""),"d0":a,"d1":b,"p":pidx(n.replace(" II",""),a,b),"lbl":n} for n,a,b in lst]
life={"pats":pats,"flood":-2348,
      "united":klist(KU),"judah":klist(KJ),"israel":klist(KI),"prophets":klist(PR),
      "events":[[-931,"kingdom divides"],[-722,"Israel falls to Assyria"],[-586,"Jerusalem falls to Babylon"],[-538,"return from exile"],[-516,"second temple finished"]]}

# ---------- write ----------
d["places"]=places
d["journeys"]=journeys
d["geo"]={"bbox":[LON0,LAT0,LON1,LAT1],"land":land,"lakes":lakes,"rivers":rivers}
d["life"]=life
raw=json.dumps(d,separators=(",",":"),ensure_ascii=False).encode()
gz=gzip.compress(raw,9)
b64=base64.b64encode(gz).decode()
open(f"{OUT}/data.b64","w").write(b64)
print(f"v2 bundle: raw {len(raw)/1e6:.1f}MB gz {len(gz)/1e6:.1f}MB b64 {len(b64)/1e6:.1f}MB")
