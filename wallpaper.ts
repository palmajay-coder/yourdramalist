// The site owner's account. Only this account can open the admin page.
export const OWNER_ID="54a7a61a-9472-40ee-8a84-a011d04cbfa9";
export function canEdit(session:any){return session?.user?.id===OWNER_ID}
