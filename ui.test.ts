import {parse} from "npm:acorn@8.15.0";
import handler from "./app.ts";
import {adminPage} from "./wallpaperAdmin.ts";
const html=await(await handler(new Request("https://test/"))).text();
let passed=0;
for(const [name,value] of [["public app",html],["admin signed out",adminPage(false)],["admin owner",adminPage(true)]]){
 for(const m of value.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))parse(m[1],{ecmaVersion:"latest"});
 console.log("PASS valid browser JavaScript: "+name);passed++;
}
if(!html.includes("CONNECT")||html.includes("01 Connect")||!html.includes("and select your choice."))throw Error("Copy regression");
console.log("PASS navigation labels and shared discover copy");passed++;
console.log(JSON.stringify({passed}));

if(/brandVersion|landingBrandVersion/.test(html.replace(/<style>[\s\S]*?<\/style>/g,""))||/<title>[^<]*V\./.test(html))throw Error("Visible version badge returned");
if(!html.includes("Catalogs by Country")||!html.includes("catalogShelves.css"))throw Error("Catalog shelf integration missing");
// One design for every device: the app layout is on for all visitors, mouse users get row buttons,
// and wide screens show a centered column. The old hostname gate must not come back.
if(!html.includes("const compactAndroid=true;")||/mobileBetaHost|mobile-test\.palmajay/.test(html))throw Error("App layout is not on for every visitor");
if(!html.includes("rowScrollButtons")||!html.includes("@media(min-width:560px){body.androidSetup>header"))throw Error("Desktop support for the app layout missing");
console.log("PASS catalog integration and no visible version badge");
