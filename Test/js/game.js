/*=========================================
  Market Empire — game.js
  Инициализация, состояние, игровой цикл
=========================================*/

const GAME_VERSION = "0.2.2";

const splash = document.getElementById("splash-screen");
const menu = document.getElementById("main-menu");
const app = document.getElementById("app");

const newGameBtn = document.getElementById("newGameBtn");
const continueBtn = document.getElementById("continueBtn");
const settingsMenuBtn = document.getElementById("settingsMenuBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const exitBtn = document.getElementById("exitBtn");
const exitBtn2 = document.getElementById("exitBtn2");

function createNewState(){
    const today = new Date();
    return {
        version: GAME_VERSION,
        seed: Math.floor(Math.random()*1e9),
        day: 1,
        date: today.toISOString(),
        money: 100000,
        reputation: 50,
        inflation: 4.2,
        usdRate: 89.4,
        economyStatus: "stable",
        portfolio: {},
        priceHistory: {},
        goodsEconomy: {},
        newsLog: [],
        bank: { deposit:0, loan:0 },
        stats: { trades:0, buys:0, sells:0 },
        achievements: {},
        settings: { sound:true },
        family: { relationship:60 },
        messages: { pending:[], log:[] },
        insurance: {},
        cargoDelay: {},
        assets: {},
        casino: { hippodromeRaces:0, hippodromeWins:0, lotteryTickets:0, lotteryWins:0, pokerGames:0, pokerWins:0, netProfit:0 },
        tax: { periodStartDay:1, periodStartMoney:100000, periodFees:0 },
        lastSave: Date.now()
    };
}

function switchScreen(hideEl, showEl){
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduceMotion || !hideEl){
        if(hideEl) hideEl.classList.add("hidden");
        showEl.classList.remove("hidden");
        return;
    }
    hideEl.classList.add("fade-out");
    setTimeout(()=>{
        hideEl.classList.add("hidden");
        hideEl.classList.remove("fade-out");
        showEl.classList.remove("hidden");
        showEl.style.opacity = "0";
        requestAnimationFrame(()=>{ showEl.style.opacity = ""; });
    }, 320);
}

const Game = {
    state: null,

    start(fresh){
        this.state = fresh ? createNewState() : (SaveManager.load() || createNewState());
        // на случай старого сохранения без новых полей
        this.state.bank = this.state.bank || { deposit:0, loan:0 };
        this.state.stats = this.state.stats || { trades:0, buys:0, sells:0 };
        this.state.achievements = this.state.achievements || {};
        this.state.settings = this.state.settings || { sound:true };
        this.state.newsLog = this.state.newsLog || [];
        this.state.priceHistory = this.state.priceHistory || {};
        this.state.goodsEconomy = this.state.goodsEconomy || {};
        familyState(this.state);
        messagesState(this.state);
        assetsState(this.state);
        casinoState(this.state);
        eventsState(this.state);
        taxState(this.state);

        ensureHistory(this.state, selectedGood, this.state.day);
        switchScreen(menu, app);
        this.refreshAll();
        SaveManager.save(this.state);
    },

    nextDay(){
        if(this._advancing) return;
        this._advancing = true;
        SoundFX.nextDay();

        const buttons = [nextDayBtn, document.getElementById("nextDayBtnTop")];
        const originalHtml = nextDayBtn.innerHTML;
        buttons.forEach(b=>b && b.classList.add("loading"));
        nextDayBtn.innerHTML = `<span class="spin"></span>Обновляем рынок…`;

        setTimeout(()=>{
            const state = this.state;
            state.day++;
            const d = new Date(state.date);
            d.setDate(d.getDate()+1);
            state.date = d.toISOString();

            advanceMacroEconomy(state);
            applyDailyBankInterest(state);

            const firedEvents = processDailyEvents(state);  // 1-4: события решают, что происходит с миром сегодня
            GOODS.forEach(g=>ensureHistory(state, g.id, state.day)); // 5-6: цены считаются с учётом этих событий
            newsFromEvents(state, firedEvents);              // 7: новости формируются ПОСЛЕ того, как мир уже изменился

            generateMessages(state);
            checkAchievements(state);

            const taxReport = checkMonthlyTax(state);

            this.refreshAll();
            SaveManager.save(state);

            if(taxReport) TaxModal.show(taxReport);

            buttons.forEach(b=>b && b.classList.remove("loading"));
            nextDayBtn.innerHTML = originalHtml;
            this._advancing = false;
        }, 420);
    },

    afterAction(){
        checkAchievements(this.state);
        this.refreshAll();
        SaveManager.save(this.state);
    },

    refreshAll(){
        updateTopBar();
        renderMarket();
        ChartModule.renderMainChart();
        renderNews();
        renderPortfolio();
        const activeView = document.querySelector(".view.active");
        if(activeView){
            const name = activeView.id.replace("view-","");
            if(name==="bank") renderBank();
            if(name==="casino") renderCasino();
            if(name==="family") renderFamily();
            if(name==="assets") renderAssets();
            if(name==="reports") renderReports();
            if(name==="achievements") renderAchievements();
            if(name==="settings") renderSettings();
        }
    }
};

// --------------------------
// Экран запуска
// --------------------------

window.addEventListener("load", ()=>{
    UI.initNav();
    ChartModule.init();
    GlobeAnim.init();

    setTimeout(()=>{
        switchScreen(splash, menu);
        continueBtn.disabled = !SaveManager.hasSave();
    }, 1800);

    window.addEventListener("resize", ()=>{
        if(!app.classList.contains("hidden")) ChartModule.renderMainChart();
    });
});

newGameBtn.addEventListener("click", ()=>{
    if(SaveManager.hasSave() && !confirm("Начать новую игру? Текущее сохранение будет перезаписано.")) return;
    Game.start(true);
});

continueBtn.addEventListener("click", ()=>{
    if(continueBtn.disabled) return;
    Game.start(false);
});

settingsMenuBtn.addEventListener("click", ()=>{
    Game.start(SaveManager.hasSave() ? false : true);
    UI.showView("settings");
});

nextDayBtn.addEventListener("click", ()=> Game.nextDay());
document.getElementById("nextDayBtnTop").addEventListener("click", ()=> Game.nextDay());

function goToMenu(){
    SoundFX.click();
    if(Game.state) SaveManager.save(Game.state);
    switchScreen(app, menu);
    continueBtn.disabled = !SaveManager.hasSave();
}
exitBtn.addEventListener("click", goToMenu);
exitBtn2.addEventListener("click", goToMenu);
