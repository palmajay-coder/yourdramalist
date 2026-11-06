// Existing suites assert and throw on failure. Import sequentially to keep output readable.
const suites = [
  "popularLists.test.ts", "dramaDetails.test.ts", "people.test.ts",
  "directList.test.ts", "listOwner.test.ts", "explore.test.ts",
  "featured.test.ts", "wallpaper.test.ts", "posterBackground.test.ts",
  "addon.test.ts", "preferences.test.ts", "ui.test.ts",
];
for (const suite of suites) {
  console.log("\nSUITE " + suite);
  await import(new URL("../" + suite, import.meta.url).href);
}
console.log("\nAll " + suites.length + " offline suites completed.");
