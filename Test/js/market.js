/*=========================================
  Market Empire — market.js
  Товары, цены, биржа, покупка/продажа
=========================================*/

// Каталог товаров (статичные данные, id — ключ в state.portfolio / state.prices)
// Иконки-слитки для золота и серебра (вместо медалей) — простые "изометрические" SVG, без градиентов/id, чтобы не было конфликтов при повторном использовании на странице
const GOLD_BAR_ICON = `<svg viewBox="0 0 32 20" style="width:1.3em;height:0.85em;vertical-align:-0.12em" xmlns="http://www.w3.org/2000/svg"><polygon points="3,14 9,4 29,4 23,14" fill="#e8b923"/><polygon points="3,14 23,14 23,17 3,17" fill="#a97a0d"/><polygon points="23,14 29,4 29,7 23,17" fill="#c99612"/></svg>`;
const SILVER_BAR_ICON = `<svg viewBox="0 0 32 20" style="width:1.3em;height:0.85em;vertical-align:-0.12em" xmlns="http://www.w3.org/2000/svg"><polygon points="3,14 9,4 29,4 23,14" fill="#d9d9d9"/><polygon points="3,14 23,14 23,17 3,17" fill="#87878a"/><polygon points="23,14 29,4 29,7 23,17" fill="#aeaeb0"/></svg>`;

const GOODS = [
    { id:"oil",    icon:"🛢",  name:"Нефть",         unit:"Баррель",   base:5000  },
    { id:"gold",   icon:GOLD_BAR_ICON,   name:"Золото",  unit:"1 кг",      base:8700  },
    { id:"silver", icon:SILVER_BAR_ICON, name:"Серебро", unit:"1 кг",      base:950   },
    { id:"grain",  icon:"🌾",  name:"Зерно",         unit:"1 тонна",   base:1250  },
    { id:"coffee", icon:"☕",  name:"Кофе",          unit:"1 тонна",   base:3200  },
    { id:"cocoa",  icon:"🍫",  name:"Какао",         unit:"1 тонна",   base:2800  },
    { id:"lithium",icon:"🔋",  name:"Литий",         unit:"1 тонна",   base:15500 },
    { id:"steel",  icon:"🔩",  name:"Сталь",         unit:"1 тонна",   base:620   },
    { id:"wood",   icon:"🪵",  name:"Древесина",     unit:"1 м³",      base:410   },
    { id:"power",  icon:"⚡",  name:"Электроэнергия",unit:"1 МВт·ч",   base:95    },
    { id:"coal",   icon:"🪨",  name:"Уголь",         unit:"1 тонна",   base:480   }
];

// Параметры "живой экономики" каждого товара: сколько добывается/потребляется в день (в условных
// единицах — не привязаны к реальным мировым объёмам, только друг к другу), базовый запас в днях
// потребления, сезонность (если есть) и эластичность цены к уровню запасов.
const GOOD_ECON_PARAMS = {
    oil:     { production:10000, consumption:9950,  stockDays:30, elasticity:0.70, seasonal:null },
    gold:    { production:500,   consumption:495,   stockDays:40, elasticity:0.90, seasonal:null },
    silver:  { production:1200,  consumption:1180,  stockDays:35, elasticity:0.80, seasonal:null },
    grain:   { production:8000,  consumption:7900,  stockDays:25, elasticity:0.60, seasonal:{amplitude:0.35, period:90,  phase:0,  appliesTo:"production"} },
    coffee:  { production:3000,  consumption:2950,  stockDays:30, elasticity:0.65, seasonal:{amplitude:0.30, period:120, phase:20, appliesTo:"production"} },
    cocoa:   { production:2000,  consumption:1970,  stockDays:28, elasticity:0.65, seasonal:{amplitude:0.28, period:110, phase:40, appliesTo:"production"} },
    lithium: { production:800,   consumption:820,   stockDays:45, elasticity:0.90, seasonal:null },
    steel:   { production:15000, consumption:14800, stockDays:20, elasticity:0.50, seasonal:null },
    wood:    { production:6000,  consumption:5900,  stockDays:22, elasticity:0.55, seasonal:{amplitude:0.20, period:180, phase:60, appliesTo:"consumption"} },
    power:   { production:20000, consumption:19800, stockDays:10, elasticity:0.60, seasonal:{amplitude:0.25, period:180, phase:0,  appliesTo:"consumption"} },
    coal:    { production:9000,  consumption:8850,  stockDays:25, elasticity:0.55, seasonal:{amplitude:0.22, period:180, phase:10, appliesTo:"consumption"} }
};

function findGood(id){ return GOODS.find(g=>g.id===id); }

// --------------------------
// Генератор случайных чисел
// --------------------------

function seedRandom(seed){
    let s = seed % 2147483647;
    if(s<=0) s += 2147483646;
    // "прогреваем" генератор — первые несколько значений линейного конгруэнтного
    // генератора сильно коррелируют с самим seed, пока не пройдёт несколько итераций.
    // Это не заметно там, где из одного seed берётся много чисел подряд (история цен),
    // но даёт систематический перекос там, где используется только первое-второе значение
    // (ежедневные броски событий и сообщений) — поэтому прогреваем всегда, на всякий случай.
    for(let i=0;i<10;i++) s = (s*16807) % 2147483647;
    return function(){
        s = (s*16807) % 2147483647;
        return (s-1)/2147483646;
    };
}

// --------------------------
// Живая экономика: добыча, потребление, запасы, баланс -> цена
// --------------------------

function initGoodEconomy(state, goodId){
    if(!state.goodsEconomy) state.goodsEconomy = {};
    if(!state.goodsEconomy[goodId]){
        const p = GOOD_ECON_PARAMS[goodId];
        state.goodsEconomy[goodId] = {
            stockpile: p.consumption * p.stockDays, // стартуем с "здорового" запаса
            demandMod: 1,                            // скрытый мировой спрос, медленно блуждает
            supplyEffects: [],                       // активные эффекты на добычу (от событий/игрока)
            demandEffects: []                        // активные эффекты на потребление
        };
    }
    return state.goodsEconomy[goodId];
}

function seasonalFactor(day, s){
    if(!s) return 1;
    return 1 + s.amplitude*Math.sin(2*Math.PI*(day+s.phase)/s.period);
}

function sumEffects(effects){
    return effects.reduce((sum,e)=>sum+e.impact, 0);
}

function tickEffects(effects){
    return effects.map(e=>({ impact:e.impact, daysLeft:e.daysLeft-1 })).filter(e=>e.daysLeft>0);
}

// Добавляет временный эффект на добычу/потребление конкретного товара
// (используется системой событий и последствиями действий игрока)
function addEconomyEffect(state, goodId, kind, impact, duration){
    const econ = initGoodEconomy(state, goodId);
    const list = kind==="supply" ? econ.supplyEffects : econ.demandEffects;
    list.push({ impact, daysLeft: Math.max(1,duration) });
}

// Считает цену на один следующий день на основе баланса добычи/потребления
function simulateNextDay(state, goodId, generatingDay, rnd){
    const params = GOOD_ECON_PARAMS[goodId];
    const good = findGood(goodId);
    const econ = initGoodEconomy(state, goodId);
    const normStock = params.consumption * params.stockDays;

    const seasonalProd = params.seasonal && params.seasonal.appliesTo==="production" ? seasonalFactor(generatingDay, params.seasonal) : 1;
    const seasonalCons = params.seasonal && params.seasonal.appliesTo==="consumption" ? seasonalFactor(generatingDay, params.seasonal) : 1;

    const supplyEffectSum = sumEffects(econ.supplyEffects);
    const demandEffectSum = sumEffects(econ.demandEffects);

    const noiseProd = (rnd()-0.5)*0.02;
    const noiseCons = (rnd()-0.5)*0.02;
    const noisePrice = (rnd()-0.5)*0.01;

    // Обратная связь цены на добычу/потребление (равновесие спроса-предложения):
    // высокая цена -> производители наращивают добычу, спрос слегка "разрушается", и наоборот.
    // Без этого механизма даже небольшой постоянный перекос добычи/потребления уводил бы
    // цену в одну сторону бесконечно; с ним рынок сам стремится к новому равновесию.
    const prevPrice = state.priceHistory[goodId][state.priceHistory[goodId].length-1];
    const priceRatio = prevPrice / good.base;
    const supplyResponse = 1 + (priceRatio-1)*0.20;
    const demandResponse = 1 - (priceRatio-1)*0.20;

    const production = params.production * seasonalProd * (1+supplyEffectSum) * supplyResponse * (1+noiseProd);
    const consumption = params.consumption * seasonalCons * econ.demandMod * (1+demandEffectSum) * demandResponse * (1+noiseCons);
    const balance = production - consumption;

    econ.stockpile = Math.max(normStock*0.1, Math.min(normStock*6, econ.stockpile + balance));

    // скрытый мировой спрос — медленно блуждает и тянется обратно к 1
    econ.demandMod += (rnd()-0.5)*0.01 + (1-econ.demandMod)*0.05;
    econ.demandMod = Math.max(0.8, Math.min(1.2, econ.demandMod));

    const stockRatio = Math.max(0.15, Math.min(6, econ.stockpile/normStock));
    let priceTarget = good.base / Math.pow(stockRatio, params.elasticity);
    priceTarget = Math.max(good.base*0.2, Math.min(good.base*4, priceTarget));

    let price = prevPrice + (priceTarget-prevPrice)*0.18 + prevPrice*noisePrice;
    price = Math.max(good.base*0.15, Math.min(good.base*4.5, price));

    econ.production = production; econ.consumption = consumption; econ.balance = balance; // для панели анализа

    econ.supplyEffects = tickEffects(econ.supplyEffects);
    econ.demandEffects = tickEffects(econ.demandEffects);

    return Math.round(price*100)/100;
}

// Гарантирует, что история цены товара продлена как минимум до дня `day`
function ensureHistory(state, goodId, day){
    const good = findGood(goodId);
    if(!state.priceHistory[goodId]) state.priceHistory[goodId] = [good.base];
    initGoodEconomy(state, goodId);
    const hist = state.priceHistory[goodId];
    const rnd = seedRandom(state.seed + goodId.charCodeAt(0)*97 + hist.length);
    while(hist.length < day){
        const generatingDay = hist.length + 1;
        hist.push(simulateNextDay(state, goodId, generatingDay, rnd));
    }
    return hist;
}

function currentPrice(state, goodId){
    const hist = ensureHistory(state, goodId, state.day);
    return hist[state.day-1];
}

function priceChange(state, goodId){
    const hist = ensureHistory(state, goodId, state.day);
    if(state.day<2) return {abs:0, pct:0};
    const prev = hist[state.day-2];
    const cur = hist[state.day-1];
    return { abs: Math.round((cur-prev)*100)/100, pct: prev? ((cur-prev)/prev*100):0 };
}

// --------------------------
// Торговля
// --------------------------

const TRADE_LOT = 1; // единиц за одну сделку кнопкой (можно расширить полем ввода в будущем)

function buyGood(id){
    const state = Game.state;
    const good = findGood(id);
    const price = currentPrice(state, id);
    const cost = price * TRADE_LOT;
    const fee = Math.round(cost*TRADE_FEE_RATE*100)/100;
    const total = cost + fee;

    if(state.money < total){
        SoundFX.error();
        UI.toast("Недостаточно денег для покупки (с учётом комиссии)");
        return;
    }

    SoundFX.buy();
    state.money -= total;
    chargeTradeFee(state, cost);

    const pos = state.portfolio[id] || { qty:0, avgPrice:0 };
    const newQty = pos.qty + TRADE_LOT;
    pos.avgPrice = (pos.avgPrice*pos.qty + price*TRADE_LOT) / newQty;
    pos.qty = newQty;
    state.portfolio[id] = pos;

    state.stats.trades++;
    state.stats.buys++;
    if(!state.achievements.firstTrade) state.achievements.firstTrade = true;
    if(!state.tradeVolumeToday) state.tradeVolumeToday = {};
    state.tradeVolumeToday[id] = (state.tradeVolumeToday[id]||0) + TRADE_LOT;

    UI.toast(`Куплено: ${good.name} × ${TRADE_LOT} за ${fmtMoney(cost)} (+комиссия ${fmtMoney(fee)})`);

    Game.afterAction();
}

function sellGood(id){
    const state = Game.state;
    const good = findGood(id);
    const pos = state.portfolio[id];

    if(state.cargoDelay && state.cargoDelay[id] >= state.day){
        SoundFX.error();
        UI.toast(`Продажа «${good.name}» временно недоступна — груз задержан в порту`);
        return;
    }

    if(!pos || pos.qty < TRADE_LOT){
        SoundFX.error();
        UI.toast(`У вас нет столько «${good.name}» для продажи`);
        return;
    }

    SoundFX.sell();
    const price = currentPrice(state, id);
    const revenue = price * TRADE_LOT;
    const fee = Math.round(revenue*TRADE_FEE_RATE*100)/100;
    const net = revenue - fee;

    pos.qty -= TRADE_LOT;
    state.money += net;
    chargeTradeFee(state, revenue);
    if(pos.qty === 0) pos.avgPrice = 0;

    state.stats.trades++;
    state.stats.sells++;
    if(!state.achievements.firstSell) state.achievements.firstSell = true;
    if(!state.tradeVolumeToday) state.tradeVolumeToday = {};
    state.tradeVolumeToday[id] = (state.tradeVolumeToday[id]||0) - TRADE_LOT;

    UI.toast(`Продано: ${good.name} × ${TRADE_LOT} за ${fmtMoney(net)} (комиссия ${fmtMoney(fee)})`);

    Game.afterAction();
}

// --------------------------
// Форматирование
// --------------------------

function fmtMoney(n){
    return Math.round(n).toLocaleString("ru-RU") + " ₽";
}
function fmtSigned(n, suffix){
    const s = n>=0 ? "+" : "";
    return s + (Math.round(n*100)/100).toLocaleString("ru-RU") + (suffix||"");
}

// --------------------------
// Отрисовка карточек биржи
// --------------------------

let selectedGood = "oil";
const _lastCardPrices = {};

function renderMarket(){
    const state = Game.state;
    const container = document.getElementById("goodsContainer");
    container.innerHTML = "";

    GOODS.forEach(good=>{
        const price = currentPrice(state, good.id);
        const change = priceChange(state, good.id);
        const hist = ensureHistory(state, good.id, state.day);
        const window7 = hist.slice(Math.max(0,state.day-7), state.day);
        const pos = state.portfolio[good.id];
        const up = change.pct >= 0;

        const card = document.createElement("div");
        card.className = "good-card" + (good.id===selectedGood ? " selected" : "");
        card.dataset.id = good.id;

        card.innerHTML = `
            <div class="good-title-row">
                <div>
                    <div class="good-title"><span class="good-icon">${good.icon}</span>${good.name}</div>
                    <div class="good-unit">${good.unit}</div>
                </div>
                <span class="dir-dot ${up?"dir-up":"dir-down"}"></span>
            </div>
            <div class="good-price">${fmtMoney(price)}</div>
            <div class="good-change ${up?"up":"down"}">${fmtSigned(change.abs)} ₽ (${fmtSigned(change.pct)}%)</div>
            <canvas class="spark" width="220" height="46" data-spark="${good.id}"></canvas>
            <div class="good-meta">
                <span>Мин: ${fmtMoney(Math.min(...window7))}</span>
                <span>Макс: ${fmtMoney(Math.max(...window7))}</span>
            </div>
            <div class="good-owned">
                У вас: <b>${pos&&pos.qty?pos.qty:0}</b>
                ${pos&&pos.qty ? " · Ср. цена: "+fmtMoney(pos.avgPrice) : ""}
            </div>
            <div class="good-actions">
                <button class="btn-buy" data-action="buy" data-id="${good.id}" ${state.money<price?"disabled":""}>Купить</button>
                <button class="btn-sell" data-action="sell" data-id="${good.id}" ${(!pos||pos.qty<1||(state.cargoDelay&&state.cargoDelay[good.id]>=state.day))?"disabled":""}>Продать</button>
            </div>
        `;

        container.appendChild(card);
    });

    // события
    container.querySelectorAll(".good-card").forEach(card=>{
        card.addEventListener("click", (e)=>{
            if(e.target.closest("button")) return;
            selectedGood = card.dataset.id;
            const sel = document.getElementById("chartGoodSelect");
            if(sel) sel.value = selectedGood;
            renderMarket();
            ChartModule.renderMainChart();
        });
    });
    container.querySelectorAll("[data-action='buy']").forEach(btn=>{
        btn.addEventListener("click", ()=>buyGood(btn.dataset.id));
    });
    container.querySelectorAll("[data-action='sell']").forEach(btn=>{
        btn.addEventListener("click", ()=>sellGood(btn.dataset.id));
    });

    // спарклайны
    container.querySelectorAll("[data-spark]").forEach(cv=>{
        const gid = cv.dataset.spark;
        const hist = ensureHistory(state, gid, state.day).slice(Math.max(0,state.day-14), state.day);
        drawSparkline(cv, hist);
    });

    // вспышка карточек при изменении цены с прошлой отрисовки
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!reduceMotion){
        GOODS.forEach(good=>{
            const price = currentPrice(state, good.id);
            const prev = _lastCardPrices[good.id];
            if(prev !== undefined && prev !== price){
                const card = container.querySelector(`.good-card[data-id="${good.id}"]`);
                if(card){
                    const cls = price > prev ? "flash-up" : "flash-down";
                    card.classList.add(cls);
                    const priceEl = card.querySelector(".good-price");
                    if(priceEl) priceEl.classList.add("bump");
                    setTimeout(()=>{ card.classList.remove(cls); if(priceEl) priceEl.classList.remove("bump"); }, 1000);
                }
            }
            _lastCardPrices[good.id] = price;
        });
    } else {
        GOODS.forEach(good=>{ _lastCardPrices[good.id] = currentPrice(state, good.id); });
    }
}

function renderEconStats(state, goodId){
    const el = document.getElementById("econStats");
    if(!el) return;
    const econ = initGoodEconomy(state, goodId);
    const params = GOOD_ECON_PARAMS[goodId];
    const balance = econ.balance!==undefined ? econ.balance : (econ.production||params.production)-(econ.consumption||params.consumption);
    const normStock = params.consumption*params.stockDays;
    const stockPct = Math.round((econ.stockpile/normStock)*100);

    el.innerHTML = `
        <div class="econ-stat"><span>Добыча</span><b>${Math.round(econ.production||params.production).toLocaleString("ru-RU")}</b></div>
        <div class="econ-stat"><span>Потребление</span><b>${Math.round(econ.consumption||params.consumption).toLocaleString("ru-RU")}</b></div>
        <div class="econ-stat"><span>Запасы</span><b>${Math.round(econ.stockpile).toLocaleString("ru-RU")} <i>(${stockPct}%)</i></b></div>
        <div class="econ-stat"><span>Баланс</span><b class="${balance>=0?'profit-pos':'profit-neg'}">${fmtSigned(Math.round(balance))}</b></div>
    `;
}

function drawSparkline(canvas, data){
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if(data.length<2) return;

    const min = Math.min(...data), max = Math.max(...data);
    const range = (max-min)||1;
    const up = data[data.length-1] >= data[0];

    ctx.beginPath();
    data.forEach((v,i)=>{
        const x = (i/(data.length-1))*w;
        const y = h - ((v-min)/range)*h;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = up ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // заливка
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0, up ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fill();
}
