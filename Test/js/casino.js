/*=========================================
  Market Empire — casino.js
  Ипподром, лотерея, покер (виртуальная валюта игры)
=========================================*/

function casinoState(state){
    if(!state.casino) state.casino = {};
    const cs = state.casino;
    if(cs.totalGames===undefined){
        cs.totalGames = (cs.hippodromeRaces||0)+(cs.lotteryTickets||0)+(cs.pokerGames||0);
    }
    if(cs.netProfit===undefined) cs.netProfit = 0;
    if(cs.biggestWin===undefined) cs.biggestWin = 0;
    return cs;
}

function recordCasinoResult(cs, delta){
    cs.totalGames++;
    cs.netProfit += delta;
    if(delta > cs.biggestWin) cs.biggestWin = delta;
}

let casinoTab = "hippodrome";

function renderCasino(){
    const state = Game.state;
    const cs = casinoState(state);
    const el = document.getElementById("casinoContent");

    el.innerHTML = `
        <div class="stat-cards" style="margin-bottom:16px">
            <div class="stat-card"><div class="lbl">Игр сыграно</div><div class="num">${cs.totalGames}</div></div>
            <div class="stat-card"><div class="lbl">Баланс казино</div><div class="num ${cs.netProfit>=0?'profit-pos':'profit-neg'}">${fmtSigned(cs.netProfit)} ₽</div></div>
            <div class="stat-card"><div class="lbl">Крупнейший выигрыш</div><div class="num profit-pos">${fmtMoney(cs.biggestWin)}</div></div>
        </div>
        <div class="period-buttons casino-tabs" style="margin-bottom:16px">
            <button class="period-btn ${casinoTab==='hippodrome'?'active':''}" data-casino-tab="hippodrome">🐎 Ипподром</button>
            <button class="period-btn ${casinoTab==='lottery'?'active':''}" data-casino-tab="lottery">🎟️ Лотерея</button>
            <button class="period-btn ${casinoTab==='poker'?'active':''}" data-casino-tab="poker">🃏 Покер</button>
            <button class="period-btn ${casinoTab==='roulette'?'active':''}" data-casino-tab="roulette">🎡 Рулетка</button>
            <button class="period-btn ${casinoTab==='blackjack'?'active':''}" data-casino-tab="blackjack">🂡 21</button>
            <button class="period-btn ${casinoTab==='slots'?'active':''}" data-casino-tab="slots">🎰 Автомат</button>
        </div>
        <div id="casinoSubview"></div>
    `;

    el.querySelectorAll("[data-casino-tab]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            SoundFX.nav();
            casinoTab = btn.dataset.casinoTab;
            renderCasino();
        });
    });

    if(casinoTab==="hippodrome") renderHippodrome();
    if(casinoTab==="lottery") renderLottery();
    if(casinoTab==="poker") renderPoker();
    if(casinoTab==="roulette") renderRoulette();
    if(casinoTab==="blackjack") renderBlackjack();
    if(casinoTab==="slots") renderSlots();
}

/* ============ ИППОДРОМ ============ */

const HORSE_NAMES = [
    { name:"Стрела",   emoji:"🐎" }, { name:"Ветерок",  emoji:"🐎" },
    { name:"Гроза",    emoji:"🐎" }, { name:"Комета",   emoji:"🐎" },
    { name:"Ураган",   emoji:"🐎" }, { name:"Звезда",   emoji:"🐎" }
];

let currentHorses = null;
let selectedHorse = null;
let raceRunning = false;

function rollHorses(){
    const raw = HORSE_NAMES.map(h=>({ ...h, strength: 0.5 + Math.random() }));
    const total = raw.reduce((s,h)=>s+h.strength,0);
    currentHorses = raw.map(h=>{
        const prob = h.strength/total;
        const odds = Math.max(1.3, Math.round((1/prob)*0.85*10)/10);
        return { ...h, odds };
    });
    selectedHorse = null;
}

function renderHippodrome(){
    if(!currentHorses) rollHorses();
    const el = document.getElementById("casinoSubview");

    el.innerHTML = `
        <p class="panel-sub">Выберите лошадь и сделайте ставку. Коэффициент — во сколько раз умножится ставка при победе.</p>
        <div id="horseList"></div>
        <div class="bank-row" style="margin-top:14px; max-width:360px">
            <input type="number" id="horseBet" placeholder="Ставка, ₽" min="0">
            <button id="raceBtn">Скакать! 🏁</button>
        </div>
    `;

    const list = document.getElementById("horseList");
    list.innerHTML = currentHorses.map((h,i)=>`
        <div class="horse-row ${selectedHorse===i?'selected':''}" data-horse="${i}">
            <span class="horse-name">${h.emoji} ${h.name}</span>
            <span class="horse-odds">x${h.odds}</span>
            <div class="horse-track"><div class="horse-progress" id="horseProgress${i}"></div></div>
        </div>
    `).join("");

    list.querySelectorAll("[data-horse]").forEach(row=>{
        row.addEventListener("click", ()=>{
            if(raceRunning) return;
            selectedHorse = Number(row.dataset.horse);
            SoundFX.click();
            renderHippodrome();
        });
    });

    document.getElementById("raceBtn").addEventListener("click", startRace);
}

function startRace(){
    if(raceRunning) return;
    const state = Game.state;
    const bet = Number(document.getElementById("horseBet").value);
    if(selectedHorse===null){ SoundFX.error(); UI.toast("Сначала выберите лошадь"); return; }
    if(!(bet>0) || bet>state.money){ SoundFX.error(); UI.toast("Некорректная ставка"); return; }

    state.money -= bet;
    updateTopBar();
    raceRunning = true;
    document.getElementById("raceBtn").disabled = true;
    SoundFX.nextDay();

    const n = currentHorses.length;
    const positions = new Array(n).fill(0);
    const speeds = currentHorses.map(h => 0.55 + (1/h.odds)*1.3);

    function frame(){
        for(let i=0;i<n;i++){
            positions[i] += speeds[i]*(0.4+Math.random()*1.1);
            const bar = document.getElementById("horseProgress"+i);
            if(bar) bar.style.width = Math.min(100,positions[i])+"%";
        }
        const winner = positions.findIndex(p=>p>=100);
        if(winner===-1){
            requestAnimationFrame(frame);
        } else {
            finishRace(winner, bet);
        }
    }
    requestAnimationFrame(frame);
}

function finishRace(winnerIdx, bet){
    const state = Game.state;
    const cs = casinoState(state);
    const won = winnerIdx === selectedHorse;

    if(won){
        const payout = Math.round(bet*currentHorses[winnerIdx].odds);
        state.money += payout;
        recordCasinoResult(cs, payout-bet);
        SoundFX.achievement();
        UI.toast(`🏆 ${currentHorses[winnerIdx].name} победила! Выигрыш: ${fmtMoney(payout)}`);
    } else {
        recordCasinoResult(cs, -bet);
        SoundFX.error();
        UI.toast(`Победила ${currentHorses[winnerIdx].name}. Ставка не сыграла.`);
    }

    raceRunning = false;
    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
    setTimeout(()=>{ rollHorses(); renderHippodrome(); }, 1200);
}

/* ============ ЛОТЕРЕЯ ============ */

const LOTTERY_PRICE = 500;
const LOTTERY_POOL = 36;
const LOTTERY_PICK = 6;
let lotterySelected = [];
let lastLotteryResult = null;

const LOTTERY_PRIZES = { 6:5000, 5:200, 4:20, 3:3 }; // множитель цены билета

function renderLottery(){
    const el = document.getElementById("casinoSubview");
    const nums = Array.from({length:LOTTERY_POOL}, (_,i)=>i+1);

    el.innerHTML = `
        <p class="panel-sub">Билет — ${fmtMoney(LOTTERY_PRICE)}. Выберите ${LOTTERY_PICK} чисел из ${LOTTERY_POOL}, угадайте как можно больше в розыгрыше.</p>
        <div class="lottery-grid" id="lotteryGrid"></div>
        <div class="bank-row" style="margin-top:14px; max-width:420px">
            <button id="quickPickBtn">🎲 Быстрый выбор</button>
            <button id="playLotteryBtn">Играть за ${fmtMoney(LOTTERY_PRICE)}</button>
        </div>
        <div id="lotteryResult"></div>
    `;

    const grid = document.getElementById("lotteryGrid");
    grid.innerHTML = nums.map(n=>`<button class="lotto-num ${lotterySelected.includes(n)?'picked':''}" data-num="${n}">${n}</button>`).join("");
    grid.querySelectorAll("[data-num]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            const n = Number(btn.dataset.num);
            if(lotterySelected.includes(n)){
                lotterySelected = lotterySelected.filter(x=>x!==n);
            } else if(lotterySelected.length < LOTTERY_PICK){
                lotterySelected.push(n);
            }
            SoundFX.click();
            renderLottery();
        });
    });

    document.getElementById("quickPickBtn").addEventListener("click", ()=>{
        const pool = [...nums];
        lotterySelected = [];
        while(lotterySelected.length < LOTTERY_PICK && pool.length){
            const idx = Math.floor(Math.random()*pool.length);
            lotterySelected.push(pool.splice(idx,1)[0]);
        }
        SoundFX.click();
        renderLottery();
    });

    document.getElementById("playLotteryBtn").addEventListener("click", playLottery);

    if(lastLotteryResult) renderLotteryResult();
}

function playLottery(){
    const state = Game.state;
    if(lotterySelected.length !== LOTTERY_PICK){
        SoundFX.error(); UI.toast(`Выберите ровно ${LOTTERY_PICK} чисел`); return;
    }
    if(state.money < LOTTERY_PRICE){ SoundFX.error(); UI.toast("Недостаточно денег на билет"); return; }

    state.money -= LOTTERY_PRICE;
    const cs = casinoState(state);

    const pool = Array.from({length:LOTTERY_POOL}, (_,i)=>i+1);
    const drawn = [];
    while(drawn.length < LOTTERY_PICK){
        drawn.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    }
    const matches = lotterySelected.filter(n=>drawn.includes(n)).length;
    const mult = LOTTERY_PRIZES[matches] || 0;
    const prize = mult * LOTTERY_PRICE;

    if(prize>0){
        state.money += prize;
        recordCasinoResult(cs, prize-LOTTERY_PRICE);
        SoundFX.achievement();
    } else {
        recordCasinoResult(cs, -LOTTERY_PRICE);
        SoundFX.error();
    }

    lastLotteryResult = { drawn, selected:[...lotterySelected], matches, prize };
    lotterySelected = [];
    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
    renderLottery();
}

function renderLotteryResult(){
    const r = lastLotteryResult;
    const el = document.getElementById("lotteryResult");
    if(!el || !r) return;
    el.innerHTML = `
        <div class="bank-box" style="margin-top:14px">
            <h3>Результат розыгрыша</h3>
            <p class="hint">Выпало: ${r.drawn.sort((a,b)=>a-b).join(", ")}</p>
            <p class="hint">Ваши числа: ${r.selected.sort((a,b)=>a-b).join(", ")}</p>
            <p>Совпадений: <b>${r.matches}</b></p>
            <p class="${r.prize>0?'profit-pos':'profit-neg'}" style="font-size:16px;font-weight:700">
                ${r.prize>0 ? "Выигрыш: "+fmtMoney(r.prize) : "Без выигрыша"}
            </p>
        </div>
    `;
}

/* ============ ПОКЕР ============ */

const SUITS = ["♠","♥","♦","♣"];
const RANK_LABELS = {11:"J",12:"Q",13:"K",14:"A"};
const HAND_NAMES = ["Старшая карта","Пара","Две пары","Тройка","Стрит","Флеш","Фулл-хаус","Каре","Стрит-флеш"];

let poker = { phase:"bet", deck:[], player:[], dealer:[], held:[false,false,false,false,false], bet:0, resultText:"" };

function freshDeck(){
    const deck = [];
    SUITS.forEach(suit=>{
        for(let v=2; v<=14; v++) deck.push({ suit, value:v, label: RANK_LABELS[v]||String(v) });
    });
    for(let i=deck.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]] = [deck[j],deck[i]];
    }
    return deck;
}

function evaluateHand(cards){
    const values = cards.map(c=>c.value).sort((a,b)=>b-a);
    const isFlush = cards.every(c=>c.suit===cards[0].suit);
    const uniq = [...new Set(values)];
    let isStraight=false, straightHigh=0;
    if(uniq.length===5){
        if(uniq[0]-uniq[4]===4){ isStraight=true; straightHigh=uniq[0]; }
        else if(uniq.join(",")==="14,5,4,3,2"){ isStraight=true; straightHigh=5; }
    }
    const counts = {};
    values.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups = Object.entries(counts).map(([v,c])=>({v:Number(v),c})).sort((a,b)=> b.c-a.c || b.v-a.v);

    let rank;
    if(isStraight && isFlush) rank=8;
    else if(groups[0].c===4) rank=7;
    else if(groups[0].c===3 && groups[1] && groups[1].c===2) rank=6;
    else if(isFlush) rank=5;
    else if(isStraight) rank=4;
    else if(groups[0].c===3) rank=3;
    else if(groups[0].c===2 && groups[1] && groups[1].c===2) rank=2;
    else if(groups[0].c===2) rank=1;
    else rank=0;

    const tiebreak = isStraight ? [straightHigh] : groups.map(g=>g.v);
    return [rank, ...tiebreak];
}

function compareHands(a,b){
    const A = evaluateHand(a), B = evaluateHand(b);
    for(let i=0;i<Math.max(A.length,B.length);i++){
        const av=A[i]||0, bv=B[i]||0;
        if(av!==bv) return av-bv;
    }
    return 0;
}

function cardHtml(card, faceDown){
    if(faceDown) return `<div class="poker-card face-down">🂠</div>`;
    const red = card.suit==="♥"||card.suit==="♦";
    return `<div class="poker-card ${red?'red':''}"><span>${card.label}</span><span>${card.suit}</span></div>`;
}

function renderPoker(){
    const el = document.getElementById("casinoSubview");

    if(poker.phase==="bet"){
        el.innerHTML = `
            <p class="panel-sub">5-карточный покер против дилера. Сдайте карты, оставьте нужные (клик по карте), обменяйте остальные один раз.</p>
            <div class="bank-row" style="max-width:360px">
                <input type="number" id="pokerBet" placeholder="Ставка, ₽" min="0">
                <button id="pokerDealBtn">Сдать карты</button>
            </div>
        `;
        document.getElementById("pokerDealBtn").addEventListener("click", pokerDeal);
        return;
    }

    if(poker.phase==="draw"){
        el.innerHTML = `
            <p class="panel-sub">Кликните по картам, которые хотите оставить, затем нажмите «Обменять и вскрыть».</p>
            <div class="poker-hand" id="pokerPlayerHand"></div>
            <div class="bank-row" style="max-width:320px">
                <button id="pokerFinishBtn">Обменять и вскрыть 🃏</button>
            </div>
        `;
        const hand = document.getElementById("pokerPlayerHand");
        hand.innerHTML = poker.player.map((c,i)=>`
            <div class="poker-card-wrap ${poker.held[i]?'held':''}" data-card="${i}">
                ${cardHtml(c,false)}
                <div class="hold-label">${poker.held[i]?"Держим":""}</div>
            </div>
        `).join("");
        hand.querySelectorAll("[data-card]").forEach(w=>{
            w.addEventListener("click", ()=>{
                const i = Number(w.dataset.card);
                poker.held[i] = !poker.held[i];
                SoundFX.click();
                renderPoker();
            });
        });
        document.getElementById("pokerFinishBtn").addEventListener("click", pokerFinish);
        return;
    }

    if(poker.phase==="result"){
        el.innerHTML = `
            <div class="poker-hand">${poker.player.map(c=>cardHtml(c,false)).join("")}</div>
            <p class="hint" style="margin:4px 0 14px">Ваша комбинация: <b>${HAND_NAMES[evaluateHand(poker.player)[0]]}</b></p>
            <div class="poker-hand">${poker.dealer.map(c=>cardHtml(c,false)).join("")}</div>
            <p class="hint" style="margin:4px 0 14px">Дилер: <b>${HAND_NAMES[evaluateHand(poker.dealer)[0]]}</b></p>
            <p style="font-size:16px;font-weight:700" class="${poker.resultClass}">${poker.resultText}</p>
            <button id="pokerAgainBtn" style="margin-top:10px">Сыграть снова</button>
        `;
        document.getElementById("pokerAgainBtn").addEventListener("click", ()=>{
            poker.phase = "bet";
            renderPoker();
        });
    }
}

function pokerDeal(){
    const state = Game.state;
    const bet = Number(document.getElementById("pokerBet").value);
    if(!(bet>0) || bet>state.money){ SoundFX.error(); UI.toast("Некорректная ставка"); return; }

    state.money -= bet;
    updateTopBar();
    SoundFX.click();

    const deck = freshDeck();
    poker = {
        phase:"draw",
        deck,
        player: deck.splice(0,5),
        dealer: deck.splice(0,5),
        held: [false,false,false,false,false],
        bet
    };
    SaveManager.save(state);
    renderPoker();
}

function computeDealerHold(hand){
    const counts = {};
    hand.forEach(c=>counts[c.value]=(counts[c.value]||0)+1);
    return hand.map(c => counts[c.value]>=2 || c.value>=12);
}

function pokerFinish(){
    const state = Game.state;
    const cs = casinoState(state);

    poker.player = poker.player.map((c,i)=> poker.held[i] ? c : poker.deck.pop());
    const dealerHeld = computeDealerHold(poker.dealer);
    poker.dealer = poker.dealer.map((c,i)=> dealerHeld[i] ? c : poker.deck.pop());

    const cmp = compareHands(poker.player, poker.dealer);

    if(cmp>0){
        state.money += poker.bet*2;
        recordCasinoResult(cs, poker.bet);
        poker.resultText = `Вы выиграли ${fmtMoney(poker.bet*2)}!`;
        poker.resultClass = "profit-pos";
        SoundFX.achievement();
    } else if(cmp<0){
        recordCasinoResult(cs, -poker.bet);
        poker.resultText = "Дилер выиграл раздачу.";
        poker.resultClass = "profit-neg";
        SoundFX.error();
    } else {
        state.money += poker.bet;
        cs.totalGames++;
        poker.resultText = "Ничья — ставка возвращена.";
        poker.resultClass = "";
        SoundFX.click();
    }

    poker.phase = "result";
    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
    renderPoker();
}

/* ============ РУЛЕТКА ============ */

const ROULETTE_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function rouletteColor(n){ if(n===0) return "green"; return ROULETTE_RED.has(n) ? "red" : "black"; }

// Реальный порядок секторов европейского колеса рулетки (37 чисел, включая 0)
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const WHEEL_SLICE = 360/WHEEL_ORDER.length;

function buildWheelGradient(){
    const stops = WHEEL_ORDER.map((n,i)=>{
        const from = (i*WHEEL_SLICE).toFixed(3);
        const to = ((i+1)*WHEEL_SLICE).toFixed(3);
        const color = rouletteColor(n)==="red" ? "#c0392b" : rouletteColor(n)==="black" ? "#161616" : "#166534";
        return `${color} ${from}deg ${to}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
}

function buildWheelNumbers(){
    const radius = 88; // px от центра колеса до цифр
    return WHEEL_ORDER.map((n,i)=>{
        const centerAngle = (i*WHEEL_SLICE + WHEEL_SLICE/2).toFixed(2);
        return `<span class="wheel-number-pos" style="transform:rotate(${centerAngle}deg) translate(0, -${radius}px)"><span class="wheel-number-label">${n}</span></span>`;
    }).join("");
}

let rouletteBet = { type:null, value:null };
let rouletteSpinning = false;
let wheelRotation = 0;

function renderRoulette(){
    const el = document.getElementById("casinoSubview");
    const numbers = Array.from({length:37}, (_,i)=>i); // 0..36

    el.innerHTML = `
        <p class="panel-sub">Поставьте на число (x36), цвет или чёт/нечет (x2), затем крутите колесо.</p>
        <div class="wheel-wrap">
            <div class="wheel-pointer"></div>
            <div class="roulette-wheel" id="rouletteWheel"></div>
            <div class="wheel-hub" id="rouletteHub">–</div>
        </div>
        <div class="roulette-grid" id="rouletteGrid"></div>
        <div class="period-buttons" style="margin:12px 0">
            <button class="period-btn" data-bet-type="color" data-bet-value="red">Красное</button>
            <button class="period-btn" data-bet-type="color" data-bet-value="black">Чёрное</button>
            <button class="period-btn" data-bet-type="parity" data-bet-value="even">Чёт</button>
            <button class="period-btn" data-bet-type="parity" data-bet-value="odd">Нечет</button>
        </div>
        <p class="hint" id="rouletteBetLabel">Ставка не выбрана</p>
        <div class="bank-row" style="max-width:360px">
            <input type="number" id="rouletteBetInput" placeholder="Сумма ставки, ₽" min="0">
            <button id="rouletteSpinBtn">Крутить 🎡</button>
        </div>
    `;

    const wheel = document.getElementById("rouletteWheel");
    wheel.style.background = buildWheelGradient();
    wheel.innerHTML = buildWheelNumbers();
    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    const grid = document.getElementById("rouletteGrid");
    grid.innerHTML = numbers.map(n=>`
        <button class="roulette-num roulette-${rouletteColor(n)} ${rouletteBet.type==='number'&&rouletteBet.value===n?'picked':''}" data-num="${n}">${n}</button>
    `).join("");
    grid.querySelectorAll("[data-num]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            rouletteBet = { type:"number", value:Number(btn.dataset.num) };
            SoundFX.click();
            renderRoulette();
        });
    });

    el.querySelectorAll("[data-bet-type]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
            rouletteBet = { type:btn.dataset.betType, value:btn.dataset.betValue };
            SoundFX.click();
            renderRoulette();
        });
    });

    const labelEl = document.getElementById("rouletteBetLabel");
    if(rouletteBet.type==="number") labelEl.textContent = `Ставка: число ${rouletteBet.value} (x36)`;
    else if(rouletteBet.type==="color") labelEl.textContent = `Ставка: ${rouletteBet.value==='red'?'красное':'чёрное'} (x2)`;
    else if(rouletteBet.type==="parity") labelEl.textContent = `Ставка: ${rouletteBet.value==='even'?'чёт':'нечет'} (x2)`;

    document.getElementById("rouletteSpinBtn").addEventListener("click", spinRoulette);
}

function spinRoulette(){
    if(rouletteSpinning) return;
    const state = Game.state;
    const bet = Number(document.getElementById("rouletteBetInput").value);
    if(!rouletteBet.type){ SoundFX.error(); UI.toast("Сначала выберите ставку"); return; }
    if(!(bet>0) || bet>state.money){ SoundFX.error(); UI.toast("Некорректная ставка"); return; }

    state.money -= bet;
    updateTopBar();
    rouletteSpinning = true;
    document.getElementById("rouletteSpinBtn").disabled = true;
    SoundFX.nextDay();

    const result = Math.floor(Math.random()*37);
    const idx = WHEEL_ORDER.indexOf(result);
    const sliceCenter = idx*WHEEL_SLICE + WHEEL_SLICE/2;
    const targetMod = (360 - sliceCenter + 360) % 360; // угол, на который надо довернуть, чтобы сектор встал под указатель
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if(delta <= 0) delta += 360;
    const spins = 6;
    wheelRotation += spins*360 + delta;

    const wheel = document.getElementById("rouletteWheel");
    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    setTimeout(()=> finishRoulette(result, bet), 3300);
}

function finishRoulette(result, bet){
    const state = Game.state;
    const cs = casinoState(state);
    const hub = document.getElementById("rouletteHub");
    if(hub){
        hub.textContent = result;
        hub.className = "wheel-hub roulette-"+rouletteColor(result);
    }

    let payout = 0;
    if(rouletteBet.type==="number" && rouletteBet.value===result) payout = bet*36;
    else if(rouletteBet.type==="color" && rouletteBet.value===rouletteColor(result)) payout = bet*2;
    else if(rouletteBet.type==="parity" && result!==0){
        const isEven = result%2===0;
        if((rouletteBet.value==="even")===isEven) payout = bet*2;
    }

    if(payout>0){
        state.money += payout;
        recordCasinoResult(cs, payout-bet);
        SoundFX.achievement();
        UI.toast(`🎉 Выпало ${result}! Выигрыш: ${fmtMoney(payout)}`);
    } else {
        recordCasinoResult(cs, -bet);
        SoundFX.error();
        UI.toast(`Выпало ${result}. Ставка не сыграла.`);
    }

    rouletteSpinning = false;
    rouletteBet = { type:null, value:null };
    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
    setTimeout(renderRoulette, 1000);
}

/* ============ БЛЭКДЖЕК (21) ============ */

let bj = { phase:"bet", deck:[], player:[], dealer:[], bet:0, resultText:"", resultClass:"" };

function blackjackValue(cards){
    let total=0, aces=0;
    cards.forEach(c=>{
        let v = (c.value>=11 && c.value<=13) ? 10 : (c.value===14 ? 11 : c.value);
        if(c.value===14) aces++;
        total += v;
    });
    while(total>21 && aces>0){ total-=10; aces--; }
    return total;
}

function renderBlackjack(){
    const el = document.getElementById("casinoSubview");

    if(bj.phase==="bet"){
        el.innerHTML = `
            <p class="panel-sub">Классический блэкджек: наберите 21 или ближе к нему, чем дилер, не превысив.</p>
            <div class="bank-row" style="max-width:360px">
                <input type="number" id="bjBetInput" placeholder="Ставка, ₽" min="0">
                <button id="bjDealBtn">Сдать карты</button>
            </div>
        `;
        document.getElementById("bjDealBtn").addEventListener("click", bjDeal);
        return;
    }

    if(bj.phase==="player"){
        el.innerHTML = `
            <p class="hint">Дилер</p>
            <div class="poker-hand">${cardHtml(bj.dealer[0],false)}${cardHtml(bj.dealer[1],true)}</div>
            <p class="hint">Ваши карты (${blackjackValue(bj.player)})</p>
            <div class="poker-hand">${bj.player.map(c=>cardHtml(c,false)).join("")}</div>
            <div class="bank-row" style="max-width:320px">
                <button id="bjHitBtn">Ещё карту</button>
                <button id="bjStandBtn">Хватит</button>
            </div>
        `;
        document.getElementById("bjHitBtn").addEventListener("click", bjHit);
        document.getElementById("bjStandBtn").addEventListener("click", bjStand);
        return;
    }

    if(bj.phase==="result"){
        el.innerHTML = `
            <p class="hint">Дилер (${blackjackValue(bj.dealer)})</p>
            <div class="poker-hand">${bj.dealer.map(c=>cardHtml(c,false)).join("")}</div>
            <p class="hint">Вы (${blackjackValue(bj.player)})</p>
            <div class="poker-hand">${bj.player.map(c=>cardHtml(c,false)).join("")}</div>
            <p style="font-size:16px;font-weight:700" class="${bj.resultClass}">${bj.resultText}</p>
            <button id="bjAgainBtn" style="margin-top:10px">Сыграть снова</button>
        `;
        document.getElementById("bjAgainBtn").addEventListener("click", ()=>{ bj.phase="bet"; renderBlackjack(); });
    }
}

function bjDeal(){
    const state = Game.state;
    const bet = Number(document.getElementById("bjBetInput").value);
    if(!(bet>0) || bet>state.money){ SoundFX.error(); UI.toast("Некорректная ставка"); return; }

    state.money -= bet;
    updateTopBar();
    SoundFX.click();

    const deck = freshDeck();
    bj = { phase:"player", deck, player:deck.splice(0,2), dealer:deck.splice(0,2), bet, resultText:"", resultClass:"" };
    SaveManager.save(state);

    if(blackjackValue(bj.player)===21){
        bjStand(); // натуральный блэкджек — сразу к развязке
        return;
    }
    renderBlackjack();
}

function bjHit(){
    bj.player.push(bj.deck.pop());
    SoundFX.click();
    if(blackjackValue(bj.player) > 21){
        bjResolve();
        return;
    }
    renderBlackjack();
}

function bjStand(){
    while(blackjackValue(bj.dealer) < 17){
        bj.dealer.push(bj.deck.pop());
    }
    bjResolve();
}

function bjResolve(){
    const state = Game.state;
    const cs = casinoState(state);
    const playerVal = blackjackValue(bj.player);
    const dealerVal = blackjackValue(bj.dealer);
    const playerBJ = playerVal===21 && bj.player.length===2;
    const dealerBJ = dealerVal===21 && bj.dealer.length===2;

    if(playerVal>21){
        recordCasinoResult(cs, -bj.bet);
        bj.resultText = "Перебор — вы проиграли."; bj.resultClass = "profit-neg";
        SoundFX.error();
    } else if(dealerVal>21){
        state.money += bj.bet*2;
        recordCasinoResult(cs, bj.bet);
        bj.resultText = `Перебор у дилера! Выигрыш: ${fmtMoney(bj.bet*2)}`; bj.resultClass = "profit-pos";
        SoundFX.achievement();
    } else if(playerBJ && !dealerBJ){
        const payout = Math.round(bj.bet*2.5);
        state.money += payout;
        recordCasinoResult(cs, payout-bj.bet);
        bj.resultText = `Блэкджек! Выигрыш: ${fmtMoney(payout)}`; bj.resultClass = "profit-pos";
        SoundFX.achievement();
    } else if(playerVal>dealerVal){
        state.money += bj.bet*2;
        recordCasinoResult(cs, bj.bet);
        bj.resultText = `Вы выиграли ${fmtMoney(bj.bet*2)}!`; bj.resultClass = "profit-pos";
        SoundFX.achievement();
    } else if(playerVal<dealerVal){
        recordCasinoResult(cs, -bj.bet);
        bj.resultText = "Дилер выиграл."; bj.resultClass = "profit-neg";
        SoundFX.error();
    } else {
        state.money += bj.bet;
        cs.totalGames++;
        bj.resultText = "Ничья — ставка возвращена."; bj.resultClass = "";
        SoundFX.click();
    }

    bj.phase = "result";
    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
    renderBlackjack();
}

/* ============ ОДНОРУКИЙ БАНДИТ ============ */

const SLOT_SYMBOLS = [
    { icon:"🍒", mult:4 },
    { icon:"🍋", mult:6 },
    { icon:"🔔", mult:10 },
    { icon:"⭐", mult:16 },
    { icon:"💎", mult:25 },
    { icon:"7️⃣", mult:50 }
];

let slotSpinning = false;
let slotReels = [0,1,2];

function renderSlots(){
    const el = document.getElementById("casinoSubview");
    el.innerHTML = `
        <p class="panel-sub">Три одинаковых символа — джекпот по множителю символа. Два одинаковых — половина ставки назад.</p>
        <div class="slot-machine">
            <div class="slot-reel" id="slotReel0">${SLOT_SYMBOLS[slotReels[0]].icon}</div>
            <div class="slot-reel" id="slotReel1">${SLOT_SYMBOLS[slotReels[1]].icon}</div>
            <div class="slot-reel" id="slotReel2">${SLOT_SYMBOLS[slotReels[2]].icon}</div>
        </div>
        <div class="bank-row" style="max-width:360px; margin-top:14px">
            <input type="number" id="slotBet" placeholder="Ставка, ₽" min="0">
            <button id="slotSpinBtn">Крутить 🎰</button>
        </div>
    `;
    document.getElementById("slotSpinBtn").addEventListener("click", spinSlots);
}

function spinSlots(){
    if(slotSpinning) return;
    const state = Game.state;
    const bet = Number(document.getElementById("slotBet").value);
    if(!(bet>0) || bet>state.money){ SoundFX.error(); UI.toast("Некорректная ставка"); return; }

    state.money -= bet;
    updateTopBar();
    slotSpinning = true;
    document.getElementById("slotSpinBtn").disabled = true;
    SoundFX.nextDay();

    const finals = [
        Math.floor(Math.random()*SLOT_SYMBOLS.length),
        Math.floor(Math.random()*SLOT_SYMBOLS.length),
        Math.floor(Math.random()*SLOT_SYMBOLS.length)
    ];
    const stopDelays = [700, 1200, 1800];

    [0,1,2].forEach(reelIdx=>{
        const reelEl = document.getElementById("slotReel"+reelIdx);
        const spin = setInterval(()=>{
            reelEl.textContent = SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)].icon;
        }, 70);
        setTimeout(()=>{
            clearInterval(spin);
            slotReels[reelIdx] = finals[reelIdx];
            reelEl.textContent = SLOT_SYMBOLS[finals[reelIdx]].icon;
            if(reelIdx===2) finishSlots(finals, bet);
        }, stopDelays[reelIdx]);
    });
}

function finishSlots(finals, bet){
    const state = Game.state;
    const cs = casinoState(state);
    document.getElementById("slotSpinBtn").disabled = false;
    slotSpinning = false;

    let payout = 0;
    if(finals[0]===finals[1] && finals[1]===finals[2]){
        payout = bet * SLOT_SYMBOLS[finals[0]].mult;
    } else if(finals[0]===finals[1] || finals[1]===finals[2] || finals[0]===finals[2]){
        payout = Math.round(bet*0.5);
    }

    if(payout>0){
        state.money += payout;
        recordCasinoResult(cs, payout-bet);
        SoundFX.achievement();
        UI.toast(`Выигрыш: ${fmtMoney(payout)}`);
    } else {
        recordCasinoResult(cs, -bet);
        SoundFX.error();
        UI.toast("Не повезло — попробуйте ещё раз");
    }

    checkAchievements(state);
    updateTopBar();
    SaveManager.save(state);
}
