import {weeklyCatalog} from "./collections.ts";
import {exploreCatalog} from "./explore.ts";
const LABELS:Record<string,{watchlists:string[];filmography:string;all:string}>={
 "es-ES":{watchlists:["Viendo actualmente","Completados","En pausa","Abandonados","Plan para ver","Indecisos","No me interesan"],filmography:"Filmografía",all:"Dramas y películas"},
 "fr-FR":{watchlists:["En cours","Terminés","En pause","Abandonnés","À voir","Indécis","Pas intéressés"],filmography:"Filmographie",all:"Dramas et films"},
 "de-DE":{watchlists:["Schaue ich gerade","Abgeschlossen","Pausiert","Abgebrochen","Merkliste","Unentschieden","Nicht interessiert"],filmography:"Filmografie",all:"Dramen und Filme"},
 "it-IT":{watchlists:["In visione","Completati","In pausa","Abbandonati","Da vedere","Indecisi","Non interessati"],filmography:"Filmografia",all:"Drammi e film"},
 "pt-BR":{watchlists:["Assistindo","Concluídos","Em espera","Abandonados","Quero assistir","Indecisos","Não tenho interesse"],filmography:"Filmografia",all:"Dramas e filmes"},
 "nl-NL":{watchlists:["Aan het kijken","Voltooid","On hold","Gestopt","Wil ik kijken","Onbeslist","Geen interesse"],filmography:"Filmografie",all:"Drama's en films"},
 "pl-PL":{watchlists:["W trakcie","Ukończone","Wstrzymane","Porzucone","Do obejrzenia","Niezdecydowane","Brak zainteresowania"],filmography:"Filmografia",all:"Dramaty i filmy"},
 "tr-TR":{watchlists:["İzliyorum","Tamamlandı","Beklemede","Bırakıldı","İzlenecek","Kararsızım","İlgilenmiyorum"],filmography:"Filmografi",all:"Diziler ve filmler"},
 "ru-RU":{watchlists:["Смотрю","Просмотрено","Отложено","Брошено","В планах","Не определился","Не интересно"],filmography:"Фильмография",all:"Дорамы и фильмы"},
 "uk-UA":{watchlists:["Дивлюся","Переглянуто","Відкладено","Кинуто","У планах","Не визначився","Не цікаво"],filmography:"Фільмографія",all:"Дорами та фільми"},
 "ar-SA":{watchlists:["أشاهد الآن","مكتمل","مؤجل","متروك","للمشاهدة لاحقًا","لم أقرر","غير مهتم"],filmography:"الأعمال الفنية",all:"المسلسلات والأفلام"},
 "he-IL":{watchlists:["בצפייה","הושלמו","בהמתנה","ננטשו","לצפייה","מתלבט/ת","לא מעוניין/ת"],filmography:"פילמוגרפיה",all:"דרמות וסרטים"},
 "hi-IN":{watchlists:["अभी देख रहे हैं","पूरी की","रोक रखी","छोड़ दी","देखने की सूची","अनिश्चित","रुचि नहीं"],filmography:"फिल्मोग्राफी",all:"ड्रामा और फ़िल्में"},
 "ja-JP":{watchlists:["視聴中","視聴済み","保留中","中断","視聴予定","未定","興味なし"],filmography:"出演作品",all:"ドラマ・映画"},
 "ko-KR":{watchlists:["시청 중","완료","보류 중","중단","시청 예정","미정","관심 없음"],filmography:"작품 목록",all:"드라마 및 영화"},
 "zh-CN":{watchlists:["正在观看","已完成","暂缓","已弃看","想看","未决定","不感兴趣"],filmography:"影视作品",all:"剧集与电影"}
};
const STATUS_INDEX:Record<string,number>={watching:0,completed:1,on_hold:2,dropped:3,plan_to_watch:4,undecided:5,not_interested:6};
const CATEGORY_INDEX:Record<string,number>={"top-shows":0,"popular-shows":1,"newest-shows":2,"upcoming-shows":3,"airing-shows":4,"variety-shows":5,"top-movies":6,"popular-movies":7,"newest-movies":8,"upcoming-movies":9};
const CATEGORY_LABELS:Record<string,string[]>={
 "es-ES":["Mejores series","Series más populares","Series más recientes","Próximas series","Mejores series en emisión","Programas de variedades","Mejores películas","Películas más populares","Películas más recientes","Próximas películas"],
 "fr-FR":["Meilleures séries","Séries les plus populaires","Séries les plus récentes","Séries à venir","Meilleures séries en cours","Émissions de variétés","Meilleurs films","Films les plus populaires","Films les plus récents","Films à venir"],
 "de-DE":["Top-Serien","Beliebteste Serien","Neueste Serien","Demnächst erscheinende Serien","Top laufende Serien","Varietéshows","Top-Filme","Beliebteste Filme","Neueste Filme","Demnächst erscheinende Filme"],
 "it-IT":["Serie migliori","Serie più popolari","Serie più recenti","Prossime serie","Migliori serie in onda","Varietà","Film migliori","Film più popolari","Film più recenti","Prossimi film"],
 "pt-BR":["Melhores séries","Séries mais populares","Séries mais recentes","Próximas séries","Séries em exibição mais populares","Programas de variedades","Melhores filmes","Filmes mais populares","Filmes mais recentes","Próximos filmes"],
 "nl-NL":["Beste series","Populairste series","Nieuwste series","Binnenkort te zien","Beste lopende series","Varietyshows","Beste films","Populairste films","Nieuwste films","Binnenkort te zien"],
 "pl-PL":["Najlepsze seriale","Najpopularniejsze seriale","Najnowsze seriale","Nadchodzące seriale","Najlepsze emitowane seriale","Programy rozrywkowe","Najlepsze filmy","Najpopularniejsze filmy","Najnowsze filmy","Nadchodzące filmy"],
 "tr-TR":["En iyi diziler","En popüler diziler","En yeni diziler","Yakında yayınlanacak diziler","En iyi devam eden diziler","Varyete programları","En iyi filmler","En popüler filmler","En yeni filmler","Yakında yayınlanacak filmler"],
 "ru-RU":["Лучшие сериалы","Популярные сериалы","Новые сериалы","Скоро выйдут: сериалы","Лучшие сериалы в эфире","Развлекательные шоу","Лучшие фильмы","Популярные фильмы","Новые фильмы","Скоро выйдут: фильмы"],
 "uk-UA":["Найкращі серіали","Найпопулярніші серіали","Найновіші серіали","Незабаром: серіали","Найкращі серіали в ефірі","Розважальні шоу","Найкращі фільми","Найпопулярніші фільми","Найновіші фільми","Незабаром: фільми"],
 "ar-SA":["أفضل المسلسلات","المسلسلات الأكثر شعبية","أحدث المسلسلات","مسلسلات قادمة","أفضل المسلسلات المعروضة","برامج المنوعات","أفضل الأفلام","الأفلام الأكثر شعبية","أحدث الأفلام","أفلام قادمة"],
 "he-IL":["הסדרות המובילות","הסדרות הפופולריות ביותר","הסדרות החדשות ביותר","סדרות בקרוב","הסדרות המשודרות המובילות","תוכניות בידור","הסרטים המובילים","הסרטים הפופולריים ביותר","הסרטים החדשים ביותר","סרטים בקרוב"],
 "hi-IN":["शीर्ष सीरीज़","सबसे लोकप्रिय सीरीज़","नई सीरीज़","आने वाली सीरीज़","शीर्ष प्रसारित सीरीज़","वैरायटी शो","शीर्ष फ़िल्में","सबसे लोकप्रिय फ़िल्में","नई फ़िल्में","आने वाली फ़िल्में"],
 "ja-JP":["人気ドラマ","人気のドラマ","最新ドラマ","放送予定ドラマ","放送中の人気ドラマ","バラエティ番組","人気映画","人気の映画","最新映画","公開予定映画"],
 "ko-KR":["최고의 드라마","인기 드라마","최신 드라마","방영 예정 드라마","현재 방영 중인 인기작","예능 프로그램","최고의 영화","인기 영화","최신 영화","개봉 예정 영화"],
 "zh-CN":["热门剧集","最受欢迎的剧集","最新剧集","即将播出的剧集","热门在播剧集","综艺节目","热门电影","最受欢迎的电影","最新电影","即将上映的电影"]
};
const COUNTRIES:Record<string,string>={"1":"JP","2":"CN","3":"KR","5":"TW","6":"TH"};
export function localizedCatalogName(entry:any,language="en-US",personNames:Record<string,string>={}){
 const copy=LABELS[language];
 const username=()=>String(entry.name||"").match(/^(.+?)[’']s (?:Currently Watching|Completed|On Hold|Dropped|Plan to Watch|Undecided|Not Interested|All Dramas & Films)$/i)?.[1]||entry.watchlist||"";
 if(entry.weekly)return weeklyCatalog(entry.weekly.country,entry.weekly.slot,language).name;
 if(entry.explore){const c=entry.explore,index=CATEGORY_INDEX[c.category],base=exploreCatalog(c.category,c.country);if(!copy||index===undefined)return base.name;const country=c.country?new Intl.DisplayNames([language],{type:"region"}).of(COUNTRIES[c.country])||"":"";return "MyDramaList’s "+CATEGORY_LABELS[language][index]+(country?" ("+country+")":"");}
 if(entry.watchlistStatus){const status=WATCHLIST_CARDS_LABEL[entry.watchlistStatus];const translated=copy?.watchlists[STATUS_INDEX[entry.watchlistStatus]]||status;return username()+"’s "+translated;}
 if(entry.watchlist&&entry.watchlistAll)return username()+"’s "+(copy?.all||"All Dramas & Films");
 if(entry.person&&entry.mode){const personName=String(entry.name||"").replace(/[’']s Filmography$/i,"");return (personNames[entry.person]||personName)+"’s "+(copy?.filmography||"Filmography");}
 return entry.name;
}
const WATCHLIST_CARDS_LABEL:Record<string,string>={watching:"Currently Watching",completed:"Completed",on_hold:"On Hold",dropped:"Dropped",plan_to_watch:"Plan to Watch",undecided:"Undecided",not_interested:"Not Interested"};
