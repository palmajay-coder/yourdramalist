export const NOTIFICATION_CSS=`
.noticeToast{position:fixed;top:20px;right:20px;z-index:9999;background:#fff;border-left:4px solid #e0393e;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:14px 16px;min-width:260px;max-width:340px}
.noticeToast[hidden]{display:none}
.noticeToastTop{display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:11px;font-weight:800;letter-spacing:.04em;color:#e0393e;text-transform:uppercase}
.noticeToastClose{cursor:pointer;font:inherit;font-size:20px;background:none;border:0;padding:2px;color:#768493;line-height:1}
.noticeToastClose:focus-visible{outline:2px solid #1976b8;outline-offset:3px}
.noticeToastMessage{margin:6px 0 0;font-size:14px;line-height:1.5;color:#2b2f36}
@media(max-width:420px){.noticeToast{top:16px;right:16px;left:16px;min-width:0;max-width:none}}
`;
export function installFloatingNotice(copy:{noticeTitle:string;dismissNotice:string}){
 const root=document.createElement("aside");root.className="noticeToast";root.id="floatingNotice";root.hidden=true;
 const top=document.createElement("div");top.className="noticeToastTop";
 const title=document.createElement("strong");title.textContent=copy.noticeTitle;
 const close=document.createElement("button");close.type="button";close.className="noticeToastClose";close.textContent="×";close.setAttribute("aria-label",copy.dismissNotice);
 const message=document.createElement("p");message.className="noticeToastMessage";message.setAttribute("role","status");message.setAttribute("aria-live","polite");message.setAttribute("aria-atomic","true");
 top.append(title,close);root.append(top,message);document.body.append(root);
 let timer:ReturnType<typeof setTimeout>|undefined;
 function hide(){clearTimeout(timer);root.hidden=true;message.textContent="";}
 close.onclick=hide;
 return {show(text:string,heading?:string){clearTimeout(timer);title.textContent=heading||copy.noticeTitle;message.textContent=text;root.hidden=false;timer=setTimeout(hide,6000);},hide};
}
