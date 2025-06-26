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
    planetCanvas: null,
    planetCtx: null,
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
    this.m = m;
    this.radius = radius;
    this.color = color;
    this.r = new Vector(rx, ry);
    this.v = new Vector(vx, vy);
    config.updateList.push(this);
}

// Main -----------------------------------------

function calculateTotalEnergy() {
    let kineticEnergy = 0;
    let potentialEnergy = 0;

    for (const obj of config.updateList) {
        kineticEnergy += 0.5 * obj.m * vmul(obj.v, obj.v);
    }

    for (let i = 0; i < config.prt_num; i++) {
        for (let j = i + 1; j < config.prt_num; j++) {
            const obj1 = config.updateList[i];
            const obj2 = config.updateList[j];
            const distance = sub(obj1.r, obj2.r).abs();
            if (distance > 0) {
                potentialEnergy -= config.G * obj1.m * obj2.m / distance;
            }
        }
    }
    return kineticEnergy + potentialEnergy;
}

function updatePos(obj, accelerations) {
    const acceleration = accelerations[config.updateList.indexOf(obj)];
    obj.v = add(obj.v, cmul(config.dt, acceleration));

    if (config.isBounded) {
        dealWithCollision(obj);
    }

    obj.r = add(obj.r, cmul(config.dt, obj.v));
}

function movementManager() {
    if (config.stopMoving) return;

    // Calculate accelerations based on current positions
    const accelerations = config.updateList.map(obj => {
        let acceleration = new Vector(0, 0);
        if ((!config.isIgnoreOthers) || (obj !== config.updateList[0])) {
            for (const otherObj of config.updateList) {
                if (otherObj !== obj) {
                    const distanceVector = sub(otherObj.r, obj.r);
                    const distance = distanceVector.abs() + config.min_dist;
                    const force = cmul(config.G * otherObj.m / (distance * distance * distance), distanceVector);
                    acceleration = add(acceleration, force);
                }
            }
        }
        return acceleration;
    });

    // Update all positions based on the calculated accelerations
    for (const obj of config.updateList) {
        updatePos(obj, accelerations);
    }

    const infoPanel = document.getElementById('info-panel');
    if (config.isFocus) {
        const focusedPlanet = config.updateList[config.trId];
        const sun = config.updateList[0];
        const distance = sub(focusedPlanet.r, sun.r).abs() / config.au;
        const velocity = focusedPlanet.v.abs();

        document.getElementById('info-planet-name').textContent = focusedPlanet.name;
        document.getElementById('info-distance').textContent = distance.toFixed(8) + ' AU';
        document.getElementById('info-velocity').textContent = velocity.toFixed(2) + ' m/s';
        infoPanel.classList.add('visible');
    } else {
        infoPanel.classList.remove('visible');
    }

    const totalEnergy = calculateTotalEnergy();
    document.getElementById('total-energy').textContent = totalEnergy.toExponential(8);

    config.timer += config.dt;
    document.title = "Garzon's | Now T=" + (config.timer / 60 / 60 / 24).toString() + "d";
}

function draw() {
    config.planetCtx.clearRect(0, 0, config.planetCanvas.width, config.planetCanvas.height);

    if (config.isFocus) {
        config.camera = config.updateList[config.trId].r;
    }

    for (const obj of config.updateList) {
        let p = obj.r.clone();
        p = sub(p, config.camera);
        p = cmul(config.zoom, p);
        if (config.scenter) {
            p = add(p, config.scenter);
        }

        // Draw planet
        config.planetCtx.beginPath();
        config.planetCtx.arc(p.x, p.y, obj.radius, 0, 2 * Math.PI);
        config.planetCtx.fillStyle = obj.color;
        config.planetCtx.fill();

        // Draw name
        config.planetCtx.fillStyle = 'white';
        config.planetCtx.font = '12px Arial';
        config.planetCtx.textAlign = 'center';
        config.planetCtx.fillText(obj.name, p.x, p.y + obj.radius + 12);

        // Corrected trace logic
        if (config.isTraced && obj.name !== 'Sun') {
            config.traceCtx.fillStyle = obj.color;
            config.traceCtx.fillRect(p.x, p.y, 1, 1);
        }
    }
}

function random(minint,maxint){
	maxint++;
	return Math.floor(Math.random()*(maxint-minint))+minint;
}

let animationFrameId = null;
function mainLoop() {
    if (config.isRunning) {
        movementManager();
        draw();
        animationFrameId = requestAnimationFrame(mainLoop);
    } else {
        cancelAnimationFrame(animationFrameId);
    }
}

function init() {
    config.traceCanvas = document.getElementById('trace-canvas');
    config.traceCtx = config.traceCanvas.getContext('2d');
    config.planetCanvas = document.getElementById('planet-canvas');
    config.planetCtx = config.planetCanvas.getContext('2d');

    // Create planets from data
    planetData.forEach(data => {
        new Obj(data.name, data.mass, data.radius, data.color, data.rx, data.ry, data.vx, data.vy);
    });

    // Populate focus dropdown
    const focusSelect = document.getElementById('focus-select');
    config.updateList.forEach((planet, i) => {
        const option = document.createElement('option');
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
    
    const toggleTraceButton = document.getElementById('toggle-trace');
    if (toggleTraceButton) {
        toggleTraceButton.addEventListener('click', function() {
            config.isTraced = !config.isTraced;
            this.textContent = config.isTraced ? 'Hide' : 'Show';
        });
    }

    focusSelect.addEventListener('change', function () {
        const selectedIndex = parseInt(this.value);
        if (selectedIndex === -1) {
            config.isFocus = false;
        } else {
            config.isFocus = true;
            config.trId = selectedIndex;
        }
        clearTrace();
    });

    const pauseButton = document.getElementById('pause-button');
    pauseButton.addEventListener('click', function() {
        config.isRunning = !config.isRunning;
        this.textContent = config.isRunning ? 'Pause' : 'Resume';
        if (config.isRunning) {
            mainLoop();
        }
    });

    window.onresize = function(){
        config.browser_width  = parseFloat(window.innerWidth);
        config.browser_height = parseFloat(window.innerHeight);
        config.traceCanvas.width = config.browser_width;
        config.traceCanvas.height = config.browser_height;
        config.planetCanvas.width = config.browser_width;
        config.planetCanvas.height = config.browser_height;
        config.browser_width -= config.width_padding;
        config.browser_height -= config.height_padding;
        config.scenter=new Vector(config.browser_width/2.0,config.browser_height/2.0);
    }

    window.onresize(); // Initial setup
    if(!config.isFocus) config.camera=new Vector(0,0);
    mainLoop();
}

function clearTrace() {
    config.traceCtx.clearRect(0, 0, config.traceCanvas.width, config.traceCanvas.height);
}

document.addEventListener('DOMContentLoaded', init);

// Starry background
const backgroundCanvas = document.getElementById('background-canvas');
const backgroundCtx = backgroundCanvas.getContext('2d');
let stars = [];

function setupBackground() {
    backgroundCanvas.width = window.innerWidth;
    backgroundCanvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < 500; i++) {
        stars.push({
            x: Math.random() * backgroundCanvas.width,
            y: Math.random() * backgroundCanvas.height,
            radius: Math.random() * 1.5,
            alpha: Math.random()
        });
    }
}

function drawBackground() {
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    backgroundCtx.fillStyle = '#000';
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    stars.forEach(star => {
        backgroundCtx.beginPath();
        backgroundCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        backgroundCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        backgroundCtx.fill();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupBackground();
    drawBackground();
    window.addEventListener('resize', () => {
        setupBackground();
        drawBackground();
    });
});