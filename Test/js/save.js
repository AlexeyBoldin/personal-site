/*=========================================
  Market Empire — save.js
  Сохранение и загрузка прогресса
=========================================*/

const SAVE_KEY = "marketEmpireSave_v2";

const SaveManager = {

    hasSave(){
        return !!localStorage.getItem(SAVE_KEY);
    },

    save(state){
        try{
            state.lastSave = Date.now();
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
            return true;
        }catch(e){
            console.error("Не удалось сохранить игру:", e);
            return false;
        }
    },

    load(){
        const raw = localStorage.getItem(SAVE_KEY);
        if(!raw) return null;
        try{
            return JSON.parse(raw);
        }catch(e){
            console.error("Сохранение повреждено:", e);
            return null;
        }
    },

    reset(){
        localStorage.removeItem(SAVE_KEY);
    }

};
