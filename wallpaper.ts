// The site owner's account. Only this account can open the admin page.
export const OWNER_ID="54a7a61a-9472-40ee-8a84-a011d04cbfa9";
export function canEdit(session:any){return session?.user?.id===OWNER_ID}

// The tint over the Connect page's moving poster wall. The default matches the original look.
export const DEFAULT_TINT={tint:"#0a0c10",opacity:0.74};
/** Reads tint settings, including ones saved by the old Wallpaper section (extra fields are ignored). */
export function validateTint(value:any){
 if(!value||typeof value!=="object")throw Error("Invalid tint settings.");
 const {tint,opacity}=value;
 if(typeof tint!=="string"||!/^#[0-9a-f]{6}$/i.test(tint))throw Error("Choose a valid tint color.");
 if(typeof opacity!=="number"||!Number.isFinite(opacity)||opacity<0||opacity>1)throw Error("Tint strength must be between 0 and 100%.");
 return {tint:tint.toLowerCase(),opacity:Math.round(opacity*100)/100};
}
