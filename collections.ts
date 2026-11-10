import {pacificDate, pacificMidnight} from "./pacificTime.ts";
// Stable weekly slots: installation IDs never include a date or theme name.
export const COLLECTION_COUNTRIES:Record<string,string>={"3":"KR","2":"CN","1":"JP","5":"TW","6":"TH"};
// The newest themes come first. Rotation runs through the whole pool, two themes a week, before any theme repeats.
export const THEMES=[
 {name:"Sweet Revenge",description:"Payback, served slowly.",keywords:["revenge"]},
 {name:"First Love",description:"The one you never forget.",keywords:["first love"]},
 {name:"Things That Go Bump",description:"Ghosts, spirits and the unexplained.",keywords:["supernatural","ghost"]},
 {name:"School Days",description:"Lockers, crushes and growing up.",keywords:["high school","school"]},
 {name:"Laugh Out Loud",description:"Comedies for a good mood.",genre:"35"},
 {name:"Across Time",description:"Stories that bend time.",keywords:["time travel"]},
 {name:"Found Family",description:"The family you choose.",keywords:["found family","friendship"]},
 {name:"Swords and Fists",description:"Martial arts and legends.",keywords:["martial arts","wuxia"]},
 {name:"Chasing a Killer",description:"Detectives on a dangerous trail.",keywords:["serial killer","detective"]},
 {name:"Coming of Age",description:"Finding out who you are.",keywords:["coming of age"]},
 {name:"Love at Work",description:"Romance between meetings.",keywords:["office romance","workplace romance","boss"]},
 {name:"Family Ties",description:"Stories about the people at home.",genre:"10751"},
 {name:"Doctor’s Orders",description:"Life and love in the hospital.",keywords:["hospital","doctor","medical drama"]},
 {name:"A Table for Two",description:"Stories best enjoyed hungry.",keywords:["food","cooking","chef"]},
 {name:"Order in the Court",description:"Lawyers, cases and verdicts.",keywords:["lawyer","courtroom","legal drama"]},
 {name:"Center Stage",description:"Idols, bands and the music business.",keywords:["idol","music"]},
 {name:"Game On",description:"Teams, rivals and the will to win.",keywords:["sports"]},
 {name:"Small-Town Life",description:"Slow days far from the city.",keywords:["small town","countryside"]},
 {name:"Another Life",description:"Second lives and fresh starts.",keywords:["reincarnation"]},
 {name:"Bring the Tissues",description:"Stories worth a few tears.",keywords:["tragedy","heartbreak","terminal illness"]},
 {name:"Love With a Twist",description:"Romance that keeps you guessing.",keywords:["love triangle","enemies to lovers","fake relationship"]},
 {name:"A Little Comfort",description:"Good company for a quiet night.",keywords:["friendship","slice of life"]},
 {name:"One More Episode",description:"Mysteries that keep you watching.",genre:"9648"},
 {name:"Another Time",description:"Step into stories from the past.",keywords:["historical","period drama"]},
 {name:"Under Suspicion",description:"Crime stories with something to hide.",genre:"80"},
];
const LOCALIZED_THEME_NAMES:Record<string,string[]>={
 "es-ES":["Dulce venganza","Primer amor","Cosas que asustan","Días de escuela","Para reír a carcajadas","A través del tiempo","La familia que eliges","Espadas y puños","Tras la pista de un asesino","Hacerse mayor","Amor en la oficina","Lazos de familia","Órdenes del médico","Mesa para dos","Orden en la sala","Bajo los focos","A jugar","Vida de pueblo","Otra vida","Prepara los pañuelos","Amor con un giro","Un poco de consuelo","Un episodio más","Otra época","Bajo sospecha"],
 "fr-FR":["Douce vengeance","Premier amour","Frissons surnaturels","Années lycée","Éclats de rire","À travers le temps","La famille qu'on choisit","Sabres et poings","Sur la piste d'un tueur","Grandir","L'amour au bureau","Liens familiaux","Ordonnance du médecin","Une table pour deux","Silence dans la salle","Sous les projecteurs","Que le match commence","La vie à la campagne","Une autre vie","Préparez les mouchoirs","Un amour plein de surprises","Un peu de réconfort","Encore un épisode","Une autre époque","Sous suspicion"],
 "de-DE":["Süße Rache","Erste Liebe","Unheimliche Geschichten","Schulzeit","Zum Lachen","Durch die Zeit","Wahlfamilie","Schwerter und Fäuste","Einem Mörder auf der Spur","Erwachsen werden","Liebe im Büro","Familienbande","Ärztlicher Rat","Ein Tisch für zwei","Ruhe im Gerichtssaal","Im Rampenlicht","Anpfiff","Leben auf dem Land","Ein anderes Leben","Taschentücher bereit","Liebe mit einer Wendung","Ein wenig Geborgenheit","Nur noch eine Folge","Eine andere Zeit","Unter Verdacht"],
 "it-IT":["Dolce vendetta","Primo amore","Storie da brivido","Giorni di scuola","Risate assicurate","Attraverso il tempo","La famiglia che scegli","Spade e pugni","Sulle tracce di un assassino","Diventare grandi","Amore in ufficio","Legami di famiglia","Ordini del medico","Un tavolo per due","Silenzio in aula","Sotto i riflettori","Si gioca","Vita di paese","Un'altra vita","Prepara i fazzoletti","Amore a sorpresa","Un po' di conforto","Ancora un episodio","Un'altra epoca","Sotto sospetto"],
 "pt-BR":["Doce vingança","Primeiro amor","Coisas assustadoras","Tempos de escola","Para rir alto","Através do tempo","A família que escolhemos","Espadas e punhos","No rastro de um assassino","Crescendo","Amor no escritório","Laços de família","Ordens médicas","Mesa para dois","Ordem no tribunal","Sob os holofotes","Bola em jogo","Vida no interior","Outra vida","Prepare os lenços","Amor com uma reviravolta","Um pouco de aconchego","Só mais um episódio","Outra época","Sob suspeita"],
 "nl-NL":["Zoete wraak","Eerste liefde","Griezelige verhalen","Schooltijd","Lachen geblazen","Door de tijd","Zelfgekozen familie","Zwaarden en vuisten","Op het spoor van een moordenaar","Volwassen worden","Liefde op het werk","Familiebanden","Doktersadvies","Een tafel voor twee","Stilte in de rechtszaal","In de spotlights","Aftrap","Leven op het platteland","Een ander leven","Houd de zakdoeken klaar","Liefde met een twist","Een beetje troost","Nog één aflevering","Een andere tijd","Onder verdenking"],
 "pl-PL":["Słodka zemsta","Pierwsza miłość","Nadprzyrodzone historie","Szkolne dni","Do łez ze śmiechu","Przez czas","Wybrana rodzina","Miecze i pięści","Na tropie mordercy","Dorastanie","Miłość w biurze","Więzy rodzinne","Zalecenia lekarza","Stolik dla dwojga","Proszę o spokój na sali","W świetle reflektorów","Gra się zaczyna","Życie na prowincji","Inne życie","Przygotuj chusteczki","Miłość z twistem","Odrobina ukojenia","Jeszcze jeden odcinek","Inne czasy","Pod podejrzeniem"],
 "tr-TR":["Tatlı intikam","İlk aşk","Doğaüstü hikâyeler","Okul günleri","Kahkaha garantili","Zamanın ötesinde","Seçilmiş aile","Kılıçlar ve yumruklar","Bir katilin izinde","Büyümek","İş yerinde aşk","Aile bağları","Doktor tavsiyesi","İki kişilik masa","Mahkemede sessizlik","Sahne ışıkları altında","Oyun başlasın","Kasaba hayatı","Başka bir hayat","Mendilleri hazırlayın","Sürprizli aşk","Biraz huzur","Bir bölüm daha","Başka bir zaman","Şüphe altında"],
 "ru-RU":["Сладкая месть","Первая любовь","Сверхъестественное","Школьные годы","Повод посмеяться","Сквозь время","Семья по выбору","Мечи и кулаки","По следу убийцы","Взросление","Любовь в офисе","Семейные узы","Предписание врача","Столик на двоих","Суд идёт","В свете софитов","Игра началась","Жизнь в провинции","Другая жизнь","Приготовьте платки","Любовь с неожиданным поворотом","Немного уюта","Ещё одна серия","Другая эпоха","Под подозрением"],
 "uk-UA":["Солодка помста","Перше кохання","Надприродне","Шкільні роки","Привід посміятися","Крізь час","Родина за вибором","Мечі та кулаки","Слідами вбивці","Дорослішання","Кохання в офісі","Родинні зв'язки","Порада лікаря","Столик на двох","Суд іде","У світлі софітів","Гра почалася","Життя в провінції","Інше життя","Приготуйте хустинки","Кохання з несподіваним поворотом","Трохи затишку","Ще одна серія","Інша епоха","Під підозрою"],
 "ar-SA":["انتقام حلو","الحب الأول","حكايات خارقة","أيام المدرسة","ضحك بلا توقف","عبر الزمن","عائلة نختارها","سيوف وقبضات","في أثر قاتل","سنوات النضوج","حب في المكتب","روابط عائلية","أوامر الطبيب","طاولة لشخصين","نظام في المحكمة","تحت الأضواء","لتبدأ اللعبة","حياة الريف","حياة أخرى","جهّزوا المناديل","حبّ مع مفاجأة","قليل من الراحة","حلقة أخرى","زمن آخر","تحت الشبهة"],
 "he-IL":["נקמה מתוקה","אהבה ראשונה","סיפורים על-טבעיים","ימי בית הספר","צחוק מתגלגל","מסע בזמן","משפחה שבוחרים","חרבות ואגרופים","בעקבות רוצח","להתבגר","אהבה במשרד","קשרי משפחה","הוראות רופא","שולחן לשניים","שקט באולם","באור הזרקורים","המשחק מתחיל","חיים בעיירה קטנה","חיים אחרים","הכינו את הממחטות","אהבה עם טוויסט","קצת נחמה","עוד פרק אחד","זמן אחר","תחת חשד"],
 "hi-IN":["मीठा बदला","पहला प्यार","अलौकिक कहानियाँ","स्कूल के दिन","खुलकर हँसिए","समय के पार","चुना हुआ परिवार","तलवारें और मुक्के","एक कातिल की तलाश","बड़े होते हुए","दफ़्तर वाला प्यार","पारिवारिक रिश्ते","डॉक्टर की सलाह","दो लोगों की मेज़","अदालत में ख़ामोशी","सुर्ख़ियों में","खेल शुरू","छोटे शहर की ज़िंदगी","एक और जीवन","रूमाल तैयार रखें","एक नया मोड़ वाला प्यार","थोड़ा सुकून","एक एपिसोड और","एक और दौर","संदेह के घेरे में"],
 "ja-JP":["甘い復讐","初恋","不思議な物語","学園の日々","思いきり笑おう","時を超えて","選んだ家族","剣と拳","殺人鬼を追え","大人になるまで","オフィスの恋","家族の絆","ドクターの処方箋","ふたりの食卓","法廷へようこそ","スポットライトの下で","試合開始","田舎暮らし","もうひとつの人生","涙の準備を","ひとひねりある恋","ほっとするひととき","もう1話だけ","あの頃へ","疑惑の中で"],
 "ko-KR":["달콤한 복수","첫사랑","기묘한 이야기","학창 시절","마음껏 웃어요","시간을 넘어","우리가 고른 가족","칼과 주먹","살인자를 쫓아서","어른이 되는 시간","사내 연애","가족의 끈","의사의 처방","둘만의 식탁","법정의 시간","무대 위의 별","경기 시작","시골 생활","또 다른 삶","눈물 준비하세요","반전 있는 사랑","작은 위로","한 편만 더","그 시절 이야기","의심의 그림자"],
 "zh-CN":["甜蜜复仇","初恋","灵异故事","校园时光","开怀大笑","穿越时空","选择的家人","刀剑与拳脚","追踪杀手","成长时光","职场恋爱","家庭羁绊","医生的嘱咐","二人餐桌","法庭肃静","聚光灯下","比赛开始","小镇生活","另一种人生","备好纸巾","爱情有转折","一抹慰藉","再看一集","另一个时代","疑云之下"],
};
export function weekWindow(time=Date.now()){
 const {date:d}=pacificDate(time);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
 const start=d.getTime(),index=Math.floor((start-Date.UTC(2026,10,2))/604800000);
 return{week:d.toISOString().slice(0,10),index,nextRefresh:new Date(pacificMidnight(new Date(start+604800000))).toISOString(),themes:themesForWeek(index)};
}
// Weeks before Nov 16, 2026 keep the original six-theme rotation, so installed rows never change mid-week.
const POOL_START=2,ORIGINAL=THEMES.slice(-6);
export function themesForWeek(index:number){
 const wrap=(n:number,size:number)=>((n%size)+size)%size;
 if(index<POOL_START)return [0,1].map(i=>ORIGINAL[wrap(index*2+i,ORIGINAL.length)]);
 return [0,1].map(i=>THEMES[wrap((index-POOL_START)*2+i,THEMES.length)]);
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
