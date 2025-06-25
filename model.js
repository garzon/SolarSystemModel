const config = {
    zoom: 0.000000001,
    dt: 1000,
    k: 0.8,
    stopMoving: false,
    G_range: 0.2,
    g: 9.8,
    g_dt: 0.02,
    min_dist: 0,
    isFocus: false,
    isBounded: false,
    prt_num: 9,
    camera: new Vector(0, 0),
    au: 149600000000, // Correct AU value
    mE: 5.9736e24,
    G: 6.67384e-11,
    isTraced: true,
    trId: 0,
    trTimeOut: 300,
    trCounter: 0,
    isIgnoreOthers: false,
    scenter: null,
    browser_width: 0,
    browser_height: 0,
    width_padding: 40,
    height_padding: 40,
    timer: 0,
    updateList: [],
    traceCanvas: null,
    traceCtx: null,
    isRunning: true // Simulation is running by default
};

const planetData = [
    { name: 'Sun', mass: 1.9891e30, radius: 10, color: '#ffcc00', rx: 0, ry: 0, vx: 0, vy: 0 },
    { name: 'Mercury', mass: 3.302e23, radius: 2, color: '#a9a9a9', rx: 57910000000, ry: 0, vx: 0, vy: 47878 },
    { name: 'Venus', mass: 4.8685e24, radius: 2, color: '#f0e68c', rx: 108208930000, ry: 0, vx: 0, vy: 35025 },
    { name: 'Earth', mass: 5.9736e24, radius: 2, color: '#6b8e23', rx: 149600000000, ry: 0, vx: 0, vy: 29789 },
    { name: 'Mars', mass: 6.4185e23, radius: 2, color: '#ff4500', rx: 227940000000, ry: 0, vx: 0, vy: 24133 },
    { name: 'Jupiter', mass: 1.899e27, radius: 4, color: '#deb887', rx: 778330000000, ry: 0, vx: 0, vy: 13060 },
    { name: 'Saturn', mass: 5.6846e26, radius: 3, color: '#f5deb3', rx: 1429400000000, ry: 0, vx: 0, vy: 9637 },
    { name: 'Uranus', mass: 8.6832e25, radius: 2, color: '#add8e6', rx: 2870990000000, ry: 0, vx: 0, vy: 6800 },
    { name: 'Neptune', mass: 1.0243e26, radius: 2, color: '#4682b4', rx: 4.504e12, ry: 0, vx: 0, vy: 5429 }
];

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

// Obj START -------------------------------------

function Obj(name, m, radius, color, rx, ry, vx, vy) {
    this.name = name;
    this.classid = "myObj" + config.updateList.length.toString();
    var objContainer = document.createElement('div');
    objContainer.className = 'celestial-body-container';

    var objElement = document.createElement('div');
    objElement.className = 'celestial-body ' + this.classid;
    if (name === 'Sun') {
        objElement.classList.add('sun-glow');
    }
    objElement.style.width = (radius * 2) + 'px';
    objElement.style.height = (radius * 2) + 'px';
    objElement.style.backgroundColor = color;

    var nameElement = document.createElement('div');
    nameElement.className = 'planet-name';
    nameElement.textContent = name;

    objContainer.appendChild(objElement);
    objContainer.appendChild(nameElement);
    document.body.appendChild(objContainer);

    this.m = m;
    this.element = objContainer;
    this.radius = radius;
    this.r = new Vector(rx, ry);
    this.v = new Vector(vx, vy);
    config.updateList.push(this);
    setPos(this);
}

// Main -----------------------------------------

function setPos(obj) {
    obj.oldr = obj.r.clone();
    var p = obj.r.clone();

    if (config.isFocus) {
        config.camera = config.updateList[config.trId].r;
    }

    p = sub(p, config.camera);
    p = cmul(config.zoom, p);
    if (config.scenter) {
        p = add(p, config.scenter);
    }

    var shouldTrace = false;
    if (config.isFocus) {
        shouldTrace = true;
    } else if (config.isTraced && obj === config.updateList[config.trId]) {
        config.trCounter++;
        if (config.trCounter >= config.trTimeOut) {
            shouldTrace = true;
            config.trCounter = 0;
        }
    }

    if (shouldTrace) {
        config.traceCtx.fillStyle = 'yellow';
        config.traceCtx.fillRect(p.x, p.y, 1, 1);
    }

    obj.element.style.left = p.x.toString() + "px";
    obj.element.style.top = p.y.toString() + "px";
}

function updatePos(obj) {
    var acceleration = new Vector(0, 0);

    if ((!config.isIgnoreOthers) || (obj !== config.updateList[0])) {
        for (var j = 0; j < config.prt_num; j++) {
            if (config.isIgnoreOthers && j > 0) {
                break;
            }

            var otherObj = config.updateList[j];

            if (otherObj !== obj) {
                var distanceVector = sub(otherObj.oldr, obj.r);
                var distance = distanceVector.abs() + config.min_dist;
                var force = cmul(config.G * otherObj.m / (distance * distance * distance), distanceVector);
                acceleration = add(acceleration, force);
            }
        }
    }

    obj.v = add(obj.v, cmul(config.dt, acceleration));

    if (config.isBounded) {
        dealWithCollision(obj);
    }

    obj.r = add(obj.r, cmul(config.dt, obj.v));
}

function movementManager() {
    var obj;
    if (config.stopMoving) return;
    for (var i in config.updateList) {
        obj = config.updateList[i];
        updatePos(obj);
    }
    for (var i in config.updateList) {
        obj = config.updateList[i];
        setPos(obj);
    }

    var infoPanel = document.getElementById('info-panel');
    if (config.isFocus) {
        var focusedPlanet = config.updateList[config.trId];
        var sun = config.updateList[0];
        var distance = sub(focusedPlanet.r, sun.r).abs() / config.au;
        var velocity = focusedPlanet.v.abs();

        document.getElementById('info-planet-name').textContent = focusedPlanet.name;
        document.getElementById('info-distance').textContent = distance.toFixed(2) + ' AU';
        document.getElementById('info-velocity').textContent = velocity.toFixed(2) + ' m/s';
        infoPanel.classList.add('visible');
    } else {
        infoPanel.classList.remove('visible');
    }

    config.timer += config.dt;
    document.title = "Garzon's | Now T=" + (config.timer / 60 / 60 / 24).toString() + "d";
}

function random(minint,maxint){
	maxint++;
	return Math.floor(Math.random()*(maxint-minint))+minint;
}

function mainLoop() {
    movementManager();
    requestAnimationFrame(mainLoop);
}

function init() {
    config.traceCanvas = document.getElementById('trace-canvas');
    config.traceCtx = config.traceCanvas.getContext('2d');

    // Create planets from data
    planetData.forEach(data => {
        new Obj(data.name, data.mass, data.radius, data.color, data.rx, data.ry, data.vx, data.vy);
    });

    // Populate focus dropdown
    var focusSelect = document.getElementById('focus-select');
    config.updateList.forEach((planet, i) => {
        var option = document.createElement('option');
        option.value = i;
        option.text = planet.name;
        focusSelect.appendChild(option);
    });

    // Centralized event listeners
    document.getElementById('zoom-in').addEventListener('click', () => { config.zoom *= 2; clearTrace(); });
    document.getElementById('zoom-out').addEventListener('click', () => { config.zoom *= 0.5; clearTrace(); });
    document.getElementById('speed-up').addEventListener('click', () => { if (config.dt < 10000) { config.dt *= 2; config.trTimeOut *= 2; } });
    document.getElementById('speed-down').addEventListener('click', () => { if (config.dt > 16) { config.dt *= 0.5; config.trTimeOut *= 0.5; } });
    document.getElementById('clear-trace').addEventListener('click', clearTrace);
    focusSelect.addEventListener('change', function () {
        var selectedIndex = parseInt(this.value);
        if (selectedIndex === -1) {
            config.isFocus = false;
        } else {
            config.isFocus = true;
            config.trId = selectedIndex;
        }
        clearTrace();
    });

    window.onresize = function(){
        config.browser_width  = parseFloat(window.innerWidth);
        config.browser_height = parseFloat(window.innerHeight);
        config.traceCanvas.width = config.browser_width;
        config.traceCanvas.height = config.browser_height;
        config.browser_width -= config.width_padding;
        config.browser_height -= config.height_padding;
        config.scenter=new Vector(config.browser_width/2.0,config.browser_height/2.0);
    }

    window.onresize(); // Initial setup
    if(config.isTraced) config.trId=random(1,config.prt_num-1);
	  if(!config.isFocus) config.camera=new Vector(0,0);
    mainLoop();
}

function clearTrace() {
    config.traceCtx.clearRect(0, 0, config.traceCanvas.width, config.traceCanvas.height);
}

document.addEventListener('DOMContentLoaded', init);