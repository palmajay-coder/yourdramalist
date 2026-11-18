import {handlePersonalCatalog} from "./personalCatalogs.ts";
import {createTokenCodec, loadCatalog, makeManifest, normalizeAddon} from "./addon.ts";

Deno.test("an installed personal catalog reads later additions, removals and deletion", async () => {
  const stored = new Map<string, any>();
  const store = {
    async setJSON(key: string, value: unknown) { stored.set(key,value); },
    async delete(key: string) { stored.delete(key); },
  };
  const origin = "https://preview.test";
  const save = (key: string, titles: unknown, from = origin) =>
    handlePersonalCatalog(new Request(origin + "/api/personal-catalog", {
      method:"POST", headers:{origin:from,"content-type":"application/json"},
      body:JSON.stringify({key,titles}),
    }),store as any);
  const assert = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
  const key = "ab".repeat(32);
  const drama = {name:"Drama",url:"https://mydramalist.com/123-drama",type:"Drama",year:2024};
  const movie = {name:"Movie",url:"https://mydramalist.com/456-movie",type:"Movie",poster:"https://image.tmdb.org/t/p/w500/movie.jpg"};
  const {id} = await (await save(key,[drama])).json();
  assert(/^[a-f0-9]{32}$/.test(id) && !key.includes(id), "The editor key was exposed");
  assert((await save(id,[])).status === 400, "Catalog reference was accepted as an editor key");
  assert((await save(key,[],"https://other.test")).status === 403, "Cross-origin write succeeded");
  assert((await save(key,[{...drama,url:"https://other.test/123-drama"}])).status === 400,"Unsupported source was accepted");
  const codec = createTokenCodec("a".repeat(64));
  const token = await codec.seal(normalizeAddon({catalogs:[
    {kind:"user-collection",name:"Favorites",url:"ydl-personal:" + id},
    {name:"Community",url:"https://mydramalist.com/list/abc123"},
  ]}));
  const config = await codec.open(token);
  const manifest = makeManifest(config);
  assert(manifest.catalogs.map(x=>x.name).join(",") === "Favorites,Community","Mixed manifest order changed");
  const read = () => loadCatalog(config,0,0,origin + "/addon/" + token,{
    personalCatalog: async (ref: string) => stored.get("personal-catalog/v1/" + ref),
    hidden: async () => new Set(),
    map: async (items: any[],type: string) => items.map(item=>({
      id:"tt" + item.slug.split("-")[0],name:item.title,type,poster:item.image || "https://i.mydramalist.com/example.jpg",
    })),
  } as any);
  assert((await read()).metas.map(x=>x.name).join(",") === "Drama","First install had the wrong titles");
  assert((await (await save(key,[movie,drama])).json()).id === id,"An edit changed the catalog reference");
  const edited = (await read()).metas;
  assert(edited.map(x=>x.name).join(",") === "Movie,Drama" && edited[0].type === "movie","The same catalog did not show the addition");
  await save(key,[movie]);
  assert((await read()).metas.map(x=>x.name).join(",") === "Movie","The same catalog did not reflect removal");
  await save(key,null);
  assert(stored.size === 0 && !(await read()).metas.length,"Deleting the collection left remote content");
});
