const dustContainer =
document.getElementById("dust");

for(let i=0;i<120;i++){

    const p=document.createElement("div");

    p.className="dust";

    p.style.left=Math.random()*100+"%";

    p.style.top=Math.random()*100+"%";

    p.style.animationDuration=
    (15+Math.random()*20)+"s";

    p.style.animationDelay=
    (-Math.random()*20)+"s";

    p.style.opacity=
    .05+Math.random()*.25;

    p.style.transform=
    `scale(${0.5+Math.random()*2})`;

    dustContainer.appendChild(p);

}