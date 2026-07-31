/*=========================================
  Market Empire — messages.js
  Единый почтовый ящик смартфона: 8 источников сообщений
  с реалистичным разбросом частоты (семья чаще всего, остальное — реже)
=========================================*/

const MESSAGE_SENDERS = {
    family:     { icon:"👨‍👩‍👧", label:"Семья",     weight:0.032 },
    bank:       { icon:"🏦",      label:"Банк",      weight:0.018 },
    journalist: { icon:"📰",      label:"Пресса",    weight:0.012 },
    investor:   { icon:"💼",      label:"Инвестор",  weight:0.010 },
    tax:        { icon:"🏛",      label:"Налоговая", weight:0.008 },
    carrier:    { icon:"🚢",      label:"Перевозчик",weight:0.014 },
    secretary:  { icon:"👔",      label:"Секретарь", weight:0.014, requiresOffice:true },
    insurance:  { icon:"⚠️",      label:"Страховая", weight:0.009 }
};

const MAX_PENDING_MESSAGES = 4;

function messagesState(state){
    if(!state.messages) state.messages = { pending:[], log:[] };
    return state.messages;
}

function pushMessage(state, msg){
    const inbox = messagesState(state);
    inbox.pending.unshift(msg);
}

function resolveAndLog(state, msg, outcomeText, effectClass){
    const inbox = messagesState(state);
    inbox.pending = inbox.pending.filter(m=>m.id!==msg.id);
    inbox.log.unshift({ ...msg, outcome:outcomeText, effectClass });
    inbox.log = inbox.log.slice(0,60);
}

function newMsgId(state, rnd){
    return "msg"+state.day+"_"+Math.floor(rnd()*1e6);
}

// --------------------------
// Генерация — по одному сообщению-кандидату на категорию в день
// --------------------------

function generateMessages(state){
    const inbox = messagesState(state);
    if(inbox.pending.length >= MAX_PENDING_MESSAGES) return;
    const rnd = seedRandom(state.seed + state.day*53 + 11);

    const builders = {
        family: buildFamilyMessage,
        bank: buildBankMessage,
        journalist: buildJournalistMessage,
        investor: buildInvestorMessage,
        tax: buildTaxMessage,
        carrier: buildCarrierMessage,
        secretary: buildSecretaryMessage,
        insurance: buildInsuranceMessage
    };

    Object.keys(MESSAGE_SENDERS).forEach(cat=>{
        if(inbox.pending.length >= MAX_PENDING_MESSAGES) return;
        const meta = MESSAGE_SENDERS[cat];
        if(meta.requiresOffice && !assetOwnsAny(state,"office")) return;
        if(rnd() > meta.weight) return;
        const msg = builders[cat](state, rnd);
        if(msg) pushMessage(state, { ...msg, category:cat, day:state.day, id:newMsgId(state, rnd) });
    });

    checkInsuranceIncidents(state, rnd);
}

// --------------------------
// Семья
// --------------------------

function buildFamilyMessage(state, rnd){
    const tpl = FAMILY_TEMPLATES[Math.floor(rnd()*FAMILY_TEMPLATES.length)];
    const amount = Math.round((tpl.min + rnd()*(tpl.max-tpl.min))/50)*50;
    return {
        sender: tpl.sender, avatar: tpl.avatar,
        text: tpl.text.replace("{amount}", amount.toLocaleString("ru-RU")),
        amount,
        actions:[ {label:"Дать", kind:"give"}, {label:"Отказать", kind:"decline"} ]
    };
}

// --------------------------
// Банк
// --------------------------

function buildBankMessage(state, rnd){
    if(rnd() < 0.5){
        const amount = Math.round((50000 + rnd()*250000)/1000)*1000;
        const annualRate = (BANK_LOAN_RATE*365*100).toFixed(1);
        return {
            sender:"Банк", avatar:"🏦",
            text:`Хотите оформить кредит ${amount.toLocaleString("ru-RU")} ₽ по стандартной ставке (~${annualRate}% годовых)?`,
            amount,
            actions:[ {label:"Оформить", kind:"bank_loan"}, {label:"Не сейчас", kind:"dismiss"} ]
        };
    }
    return {
        sender:"Банк", avatar:"🏦",
        text:"Специальное предложение: внесите депозит и проценты начнут копиться уже с завтрашнего дня.",
        amount:50000,
        actions:[ {label:"Внести 50 000 ₽", kind:"bank_deposit"}, {label:"Не сейчас", kind:"dismiss"} ]
    };
}

// --------------------------
// Журналисты
// --------------------------

const JOURNALIST_TEXTS = [
    "Деловое издание хочет взять у вас интервью о секретах успеха.",
    "Блогер-обозреватель рынка предлагает совместный эфир для своего канала.",
    "Журнал готовит рубрику про успешных предпринимателей — приглашают вас."
];

function buildJournalistMessage(state, rnd){
    return {
        sender:"Пресса", avatar:"📰",
        text: JOURNALIST_TEXTS[Math.floor(rnd()*JOURNALIST_TEXTS.length)],
        actions:[ {label:"Дать интервью", kind:"give_interview"}, {label:"Отказать", kind:"decline"} ]
    };
}

// --------------------------
// Инвесторы (предлагают выкупить одно из ваших приобретений)
// --------------------------

function buildInvestorMessage(state, rnd){
    const owned = ASSET_LINES.filter(l=>l.id!=="smartphone" && assetsState(state)[l.id]>=0);
    if(owned.length===0) return null;
    const line = owned[Math.floor(rnd()*owned.length)];
    const tierIdx = assetsState(state)[line.id];
    const tier = line.tiers[tierIdx];
    const amount = Math.round(tier.price*0.6);
    return {
        sender:"Инвестор", avatar:"💼",
        text:`Инвестор предлагает выкупить вашу позицию «${tier.name}» (${line.name}) за ${fmtMoney(amount)}. Интересно?`,
        amount, lineId: line.id,
        actions:[ {label:"Продать", kind:"investor_sell"}, {label:"Отказать", kind:"decline"} ]
    };
}

// --------------------------
// Налоговая
// --------------------------

function buildTaxMessage(state, rnd){
    const settlement = Math.max(500, Math.round(state.money*0.015/100)*100);
    return {
        sender:"Налоговая", avatar:"🏛",
        text:`Обнаружены расхождения в декларации. Можно уточнить данные и оплатить сбор ${fmtMoney(settlement)}, либо рискнуть — возможна проверка.`,
        amount: settlement,
        actions:[ {label:"Оплатить", kind:"tax_settle"}, {label:"Рискнуть", kind:"tax_risk"} ]
    };
}

// --------------------------
// Перевозчики (эффект уже применяется в момент показа сообщения)
// --------------------------

function buildCarrierMessage(state, rnd){
    const owned = GOODS.filter(g=> state.portfolio[g.id] && state.portfolio[g.id].qty>0);
    if(owned.length===0) return null; // нечего задерживать в порту, если нечем торгуете
    const good = owned[Math.floor(rnd()*owned.length)];
    state.cargoDelay = state.cargoDelay || {};
    state.cargoDelay[good.id] = state.day + 1; // продажа этого товара недоступна 1 день
    return {
        sender:"Перевозчик", avatar:"🚢",
        text:`Ваш груз «${good.name}» задержан в порту из-за таможенной проверки. Продажа временно недоступна.`,
        actions:[ {label:"Понятно", kind:"dismiss"} ]
    };
}

// --------------------------
// Секретарь (только если куплен офис)
// --------------------------

const SECRETARY_TEXTS = [
    "Напоминаю: на этой неделе много встреч, всё расписание у меня.",
    "Кофе на вашем столе — как обычно, чёрный без сахара.",
    "Курьер привёз документы на подпись, всё в порядке.",
    "Канцелярские принадлежности заказаны, склад пополнен."
];

function buildSecretaryMessage(state, rnd){
    return {
        sender:"Секретарь", avatar:"👔",
        text: SECRETARY_TEXTS[Math.floor(rnd()*SECRETARY_TEXTS.length)],
        actions:[ {label:"Понятно", kind:"dismiss"} ]
    };
}

// --------------------------
// Страховая: предложение полиса + отдельная проверка страховых случаев
// --------------------------

function buildInsuranceMessage(state, rnd){
    const owned = ASSET_LINES.filter(l=>l.id!=="smartphone" && assetsState(state)[l.id]>=0);
    if(owned.length===0) return null;
    const line = owned[Math.floor(rnd()*owned.length)];
    if(state.insurance && state.insurance[line.id] >= state.day) return null; // уже застраховано
    const tier = line.tiers[assetsState(state)[line.id]];
    const premium = Math.max(500, Math.round(tier.price*0.015/100)*100);
    return {
        sender:"Страховая", avatar:"⚠️",
        text:`Предлагаем застраховать «${tier.name}» (${line.name}) на 60 дней. Премия: ${fmtMoney(premium)}.`,
        amount: premium, lineId: line.id,
        actions:[ {label:"Застраховать", kind:"insure"}, {label:"Отказать", kind:"decline"} ]
    };
}

function checkInsuranceIncidents(state, rnd){
    const owned = ASSET_LINES.filter(l=>l.id!=="smartphone" && assetsState(state)[l.id]>=0);
    if(owned.length===0) return;
    if(rnd() > 0.006) return; // редкий страховой случай

    const line = owned[Math.floor(rnd()*owned.length)];
    const tier = line.tiers[assetsState(state)[line.id]];
    const insured = state.insurance && state.insurance[line.id] >= state.day;

    if(insured){
        pushMessage(state, {
            id:newMsgId(state, rnd), category:"insurance", day:state.day,
            sender:"Страховая", avatar:"⚠️",
            text:`Инцидент с «${tier.name}» (${line.name})! К счастью, полис уже покрыл ремонт — с вас ничего не списано.`,
            actions:[ {label:"Понятно", kind:"dismiss"} ]
        });
    } else {
        const cost = Math.round(tier.price*0.12);
        state.money -= cost;
        pushMessage(state, {
            id:newMsgId(state, rnd), category:"insurance", day:state.day,
            sender:"Страховая", avatar:"⚠️",
            text:`Инцидент с «${tier.name}» (${line.name})! Ремонт обошёлся в ${fmtMoney(cost)} — страховки не было.`,
            actions:[ {label:"Понятно", kind:"dismiss"} ]
        });
    }
}

// --------------------------
// Разрешение сообщений (единая точка входа для всех категорий)
// --------------------------

function resolveMessage(id, kind){
    const state = Game.state;
    const inbox = messagesState(state);
    const msg = inbox.pending.find(m=>m.id===id);
    if(!msg) return;

    switch(kind){
        case "give": {
            if(state.money < msg.amount){ SoundFX.error(); UI.toast("Недостаточно денег, чтобы помочь"); return; }
            state.money -= msg.amount;
            state.family.relationship = Math.min(100, state.family.relationship + 4 + Math.random()*4);
            SoundFX.click();
            UI.toast(`Вы помогли: ${msg.sender.toLowerCase()} рад(а)`);
            resolveAndLog(state, msg, "given", "profit-pos");
            break;
        }
        case "decline": {
            if(msg.category==="family"){
                state.family.relationship = Math.max(0, state.family.relationship - 2 - Math.random()*4);
            }
            SoundFX.click();
            UI.toast("Отказано");
            resolveAndLog(state, msg, "declined", "profit-neg");
            break;
        }
        case "dismiss": {
            SoundFX.click();
            resolveAndLog(state, msg, "dismissed", "");
            break;
        }
        case "bank_loan": {
            bankTakeLoan(msg.amount);
            resolveAndLog(state, msg, "accepted", "profit-pos");
            break;
        }
        case "bank_deposit": {
            bankDeposit(msg.amount);
            resolveAndLog(state, msg, "accepted", "profit-pos");
            break;
        }
        case "give_interview": {
            state.reputation = Math.min(100, state.reputation + 2 + Math.round(Math.random()*3));
            SoundFX.achievement();
            UI.toast("Интервью вышло удачным — репутация выросла");
            resolveAndLog(state, msg, "given", "profit-pos");
            break;
        }
        case "investor_sell": {
            const assets = assetsState(state);
            state.money += msg.amount;
            assets[msg.lineId] = -1;
            SoundFX.buy();
            UI.toast(`Продано инвестору за ${fmtMoney(msg.amount)}`);
            resolveAndLog(state, msg, "given", "profit-pos");
            break;
        }
        case "tax_settle": {
            if(state.money < msg.amount){ SoundFX.error(); UI.toast("Недостаточно денег"); return; }
            state.money -= msg.amount;
            SoundFX.click();
            UI.toast("Сбор оплачен, вопрос закрыт");
            resolveAndLog(state, msg, "given", "profit-neg");
            break;
        }
        case "tax_risk": {
            taxState(state).auditPenalty = true;
            SoundFX.click();
            UI.toast("Вы рискнули — возможна повышенная проверка при следующем расчёте налога");
            resolveAndLog(state, msg, "declined", "profit-neg");
            break;
        }
        case "insure": {
            if(state.money < msg.amount){ SoundFX.error(); UI.toast("Недостаточно денег"); return; }
            state.money -= msg.amount;
            if(!state.insurance) state.insurance = {};
            state.insurance[msg.lineId] = state.day + 60;
            SoundFX.click();
            UI.toast("Полис оформлен на 60 дней");
            resolveAndLog(state, msg, "given", "profit-neg");
            break;
        }
    }

    checkAchievements(state);
    Game.afterAction();
}

// --------------------------
// Отрисовка (единая лента для всех источников)
// --------------------------

function renderFamily(){
    const state = Game.state;
    const container = document.getElementById("phoneContainer");
    const tier = assetsState(state).smartphone; // -1 нет телефона, 0 кнопочный, 1+ смартфон

    if(tier < 0){
        container.innerHTML = `
            <div class="empty-state" style="padding:30px 10px">
                📵 У вас пока нет телефона — никто не может до вас достучаться.<br>
                Купите телефон во вкладке «Имущество», чтобы начать получать сообщения.
            </div>
        `;
        return;
    }

    if(tier === 0){
        container.innerHTML = `
            <div class="feature-phone">
                <div class="feature-phone-screen" id="familyContent"></div>
                <div class="feature-softkeys"><span>◀ Меню</span><span>Выбор ▶</span></div>
                <div class="feature-phone-keypad">
                    ${["1","2","3","4","5","6","7","8","9","✳","0","#"].map(k=>`<div class="feature-key">${k}</div>`).join("")}
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="phone-frame">
                <div class="phone-notch"></div>
                <div class="phone-statusbar">
                    <span id="phoneClock">9:41</span>
                    <span>📶 🔋</span>
                </div>
                <div class="phone-screen" id="familyContent"></div>
            </div>
        `;
    }

    const clockEl = document.getElementById("phoneClock");
    if(clockEl) clockEl.textContent = new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});

    const el = document.getElementById("familyContent");
    const inbox = messagesState(state);
    familyState(state); // на случай миграции старого сохранения
    const retro = tier === 0;

    const renderMsg = (m, resolved)=>{
        const meta = MESSAGE_SENDERS[m.category] || { icon:"💬" };
        const actionsHtml = resolved ? "" : `
            <div class="msg-actions">
                ${m.actions.map(a=>`<button class="${retro?'feature-btn':(a.kind==='decline'||a.kind==='tax_risk'?'btn-sell':'btn-buy')}" data-kind="${a.kind}" data-id="${m.id}">${a.label}</button>`).join("")}
            </div>`;
        const outcomeHtml = resolved ? `<div class="msg-outcome ${retro?'':m.effectClass||''}">${
            { given:"✔ Согласились", declined:"✖ Отклонено", dismissed:"· Прочитано" }[m.outcome] || ""
        }</div>` : "";

        if(retro){
            return `
                <div class="feature-msg ${resolved?'resolved':''}">
                    <div class="feature-msg-head">[${m.sender}] День ${m.day}</div>
                    <div class="feature-msg-text">${m.text}</div>
                    ${actionsHtml}
                    ${outcomeHtml}
                </div>
            `;
        }

        return `
            <div class="chat-bubble ${resolved?'resolved':''}">
                <span class="msg-avatar">${m.avatar||meta.icon}</span>
                <div class="bubble-content">
                    <div class="msg-sender">${m.sender} <span class="msg-day">День ${m.day}</span></div>
                    <div class="msg-text">${m.text}</div>
                    ${actionsHtml}
                    ${outcomeHtml}
                </div>
            </div>
        `;
    };

    const pendingHtml = inbox.pending.map(m=>renderMsg(m,false)).join("");
    const historyHtml = inbox.log.slice(0,20).map(m=>renderMsg(m,true)).join("");

    const repHtml = retro
        ? `<div class="feature-msg-head">&gt; ОТНОШЕНИЯ В СЕМЬЕ: ${Math.round(state.family.relationship)}%</div>`
        : `<div class="family-rep">
               <span>❤️ Отношения в семье</span>
               <span class="rep-bar" style="width:90px"><span style="width:${Math.round(state.family.relationship)}%"></span></span>
               <b>${Math.round(state.family.relationship)}%</b>
           </div>`;

    el.innerHTML = `
        ${repHtml}
        ${pendingHtml || `<div class="${retro?'feature-empty':'empty-state'}">${retro?'НЕТ НОВЫХ СООБЩЕНИЙ':'Новых сообщений нет'}</div>`}
        ${historyHtml ? `<div style="font-size:${retro?'11px':'12px'};color:${retro?'inherit':'var(--text2)'};margin:14px 0 6px">${retro?'ИСТОРИЯ':'История'}</div>${historyHtml}` : ""}
    `;

    el.querySelectorAll("[data-kind]").forEach(btn=>{
        btn.addEventListener("click", ()=> resolveMessage(btn.dataset.id, btn.dataset.kind));
    });
}
