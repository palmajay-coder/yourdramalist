// Existing suites assert and throw on failure. Import sequentially to keep output readable.
const suites = [
  "popularLists.test.ts", "dramaDetails.test.ts", "people.test.ts",
  "directList.test.ts", "listOwner.test.ts", "explore.test.ts",
  "featured.test.ts", "wallpaper.test.ts", "posterBackground.test.ts",
  "addon.test.ts", "preferences.test.ts", "ui.test.ts", "selection.test.ts", "dramaSearch.test.ts",
];
const failures: string[] = [];
for (const suite of suites) {
  console.log("\nSUITE " + suite);
  try { await import(new URL("../" + suite, import.meta.url).href); }
  catch (error) { failures.push(suite); console.error(error); }
}
if (failures.length) throw Error("Failed offline suites: " + failures.join(", "));
console.log("\nAll " + suites.length + " offline suites completed.");
