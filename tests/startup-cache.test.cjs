const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "dist/index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "dist/app.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dist/sw.js"), "utf8");

test("HTML and SW precache use the same current app.js URL", () => {
  const src = html.match(/<script\s+src="(\.\/app\.js\?v=[^"]+)"\s+defer/);
  assert.ok(src, "versioned app.js must be loaded with defer");
  assert.ok(sw.includes('"'+src[1]+'"'), "service worker must precache the same version as HTML");
  assert.ok(!src[1].includes("20261025-unit5"), "stale app.js query may replay removed profile control");
  assert.ok(sw.includes('if (/\\.(?:js|mjs|css)$/.test(requestUrl.pathname))'));
  assert.ok(sw.includes("fetch(event.request)"), "same-origin assets must use network first");
  assert.ok(!sw.includes("gold-signal-v5-unit5-suite-20261028"));
  assert.ok(app.includes("serviceWorker.register(\"./sw.js?v=20261113-startup-fix-1\""));
});

test("startup JS compiles and all required app DOM nodes exist", () => {
  assert.doesNotThrow(() => new vm.Script(app, {filename:"dist/app.js"}));
  assert.doesNotThrow(() => new vm.Script(sw, {filename:"dist/sw.js"}));
  const queried = [...app.matchAll(/document\.querySelector\(["']#([\w-]+)["']\)/g)]
    .map(x => x[1]);
  for (const id of new Set(queried)) {
    assert.ok(html.includes('id="'+id+'"'), "missing #"+id+" in dist/index.html");
  }
  assert.ok(!app.includes('document.querySelector("#profileButton").addEventListener'));
  assert.ok(!html.includes('id="profileButton"'));
});

test("data failure has an explicit status and simulation remains available", () => {
  assert.match(app, /데이터 연결 실패 · 기본 가정/);
  assert.match(app, /function render\(\)/);
  assert.match(app, /render\(\);\s*loadAutomatedMarketData\(\);/);
});
