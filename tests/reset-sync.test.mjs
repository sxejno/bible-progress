// Dependency-free regression checks against the shipped single-file app.
// Run: node tests/reset-sync.test.mjs [path/to/index.html]
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const html = fs.readFileSync(process.argv[2] || new URL('../index.html', import.meta.url), 'utf8')
function section(start, end) {
    const from = html.indexOf(start)
    const to = html.indexOf(end, from)
    assert.ok(from >= 0 && to > from, `Missing app section: ${start}`)
    return html.slice(from, to)
}
const helpers = section('        function parseReadList(', '        // --- AUTH LOGIC ---')
const sync = section('        function getSyncTargetProfile(', '        // Plan marks:')
const reset = section('        window.toggleAllInBook =', '        // --- READ-THROUGHS: SUMMARIES')
// Execute the actual profile merge and tombstone code, rather than a test copy.
const merge = section('            // Merge local chapter read timestamps into cloud profiles,', '            // Merge per-profile metadata:')
const ctx = vm.createContext({
    appData: {}, window: { showConfirm: async () => true, saveProgress() {}, renderChapterGrid() {} },
    bible: [{ name: 'Genesis', ch: Array(7).fill(1) }], activeBookIdx: 0, escapeHtml: s => s
})
vm.runInContext(helpers + sync + reset + `
    function merge_for_test(local, cloud) {
        const localProfiles = local.profiles, localReadHistory = local.readHistory
        const localReadThroughStarts = local.readThroughStarts, localDeletedReads = local.deletedReads
        appData = cloud
        appData.deletedChapters = local.deletedChapters || {}
        ${merge}
        return appData
    }
`, ctx)
const run = code => vm.runInContext(code, ctx)
const now = Date.now(), day = 86400000
const old = now - 20 * day, start = now - 10 * day, mirrored = now - 2 * day, own = now - day
const initial = {
    activeProfileId: 'A', profileSyncRules: { A: 'B' }, readThroughStarts: { A: [start] },
    profiles: { A: { 'Genesis-1': mirrored, 'Genesis-2': old, 'Genesis-4': mirrored, 'Genesis-5': mirrored },
        B: { 'Genesis-1': mirrored, 'Genesis-2': old, 'Genesis-3': own, 'Genesis-4': own, 'Genesis-5': mirrored } },
    readHistory: { A: { 'Genesis-1': String(old), 'Genesis-4': `${old},${start + 1}` },
        B: { 'Genesis-1': String(old), 'Genesis-4': `${old},${start + 1},${mirrored}`, 'Genesis-5': String(old) } }
}
ctx.appData = structuredClone(initial)
await run('window.toggleAllInBook(false)')
function check_reset(state) {
    assert.equal(state.profiles.B['Genesis-1'], old, 'keep previous round')
    assert.equal(state.profiles.B['Genesis-2'], old, 'keep source-unmodified chapter')
    assert.equal(state.profiles.B['Genesis-3'], own, 'keep target-only chapter')
    assert.equal(state.profiles.B['Genesis-4'], own, 'keep newer independent latest')
    assert.equal(state.readHistory.B['Genesis-4'], String(old), 'remove all mirrored current-round history')
    assert.equal(state.profiles.B['Genesis-5'], old, 'promote target-only earlier read')
    assert.equal(state.profiles.A['Genesis-1'], old, 'keep source history')
}
check_reset(ctx.appData)
console.log('PASS Reset Book preserves unrelated and earlier reads')
ctx.local = structuredClone(ctx.appData)
ctx.cloud = structuredClone(initial)
check_reset(run('merge_for_test(local, cloud)'))
console.log('PASS reset tombstones survive stale device merge')
// Exact removal is idempotent, including reads absent from the target.
run(`removeSyncedReads('B', 'Genesis-4', [${mirrored}, ${start + 1}])`)
check_reset(ctx.appData)
console.log('PASS repeated synced removal is harmless')
for (const local_newer of [false, true]) {
    const make = ts => ({ profiles: { A: { 'Genesis-1': ts } }, readHistory: { A: { 'Genesis-1': String(old) } } })
    ctx.local = make(local_newer ? own : mirrored)
    ctx.cloud = make(local_newer ? mirrored : own)
    for (let i = 0; i < 2; i++) {
        const state = run('merge_for_test(local, cloud)')
        assert.equal(state.profiles.A['Genesis-1'], own)
        assert.equal(state.readHistory.A['Genesis-1'], String(old), 'losing concurrent latest stays uncounted')
    }
}
console.log('PASS concurrent re-reads use newest-wins in both directions, without duplicate counts')
