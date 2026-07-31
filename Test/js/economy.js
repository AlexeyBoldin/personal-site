/*=========================================
  Market Empire — economy.js
  Макроэкономика, банк, достижения
=========================================*/

const ACHIEVEMENTS = [
    { id:"firstTrade",   emoji:"🤝", name:"Первая сделка",        desc:"Совершите первую покупку" },
    { id:"firstSell",    emoji:"💱", name:"Первая продажа",       desc:"Продайте товар впервые" },
    { id:"money200k",    emoji:"💵", name:"Первые 200 000 ₽",     desc:"Накопите 200 000 ₽" },
    { id:"millionaire",  emoji:"💎", name:"Миллионер",            desc:"Накопите 1 000 000 ₽" },
    { id:"trader50",     emoji:"📈", name:"Опытный трейдер",      desc:"Совершите 50 сделок" },
    { id:"diversified",  emoji:"🧺", name:"Широкий портфель",     desc:"Держите 5+ разных товаров одновременно" },
    { id:"highRep",      emoji:"⭐", name:"Высокая репутация",    desc:"Достигните репутации 80" },
    { id:"day30",        emoji:"🗓️", name:"Месяц в деле",         desc:"Продержитесь 30 торговых дней" },
    { id:"allAssets",    emoji:"👑", name:"Хозяин жизни",         desc:"Прокачайте всё имущество до максимального уровня" },
    { id:"familyLove",   emoji:"❤️", name:"Опора семьи",          desc:"Поднимите отношения в семье до 90%" }
];

function checkAchievements(state){
    const unlockedNow = [];

    if(state.money >= 200000 && !state.achievements.money200k){ state.achievements.money200k = true; unlockedNow.push("money200k"); }
    if(state.money >= 1000000 && !state.achievements.millionaire){ state.achievements.millionaire = true; unlockedNow.push("millionaire"); }
    if(state.stats.trades >= 50 && !state.achievements.trader50){ state.achievements.trader50 = true; unlockedNow.push("trader50"); }
    if(state.reputation >= 80 && !state.achievements.highRep){ state.achievements.highRep = true; unlockedNow.push("highRep"); }
    if(state.day >= 30 && !state.achievements.day30){ state.achievements.day30 = true; unlockedNow.push("day30"); }

    const distinctGoods = Object.values(state.portfolio).filter(p=>p.qty>0).length;
    if(distinctGoods >= 5 && !state.achievements.diversified){ state.achievements.diversified = true; unlockedNow.push("diversified"); }

    if(state.assets && Object.keys(state.assets).length>0 && ASSET_LINES.every(l=>state.assets[l.id]===l.tiers.length-1) && !state.achievements.allAssets){
        state.achievements.allAssets = true; unlockedNow.push("allAssets");
    }
    if(state.family && state.family.relationship>=90 && !state.achievements.familyLove){
        state.achievements.familyLove = true; unlockedNow.push("familyLove");
    }

    unlockedNow.forEach(id=>{
        const a = ACHIEVEMENTS.find(x=>x.id===id);
        if(a){
            SoundFX.achievement();
            UI.toast(`🏆 Достижение: ${a.name}`);
        }
    });
}

// --------------------------
// Макроэкономика
// --------------------------

function advanceMacroEconomy(state){
    const rnd = seedRandom(state.seed + state.day*13);

    // инфляция дрейфует в диапазоне 1.5% — 9%
    state.inflation += (rnd()-0.5)*0.6;
    state.inflation = Math.max(1.5, Math.min(9, state.inflation));

    // курс доллара
    state.usdRate *= 1 + (rnd()-0.5)*0.01;
    state.usdRate = Math.max(60, Math.min(140, state.usdRate));

    // статус экономики
    const roll = rnd();
    if(roll < 0.08) state.economyStatus = "recession";
    else if(roll < 0.25) state.economyStatus = "growth";
    else state.economyStatus = "stable";

    // репутация плавно тянется к 50 + бонус за капитал
    const target = 50 + Math.min(40, Math.log10(Math.max(1,state.money/100000+1))*18);
    state.reputation += (target-state.reputation)*0.08;
    state.reputation = Math.max(0, Math.min(100, Math.round(state.reputation)));
}

const ECON_LABELS = { stable:"Стабильная", growth:"Рост", recession:"Спад" };

// --------------------------
// Банк
// --------------------------

const BANK_DEPOSIT_RATE = 0.00012; // ставка в день (~4.4% годовых)
const BANK_LOAN_RATE = 0.00025;    // ставка по кредиту в день
const BANK_MAX_LOAN_MULT = 3;      // макс. кредит = репутация * множитель * 1000

function bankMaxLoan(state){
    return Math.round(state.reputation * BANK_MAX_LOAN_MULT * 1000);
}

function applyDailyBankInterest(state){
    if(state.bank.deposit > 0){
        state.bank.deposit += state.bank.deposit * BANK_DEPOSIT_RATE;
    }
    if(state.bank.loan > 0){
        state.bank.loan += state.bank.loan * BANK_LOAN_RATE;
    }
}

function bankDeposit(amount){
    const state = Game.state;
    if(amount<=0 || amount>state.money){ UI.toast("Неверная сумма"); return; }
    state.money -= amount;
    state.bank.deposit += amount;
    UI.toast(`Внесено на депозит: ${fmtMoney(amount)}`);
    Game.afterAction();
}

function bankWithdraw(amount){
    const state = Game.state;
    if(amount<=0 || amount>state.bank.deposit){ UI.toast("Неверная сумма"); return; }
    state.bank.deposit -= amount;
    state.money += amount;
    UI.toast(`Снято с депозита: ${fmtMoney(amount)}`);
    Game.afterAction();
}

function bankTakeLoan(amount){
    const state = Game.state;
    const max = bankMaxLoan(state);
    if(amount<=0 || state.bank.loan+amount>max){
        UI.toast(`Максимальный доступный кредит: ${fmtMoney(max)}`);
        return;
    }
    state.bank.loan += amount;
    state.money += amount;
    UI.toast(`Оформлен кредит: ${fmtMoney(amount)}`);
    Game.afterAction();
}

function bankRepayLoan(amount){
    const state = Game.state;
    if(amount<=0 || amount>state.money){ UI.toast("Неверная сумма"); return; }
    const pay = Math.min(amount, state.bank.loan);
    state.bank.loan -= pay;
    state.money -= pay;
    UI.toast(`Погашено: ${fmtMoney(pay)}`);
    Game.afterAction();
}
