// @ts-nocheck -- installed into the setup page's browser scope.
export function installPersonalCatalogSync() {
  const prefix = "ydl.personalCatalog.v1:";
  const queue = new Map();
  const retry = new Map();
  const validId = id => /^[a-f0-9-]{36}$/i.test(id);

  function publish(id, register = false) {
    const storageKey = prefix + id;
    const previous = queue.get(id) || Promise.resolve();
    const send = async () => {
      const collections = JSON.parse(localStorage.getItem(userCollectionsKey) || "[]");
      const collection = collections.find(item => item.id === id);
      if (register && !collection) throw Error("Collection no longer exists");
      let key = localStorage.getItem(storageKey);
      if (!key) {
        if (!register) return;
        key = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
        localStorage.setItem(storageKey,key);
      }
      const response = await fetch("/api/personal-catalog",{
        method:"POST", headers:{"content-type":"application/json"}, cache:"no-store",
        body:JSON.stringify({key,titles:collection ? collection.titles : null}),
        signal:AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error("Collection sync failed");
      const {id: reference} = await response.json();
      if (!/^[a-f0-9]{32}$/.test(reference)) throw Error("Invalid collection reference");
      clearTimeout(retry.get(id));
      retry.delete(id);
      if (!collection) localStorage.removeItem(storageKey);
      return reference;
    };
    const sync = () => navigator.locks ? navigator.locks.request(storageKey,send) : send();
    const next = previous.catch(() => {}).then(sync);
    queue.set(id,next);
    const cleanup = () => { if (queue.get(id) === next) queue.delete(id); };
    next.then(cleanup,cleanup);
    return next;
  }

  function changed(ids, notify = true) {
    for (const id of new Set(ids)) {
      if (!validId(id)) continue;
      try { if (!localStorage.getItem(prefix + id)) continue; } catch { continue; }
      publish(id).catch(() => {
        if (notify) notices.show("Saved in this browser. Nuvio sync will retry when you reconnect.");
        if (!retry.has(id)) retry.set(id,setTimeout(() => changed([id],false),15000));
      });
    }
  }

  function reconnect() {
    try {
      const ids = Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
      for (const id of ids) clearTimeout(retry.get(id));
      retry.clear();
      changed(ids,false);
    } catch { /* Local storage may be disabled. */ }
  }
  window.addEventListener("online",reconnect);
  reconnect();
  return {
    changed,
    publishSelection: async catalogs => {
      const published = [];
      for (const catalog of catalogs) {
        if (catalog.kind !== "user-collection") { published.push(catalog); continue; }
        const id = String(catalog.url).replace(/^ydl-collection:/,"");
        if (!validId(id)) throw Error("Invalid collection");
        published.push({...catalog, url:"ydl-personal:" + await publish(id,true)});
      }
      return published;
    },
  };
}
