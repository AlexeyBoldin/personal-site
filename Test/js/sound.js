/*=========================================
  Market Empire — sound.js
  Звуковые эффекты (синтез через Web Audio API)
=========================================*/

const SoundFX = {
    ctx: null,

    enabled(){
        return !Game.state || !Game.state.settings ? true : Game.state.settings.sound !== false;
    },

    getCtx(){
        if(!this.ctx){
            const AC = window.AudioContext || window.webkitAudioContext;
            if(!AC) return null;
            this.ctx = new AC();
        }
        if(this.ctx.state === "suspended") this.ctx.resume();
        return this.ctx;
    },

    tone(freq, duration, type, gainPeak, delay){
        if(!this.enabled()) return;
        const ctx = this.getCtx();
        if(!ctx) return;
        const t0 = ctx.currentTime + (delay||0);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(gainPeak||0.12, t0+0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);

        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0+duration+0.02);
    },

    click(){ this.tone(720, 0.07, "sine", 0.08); },

    nav(){ this.tone(500, 0.05, "sine", 0.06); },

    buy(){
        this.tone(440, 0.09, "triangle", 0.1);
        this.tone(660, 0.12, "triangle", 0.08, 0.05);
    },

    sell(){
        this.tone(520, 0.09, "triangle", 0.1);
        this.tone(360, 0.14, "triangle", 0.08, 0.05);
    },

    nextDay(){
        this.tone(300, 0.08, "sine", 0.07);
        this.tone(450, 0.08, "sine", 0.07, 0.09);
        this.tone(600, 0.14, "sine", 0.09, 0.18);
    },

    priceUp(){ this.tone(880, 0.06, "sine", 0.05); },
    priceDown(){ this.tone(260, 0.08, "sine", 0.05); },

    achievement(){
        this.tone(523, 0.1, "triangle", 0.1);
        this.tone(659, 0.1, "triangle", 0.1, 0.1);
        this.tone(784, 0.22, "triangle", 0.12, 0.2);
    },

    error(){ this.tone(180, 0.15, "sawtooth", 0.06); }
};
