const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

let stars = [];

function resize(){

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

}

window.addEventListener("resize", resize);
resize();

class Star{

    constructor(){

        this.reset();

    }

    reset(){

        this.x=Math.random()*canvas.width;
        this.y=Math.random()*canvas.height;

        this.size=Math.random()*2;

        this.alpha=Math.random();

        this.speed=0.05+Math.random()*0.15;

        this.twinkle=Math.random()*0.02;

    }

    update(){

        this.y+=this.speed;

        this.alpha+=this.twinkle;

        if(this.alpha>1 || this.alpha<0){

            this.twinkle*=-1;

        }

        if(this.y>canvas.height){

            this.y=0;
            this.x=Math.random()*canvas.width;

        }

    }

    draw(){

        ctx.beginPath();

        ctx.fillStyle=
        "rgba(255,255,255,"+this.alpha+")";

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI*2
        );

        ctx.fill();

    }

}

for(let i=0;i<500;i++){

    stars.push(new Star());

}

function animate(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let star of stars){

        star.update();
        star.draw();

    }

    requestAnimationFrame(animate);

}

animate();