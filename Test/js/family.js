/*=========================================
  Market Empire — family.js
  Отношения в семье + шаблоны семейных сообщений
  (сама очередь сообщений и остальные отправители — в messages.js)
=========================================*/

const FAMILY_TEMPLATES = [
    { sender:"Жена", avatar:"👩", text:"Можно я куплю новую сумку? Присмотрела за {amount} ₽.", min:2000, max:12000 },
    { sender:"Жена", avatar:"👩", text:"Хочу записаться на курсы йоги, стоит {amount} ₽ в месяц.", min:1500, max:6000 },
    { sender:"Сын", avatar:"👦", text:"Пап, нужны новые кроссовки для секции, {amount} ₽.", min:1000, max:5000 },
    { sender:"Сын", avatar:"👦", text:"Можно денег на новую игру? Всего {amount} ₽.", min:500, max:3000 },
    { sender:"Дочь", avatar:"👧", text:"Пап, у подруги день рождения, нужен подарок за {amount} ₽.", min:800, max:4000 },
    { sender:"Дочь", avatar:"👧", text:"Хочу на дополнительные занятия по рисованию, {amount} ₽ за месяц.", min:2000, max:7000 },
    { sender:"Мама", avatar:"👵", text:"Сынок, нужно подлатать крышу на даче, просят {amount} ₽.", min:5000, max:20000 },
    { sender:"Мама", avatar:"👵", text:"Нужны лекарства, не хватает {amount} ₽.", min:1000, max:8000 },
    { sender:"Друг", avatar:"🧑", text:"Займи до получки {amount} ₽? Верну как обычно.", min:3000, max:15000 }
];

function familyState(state){
    if(!state.family) state.family = { relationship:60 };
    // миграция старого формата (до v0.1.2 очередь сообщений жила прямо в state.family)
    if(Array.isArray(state.family.messages) || Array.isArray(state.family.log)){
        messagesState(state); // гарантирует существование state.messages
        (state.family.messages||[]).forEach(m=> state.messages.pending.push({ ...m, category:"family" }));
        (state.family.log||[]).forEach(m=> state.messages.log.push({ ...m, category:"family" }));
        delete state.family.messages;
        delete state.family.log;
    }
    return state.family;
}
