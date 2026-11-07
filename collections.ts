import {pacificDate, pacificMidnight} from "./pacificTime.ts";
// Stable weekly slots: installation IDs never include a date or theme name.
export const COLLECTION_COUNTRIES:Record<string,string>={"3":"KR","2":"CN","1":"JP","5":"TW","6":"TH"};
export const THEMES=[
 {name:"Bring the Tissues",description:"Stories worth a few tears.",keywords:["tragedy","heartbreak","terminal illness"]},
 {name:"Love With a Twist",description:"Romance that keeps you guessing.",keywords:["love triangle","enemies to lovers","fake relationship"]},
 {name:"A Little Comfort",description:"Good company for a quiet night.",keywords:["friendship","slice of life"]},
 {name:"One More Episode",description:"Mysteries that keep you watching.",genre:"9648"},
 {name:"Another Time",description:"Step into stories from the past.",keywords:["historical","period drama"]},
 {name:"Under Suspicion",description:"Crime stories with something to hide.",genre:"80"},
];
const LOCALIZED_THEME_NAMES:Record<string,string[]>={
 "es-ES":["Prepara los pañuelos","Amor con un giro","Un poco de consuelo","Un episodio más","Otra época","Bajo sospecha"],
 "fr-FR":["Préparez les mouchoirs","Un amour plein de surprises","Un peu de réconfort","Encore un épisode","Une autre époque","Sous suspicion"],
 "de-DE":["Taschentücher bereit","Liebe mit einer Wendung","Ein wenig Geborgenheit","Nur noch eine Folge","Eine andere Zeit","Unter Verdacht"],
 "it-IT":["Prepara i fazzoletti","Amore a sorpresa","Un po' di conforto","Ancora un episodio","Un'altra epoca","Sotto sospetto"],
 "pt-BR":["Prepare os lenços","Amor com uma reviravolta","Um pouco de aconchego","Só mais um episódio","Outra época","Sob suspeita"],
 "nl-NL":["Houd de zakdoeken klaar","Liefde met een twist","Een beetje troost","Nog één aflevering","Een andere tijd","Onder verdenking"],
 "pl-PL":["Przygotuj chusteczki","Miłość z twistem","Odrobina ukojenia","Jeszcze jeden odcinek","Inne czasy","Pod podejrzeniem"],
 "tr-TR":["Mendilleri hazırlayın","Sürprizli aşk","Biraz huzur","Bir bölüm daha","Başka bir zaman","Şüphe altında"],
 "ru-RU":["Приготовьте платки","Любовь с неожиданным поворотом","Немного уюта","Ещё одна серия","Другая эпоха","Под подозрением"],
 "uk-UA":["Приготуйте хустинки","Кохання з несподіваним поворотом","Трохи затишку","Ще одна серія","Інша епоха","Під підозрою"],
 "ar-SA":["جهّزوا المناديل","حبّ مع مفاجأة","قليل من الراحة","حلقة أخرى","زمن آخر","تحت الشبهة"],
 "he-IL":["הכינו את הממחטות","אהבה עם טוויסט","קצת נחמה","עוד פרק אחד","זמן אחר","תחת חשד"],
 "hi-IN":["रूमाल तैयार रखें","एक नया मोड़ वाला प्यार","थोड़ा सुकून","एक एपिसोड और","एक और दौर","संदेह के घेरे में"],
 "ja-JP":["涙の準備を","ひとひねりある恋","ほっとするひととき","もう1話だけ","あの頃へ","疑惑の中で"],
 "ko-KR":["눈물 준비하세요","반전 있는 사랑","작은 위로","한 편만 더","그 시절 이야기","의심의 그림자"],
 "zh-CN":["备好纸巾","爱情有转折","一抹慰藉","再看一集","另一个时代","疑云之下"],
};
export function weekWindow(time=Date.now()){
 const {date:d}=pacificDate(time);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
 const start=d.getTime(),index=Math.floor((start-Date.UTC(2026,10,2))/604800000);
 return{week:d.toISOString().slice(0,10),nextRefresh:new Date(pacificMidnight(new Date(start+604800000))).toISOString(),themes:[0,1].map(i=>THEMES[((index*2+i)%THEMES.length+THEMES.length)%THEMES.length])};
}
export function weeklyCatalog(country:string,slot:number,language="en-US"){
 if(!COLLECTION_COUNTRIES[country]||![0,1].includes(slot))throw Error("Invalid collection");
 const names:Record<string,string>={"3":"South Korea","2":"China","1":"Japan","5":"Taiwan","6":"Thailand"};
 const theme=weekWindow().themes[slot];
 const themeIndex=THEMES.findIndex(item=>item.name===theme.name),localizedTheme=LOCALIZED_THEME_NAMES[language]?.[themeIndex]||theme.name;
 let localizedCountry=names[country];
 if(language!=="en-US")try{localizedCountry=new Intl.DisplayNames([language],{type:"region"}).of(COLLECTION_COUNTRIES[country])||localizedCountry}catch{}
 return{kind:"weekly",country,slot,url:"weekly:"+country+":"+slot,name:localizedTheme+" ("+localizedCountry+")",description:theme.description,profile:"YourDramaList",types:["series"],posters:[]};
}
export function posterUrl(path:unknown){return typeof path==="string"&&/^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(path)?"https://image.tmdb.org/t/p/w780"+path:null;}
export function normalizeTitle(value:string){return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,"");}
export function matchArtwork(item:any,results:any[],kind:string,country=""){
 const year=String(item.details||"").match(/\b(19|20)\d{2}\b/)?.[0];if(!year)return null;
 const matches=results.filter(r=>!r.adult&&posterUrl(r.poster_path)&&String(r.first_air_date||r.release_date||"").slice(0,4)===year&&[r.name,r.title,r.original_name,r.original_title].some(n=>n&&normalizeTitle(n)===normalizeTitle(item.name))&&(kind!=="tv"||(country?r.origin_country?.includes(COLLECTION_COUNTRIES[country]):r.origin_country?.some((c:string)=>["KR","JP","CN","TW","TH","HK"].includes(c)))));
 return matches.length===1?posterUrl(matches[0].poster_path):null;
}
