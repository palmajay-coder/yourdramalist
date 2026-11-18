import {parseHTML} from "npm:linkedom@0.18.12";
import {installMyCollections} from "./myCollectionsClient.ts";
import {installCollectionPicker} from "./collectionPicker.ts";

Deno.test("deleting a collection updates selection and picker without changing other collections", () => {
  const {document, window} = parseHTML('<div class="androidDiscoverToolbar"><h1>My Collections</h1></div><div id="listItems"></div>');
  const title = {url:"https://mydramalist.com/1-drama", name:"Drama"};
  const first = {id:"first", name:"Favorites", titles:[title]};
  const second = {id:"second", name:"Watch later", titles:[title]};
  const userCollectionsKey = "ydl.userCollections.v1";
  let saved = JSON.stringify([first, second]);
  const state = {selection: [
    {kind:"user-collection", url:"ydl-collection:first"},
    {kind:"user-collection", url:"ydl-collection:second"},
    {kind:"watchlist", url:"https://mydramalist.com/dramalist/example"},
  ]};
  let failWrite = false;
  let selectionUpdates = 0;
  const storage = {
    getItem: () => saved,
    setItem: (_key: string, value: string) => {
      if (failWrite) throw Error("Write failed");
      saved = value;
    },
  };
  const showDialog = (dialog: HTMLDialogElement) => {
    dialog.open = true;
    dialog.close = () => {
      dialog.open = false;
      dialog.dispatchEvent(new window.Event("close"));
    };
  };
  const show = new Function("document", "window", "$", "localStorage", "userCollectionsKey",
    "state", "renderSelection", "showAndroidDialog", "setTimeout", "toggleList", "personalCatalogSync",
    `return (${installMyCollections.toString()})();`)(
      document, window, (id: string) => document.getElementById(id), storage, userCollectionsKey,
      state, () => selectionUpdates++, showDialog, () => 0, () => {}, {changed() {}},
    );
  const openPicker = new Function("document", "window", "localStorage", "userCollectionsKey",
    "showAndroidDialog", `return (${installCollectionPicker.toString()})();`)(
      document, window, storage, userCollectionsKey, showDialog,
    );
  const find = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const assert = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
  const openDelete = () => {
    find<HTMLDetailsElement>(".myCollectionMenu").open = true;
    find<HTMLButtonElement>(".myCollectionMenuDelete").click();
    assert(find<HTMLButtonElement>(".myCollectionDeleteActions .secondary").autofocus, "Cancel should have initial focus");
  };
  show("collections");
  openDelete();
  find<HTMLButtonElement>(".myCollectionDeleteActions .secondary").click();
  assert(JSON.parse(saved).length === 2 && selectionUpdates === 0, "Cancel changed saved data");
  openDelete();
  failWrite = true;
  find<HTMLButtonElement>(".myCollectionDeleteConfirm").click();
  assert(find(".myCollectionDeleteError").textContent?.includes("Could not delete"), "Missing write failure feedback");
  assert(JSON.parse(saved).length === 2 && selectionUpdates === 0, "Write failure changed selection or collections");
  failWrite = false;
  find<HTMLButtonElement>(".myCollectionDeleteConfirm").click();
  assert(saved === JSON.stringify([second]), "Deleting one collection changed another");
  assert(state.selection.length === 2 && state.selection[0].url === "ydl-collection:second",
    "Deleting a collection did not selectively remove it from Your Selection");
  openPicker(title);
  assert(find(".collectionPickerList").textContent?.includes("Watch later"), "Remaining collection missing from picker");
  assert(!find(".collectionPickerList").textContent?.includes("Favorites"), "Deleted collection still in picker");
  find<HTMLDialogElement>(".collectionPicker").close();
  openDelete();
  saved = "[]";
  find<HTMLButtonElement>(".myCollectionDeleteConfirm").click();
  assert(find(".myCollectionsMessage").textContent === "Build your own custom catalog", "Missing last collection empty state");
  assert(state.selection.length === 1 && state.selection[0].kind === "watchlist", "Stale collection selection was not cleared");
});
