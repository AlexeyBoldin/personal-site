/*=========================================
  Market Empire — assets.js
  Имущество: линии покупок от простого к роскошному (до 12 уровней в линии)
=========================================*/

const ASSET_LINES = [
    { id:"smartphone", icon:"📱", name:"Смартфон", tiers:[
        { name:"Кнопочный телефон",        price:15000,    repBonus:0, desc:"Звонки и смс — но родные наконец могут написать." },
        { name:"Бюджетный смартфон",        price:60000,    repBonus:1, desc:"Базовый интернет и мессенджеры." },
        { name:"Смартфон среднего класса",  price:150000,   repBonus:2, desc:"Хорошая камера, быстрая работа." },
        { name:"Флагман",                   price:400000,   repBonus:3, desc:"Топовые характеристики, статусная вещь." },
        { name:"Premium-версия флагмана",   price:900000,   repBonus:5, desc:"Эксклюзивная отделка, максимальный престиж." }
    ]},
    { id:"car", icon:"🚗", name:"Машина", tiers:[
        { name:"Подержанный седан",         price:200000,    repBonus:1, desc:"Простой, но на ходу." },
        { name:"Новый седан",                price:700000,    repBonus:2, desc:"Комфорт для города." },
        { name:"Кроссовер",                  price:1800000,   repBonus:3, desc:"Практичность и статус." },
        { name:"Спортивный автомобиль",      price:4500000,   repBonus:5, desc:"Скорость и эмоции." },
        { name:"Представительский седан",   price:9000000,   repBonus:7, desc:"Личный водитель прилагается по статусу." },
        { name:"Суперкар лимитированной серии", price:22000000, repBonus:10, desc:"Один из немногих в стране." }
    ]},
    { id:"house", icon:"🏠", name:"Дом", tiers:[
        { name:"Студия",            price:800000,     repBonus:2,  desc:"1 комната, совмещённый санузел." },
        { name:"Квартира",          price:2200000,    repBonus:3,  desc:"2 комнаты, отдельная кухня." },
        { name:"Таунхаус",          price:5500000,    repBonus:5,  desc:"3 комнаты, 2 санузла, небольшой двор." },
        { name:"Коттедж",           price:12000000,   repBonus:7,  desc:"5 комнат, 3 санузла, гараж." },
        { name:"Особняк",           price:28000000,   repBonus:10, desc:"8 комнат, 4 санузла, бассейн." },
        { name:"Вилла у моря",      price:60000000,   repBonus:13, desc:"12 комнат, 6 санузлов, собственный пляж." },
        { name:"Родовое поместье",  price:140000000,  repBonus:18, desc:"20+ комнат, 8 санузлов, парк и штат прислуги." }
    ]},
    { id:"office", icon:"🏢", name:"Офис", tiers:[
        { name:"Место в коворкинге",       price:100000,    repBonus:1,  desc:"Стол и стул в общем пространстве." },
        { name:"Малый офис",                price:900000,    repBonus:2,  desc:"Отдельный кабинет на 3-4 человека." },
        { name:"Офис в бизнес-центре",     price:3000000,   repBonus:4,  desc:"Целый этаж, переговорные комнаты." },
        { name:"Собственное здание",       price:15000000,  repBonus:7,  desc:"Полностью ваша недвижимость под бизнес." },
        { name:"Штаб-квартира",            price:45000000,  repBonus:12, desc:"Флагманский офис с вашим именем на фасаде." }
    ]},
    { id:"yacht", icon:"🛥️", name:"Яхта", tiers:[
        { name:"Моторный катер",   price:1500000,   repBonus:2,  desc:"Для прогулок выходного дня." },
        { name:"Малая яхта",       price:5000000,   repBonus:4,  desc:"С каютой на пару ночей." },
        { name:"Парусная яхта",    price:12000000,  repBonus:6,  desc:"Для настоящих ценителей моря." },
        { name:"Моторная яхта",    price:28000000,  repBonus:9,  desc:"Полноценное судно с экипажем." },
        { name:"Суперяхта",        price:70000000,  repBonus:14, desc:"Символ абсолютного успеха." }
    ]},
    { id:"plane", icon:"✈️", name:"Самолёт", tiers:[
        { name:"Лёгкий одномоторный самолёт", price:8000000,   repBonus:3,  desc:"Для коротких перелётов." },
        { name:"Турбовинтовой самолёт",        price:25000000,  repBonus:6,  desc:"Дальность и надёжность." },
        { name:"Бизнес-джет",                  price:80000000,  repBonus:10, desc:"Комфортные перелёты бизнес-класса." },
        { name:"Большой бизнес-джет",          price:180000000, repBonus:15, desc:"Трансконтинентальные перелёты с комфортом отеля." },
        { name:"Личный авиалайнер",            price:450000000, repBonus:20, desc:"Вершина авиационного престижа." }
    ]}
];

// state.assets[lineId] хранит ИНДЕКС текущего купленного уровня (-1 = ничего не куплено, 0 = первый уровень, и т.д.)
function assetsState(state){
    if(!state.assets) state.assets = {};
    ASSET_LINES.forEach(line=>{
        const cur = state.assets[line.id];
        if(cur===undefined){
            state.assets[line.id] = -1;
        } else if(cur===true){
            state.assets[line.id] = 0;   // миграция старых сохранений (было true/false на один товар)
        } else if(cur===false){
            state.assets[line.id] = -1;
        }
    });
    return state.assets;
}

function assetOwnsAny(state, lineId){
    return assetsState(state)[lineId] >= 0;
}

function upgradeAsset(lineId){
    const state = Game.state;
    const line = ASSET_LINES.find(l=>l.id===lineId);
    const assets = assetsState(state);
    const nextIdx = assets[lineId] + 1;

    if(nextIdx >= line.tiers.length){ UI.toast("Уже максимальный уровень в этой линии"); return; }
    const tier = line.tiers[nextIdx];

    if(state.money < tier.price){
        SoundFX.error();
        UI.toast("Недостаточно денег для покупки");
        return;
    }

    state.money -= tier.price;
    assets[lineId] = nextIdx;
    state.reputation = Math.min(100, state.reputation + tier.repBonus);
    SoundFX.buy();
    UI.toast(`${nextIdx===0?"Приобретено":"Улучшено до"}: ${tier.name}!`);
    Game.afterAction();
}

function renderLineTiers(line, ownedIdx){
    return line.tiers.map((t,i)=>{
        const state_ = i<=ownedIdx ? "owned" : (i===ownedIdx+1 ? "next" : "locked");
        return `<span class="tier-dot ${state_}" title="${t.name}">${i+1}</span>`;
    }).join(`<span class="tier-line"></span>`);
}

function renderAssets(){
    const state = Game.state;
    const assets = assetsState(state);
    const el = document.getElementById("assetsContent");

    el.innerHTML = ASSET_LINES.map(line=>{
        const ownedIdx = assets[line.id];
        const current = ownedIdx>=0 ? line.tiers[ownedIdx] : null;
        const next = ownedIdx+1 < line.tiers.length ? line.tiers[ownedIdx+1] : null;
        const canAfford = next && state.money >= next.price;

        return `
        <div class="asset-line-card">
            <div class="asset-head">
                <span class="asset-icon">${line.icon}</span>
                <div>
                    <div class="ach-name">${line.name}</div>
                    <div class="ach-desc">${current ? current.name : "Пока не куплено"}</div>
                </div>
            </div>
            <div class="tier-track">${renderLineTiers(line, ownedIdx)}</div>
            ${current ? `<div class="hint" style="margin:6px 0">${current.desc}</div>` : ""}
            ${next
                ? `<div class="asset-next">
                       <div>
                           <div style="font-weight:600;font-size:13px">Следующий уровень: ${next.name}</div>
                           <div class="hint">${next.desc}</div>
                       </div>
                       <button class="btn-buy" data-upgrade="${line.id}" ${canAfford?"":"disabled"}>${fmtMoney(next.price)}</button>
                   </div>`
                : `<div class="asset-owned-badge">✔ Максимальный уровень достигнут</div>`
            }
        </div>`;
    }).join("");

    el.querySelectorAll("[data-upgrade]").forEach(btn=>{
        btn.addEventListener("click", ()=> upgradeAsset(btn.dataset.upgrade));
    });
}

function renderOwnedAssets(){
    const state = Game.state;
    const assets = assetsState(state);
    const el = document.getElementById("ownedAssetsTable");
    if(!el) return;

    const owned = ASSET_LINES.filter(l=>assets[l.id]>=0);
    if(owned.length===0){
        el.innerHTML = `<div class="empty-state">Пока нет купленного имущества — загляните во вкладку «Имущество»</div>`;
        return;
    }

    el.innerHTML = `<div class="ach-grid">` + owned.map(line=>{
        const tier = line.tiers[assets[line.id]];
        return `
        <div class="asset-card owned">
            <div class="asset-head">
                <span class="asset-icon">${line.icon}</span>
                <div>
                    <div class="ach-name">${line.name}: ${tier.name}</div>
                    <div class="ach-desc">${tier.desc}</div>
                </div>
            </div>
            <div class="asset-price">Уровень ${assets[line.id]+1} из ${line.tiers.length}</div>
            <div class="asset-owned-badge">✔ В собственности</div>
        </div>`;
    }).join("") + `</div>`;
}
