// Re-reads and read-throughs: end-to-end checks in headless Chromium.
//
// Run from the repo root (needs Node and Playwright with a Chromium build):
//   NODE_PATH=$(npm root -g) node tests/read-throughs.test.mjs
//
// The script serves the repo itself and stubs the CDNs (Tailwind, Chart.js,
// Firebase), so it works offline. Tailwind and Chart.js come from npm once
// and are cached in tests/.cache/ (gitignored).
import { createRequire } from 'module'
import { execSync } from 'child_process'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(ROOT, 'tests', '.cache')
const DAY = 86400000
const results = []
const check = (name, cond, extra = '') => { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond || !extra ? '' : ' — ' + extra}`) }

// Pinned CDN stand-ins, fetched once
function vendor() {
    fs.mkdirSync(CACHE, { recursive: true })
    const want = { 'tailwind.js': ['@tailwindcss/browser@4.1.11', 'dist/index.global.js'], 'chart.js': ['chart.js@4.4.1', 'dist/chart.umd.js'] }
    for (const [out, [pkg, file]] of Object.entries(want)) {
        const dest = path.join(CACHE, out)
        if (fs.existsSync(dest)) continue
        const tgz = execSync(`npm pack ${pkg} --silent`, { cwd: CACHE }).toString().trim().split('\n').pop()
        const dir = path.join(CACHE, 'x-' + out)
        fs.mkdirSync(dir, { recursive: true })
        execSync(`tar -xzf ${JSON.stringify(tgz)} -C ${JSON.stringify(dir)}`, { cwd: CACHE })
        fs.copyFileSync(path.join(dir, 'package', file), dest)
        fs.rmSync(dir, { recursive: true, force: true })
        fs.rmSync(path.join(CACHE, tgz), { force: true })
    }
    return { tailwind: fs.readFileSync(path.join(CACHE, 'tailwind.js')), chart: fs.readFileSync(path.join(CACHE, 'chart.js')) }
}
const VENDOR = vendor()

// Static server for the repo root
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' }
const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const file = path.join(ROOT, rel)
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`

// Chapter keys in canonical order (the CSV spells Psalms as "Psalm")
const keys = fs.readFileSync(path.join(ROOT, 'kjv_chapter_word_counts.csv'), 'utf8')
    .trim().split('\n').slice(1).map(l => { const [b, c] = l.split(','); return `${b === 'Psalm' ? 'Psalms' : b}-${c}` })

const firebaseStub = (user) => ({
    app: `export const initializeApp = () => ({})`,
    auth: `export const getAuth = () => ({}); export const signInWithPopup = async () => {}; export const signInWithEmailAndPassword = async () => {};
           export const createUserWithEmailAndPassword = async () => {}; export class GoogleAuthProvider {}; export const signOut = async () => {};
           export const onAuthStateChanged = (a, cb) => { setTimeout(() => cb(${user ? JSON.stringify(user) : 'null'}), 0); return () => {} }`,
    firestore: `export const getFirestore = () => ({}); export const doc = (...a) => ({ path: a.slice(1).join('/') });
           export const setDoc = async (ref, data) => { window.__setDocs = (window.__setDocs || 0) + 1; window.__lastSetDoc = JSON.parse(JSON.stringify(data)) };
           export const getDoc = async () => ({ exists: () => false });
           export const onSnapshot = (ref, cb) => { window.__pushSnapshot = (appData) => cb({ exists: () => true, data: () => ({ appData }) }); return () => {} }`,
    analytics: `export const getAnalytics = () => ({}); export const logEvent = () => {}`
})

async function newPage(browser, user = null, mobile = false) {
    const ctx = await browser.newContext(mobile
        ? { ignoreHTTPSErrors: true, serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
        : { ignoreHTTPSErrors: true, serviceWorkers: 'block', viewport: { width: 1200, height: 900 } })
    const page = await ctx.newPage()
    const stubs = firebaseStub(user)
    await page.route('https://cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'application/javascript', body: VENDOR.tailwind }))
    await page.route('https://cdn.jsdelivr.net/**', r => r.request().url().includes('chart') ? r.fulfill({ contentType: 'application/javascript', body: VENDOR.chart }) : r.fulfill({ body: '' }))
    await page.route('https://www.gstatic.com/firebasejs/**', r => {
        const u = r.request().url()
        const which = u.includes('firebase-auth') ? 'auth' : u.includes('firebase-firestore') ? 'firestore' : u.includes('firebase-analytics') ? 'analytics' : 'app'
        r.fulfill({ contentType: 'application/javascript', body: stubs[which] })
    })
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '' }))
    await page.route(/ui-avatars\.com|googletagmanager/, r => r.fulfill({ body: '' }))
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error' && !/Service Worker|Failed to load resource|favicon|blob:x|ERR_PROXY|net::/.test(m.text())) errors.push(m.text()) })
    return { ctx, page, errors }
}

async function seed(page, appData, extra = {}) {
    await page.goto(`${BASE}/robots.txt`)
    await page.evaluate(([d, e]) => {
        localStorage.clear()
        localStorage.setItem('kjv_v6_data', JSON.stringify(d))
        localStorage.setItem('kjv_intro_seen', 'true')
        Object.entries(e).forEach(([k, v]) => localStorage.setItem(k, v))
    }, [appData, extra])
    await page.goto(`${BASE}/index.html`)
    await page.waitForFunction(() => typeof window.toggleChapter === 'function')
    await page.waitForTimeout(800)
}
const data = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('kjv_v6_data')))
const flush = (page) => page.waitForTimeout(400)

const baseData = (profile, extra = {}) => ({
    profiles: { [profile]: {} }, activeProfileId: profile, defaultProfileId: profile,
    profilePlans: { [profile]: 'SEQUENTIAL' }, profileSyncRules: {}, ...extra
})

async function longPress(page, selector) {
    const box = await page.locator(selector).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await page.mouse.up()
}

const launchArgs = process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=127.0.0.1;localhost'] : []
const executablePath = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined
const browser = await chromium.launch({ executablePath, args: launchArgs })
try {
    // ---------- 1. Long-press menu, read again, remove latest, plain tap ----------
    {
        const { page, errors, ctx } = await newPage(browser)
        const now = Date.now()
        const d = baseData('Tester')
        d.profiles.Tester = { 'Genesis-1': now - 3 * DAY, 'Genesis-2': now - 2 * DAY, 'Genesis-3': now - DAY }
        await seed(page, d)
        await page.evaluate(() => { window.setTab('ALL'); window.openBook(0) })
        await page.waitForSelector('button[data-chapter="Genesis-1"]')
        check('tile has data-chapter and hint', await page.locator('#chapter-grid-hint').isVisible())

        await longPress(page, 'button[data-chapter="Genesis-1"]')
        await page.waitForSelector('#chapter-menu-overlay')
        const menuText = await page.locator('#chapter-menu-overlay').innerText()
        check('long-press opens menu', /Genesis 1/.test(menuText) && /Read once/.test(menuText), menuText.replace(/\n/g, ' | '))
        let st = await data(page)
        check('long-press does not toggle the chapter', typeof st.profiles.Tester['Genesis-1'] === 'number')

        await page.waitForTimeout(450)
        await page.click('#chapter-menu-overlay button[data-action="again"]')
        await flush(page)
        st = await data(page)
        const g1 = st.profiles.Tester['Genesis-1']
        check('read again keeps old read in history', st.readHistory?.Tester?.['Genesis-1'] === String(now - 3 * DAY) && g1 > now - 1000, JSON.stringify(st.readHistory))
        const badge = await page.locator('#chapter-grid > div').first().innerText()
        check('tile shows ×2', badge.includes('×2'), badge.replace(/\n/g, ' '))

        // Right-click opens the menu too; remove the latest read
        await page.click('button[data-chapter="Genesis-1"]', { button: 'right' })
        await page.waitForSelector('#chapter-menu-overlay')
        check('right-click menu shows 2 reads', /Read 2 times/.test(await page.locator('#chapter-menu-overlay').innerText()))
        await page.waitForTimeout(450)
        await page.click('#chapter-menu-overlay button[data-action="remove"]')
        await flush(page)
        st = await data(page)
        check('remove latest restores earlier read', st.profiles.Tester['Genesis-1'] === now - 3 * DAY && st.readHistory.Tester['Genesis-1'] === '', JSON.stringify(st.readHistory))
        check('remove latest records a read tombstone', !!st.deletedReads?.Tester?.['Genesis-1']?.[String(g1)])

        // A plain tap after a long-press still toggles (suppression resets)
        await page.waitForTimeout(1100)
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)
        st = await data(page)
        check('plain tap unmarks a single read', st.profiles.Tester['Genesis-1'] === undefined && !!st.deletedChapters?.Tester?.['Genesis-1'])
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)
        st = await data(page)
        check('plain tap marks again', typeof st.profiles.Tester['Genesis-1'] === 'number' && !st.deletedChapters?.Tester?.['Genesis-1'])

        // Escape closes the menu
        await page.click('button[data-chapter="Genesis-2"]', { button: 'right' })
        await page.waitForSelector('#chapter-menu-overlay')
        await page.keyboard.press('Escape')
        check('Escape closes the menu', (await page.locator('#chapter-menu-overlay').count()) === 0)

        // Stats: re-read history makes the read-throughs card show up only after a re-read
        await page.evaluate(() => window.setTab('STATS'))
        await page.waitForTimeout(400)
        check('read-throughs card hidden without re-reads', await page.locator('#read-throughs-section').isHidden())
        check('no page errors (test 1)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }

    // ---------- 2. Finished Bible: celebration, start round 2, plans, undo, goals ----------
    {
        const { page, errors, ctx } = await newPage(browser)
        const now = Date.now()
        const start = now - 400 * DAY
        const d = baseData('Reader')
        // Spread every chapter over the past ~330 days, ending 2 days ago
        keys.forEach((k, i) => { d.profiles.Reader[k] = start + Math.floor(i / 4) * DAY + (i % 4) * 1000 })
        d.goals = { Reader: [{ id: 'g1', name: 'Old goal', type: 'wholeBible', target: {}, deadline: null, createdAt: start, completedAt: null }] }
        delete d.profiles.Reader['Revelation-22']
        await seed(page, d)
        // Finish the Bible by tapping the last chapter
        await page.evaluate(() => { window.setTab('ALL'); window.openBook(65) })
        await page.click('button[data-chapter="Revelation-22"]')
        await page.waitForSelector('text=BIBLE COMPLETE!', { timeout: 5000 })
        check('celebration offers read-through #2', await page.locator('button:has-text("Start read-through #2"):visible').first().isVisible())

        // Stats before starting: streak/heatmap baseline
        await page.locator('button:has-text("Start read-through #2"):visible').first().click()
        await page.waitForSelector('#custom-modal-overlay')
        check('confirm explains nothing is lost', /Nothing is lost/.test(await page.locator('#custom-modal-overlay').innerText()))
        await page.locator('#custom-modal-overlay button:has-text("Start")').click()
        await flush(page)
        let st = await data(page)
        check('round start recorded', Array.isArray(st.readThroughStarts?.Reader) && st.readThroughStarts.Reader.length === 1)
        check('no chapter data deleted', Object.keys(st.profiles.Reader).length === keys.length)
        const header = await page.locator('#books-completed-stat').innerText()
        check('header shows read-through #2', /READ-THROUGH #2 · 0 OF 66 BOOKS/i.test(header), header)

        // Plan restarts at Genesis 1
        await page.evaluate(() => window.setTab('PLAN'))
        await page.waitForTimeout(300)
        const planText = await page.locator('#daily-plan-list').innerText()
        check('sequential plan restarts at Genesis 1', /Genesis 1\b/.test(planText), planText.slice(0, 120).replace(/\n/g, ' | '))
        const goalsText = await page.locator('#view-plan').innerText()
        check('old goal keeps its 100%', /100(\.0)?%/.test(goalsText))

        // Grid shows earlier-round tint
        await page.evaluate(() => { window.setTab('ALL'); window.openBook(0) })
        await page.waitForSelector('button[data-chapter="Genesis-1"]')
        const cls = await page.getAttribute('button[data-chapter="Genesis-1"]', 'class')
        check('earlier-round tile is tinted', cls.includes('border-dashed'), cls)
        const aria = await page.getAttribute('button[data-chapter="Genesis-1"]', 'aria-label')
        check('earlier-round aria label', /earlier read-through/.test(aria), aria)

        // Tap marks it in round 2 and keeps the round-1 read
        const oldTs = st.profiles.Reader['Genesis-1']
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)
        st = await data(page)
        check('tap in round 2 moves old read to history', st.readHistory.Reader['Genesis-1'] === String(oldTs) && st.profiles.Reader['Genesis-1'] > now)
        check('header counts round 2 only', /0 OF 66/.test(await page.locator('#books-completed-stat').innerText()))
        // Tapping again unmarks only the round-2 read
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)
        st = await data(page)
        check('unmark in round 2 falls back to round-1 read', st.profiles.Reader['Genesis-1'] === oldTs && st.readHistory.Reader['Genesis-1'] === '')
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)

        // Reset Book only removes round-2 reads
        await page.click('button[data-chapter="Genesis-2"]')
        await flush(page)
        await page.click('button:has-text("Reset Book")')
        await page.waitForSelector('#custom-modal-overlay')
        check('reset confirm mentions read-through #2', /read-through #2/.test(await page.locator('#custom-modal-overlay').innerText()))
        await page.locator('#custom-modal-overlay button:has-text("Reset")').click()
        await flush(page)
        st = await data(page)
        check('reset book keeps round-1 reads', typeof st.profiles.Reader['Genesis-2'] === 'number' && st.profiles.Reader['Genesis-2'] < now && st.profiles.Reader['Genesis-1'] === oldTs)
        await page.click('button[data-chapter="Genesis-1"]')
        await flush(page)

        // New goal set in round 2 starts at 0%-ish
        await page.evaluate(() => window.setTab('STATS'))
        await page.waitForTimeout(500)
        const rtText = await page.locator('#read-throughs-section').innerText()
        check('stats read-throughs card lists both rounds', /Read-through #2/i.test(rtText) && /Read-through #1/i.test(rtText) && /Complete/i.test(rtText), rtText.slice(0, 300).replace(/\n/g, ' | '))
        const streak = await page.locator('#longest-streak').innerText()
        check('longest streak survives the restart', parseInt(streak, 10) >= 290, streak)
        const donut = await page.locator('#stats-donut-label').innerText()
        check('donut names the read-through', /Read-through #2/i.test(donut), donut)

        // Start #3 then undo
        await page.locator('#read-throughs-start-btn').click()
        await page.waitForSelector('#custom-modal-overlay')
        await page.locator('#custom-modal-overlay button:has-text("Start")').click()
        await flush(page)
        st = await data(page)
        check('round 3 started', st.readThroughStarts.Reader.filter(n => n > 0).length === 2)
        await page.locator('#micro-toast button:has-text("Undo")').click()
        await flush(page)
        st = await data(page)
        const starts = st.readThroughStarts.Reader
        check('undo adds a cancel marker', starts.length === 3 && starts.some(n => n < 0), JSON.stringify(starts))
        check('header back on read-through #2', /READ-THROUGH #2/.test(await page.locator('#books-completed-stat').innerText()))

        // Settings row
        await page.evaluate(() => window.setTab('SETTINGS'))
        await page.waitForTimeout(300)
        check('settings shows read-through #2', /Read-through #2/.test(await page.locator('#settings-read-through-title').innerText()))

        // Exports don't throw: CSV content includes read-throughs
        const csv = await page.evaluate(async () => {
            const orig = URL.createObjectURL; let captured = ''
            URL.createObjectURL = (blob) => { blob.text().then(t => { window.__csv = t }); return 'blob:x' }
            await window.exportProgressCSV()
            URL.createObjectURL = orig
            await new Promise(r => setTimeout(r, 200))
            return window.__csv || ''
        })
        check('CSV has read-throughs section and counts', /=== READ-THROUGHS ===/.test(csv) && /Times Read/.test(csv) && /Reader,1,Complete/.test(csv))
        check('no page errors (test 2)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }

    // ---------- 3. Cloud merge via stubbed snapshot ----------
    {
        const user = { uid: 'u1', email: 't@example.com', photoURL: null }
        const { page, errors, ctx } = await newPage(browser, user)
        const now = Date.now()
        const t1 = now - 10 * DAY, t2 = now - 5 * DAY, t3 = now - 1 * DAY
        const d = baseData('Sync')
        // Local: Genesis-1 re-read (t1 → t2); Genesis-2 had a re-read removed (t2 tombstoned)
        d.profiles.Sync = { 'Genesis-1': t2, 'Genesis-2': t1, 'Genesis-3': t1 }
        d.readHistory = { Sync: { 'Genesis-1': String(t1), 'Genesis-2': '' } }
        d.deletedReads = { Sync: { 'Genesis-2': { [String(t2)]: now - 1000 } } }
        d.readThroughStarts = { Sync: [now - 3 * DAY, -(now - 3 * DAY)] }
        d.lastModified = now - 60000
        await seed(page, d)
        await page.waitForFunction(() => typeof window.__pushSnapshot === 'function')
        // Cloud (stale device): Genesis-1 single read t1; Genesis-2 still has the removed re-read;
        // Genesis-3 re-read on the other device (t1 → t3); cloud never saw the undo
        const cloud = {
            profiles: { Sync: { 'Genesis-1': t1, 'Genesis-2': t2, 'Genesis-3': t3 } },
            activeProfileId: 'Sync', defaultProfileId: 'Sync', profilePlans: { Sync: 'SEQUENTIAL' },
            readHistory: { Sync: { 'Genesis-2': String(t1), 'Genesis-3': String(t1) } },
            readThroughStarts: { Sync: [now - 3 * DAY] },
            lastModified: now + 5000
        }
        await page.evaluate((c) => window.__pushSnapshot(c), cloud)
        await page.waitForTimeout(300)
        const st = await data(page)
        const p = st.profiles.Sync, h = st.readHistory.Sync
        check('merge keeps local re-read', p['Genesis-1'] === t2 && h['Genesis-1'] === String(t1), JSON.stringify({ g1: p['Genesis-1'], h: h['Genesis-1'] }))
        check('merge honors read tombstone', p['Genesis-2'] === t1 && h['Genesis-2'] === '', JSON.stringify({ g2: p['Genesis-2'], h: h['Genesis-2'] }))
        check('merge keeps other device re-read', p['Genesis-3'] === t3 && h['Genesis-3'] === String(t1), JSON.stringify({ g3: p['Genesis-3'], h: h['Genesis-3'] }))
        check('undo survives merge', st.readThroughStarts.Sync.some(n => n < 0) && /BOOKS READ/.test(await page.locator('#books-completed-stat').innerText()))
        check('no page errors (test 3)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }

    // ---------- 4. Horner keeps rotating and counts re-reads ----------
    {
        const { page, errors, ctx } = await newPage(browser)
        const now = Date.now()
        const d = baseData('H', { profilePlans: { H: 'HORNER' } })
        // All of Matthew..John read long ago: list 1 (Gospels) wraps to a new cycle
        keys.filter(k => /^(Matthew|Mark|Luke|John)-/.test(k)).forEach((k, i) => { d.profiles.H[k] = now - 100 * DAY + i * 1000 })
        await seed(page, d)
        await page.evaluate(() => window.setTab('PLAN'))
        await page.waitForTimeout(300)
        const before = await page.locator('#daily-plan-list').innerText()
        check('horner list 1 offers a new cycle chapter', /Matthew 1\b/.test(before), before.slice(0, 200).replace(/\n/g, ' | '))
        await page.locator('#horner-card-0 button[title="Mark as Read"]').click()
        await flush(page)
        const st = await data(page)
        check('horner re-read moves old read to history', !!st.readHistory?.H?.['Matthew-1'] && st.profiles.H['Matthew-1'] > now)
        check('no page errors (test 4)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }

    // ---------- 5. Touch: long-press, quick tap, drag ----------
    {
        const { page, ctx, errors } = await newPage(browser, null, true)
        const now = Date.now()
        const d = baseData('T')
        d.profiles.T = { 'Genesis-1': now - 3 * DAY }
        await seed(page, d)
        await page.evaluate(() => { window.setTab('ALL'); window.openBook(0) })
        await page.waitForSelector('button[data-chapter="Genesis-1"]')
        const cdp = await ctx.newCDPSession(page)
        const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
        // Touch long-press
        let p = await center('button[data-chapter="Genesis-1"]')
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] })
        await page.waitForTimeout(800)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await page.waitForTimeout(500)
        const open = await page.locator('#chapter-menu-overlay').count()
        let st = await data(page)
        check('touch long-press opens menu', open === 1)
        check('touch long-press leaves chapter read', typeof st.profiles.T['Genesis-1'] === 'number')
        check('menu stays open after finger lifts', (await page.locator('#chapter-menu-overlay').count()) === 1)
        await page.locator('#chapter-menu-overlay button[data-action="close"]').tap()
        await page.waitForTimeout(1200)
        // Quick touch tap still toggles
        p = await center('button[data-chapter="Genesis-2"]')
        await page.touchscreen.tap(p.x, p.y)
        await page.waitForTimeout(500)
        st = await data(page)
        check('quick tap marks Genesis 2', typeof st.profiles.T['Genesis-2'] === 'number')
        // Touch-scroll gesture does not open the menu
        p = await center('button[data-chapter="Genesis-5"]')
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] })
        for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y - i * 15 }] }); await page.waitForTimeout(60) }
        await page.waitForTimeout(500)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await page.waitForTimeout(300)
        check('drag does not open menu', (await page.locator('#chapter-menu-overlay').count()) === 0)
        check('no page errors (touch)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }

    // ---------- 6. Sync rules mirror only the reads the source removes ----------
    {
        const { page, errors, ctx } = await newPage(browser)
        const now = Date.now()
        const t1 = now - 30 * DAY, t2 = now - 20 * DAY, start = now - 10 * DAY, t4 = now - 2 * DAY, own = now - 3 * DAY
        // Source A is on read-through #2 and mirrors marks to B, which is still on #1.
        // Genesis 1-3 were synced in round 1 (same timestamps); Genesis 4 was synced in round 2.
        const d = baseData('A', { profileSyncRules: { A: 'B' }, profilePlans: { A: 'SEQUENTIAL', B: 'SEQUENTIAL' } })
        d.profiles.A = { 'Genesis-1': t2, 'Genesis-2': t1, 'Genesis-3': t1, 'Genesis-4': t4 }
        d.profiles.B = { 'Genesis-1': t2, 'Genesis-2': t1, 'Genesis-3': t1, 'Genesis-4': t4, 'Genesis-5': own }
        d.readHistory = { A: { 'Genesis-1': String(t1) }, B: { 'Genesis-1': String(t1) } }
        d.readThroughStarts = { A: [start] }
        await seed(page, d)
        await page.evaluate(() => { window.setTab('ALL'); window.openBook(0) })
        await page.waitForSelector('button[data-chapter="Genesis-5"]')

        // A marks Genesis 5; B already has its own read, so B keeps it as is
        await page.click('button[data-chapter="Genesis-5"]')
        await flush(page)
        let st = await data(page)
        check('sync skips a target read it already has', st.profiles.B['Genesis-5'] === own && !st.readHistory.B?.['Genesis-5'])
        // A unmarks Genesis 5; B's own read is not A's, so it stays
        await page.click('button[data-chapter="Genesis-5"]')
        await flush(page)
        st = await data(page)
        check("unmark leaves the target's own read", st.profiles.B['Genesis-5'] === own)

        // A resets Genesis: only A's read-through #2 reads (Genesis 4) leave B
        await page.click('button:has-text("Reset Book")')
        await page.waitForSelector('#custom-modal-overlay')
        await page.locator('#custom-modal-overlay button:has-text("Reset")').click()
        await flush(page)
        st = await data(page)
        check('reset removes the mirrored round-2 read from the target', st.profiles.B['Genesis-4'] === undefined)
        check("reset keeps the target's earlier reads", st.profiles.B['Genesis-1'] === t2 && st.readHistory.B['Genesis-1'] === String(t1) &&
            st.profiles.B['Genesis-2'] === t1 && st.profiles.B['Genesis-3'] === t1 && st.profiles.B['Genesis-5'] === own,
            JSON.stringify({ B: st.profiles.B, h: st.readHistory.B }))
        check('reset keeps the source round-1 reads', st.profiles.A['Genesis-1'] === t2 && st.profiles.A['Genesis-2'] === t1)
        check('no page errors (sync rules)', errors.length === 0, errors.join(' || '))
        await ctx.close()
    }
} finally {
    await browser.close()
    server.close()
}
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
