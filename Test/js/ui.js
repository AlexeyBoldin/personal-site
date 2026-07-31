/*=========================================
  Market Empire — ui.js
  Навигация, графики, отрисовка экранов
=========================================*/

const UI = {

    toast(msg){
        let el = document.getElementById("toastEl");
        if(!el){
            el = document.createElement("div");
            el.id = "toastEl";
            el.className = "toast";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add("show");
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(()=>el.classList.remove("show"), 2400);
    },

    showView(name){
        SoundFX.nav();
        document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
        document.getElementById("view-"+name).classList.add("active");
        document.querySelectorAll(".nav-item[data-view]").forEach(b=>{
            b.classList.toggle("active", b.dataset.view===name);
        });
        if(name==="portfolio") renderPortfolio();
        if(name==="news") renderNews();
        if(name==="bank") renderBank();
        if(name==="casino") renderCasino();
        if(name==="family") renderFamily();
        if(name==="assets") renderAssets();
        if(name==="reports") renderReports();
        if(name==="achievements") renderAchievements();
        if(name==="settings") renderSettings();
        if(name==="market") ChartModule.renderMainChart();
    },

    initNav(){
        document.querySelectorAll("[data-view]").forEach(el=>{
            el.addEventListener("click", ()=> UI.showView(el.dataset.view));
        });

        const calTrigger = document.getElementById("calendarTrigger");
        const calPopover = document.getElementById("calendarPopover");
        calTrigger.addEventListener("click", (e)=>{
            e.stopPropagation();
            calPopover.classList.toggle("hidden");
        });
        document.addEventListener("click", (e)=>{
            if(!calTrigger.contains(e.target)) calPopover.classList.add("hidden");
        });
    }
};

// --------------------------
// Верхняя панель и статус-строка
// --------------------------

let _lastShownMoney = null;
let _lastShownDay = null;

function animateNumber(el, from, to, duration, formatter){
    if(from === null || from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches){
        el.textContent = formatter(to);
        return;
    }
    const start = performance.now();
    function tick(now){
        const p = Math.min(1, (now-start)/duration);
        const eased = 1 - Math.pow(1-p, 3);
        const val = from + (to-from)*eased;
        el.textContent = formatter(val);
        if(p<1) requestAnimationFrame(tick);
        else el.textContent = formatter(to);
    }
    requestAnimationFrame(tick);
}

const RU_MONTHS_SHORT = ["ЯНВ","ФЕВ","МАР","АПР","МАЙ","ИЮН","ИЮЛ","АВГ","СЕН","ОКТ","НОЯ","ДЕК"];

function updateTopBar(){
    const state = Game.state;
    const gameDate = new Date(state.date);
    document.getElementById("calIconDay").textContent = gameDate.getDate();
    document.getElementById("calIconMonth").textContent = RU_MONTHS_SHORT[gameDate.getMonth()];

    const moneyEl = document.getElementById("moneyLabel");
    animateNumber(moneyEl, _lastShownMoney, state.money, 550, v=>fmtMoney(v));
    if(_lastShownMoney !== null && state.money !== _lastShownMoney){
        moneyEl.classList.remove("pulse-up","pulse-down");
        void moneyEl.offsetWidth;
        moneyEl.classList.add(state.money >= _lastShownMoney ? "pulse-up" : "pulse-down");
    }
    _lastShownMoney = state.money;

    const dayEl = document.getElementById("dayNum");
    if(_lastShownDay !== null && state.day !== _lastShownDay){
        dayEl.closest(".stat").classList.remove("day-flip");
        void dayEl.offsetWidth;
        dayEl.closest(".stat").classList.add("day-flip");
    }
    _lastShownDay = state.day;

    document.getElementById("dayNum").textContent = state.day;
    document.getElementById("dateLabel").textContent = formatDate(state.date);
    document.getElementById("repValue").textContent = state.reputation;
    document.getElementById("repFill").style.width = state.reputation + "%";

    document.getElementById("econStatus").textContent = ECON_LABELS[state.economyStatus] || "Стабильная";
    document.getElementById("inflationLabel").textContent = state.inflation.toFixed(1) + "%";
    document.getElementById("usdLabel").textContent = state.usdRate.toFixed(2) + " ₽";

    const t = state.lastSave ? new Date(state.lastSave) : new Date();
    document.getElementById("autosaveLabel").textContent =
        t.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

    renderCalendarPopover();

    const badge = document.getElementById("familyBadge");
    const pendingCount = state.messages ? state.messages.pending.length : 0;
    if(pendingCount>0){
        badge.textContent = pendingCount;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

// --------------------------
// Глобус: настоящее вращение сферы через проекцию (не CSS-флип)
// Условная карта мира — вытянутые "материки" на правильных относительных долготах
// --------------------------

const GLOBE_BLOBS = [
    { lon:10,  lat:38,  w:15, h:10, r:"55% 45% 60% 40% / 50% 60% 40% 50%" }, // Европа
    { lon:20,  lat:-6,  w:16, h:26, r:"50% 50% 45% 55% / 60% 55% 45% 40%" }, // Африка
    { lon:60,  lat:18,  w:17, h:15, r:"50% 50% 40% 60% / 55% 45% 55% 45%" }, // Ю. и Ц. Азия
    { lon:95,  lat:40,  w:22, h:14, r:"45% 55% 50% 50% / 55% 45% 55% 45%" }, // Сибирь/Китай
    { lon:120, lat:8,   w:11, h:9,  r:"50% 50% 55% 45% / 45% 55% 50% 50%" }, // ЮВ Азия
    { lon:135, lat:-30, w:13, h:10, r:"55% 45% 50% 50% / 50% 50% 45% 55%" }, // Австралия
    { lon:245, lat:62,  w:11, h:9,  r:"50% 50% 45% 55% / 55% 45% 50% 50%" }, // Гренландия
    { lon:250, lat:38,  w:21, h:17, r:"50% 50% 45% 55% / 45% 55% 50% 50%" }, // Сев. Америка
    { lon:265, lat:10,  w:8,  h:6,  r:"50% 50% 50% 50% / 55% 45% 55% 45%" }, // Центр. Америка
    { lon:290, lat:-18, w:13, h:24, r:"45% 55% 50% 50% / 50% 60% 40% 50%" }  // Юж. Америка
];

const GlobeAnim = {
    blobs: [],
    reduced: false,

    init(){
        this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const sphere = document.getElementById("globeSphere");
        if(!sphere) return;

        this.blobs = GLOBE_BLOBS.map(b=>{
            const el = document.createElement("div");
            el.className = "globe-blob";
            el.style.width = b.w+"px";
            el.style.height = b.h+"px";
            el.style.borderRadius = b.r;
            sphere.appendChild(el);
            return { el, lon:b.lon, lat:b.lat };
        });

        if(this.reduced){ this.render(0); return; }

        const loop = (t)=>{
            // знак минус — вращение против часовой стрелки (привычное направление)
            const angle = (-t/45) % 360;
            const newsView = document.getElementById("view-news");
            if(newsView && newsView.classList.contains("active")) this.render(angle);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    render(angleDeg){
        const R = 26; // радиус орбиты точек внутри сферы, px
        this.blobs.forEach(b=>{
            const rad = (b.lon + angleDeg) * Math.PI/180;
            const x = Math.sin(rad) * R;              // горизонтальное положение от вращения
            const depth = Math.cos(rad);               // -1 (дальняя сторона) .. 1 (ближняя)
            const y = -(b.lat/100) * R;                 // широта — постоянная по высоте
            const scaleX = Math.max(0.15, Math.abs(depth)); // сплющивание у края сферы
            const visible = depth > -0.15;              // скрыто на дальней стороне

            b.el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scaleX(${scaleX.toFixed(2)})`;
            b.el.style.opacity = visible ? Math.max(0.35, depth).toFixed(2) : 0;
            b.el.style.zIndex = depth > 0 ? 2 : 1;
        });
    }
};

// --------------------------
// Мини-календарь
// --------------------------

const RU_MONTHS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const RU_WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function renderCalendarPopover(){
    const state = Game.state;
    const pop = document.getElementById("calendarPopover");
    if(!pop) return;

    const d = new Date(state.date);
    const year = d.getFullYear(), month = d.getMonth(), today = d.getDate();
    const firstWeekday = (new Date(year, month, 1).getDay()+6)%7; // 0=Пн
    const daysInMonth = new Date(year, month+1, 0).getDate();

    let cells = "";
    for(let i=0;i<firstWeekday;i++) cells += `<span class="cal-cell empty"></span>`;
    for(let day=1; day<=daysInMonth; day++){
        cells += `<span class="cal-cell ${day===today?'is-today':''}">${day}</span>`;
    }

    pop.innerHTML = `
        <div class="cal-header">${RU_MONTHS[month]} ${year}</div>
        <div class="cal-weekdays">${RU_WEEKDAYS.map(w=>`<span>${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
    `;
}

function formatDate(iso){
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU",{ day:"numeric", month:"long", year:"numeric" });
}

// --------------------------
// Главный график цены
// --------------------------

const ChartModule = {
    period: 7,

    init(){
        document.querySelectorAll(".period-btn").forEach(btn=>{
            btn.addEventListener("click", ()=>{
                document.querySelectorAll(".period-btn").forEach(b=>b.classList.remove("active"));
                btn.classList.add("active");
                this.period = parseInt(btn.dataset.period,10);
                this.renderMainChart();
            });
        });

        const select = document.getElementById("chartGoodSelect");
        select.innerHTML = GOODS.map(g=>`<option value="${g.id}">${g.name}</option>`).join("");
        select.value = selectedGood;
        select.addEventListener("change", ()=>{
            selectedGood = select.value;
            SoundFX.click();
            renderMarket();
            this.renderMainChart();
        });
    },

    _lastData: null,
    _lastKey: null,
    _animFrame: null,

    renderMainChart(){
        const state = Game.state;
        const good = findGood(selectedGood);
        document.getElementById("chartTitle").textContent = `График цен: ${good.name} (${this.period} дн.)`;
        renderEconStats(state, selectedGood);

        let n = this.period === 1 ? 2 : this.period;
        const hist = ensureHistory(state, selectedGood, state.day);
        let data = hist.slice(Math.max(0, state.day-n), state.day);
        if(this.period === 1){
            // синтетическая внутридневная волатильность для показа за "1 день"
            const rnd = seedRandom(state.seed + state.day*3);
            const last = data[data.length-1];
            data = Array.from({length:12}, (_,i)=> last*(1+(rnd()-0.5)*0.01*i/2));
            data[data.length-1] = last;
        }
        if(data.length<2) data = [data[0]||good.base, data[0]||good.base];

        const key = selectedGood+"|"+this.period;
        const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const canAnimate = !reduceMotion && this._lastKey === key && this._lastData && this._lastData.length === data.length;

        if(this._animFrame) cancelAnimationFrame(this._animFrame);

        if(canAnimate){
            const from = this._lastData;
            const to = data;
            const start = performance.now();
            const duration = 420;
            const step = (now)=>{
                const p = Math.min(1, (now-start)/duration);
                const eased = 1 - Math.pow(1-p,3);
                const frame = from.map((v,i)=> v + (to[i]-v)*eased);
                this._drawChart(frame, good);
                if(p<1) this._animFrame = requestAnimationFrame(step);
            };
            this._animFrame = requestAnimationFrame(step);
        } else {
            this._drawChart(data, good);
        }

        this._lastData = data;
        this._lastKey = key;
    },

    _drawChart(data, good){
        const canvas = document.getElementById("mainChart");
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
        const cssH = 220;
        canvas.width = cssW*dpr; canvas.height = cssH*dpr;
        canvas.style.width = cssW+"px"; canvas.style.height = cssH+"px";
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.clearRect(0,0,cssW,cssH);

        const pad = {l:54,r:16,t:14,b:26};
        const w = cssW-pad.l-pad.r, h = cssH-pad.t-pad.b;
        const min = Math.min(...data), max = Math.max(...data);
        const range = (max-min)||1;
        const up = data[data.length-1] >= data[0];
        const lineColor = up ? "#22c55e" : "#ef4444";

        // сетка + подписи Y
        ctx.strokeStyle = "rgba(255,255,255,.06)";
        ctx.fillStyle = "#8fa0b8";
        ctx.font = "11px Arial";
        ctx.textAlign = "right";
        const steps = 4;
        for(let i=0;i<=steps;i++){
            const y = pad.t + h - (h/steps)*i;
            const val = min + (range/steps)*i;
            ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.stroke();
            ctx.fillText(Math.round(val).toLocaleString("ru-RU"), pad.l-8, y+4);
        }

        // линия
        ctx.beginPath();
        data.forEach((v,i)=>{
            const x = pad.l + (i/(data.length-1))*w;
            const y = pad.t + h - ((v-min)/range)*h;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.stroke();

        // заливка
        const lastX = pad.l+w, firstX = pad.l;
        ctx.lineTo(lastX, pad.t+h); ctx.lineTo(firstX, pad.t+h); ctx.closePath();
        const grad = ctx.createLinearGradient(0,pad.t,0,pad.t+h);
        grad.addColorStop(0, up? "rgba(34,197,94,.22)":"rgba(239,68,68,.22)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fill();

        // точки на концах + подпись последней цены
        const lx = pad.l + w, ly = pad.t + h - ((data[data.length-1]-min)/range)*h;
        ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2); ctx.fillStyle = lineColor; ctx.fill();

        ctx.textAlign = "left";
        ctx.fillStyle = lineColor;
        ctx.font = "bold 12px Arial";
        const label = Math.round(data[data.length-1]).toLocaleString("ru-RU")+" ₽";
        const lw = ctx.measureText(label).width;
        ctx.fillRect(Math.min(lx+6, cssW-lw-16), ly-10, lw+10, 20);
        ctx.fillStyle = "#0b1220";
        ctx.fillText(label, Math.min(lx+11, cssW-lw-11), ly+4);

        // подписи X (даты, только для периодов >1)
        if(this.period>1){
            ctx.fillStyle = "#8fa0b8";
            ctx.font = "10.5px Arial";
            ctx.textAlign = "center";
            const labelCount = Math.min(6, data.length);
            for(let i=0;i<labelCount;i++){
                const idx = Math.round(i*(data.length-1)/(labelCount-1||1));
                const dayOffset = (data.length-1-idx);
                const d = new Date(Game.state.date);
                d.setDate(d.getDate()-dayOffset);
                const x = pad.l + (idx/(data.length-1))*w;
                ctx.fillText(d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"}), x, cssH-6);
            }
        }
    }
};

// --------------------------
// Портфель
// --------------------------

function buildPortfolioRows(state){
    return GOODS
        .map(g=>({ good:g, pos: state.portfolio[g.id] }))
        .filter(r=>r.pos && r.pos.qty>0)
        .map(r=>{
            const price = currentPrice(state, r.good.id);
            const profit = (price - r.pos.avgPrice) * r.pos.qty;
            const profitPct = r.pos.avgPrice ? (price-r.pos.avgPrice)/r.pos.avgPrice*100 : 0;
            return { ...r, price, profit, profitPct, value: price*r.pos.qty };
        });
}

function renderPortfolioTable(el, rows, compact){
    if(rows.length===0){
        el.innerHTML = `<div class="empty-state">Портфель пуст — купите первый товар на бирже</div>`;
        return;
    }
    const rowsHtml = rows.map(r=>`
        <tr>
            <td>${r.good.icon} ${r.good.name}</td>
            <td>${r.pos.qty}</td>
            <td>${fmtMoney(r.pos.avgPrice)}</td>
            <td>${fmtMoney(r.price)}</td>
            <td class="${r.profit>=0?'profit-pos':'profit-neg'}">${fmtSigned(r.profit)} ₽</td>
            ${compact?"":`<td class="${r.profit>=0?'profit-pos':'profit-neg'}">${fmtSigned(r.profitPct)}%</td>`}
        </tr>
    `).join("");

    el.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Товар</th><th>Кол-во</th><th>Ср. цена</th><th>Тек. цена</th><th>Прибыль</th>${compact?"":"<th>%</th>"}
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

function renderPortfolio(){
    const state = Game.state;
    const rows = buildPortfolioRows(state);

    renderPortfolioTable(document.getElementById("portfolioMiniTable"), rows.slice(0,4), true);
    renderPortfolioTable(document.getElementById("portfolioFullTable"), rows, false);

    const totalValue = rows.reduce((s,r)=>s+r.value,0);
    const totalProfit = rows.reduce((s,r)=>s+r.profit,0);
    const summaryHtml = `
        <div class="portfolio-summary">
            <span>Стоимость портфеля: <b>${fmtMoney(totalValue)}</b></span>
            <span>Общая прибыль: <b class="${totalProfit>=0?'profit-pos':'profit-neg'}">${fmtSigned(totalProfit)} ₽</b></span>
        </div>`;
    document.getElementById("portfolioFullTable").insertAdjacentHTML("beforeend", summaryHtml);
    if(rows.length) document.getElementById("portfolioMiniTable").insertAdjacentHTML("beforeend", summaryHtml);

    renderOwnedAssets();
}

// --------------------------
// Банк
// --------------------------

function renderBank(){
    const state = Game.state;
    const el = document.getElementById("bankContent");
    const maxLoan = bankMaxLoan(state);

    el.innerHTML = `
        <div class="bank-grid">
            <div class="bank-box">
                <h3>💰 Депозит</h3>
                <p class="hint">Начисление ~${(BANK_DEPOSIT_RATE*365*100).toFixed(1)}% годовых, ежедневно.</p>
                <div class="big-num">${fmtMoney(state.bank.deposit)}</div>
                <div class="bank-row">
                    <input type="number" id="depositAmount" placeholder="Сумма" min="0">
                    <button id="depositBtn">Внести</button>
                </div>
                <div class="bank-row">
                    <input type="number" id="withdrawAmount" placeholder="Сумма" min="0">
                    <button id="withdrawBtn">Снять</button>
                </div>
            </div>
            <div class="bank-box">
                <h3>🏦 Кредит</h3>
                <p class="hint">Ставка ~${(BANK_LOAN_RATE*365*100).toFixed(1)}% годовых. Лимит зависит от репутации: ${fmtMoney(maxLoan)}.</p>
                <div class="big-num">${fmtMoney(state.bank.loan)}</div>
                <div class="bank-row">
                    <input type="number" id="loanAmount" placeholder="Сумма" min="0">
                    <button id="loanBtn">Взять</button>
                </div>
                <div class="bank-row">
                    <input type="number" id="repayAmount" placeholder="Сумма" min="0">
                    <button id="repayBtn">Погасить</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("depositBtn").onclick = ()=>{ SoundFX.click(); bankDeposit(Number(document.getElementById("depositAmount").value)); };
    document.getElementById("withdrawBtn").onclick = ()=>{ SoundFX.click(); bankWithdraw(Number(document.getElementById("withdrawAmount").value)); };
    document.getElementById("loanBtn").onclick = ()=>{ SoundFX.click(); bankTakeLoan(Number(document.getElementById("loanAmount").value)); };
    document.getElementById("repayBtn").onclick = ()=>{ SoundFX.click(); bankRepayLoan(Number(document.getElementById("repayAmount").value)); };
}

// --------------------------
// Отчёты
// --------------------------

function renderReports(){
    const state = Game.state;
    const el = document.getElementById("reportsContent");
    const rows = buildPortfolioRows(state);
    const netWorth = state.money + state.bank.deposit - state.bank.loan + rows.reduce((s,r)=>s+r.value,0);

    el.innerHTML = `
        <div class="stat-cards">
            <div class="stat-card"><div class="lbl">Чистый капитал</div><div class="num">${fmtMoney(netWorth)}</div></div>
            <div class="stat-card"><div class="lbl">Сделок всего</div><div class="num">${state.stats.trades}</div></div>
            <div class="stat-card"><div class="lbl">Покупок</div><div class="num">${state.stats.buys}</div></div>
            <div class="stat-card"><div class="lbl">Продаж</div><div class="num">${state.stats.sells}</div></div>
            <div class="stat-card"><div class="lbl">Дней сыграно</div><div class="num">${state.day}</div></div>
            <div class="stat-card"><div class="lbl">Товаров в портфеле</div><div class="num">${rows.length}</div></div>
        </div>
        <p class="panel-sub" style="margin-top:16px">Начальный капитал был 100 000 ₽. Текущая динамика: ${fmtSigned(netWorth-100000)} ₽ за ${state.day} дн.</p>
    `;
}

// --------------------------
// Достижения
// --------------------------

function renderAchievements(){
    const state = Game.state;
    const el = document.getElementById("achievementsContent");
    el.innerHTML = `<div class="ach-grid">` + ACHIEVEMENTS.map(a=>{
        const unlocked = !!state.achievements[a.id];
        return `
            <div class="ach-card ${unlocked?"":"locked"}">
                <span class="ach-emoji">${unlocked?a.emoji:"🔒"}</span>
                <div>
                    <div class="ach-name">${a.name}</div>
                    <div class="ach-desc">${a.desc}</div>
                </div>
            </div>`;
    }).join("") + `</div>`;
}

// --------------------------
// Настройки
// --------------------------

function renderSettings(){
    const state = Game.state;
    const el = document.getElementById("settingsContent");
    el.innerHTML = `
        <div class="settings-row">
            <div><div class="lbl">Автосохранение</div><div class="hint">Игра сохраняется после каждого дня и сделки</div></div>
            <div class="toggle on" id="toggleAutosave"></div>
        </div>
        <div class="settings-row">
            <div><div class="lbl">Звук</div><div class="hint">Звуковые эффекты интерфейса</div></div>
            <div class="toggle ${state.settings.sound?"on":""}" id="toggleSound"></div>
        </div>
        <div class="settings-row">
            <div><div class="lbl">Сбросить прогресс</div><div class="hint">Удаляет сохранение безвозвратно</div></div>
            <button class="btn-danger" id="resetBtn">Сбросить</button>
        </div>
    `;
    document.getElementById("toggleSound").addEventListener("click", (e)=>{
        state.settings.sound = !state.settings.sound;
        e.target.classList.toggle("on", state.settings.sound);
        SaveManager.save(state);
    });
    document.getElementById("resetBtn").addEventListener("click", ()=>{
        if(confirm("Точно сбросить весь прогресс? Это действие необратимо.")){
            SaveManager.reset();
            location.reload();
        }
    });
}
