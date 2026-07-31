/*=========================================
  Market Empire — news.js
  Отрисовка ленты новостей (генерация — в events.js)
=========================================*/

function renderNews(){
    const state = Game.state;
    const mini = document.getElementById("newsFeedMini");
    const full = document.getElementById("newsFeedFull");

    const renderList = (el, items)=>{
        if(items.length===0){
            el.innerHTML = `<div class="empty-state">Пока новостей нет</div>`;
            return;
        }
        el.innerHTML = items.map(n=>{
            const cred = CREDIBILITY_LABELS[n.credibility] || CREDIBILITY_LABELS.analytical;
            return `
            <div class="news-item ${n.major?'news-major':''}">
                <span class="news-icon">${n.icon}</span>
                <div class="news-body-wrap">
                    <div class="news-title-row">
                        <span class="news-title">${n.title}</span>
                        <span class="cred-badge" style="background:${cred.color}22;color:${cred.color};border-color:${cred.color}55">${cred.label}</span>
                    </div>
                    <div class="news-body">${n.body}</div>
                </div>
                <span class="news-time">День ${n.day}</span>
            </div>
        `;
        }).join("");
    };

    renderList(mini, state.newsLog.slice(0,4));
    renderList(full, state.newsLog.slice(0,60));
}
