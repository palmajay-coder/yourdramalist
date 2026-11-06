export const DEFAULT_WALLPAPER={mode:"posters",image:"",tint:"#000000",opacity:0.45};
export const OWNER_ID="54a7a61a-9472-40ee-8a84-a011d04cbfa9";
export function validateWallpaper(value:any){
 if(!value||typeof value!=="object")throw Error("Invalid wallpaper settings.");
 const mode=value.mode??"posters",image=value.image??"",tint=value.tint,opacity=value.opacity;
 if(!["posters","image"].includes(mode))throw Error("Choose moving posters or a still image.");
 if(typeof image!=="string"||image.length>2100000)throw Error("Use an image smaller than 1.5 MB.");
 if(image){
  if(image.startsWith("data:")){
   const m=image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
   if(!m||m[2].length%4)throw Error("Upload a PNG, JPEG, or WebP image.");
   let b;try{b=atob(m[2])}catch{throw Error("Invalid image.")}
   if(b.length>1500000)throw Error("Use an image smaller than 1.5 MB.");
   const valid=m[1]==="png"?b.startsWith("\x89PNG\r\n\x1a\n"):m[1]==="jpeg"?b.startsWith("\xff\xd8\xff"):b.startsWith("RIFF")&&b.slice(8,12)==="WEBP";
   if(!valid)throw Error("The image contents do not match its format.");
  }else{
   let u;try{u=new URL(image)}catch{throw Error("Enter a valid HTTPS image URL.")}
   if(u.protocol!=="https:"||u.username||u.password||u.port)throw Error("Enter an HTTPS image URL without credentials.");
   if(image.length>2000)throw Error("Image URL is too long.");
  }
 }
 if(typeof tint!=="string"||!/^#[0-9a-f]{6}$/i.test(tint))throw Error("Choose a valid tint color.");
 if(typeof opacity!=="number"||!Number.isFinite(opacity)||opacity<0||opacity>1)throw Error("Tint strength must be between 0 and 100%.");
 return {mode,image,tint,opacity};
}
export function canEdit(session:any){return session?.user?.id===OWNER_ID}
export function checkWrite(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)throw Error("Please save from the admin page.");
 if(!req.headers.get("content-type")?.startsWith("application/json"))throw Error("Expected JSON settings.");
 if(Number(req.headers.get("content-length")||0)>2200000)throw Error("The image is too large.");
}
export async function readSettingsBody(req:Request){
 const reader=req.body?.getReader();if(!reader)throw Error("Missing settings.");let body="",size=0;const decoder=new TextDecoder();
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2200000)throw Error("The image is too large.");body+=decoder.decode(value,{stream:true})}body+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
 return validateWallpaper(JSON.parse(body));
}
