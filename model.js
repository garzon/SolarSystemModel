var zoom=0.000000001;
var dt=1000,k=0.8,stopMoving=false,G_range=0.2,g=9.8,g_dt=0.02,min_dist=0,isFocus=false,isBounded=false,prt_num=2,camera;
var au=14959787011,mE=5.9736e24,G=6.67384e-11;
var isTraced=false,trId,trTimeOut=300,trCounter=0,isIgnoreOthers=true;
var scenter,browser_width,browser_height,width_padding=40,height_padding=40,isShown=false,msgAlpha=0,timer=0;
var updateList=[];

// Vector START -----------------------------------

function Vector(x,y){
	this.x=x; this.y=y;
}

function vmul(u,v){
	return u.x*v.x+u.y*v.y;
}

Vector.prototype.abs=function(){
	return Math.sqrt(vmul(this,this));
}

Vector.prototype.clone=function(){
	return new Vector(this.x,this.y);
}

function add(a,b){
	return new Vector(a.x+b.x,a.y+b.y);
}

function sub(a,b){
	return new Vector(a.x-b.x,a.y-b.y);
}

function cmul(c,v){
	return new Vector(c*v.x,c*v.y);
}

// Vector END ------------------------------------

function cssObjMaker(r){
	return "border: 1px solid; position: absolute; border-radius: "+r.toString()+"px; width: "+(r).toString()+"px; height: "+(r).toString()+"px;";
}

function cssTrMaker(p){
	return "border: 1px solid; position: absolute; border-color: yellow; border-radius: 1px; width: 1px; height: 1px; top: "+p.y.toString()+"px; left:"+p.x.toString()+"px;";
}

// Obj START -------------------------------------

function Obj(m,radius,rx,ry,vx,vy){
	this.classid="myObj"+updateList.length.toString();
	$("body").get(0).innerHTML+="<div style='"+cssObjMaker(radius)+"' class='"+this.classid+"'></div>";
	this.m=m;
	this.element=$("."+this.classid).get(0);
	this.radius=radius;
	this.r=new Vector(rx,ry);
	this.v=new Vector(vx,vy);
	updateList.push(this);
	setPos(this);
}

// Main -----------------------------------------

function setPos(obj){
	obj.oldr=obj.r.clone();
	var p=obj.r.clone();
	if(isFocus) camera=updateList[0].r;
	p=sub(p,camera);
	p=cmul(zoom,p);
	p=add(p,scenter);
	p.x-=obj.radius/2.0; p.y-=obj.radius/2.0;
	$("."+obj.classid).css({left:p.x.toString()+"px",
							top:p.y.toString()+"px"});
	if((isTraced)&&(obj==updateList[trId])){
		trCounter++;
		if(trCounter>=trTimeOut){
			$("body").get(0).innerHTML+="<div style='"+cssTrMaker(p)+"'></div>";
			trCounter=0;
		}
	}
}


function dealWithCollision(obj){
	var p=obj.r.clone(),v=obj.v,r=obj.radius;
	p=add(p,scenter);
	if (p.x+r>browser_width)
		if(v.x>0) v.x=-k*v.x;

	if (p.x<r) 
		if(v.x<0) v.x=-k*v.x;
	

	if (p.y+r>browser_height)
		if(v.y>0) v.y=-k*v.y;
	

	if (p.y<r) 
		if(v.y<0) v.y=-k*v.y;

	obj.v=v;

}

function updatePos(obj){
	var element=obj.element;
	var m,ele,r1=obj.r,r2,r,a=new Vector(0,0),v=obj.v,f,tmp;

	if((!isIgnoreOthers)||(obj!=updateList[0]))
	for(j=0;j<prt_num;j++){
		if(isIgnoreOthers)
			if(j>0) break;
		o=updateList[j];
		if(o!=obj){
			m=o.m;
			r2=o.oldr;
			r=sub(r2,r1);
			tmp=r.abs()+min_dist;
			/*
			if(2*tmp<obj.radius+o.radius){
				obj.r=add(obj.r,cmul(m/(m+obj.m),r));
				o.r=obj.r;
				obj.v=cmul(1/(m+obj.m),add(cmul(obj.m,obj.v),cmul(m,o.v)));
				o.v=obj.v;
				continue;
			} 
			*/
			f=cmul(G*m/(1.0*tmp*tmp*tmp),r);
			a=add(f,a);
		}
	}

	obj.v=add(v,cmul(dt,a));
	if(isBounded) dealWithCollision(obj);
	obj.r=add(r1,cmul(dt,v));
	
}

function movementManager(){
	var obj;
    if(stopMoving) return;
	for(i in updateList){
		obj=updateList[i];
		updatePos(obj);
	}
	for(i in updateList){
		obj=updateList[i];
		setPos(obj);
	}

	timer+=dt;
	document.title="Garzon's | Now T="+(timer/60/60/24).toString()+"d";

}

function showElement(element){
	element.style.display="";
}

function hideElement(element){
	element.style.display="none";
}

function showMsg(){
	ele=document.getElementById("msg");
	showElement(ele);
	ele.style.left=
	((browser_width-240)/2.0).toString()+"px";
	isShown=true;
}

window.onresize = function(){
	browser_width  = parseFloat(window.innerWidth);
    browser_height = parseFloat(window.innerHeight);
    browser_width -= width_padding;
    browser_height -= height_padding;
    if(isShown) document.getElementById("msg").style.left=(browser_width/2.0).toString()+"px";
	scenter=new Vector(browser_width/2.0,browser_height/2.0);
}

function random(minint,maxint){
	maxint++;
	return Math.floor(Math.random()*(maxint-minint))+minint;
}

function init(){

	if(isTraced) trId=random(1,prt_num-1);
	if(!isFocus) camera=new Vector(0,0);
	window.onresize();
	// random
	/*
	var oStar=new Obj(30000,10,0,0,0,0);
	//var oPlanet=new Obj(10,2,100,100,100,0);
	for(i=1;i<prt_num;i++){
		var vx=random(-100,100),vy=random(-100,100);
		var px=random(-300,300),py=random(-300,300);
		var m=random(1,50);
		new Obj(m,2,px,py,vx,vy);
	}
	*/
	// solar system
	var oSun=new Obj(1.9891e30,10,0,0,0,0);
	var oMercury=new Obj(3.302e23,2, 57910000000,0,0,47878);
	var oVenus=new Obj(4.8685e24,2, 108208930000,0,0,35025);
	var oEarth=new Obj(5.9736e24,2, 149600000000,0,0,29789);
	var oMars=new Obj(6.4185e23,2,  227940000000,0,0,24133);
	var oJupiter=new Obj(1.899e27,4,778330000000,0,0,13060);
	var oSaturn=new Obj(5.6846e26,3,1429400000000,0,0,9637);
	var oUranus=new Obj(8.6832e25,2,2870990000000,0,0,6800);
	var oNepture=new Obj(1.0243e26,2,4.504e12,0,0,5429);
	//var testObj=oNepture;
	//alert(Math.sqrt(oSun.m*G/testObj.r.abs()));
}

$(document).ready(function(){
	init();
	window.setInterval("movementManager()",1);
});
