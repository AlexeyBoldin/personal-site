/* ==========================================
   PERSONAL ARCHIVE
   Version 0.1
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    const hero = document.querySelector(".hero-content");
    const coat = document.querySelector(".coat");
    const title = document.querySelector("h1");
    const subtitle = document.querySelector("h2");
    const motto = document.querySelector(".motto");
    const buttons = document.querySelector(".buttons");

    // Скрываем элементы перед появлением
    [coat, title, subtitle, motto, buttons].forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
    });

    // Последовательное появление
    fadeIn(coat, 500);
    fadeIn(title, 1200);
    fadeIn(subtitle, 1700);
    fadeIn(motto, 2200);
    fadeIn(buttons, 2800);

    // Запускаем золотой блик
    setInterval(shimmer, 7000);

});


/* ==========================================
   Плавное появление
========================================== */

function fadeIn(element, delay){

    setTimeout(()=>{

        element.style.transition =
            "all 1.2s ease";

        element.style.opacity="1";
        element.style.transform="translateY(0px)";

    },delay);

}


/* ==========================================
   Золотой блик по гербу
========================================== */

function shimmer(){

    const coat=document.querySelector(".coat");

    coat.animate([

        {
            filter:"drop-shadow(0 0 10px rgba(200,162,75,.2))"
        },

        {
            filter:"drop-shadow(0 0 55px rgba(255,220,120,.95))"
        },

        {
            filter:"drop-shadow(0 0 10px rgba(200,162,75,.2))"
        }

    ],{

        duration:1800,
        easing:"ease-in-out"

    });

}


/* ==========================================
   Эффект движения мышью
========================================== */

document.addEventListener("mousemove",(e)=>{

    const coat=document.querySelector(".coat");

    const x=
    (window.innerWidth/2-e.clientX)/60;

    const y=
    (window.innerHeight/2-e.clientY)/60;

    coat.style.transform=
    `translate(${x}px,${y}px)`;

});


/* ==========================================
   Кнопки
========================================== */

document.querySelector(".gold").addEventListener("click",()=>{

    alert("Экскурсия появится в версии 0.2");

});

document.querySelector(".green").addEventListener("click",()=>{

    alert("Добро пожаловать в архив!");

});


/* ==========================================
   Мерцание звезд
========================================== */

setInterval(()=>{

    const stars=document.getElementById("stars");

    stars.style.opacity=
        0.15+Math.random()*0.2;

},1800);