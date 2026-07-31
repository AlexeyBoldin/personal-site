/*=========================================
  Market Empire — tax.js
  Комиссии за сделки + подоходный налог раз в 30 дней
  (Остальные виды налогов из мастер-плана — на будущее, по мере роста компании)
=========================================*/

const TRADE_FEE_RATE = 0.0015; // 0.15% с покупки и с продажи
const TAX_PERIOD_DAYS = 30;

// Прогрессивная шкала: часть прибыли в каждой границе облагается своей ставкой
const INCOME_TAX_BRACKETS = [
    { upTo:100000,   rate:0.10 },
    { upTo:1000000,  rate:0.15 },
    { upTo:Infinity, rate:0.20 }
];

function taxState(state){
    if(!state.tax){
        state.tax = {
            periodStartDay: state.day || 1,
            periodStartMoney: state.money,
            periodFees: 0
        };
    }
    return state.tax;
}

// Считает налог по прогрессивной шкале (каждая часть прибыли — по своей ставке, не вся сумма целиком)
function calcIncomeTax(profit){
    if(profit<=0) return 0;
    let tax = 0, remaining = profit, prevCap = 0;
    for(const b of INCOME_TAX_BRACKETS){
        const taxableHere = Math.min(remaining, b.upTo-prevCap);
        if(taxableHere>0) tax += taxableHere*b.rate;
        remaining -= taxableHere;
        prevCap = b.upTo;
        if(remaining<=0) break;
    }
    return Math.round(tax);
}

// Комиссия брокера — вызывается из market.js при каждой сделке
function chargeTradeFee(state, amount){
    const t = taxState(state);
    const fee = Math.round(amount*TRADE_FEE_RATE*100)/100;
    t.periodFees += fee;
    return fee;
}

// Проверяется каждый день в Game.nextDay(); возвращает отчёт, если наступил конец налогового периода
function checkMonthlyTax(state){
    const t = taxState(state);
    if(state.day - t.periodStartDay < TAX_PERIOD_DAYS) return null;

    const profit = state.money - t.periodStartMoney;
    let tax = calcIncomeTax(profit);

    if(t.auditPenalty){
        tax = Math.round(tax*1.05 + (tax===0 ? Math.max(0,profit)*0.01 : 0));
        t.auditPenalty = false;
    }

    state.money -= tax;

    const report = {
        profit: Math.round(profit),
        fees: Math.round(t.periodFees),
        tax,
        total: tax
    };

    t.periodStartDay = state.day;
    t.periodStartMoney = state.money;
    t.periodFees = 0;

    return report;
}

// --------------------------
// Модальное окно налогового отчёта
// --------------------------

const TaxModal = {
    show(report){
        const overlay = document.getElementById("taxModalOverlay");
        const card = document.getElementById("taxModalCard");
        if(!overlay || !card) return;

        card.innerHTML = `
            <h2 style="margin-bottom:14px">📋 Налоговый отчёт</h2>
            <div class="tax-row"><span>Прибыль за период</span><b class="${report.profit>=0?'profit-pos':'profit-neg'}">${fmtSigned(report.profit)} ₽</b></div>
            <div class="tax-row"><span>Комиссии за сделки</span><b class="profit-neg">−${fmtMoney(report.fees)}</b></div>
            <div class="tax-row"><span>Подоходный налог</span><b class="profit-neg">−${fmtMoney(report.tax)}</b></div>
            <div class="tax-row tax-total"><span>Итого списано</span><b class="profit-neg">−${fmtMoney(report.total)}</b></div>
            <button id="taxModalCloseBtn" style="width:100%;margin-top:16px">Понятно</button>
        `;
        overlay.classList.remove("hidden");
        document.getElementById("taxModalCloseBtn").addEventListener("click", ()=>{
            overlay.classList.add("hidden");
            SoundFX.click();
        });
    }
};
