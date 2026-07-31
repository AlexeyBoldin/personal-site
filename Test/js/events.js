/*=========================================
  Market Empire — events.js
  Система новостей и событий (гибридная модель)

  Порядок работы (см. game.js Game.nextDay):
  1. Проверить запланированные события календаря
  2. Обработать цепочки событий, наступающие сегодня
  3. Сгенерировать случайные события
  4. Учесть действия игрока (объём сделок)
  5. Просуммировать влияние на спрос/предложение -> bias цены
  6. market.js использует bias при расчёте цены дня
  7. Сформировать новости по сегодняшним событиям (с достоверностью)
=========================================*/

// Каждое событие: id, товар (или null для макро), влияние на добычу и/или потребление
// (доля от базового объёма) и на сколько дней оно длится, категория происхождения и,
// опционально, следующее звено цепочки. Именно через добычу/потребление события теперь
// двигают цену — реалистично и с задержкой, а не мгновенным скачком.
const EVENT_CATALOG = {
    drought:            { good:"grain",   supplyImpact:-0.04, duration:4,  chain:{ next:"poor_harvest", delay:4 } },
    poor_harvest:       { good:"grain",   supplyImpact:-0.14, duration:20, chain:{ next:"grain_deficit", delay:3 } },
    grain_deficit:      { good:"grain",   demandImpact: 0.12, duration:10 },
    good_harvest:       { good:"grain",   supplyImpact: 0.16, duration:15 },

    frost_brazil:       { good:"coffee",  supplyImpact:-0.06, duration:6,  chain:{ next:"coffee_shortage", delay:5 } },
    coffee_shortage:    { good:"coffee",  supplyImpact:-0.18, duration:18 },
    coffee_bumper_crop: { good:"coffee",  supplyImpact: 0.15, duration:15 },

    cocoa_disease:      { good:"cocoa",   supplyImpact:-0.05, duration:6,  chain:{ next:"cocoa_shortage", delay:4 } },
    cocoa_shortage:     { good:"cocoa",   supplyImpact:-0.16, duration:16 },

    opec_cut:           { good:"oil",     supplyImpact:-0.10, duration:15, planned:true },
    oil_oversupply:     { good:"oil",     supplyImpact: 0.09, duration:12 },

    lithium_boom:       { good:"lithium", demandImpact: 0.15, duration:12 },
    lithium_deposit:    { good:"lithium", supplyImpact: 0.03, duration:5,  chain:{ next:"lithium_oversupply", delay:6 } },
    lithium_oversupply: { good:"lithium", supplyImpact: 0.22, duration:25 },

    steel_boom:         { good:"steel",   demandImpact: 0.12, duration:15 },
    steel_glut:         { good:"steel",   supplyImpact: 0.15, duration:15 },

    gold_safehaven:     { good:"gold",    demandImpact: 0.12, duration:10 },
    silver_industrial:  { good:"silver",  demandImpact: 0.10, duration:12 },

    power_heatwave:     { good:"power",   demandImpact: 0.18, duration:8 },
    wood_construction:  { good:"wood",    demandImpact: 0.12, duration:15 },

    coal_accident:      { good:"coal",    supplyImpact:-0.08, duration:5,  chain:{ next:"coal_shortage", delay:3 } },
    coal_shortage:      { good:"coal",    supplyImpact:-0.16, duration:12 },

    central_bank:       { good:null,      duration:1, planned:true, macro:"rate" },

    // ---- Редкие "чёрные лебеди": срабатывают нечасто, но бьют очень сильно ----
    war_embargo:        { good:"oil",     supplyImpact:-0.30, duration:20, rare:true, chain:{ next:"embargo_easing", delay:8 } },
    embargo_easing:      { good:"oil",     supplyImpact: 0.15, duration:15 },

    major_lithium_find: { good:"lithium", supplyImpact: 0.35, duration:30, rare:true, chain:{ next:"lithium_glut_fade", delay:6 } },
    lithium_glut_fade:  { good:"lithium", supplyImpact:-0.10, duration:20 },

    gold_exchange_scandal:{ good:"gold",  demandImpact: 0.25, duration:12, rare:true },

    market_crash:        { good:null,     demandImpact:-0.20, duration:8,  rare:true, macro:"crash", chain:{ next:"market_recovery", delay:5 } },
    market_recovery:     { good:null,     demandImpact: 0.10, duration:10, macro:"crash_recovery" }
};

// Новостные шаблоны по товару и достоверности источника.
// fake — сознательно НЕ совпадает по смыслу с реальным bias (это дезинформация).
const EVENT_NEWS = {
    drought:            { good:"grain",  official:["Метеослужба фиксирует засуху","В ключевых зерновых регионах фиксируется дефицит осадков."] },
    poor_harvest:       { good:"grain",  analytical:["Урожай зерна ниже прогноза","Аналитики подтверждают: сбор зерна в этом сезоне заметно отстаёт от нормы."] },
    grain_deficit:      { good:"grain",  official:["Дефицit зерна на рынке","Запасы зерна опустились ниже критического уровня, трейдеры фиксируют рост цен."] },
    good_harvest:       { good:"grain",  official:["Рекордный урожай зерна","Благоприятная погода обеспечила высокий сбор в этом сезоне."] },

    frost_brazil:       { good:"coffee", official:["Заморозки в Бразилии","Крупнейший экспортёр кофе сообщает о повреждении плантаций."] },
    coffee_shortage:    { good:"coffee", analytical:["Дефицит кофе подтверждён","Поставки кофе сократились сильнее, чем ожидалось после заморозков."] },
    coffee_bumper_crop: { good:"coffee", official:["Рекордный урожай кофе в этом сезоне","Экспортёры нарастили поставки на мировой рынок."] },

    cocoa_disease:      { good:"cocoa",  official:["Болезнь какао-деревьев в Африке","Фитосанитарная служба фиксирует поражение плантаций."] },
    cocoa_shortage:     { good:"cocoa",  analytical:["Поставки какао сокращаются","Аналитики подтверждают снижение экспорта из ключевых регионов."] },

    opec_cut:           { good:"oil",    official:["ОПЕК+ снижает квоты добычи","Картель объявил официальное решение о сокращении добычи нефти."] },
    oil_oversupply:     { good:"oil",    official:["Запасы нефти выше нормы","Отчёт по запасам показал избыток предложения на рынке."] },

    lithium_boom:       { good:"lithium",official:["Спрос на литий резко вырос","Производители аккумуляторов сообщают о рекордных закупках."] },
    lithium_deposit:    { good:"lithium",official:["Открыто новое месторождение лития","Геологи подтвердили крупные запасы в новом регионе."] },
    lithium_oversupply: { good:"lithium",analytical:["Новое месторождение лития вышло на рынок","Аналитики фиксируют рост предложения и давление на цену."] },

    steel_boom:         { good:"steel",  official:["Стройотрасль наращивает закупки стали","Крупные инфраструктурные проекты подстёгивают спрос."] },
    steel_glut:         { good:"steel",  official:["Избыток стали на рынке","Заводы увеличили выпуск быстрее, чем растёт спрос."] },

    gold_safehaven:     { good:"gold",   analytical:["Спрос на золото как на защитный актив вырос","Нестабильность на финансовых рынках подталкивает инвесторов к золоту."] },
    silver_industrial:  { good:"silver", official:["Промышленный спрос на серебро растёт","Электроника и солнечная энергетика наращивают закупки."] },

    power_heatwave:     { good:"power",  official:["Аномальная жара увеличила потребление энергии","Рост нагрузки на сети привёл к скачку цен."] },
    wood_construction:  { good:"wood",   official:["Строительный бум поднял цены на древесину","Жилищное строительство бьёт рекорды."] },

    coal_accident:      { good:"coal",   official:["Авария на угольной шахте","Добыча приостановлена на нескольких разрезах."] },
    coal_shortage:      { good:"coal",   analytical:["Дефицит угля подтверждён","Энергокомпании фиксируют нехватку поставок топлива."] },

    central_bank:       { good:null,     official:["Центробанк принял решение по ключевой ставке","Регулятор объявил итоги очередного заседания."] },

    war_embargo:        { good:"oil",    official:["Введено нефтяное эмбарго","Крупный поставщик попал под международные санкции — рынок в шоке."] },
    embargo_easing:      { good:"oil",    official:["Эмбарго частично смягчено","Часть ограничений на поставки нефти снята, цены немного скорректировались."] },

    major_lithium_find: { good:"lithium",official:["Найдено гигантское месторождение лития","Геологи оценивают запасы как одни из крупнейших в истории отрасли."] },
    lithium_glut_fade:  { good:"lithium",analytical:["Рынок лития частично стабилизировался","Ажиотаж вокруг находки постепенно спадает."] },

    gold_exchange_scandal:{ good:"gold", official:["Скандал на золотой бирже","Расследование манипуляций с поставками спровоцировало паническую скупку золота."] },

    market_crash:        { good:null,    official:["Обвал на мировых рынках","Паника охватила биржи — резкое падение затронуло практически все активы."] },
    market_recovery:     { good:null,    analytical:["Рынки частично отыгрывают падение","После шока трейдеры начали выкупать подешевевшие активы."] }
};

// --------------------------
// Состояние системы событий
// --------------------------

function eventsState(state){
    if(!state.scheduledEvents) state.scheduledEvents = [];
    if(!state.tradeVolumeToday) state.tradeVolumeToday = {};
    if(state.plannedCalendarInit===undefined){
        // расписание плановых событий на будущее — задаётся один раз при старте игры
        state.scheduledEvents.push({ day:20,  id:"central_bank" });
        state.scheduledEvents.push({ day:50,  id:"central_bank" });
        state.scheduledEvents.push({ day:80,  id:"central_bank" });
        state.scheduledEvents.push({ day:35,  id:"opec_cut" });
        state.plannedCalendarInit = true;
    }
    return state;
}

// --------------------------
// Достоверность источника
// --------------------------

const CREDIBILITY_LABELS = {
    official:   { label:"Официально",   color:"#22c55e" },
    analytical: { label:"Аналитика",    color:"#4f8cff" },
    rumor:      { label:"Слухи",        color:"#f5b942" },
    fake:       { label:"Фейк",         color:"#ef4444" }
};

// Выбирает достоверность для события: плановые события всегда официальны,
// остальные — по вероятностной модели (в основном аналитика, иногда слухи, редко фейк)
function rollCredibility(rnd, isPlanned){
    if(isPlanned) return "official";
    const r = rnd();
    if(r<0.55) return "analytical";
    if(r<0.8) return "official";
    if(r<0.93) return "rumor";
    return "fake";
}

// --------------------------
// Основной цикл на день
// --------------------------

function processDailyEvents(state){
    eventsState(state);
    const rnd = seedRandom(state.seed + state.day*71 + 3);
    const todaysFired = []; // { eventId, good, supplyImpact, demandImpact, credibility }

    function fire(eventId, isPlanned){
        const def = EVENT_CATALOG[eventId];
        if(!def) return;
        const credibility = rollCredibility(rnd, isPlanned || def.planned);

        if(def.good){
            if(def.supplyImpact) addEconomyEffect(state, def.good, "supply", def.supplyImpact, def.duration);
            if(def.demandImpact) addEconomyEffect(state, def.good, "demand", def.demandImpact, def.duration);
        }
        if(def.macro==="crash" || def.macro==="crash_recovery"){
            GOODS.forEach(g=>{ if(def.demandImpact) addEconomyEffect(state, g.id, "demand", def.demandImpact, def.duration); });
        }
        if(def.macro==="rate"){
            state.inflation += (rnd()-0.5)*0.4;
            state.inflation = Math.max(1.5, Math.min(9, state.inflation));
        }

        todaysFired.push({ eventId, good:def.good, supplyImpact:def.supplyImpact||0, demandImpact:def.demandImpact||0, credibility });

        if(def.chain){
            state.scheduledEvents.push({ day: state.day + def.chain.delay, id: def.chain.next });
        }
    }

    // 1-2. Плановые и цепочные события, наступающие сегодня
    const due = state.scheduledEvents.filter(e=>e.day===state.day);
    state.scheduledEvents = state.scheduledEvents.filter(e=>e.day!==state.day);
    due.forEach(e=> fire(e.id, true));

    // 3. Случайные новые события (~4.5% шанс в день на каждый архетип)
    const RANDOM_STARTERS = ["drought","good_harvest","frost_brazil","coffee_bumper_crop","cocoa_disease",
                              "oil_oversupply","lithium_boom","lithium_deposit","steel_boom","steel_glut",
                              "gold_safehaven","silver_industrial","power_heatwave","wood_construction","coal_accident"];
    RANDOM_STARTERS.forEach(id=>{
        if(rnd() < 0.045) fire(id, false);
    });

    // 3б. Редкие "чёрные лебеди" — намного реже, но с сильным эффектом
    const RARE_STARTERS = ["war_embargo","major_lithium_find","gold_exchange_scandal","market_crash"];
    RARE_STARTERS.forEach(id=>{
        if(rnd() < 0.006) fire(id, false); // ~0.6% в день на архетип — примерно раз в 1.5-2 месяца игрового времени
    });

    // 4. Последствия действий игрока: заметный объём сделок за день сам становится
    // частью спроса/предложения на сегодня (а не искусственной подгонкой цены)
    Object.keys(state.tradeVolumeToday||{}).forEach(goodId=>{
        const vol = state.tradeVolumeToday[goodId];
        if(Math.abs(vol) >= 6){
            const impact = Math.sign(vol) * Math.min(0.02, Math.abs(vol)*0.0025);
            if(vol>0) addEconomyEffect(state, goodId, "demand", impact, 1); // крупная скупка -> спрос вверх
            else addEconomyEffect(state, goodId, "supply", Math.abs(impact), 1); // крупный сброс -> предложение вверх
            todaysFired.push({ eventId:"player_impact", good:goodId, supplyImpact:0, demandImpact:0, credibility:"analytical", playerCaused:true, direction:Math.sign(vol) });
        }
    });
    state.tradeVolumeToday = {};

    return todaysFired;
}

// --------------------------
// Генерация новостей из сработавших событий
// --------------------------

function newsFromEvents(state, firedEvents){
    const rnd = seedRandom(state.seed + state.day*131 + 17);
    const items = [];

    firedEvents.forEach(f=>{
        if(f.playerCaused){
            const goodName = findGood(f.good).name;
            items.push({
                icon:"📊",
                title:`Крупный трейдер заметно повлиял на рынок`,
                body:`Нетипично большой объём ${f.direction>0?"покупок":"продаж"} товара «${goodName}» за один день отразился на цене.`,
                day: state.day,
                credibility:"analytical"
            });
            return;
        }

        const tpl = EVENT_NEWS[f.eventId];
        if(!tpl) return;
        const goodMeta = tpl.good ? findGood(tpl.good) : null;
        const pool = tpl[f.credibility] || tpl.official || tpl.analytical;
        if(!pool) return;

        let title = pool[0], body = pool[1];
        const isMajor = Math.abs(f.supplyImpact||0) >= 0.18 || Math.abs(f.demandImpact||0) >= 0.18;

        if(f.credibility==="rumor"){
            title = "Слухи: " + title.charAt(0).toLowerCase()+title.slice(1);
            body = "По неподтверждённым данным, " + body.charAt(0).toLowerCase()+body.slice(1) + " Официальных подтверждений пока нет.";
        }
        if(f.credibility==="fake"){
            // фейк сознательно искажает направление, чтобы игрок не доверял вслепую
            title = "⚠ " + title;
            body = "Источник в соцсетях утверждает обратное общепринятому мнению о рынке — достоверность под вопросом.";
        }

        items.push({
            icon: isMajor ? "🚨" : (goodMeta ? goodMeta.icon : "🏛️"),
            title, body,
            day: state.day,
            credibility: f.credibility,
            major: isMajor
        });
    });

    if(items.length===0){
        items.push({ icon:"🌍", title:"На рынках без существенных изменений", body:"Торговый день прошёл спокойно, значимых новостей не поступало.", day: state.day, credibility:"analytical" });
    }

    state.newsLog = items.concat(state.newsLog).slice(0,200);
}
