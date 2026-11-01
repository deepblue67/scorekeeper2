import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const currentCacheName = "scorekeeper-V20261101 15H30";

function requestKey(request) {
  return typeof request === "string" ? request : request.url;
}

function createHarness({ fetchImpl } = {}) {
  const listeners = {};
  const stores = new Map();
  const deleted = [];

  function getStore(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }

  const caches = {
    async open(name) {
      const store = getStore(name);
      return {
        async addAll(requests) {
          for (const request of requests) {
            store.set(requestKey(request), new Response(`cached:${requestKey(request)}`));
          }
        },
        async add(request) {
          store.set(requestKey(request), new Response(`cached:${requestKey(request)}`));
        },
        async put(request, response) {
          store.set(requestKey(request), response.clone());
        }
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      deleted.push(name);
      return stores.delete(name);
    },
    async match(request) {
      const key = requestKey(request);
      for (const store of stores.values()) {
        if (store.has(key)) return store.get(key).clone();
      }
      return undefined;
    }
  };

  let skipWaitingCalled = false;
  let claimCalled = false;
  const self = {
    location: {
      origin: "https://example.test",
      hostname: "example.test"
    },
    clients: {
      async claim() {
        claimCalled = true;
      }
    },
    async skipWaiting() {
      skipWaitingCalled = true;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    }
  };

  const context = {
    URL,
    Response,
    Request,
    Set,
    Promise,
    console,
    caches,
    self,
    fetch: fetchImpl || (async request => new Response(`network:${requestKey(request)}`))
  };

  vm.runInNewContext(source, context, { filename: "sw.js" });

  return {
    caches,
    deleted,
    getStore,
    listeners,
    stores,
    get claimCalled() {
      return claimCalled;
    },
    get skipWaitingCalled() {
      return skipWaitingCalled;
    }
  };
}

function lifecycleEvent() {
  let pending;
  return {
    event: {
      waitUntil(promise) {
        pending = promise;
      }
    },
    async done() {
      await pending;
    }
  };
}

function fetchEvent(request) {
  let responsePromise;
  const background = [];
  return {
    event: {
      request,
      respondWith(promise) {
        responsePromise = Promise.resolve(promise);
      },
      waitUntil(promise) {
        background.push(Promise.resolve(promise));
      }
    },
    get responded() {
      return Boolean(responsePromise);
    },
    async response() {
      return responsePromise;
    },
    async backgroundDone() {
      await Promise.all(background);
    }
  };
}

test("install caches the app shell and waits for the user to activate the update", async () => {
  const harness = createHarness();
  const install = lifecycleEvent();

  harness.listeners.install(install.event);
  await install.done();

  const cache = harness.getStore(currentCacheName);
  assert.ok(cache.has("./"));
  assert.ok(cache.has("./index.html"));
  assert.ok(cache.has("./sw.js"));
  // Mise à jour guidée : pas d'activation forcée à l'installation
  assert.equal(harness.skipWaitingCalled, false);

  const message = lifecycleEvent();
  harness.listeners.message({ ...message.event, data: { type: "SKIP_WAITING" } });
  await message.done();
  assert.equal(harness.skipWaitingCalled, true);
});

test("activate deletes only older ScoreKeeper caches", async () => {
  const harness = createHarness();
  harness.getStore("scorekeeper-old");
  harness.getStore(currentCacheName);
  harness.getStore("another-application-cache");
  const activate = lifecycleEvent();

  harness.listeners.activate(activate.event);
  await activate.done();

  assert.deepEqual(harness.deleted, ["scorekeeper-old"]);
  assert.ok(harness.stores.has("another-application-cache"));
  assert.equal(harness.claimCalled, true);
});

test("navigation uses the cached app shell when the network is unavailable", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new Error("offline");
    }
  });
  const cache = await harness.caches.open(currentCacheName);
  await cache.put("./index.html", new Response("offline shell"));
  const navigation = fetchEvent({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: "https://example.test/deep-link"
  });

  harness.listeners.fetch(navigation.event);
  const response = await navigation.response();

  assert.equal(await response.text(), "offline shell");
});

test("unrelated external requests are not intercepted or cached", async () => {
  const harness = createHarness();
  const external = fetchEvent({
    method: "GET",
    mode: "cors",
    destination: "script",
    url: "https://unrelated.example/app.js"
  });

  harness.listeners.fetch(external.event);

  assert.equal(external.responded, false);
  assert.equal(harness.stores.size, 0);
});

test("same-origin resources are served from cache before the network", async () => {
  const resourceUrl = "https://example.test/icon.png";
  let fetchCalled = false;
  const harness = createHarness({
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("fresh");
    }
  });
  const cache = await harness.caches.open(currentCacheName);
  await cache.put(resourceUrl, new Response("cached"));
  const resource = fetchEvent({
    method: "GET",
    mode: "same-origin",
    destination: "image",
    url: resourceUrl
  });

  harness.listeners.fetch(resource.event);
  const response = await resource.response();

  assert.equal(await response.text(), "cached");
  assert.equal(fetchCalled, false);
});

test("the delivery has no external script, stylesheet, or service-worker dependency", () => {
  assert.doesNotMatch(indexSource, /<script\b[^>]*\bsrc=["']https?:\/\//i);
  assert.doesNotMatch(indexSource, /<link\b[^>]*\bhref=["']https?:\/\//i);
  assert.match(indexSource, /qrcodejs 1\.0\.0/);
  assert.doesNotMatch(source, /fonts\.googleapis|fonts\.gstatic|cdnjs|CACHEABLE_EXTERNAL_HOSTS/i);
});
