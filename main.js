let canvas, gl, program;
let positionBuffer;

const state = {
    renderMode: 0,
    chaosPointCount: 20000,
    subdivideDepth: 4,
    pointSize: 2.0,
    colorScheme: 0,
    animPause: false,
    animCurrentPoints: 0,
    panX: 0,
    panY: 0,
    zoom: 1.0
};

//三套配色方案
const colorSchemes = [
    [0.10, 0.80, 0.95],
    [0.90, 0.25, 0.50],
    [0.30, 0.90, 0.35]
];

const triVerts = [
    [-0.9, -0.6],
    [ 0.9, -0.6],
    [ 0.0,  0.9]
];
let pointsData = [];

const vertexShaderSource = `
attribute vec2 aPosition;
uniform float u_panX;
uniform float u_panY;
uniform float u_zoom;
uniform float u_pointSize;
void main(){
    vec2 offset = vec2(u_panX, u_panY);
    vec2 pos = (aPosition + offset) * u_zoom;
    gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
    gl_PointSize = u_pointSize;
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main(){
    gl_FragColor = vec4(u_color, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vsSource, fsSource) {
    const vShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vShader || !fShader) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return null;
    }
    return prog;
}

//混沌游戏算法
function chaosGame(totalPoints) {
    const out = [];
    let p = [Math.random() * 2 - 1, Math.random() * 2 - 1];
    for(let i = 0; i < totalPoints; i++){
        const idx = Math.floor(Math.random() * 3);
        const v = triVerts[idx];
        p[0] = (p[0] + v[0]) * 0.5;
        p[1] = (p[1] + v[1]) * 0.5;
        out.push(p[0], p[1]);
    }
    return out;
}

//递归细分 subdivide 作业要求函数
function subdivide(a, b, c, depth, out) {
    if(depth === 0){
        out.push(a[0], a[1]);
        out.push(b[0], b[1]);
        out.push(c[0], c[1]);
        return;
    }
    const ab = [(a[0]+b[0])/2, (a[1]+b[1])/2];
    const bc = [(b[0]+c[0])/2, (b[1]+c[1])/2];
    const ca = [(c[0]+a[0])/2, (c[1]+a[1])/2];
    subdivide(a, ab, ca, depth - 1, out);
    subdivide(b, bc, ab, depth - 1, out);
    subdivide(c, ca, bc, depth - 1, out);
}

function regenerateVertices(){
    pointsData = [];
    if(state.renderMode === 0){
        const fullSet = chaosGame(state.chaosPointCount);
        const takeLength = Math.min(state.animCurrentPoints * 2, fullSet.length);
        pointsData = fullSet.slice(0, takeLength);
    }else{
        subdivide(triVerts[0], triVerts[1], triVerts[2], state.subdivideDepth, pointsData);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsData), gl.STATIC_DRAW);
}

window.onload = init;
function init(){
    canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
    if(!gl){
        alert("浏览器不支持WebGL");
        return;
    }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if(!program) return;
    gl.useProgram(program);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const aPositionLoc = gl.getAttribLocation(program, "aPosition");
    const uPanX = gl.getUniformLocation(program, "u_panX");
    const uPanY = gl.getUniformLocation(program, "u_panY");
    const uZoom = gl.getUniformLocation(program, "u_zoom");
    const uPointSize = gl.getUniformLocation(program, "u_pointSize");
    const uColor = gl.getUniformLocation(program, "u_color");

    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    //UI面板绑定
    const modeSelect = document.getElementById("modeSelect");
    const pointCountSlider = document.getElementById("pointCountSlider");
    const pointCountVal = document.getElementById("pointCountVal");
    const depthSlider = document.getElementById("depthSlider");
    const depthVal = document.getElementById("depthVal");
    const pointSizeSlider = document.getElementById("pointSizeSlider");
    const pointSizeVal = document.getElementById("pointSizeVal");
    const colorSelect = document.getElementById("colorSelect");

    modeSelect.onchange = function(){
        state.renderMode = Number(this.value);
        state.animCurrentPoints = 0;
        regenerateVertices();
    };
    pointCountSlider.oninput = function(){
        state.chaosPointCount = Number(this.value);
        pointCountVal.textContent = state.chaosPointCount;
        state.animCurrentPoints = 0;
        regenerateVertices();
    };
    depthSlider.oninput = function(){
        state.subdivideDepth = Number(this.value);
        depthVal.textContent = state.subdivideDepth;
        regenerateVertices();
    };
    pointSizeSlider.oninput = function(){
        state.pointSize = Number(this.value);
        pointSizeVal.textContent = state.pointSize.toFixed(1);
    };
    colorSelect.onchange = function(){
        state.colorScheme = Number(this.value);
    };

    //鼠标事件：拖拽平移、滚轮缩放
    let drag = false;
    let lastX, lastY;
    canvas.onmousedown = e=>{
        drag = true;
        lastX = e.clientX;
        lastY = e.clientY;
    };
    canvas.onmousemove = e=>{
        if(!drag) return;
        const dx = (e.clientX - lastX) / canvas.width * 2.0;
        const dy = (lastY - e.clientY) / canvas.height * 2.0;
        state.panX += dx / state.zoom;
        state.panY += dy / state.zoom;
        lastX = e.clientX;
        lastY = e.clientY;
    };
    canvas.onmouseup = ()=> drag = false;
    canvas.onmouseleave = ()=> drag = false;
    canvas.onwheel = e=>{
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.93 : 1.07;
        state.zoom *= scaleFactor;
    };

    //键盘事件
    window.onkeydown = ev=>{
        switch(ev.key){
            case "1":
                state.renderMode = 0;
                modeSelect.value = 0;
                state.animCurrentPoints = 0;
                regenerateVertices();
                break;
            case "2":
                state.renderMode = 1;
                modeSelect.value = 1;
                regenerateVertices();
                break;
            case "3":
                state.renderMode = 2;
                modeSelect.value = 2;
                regenerateVertices();
                break;
            case " ":
                ev.preventDefault();
                state.animPause = !state.animPause;
                break;
        }
    };

    function renderLoop(){
        requestAnimationFrame(renderLoop);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if(!state.animPause && state.renderMode === 0){
            if(state.animCurrentPoints < state.chaosPointCount){
                state.animCurrentPoints += 25;
                regenerateVertices();
            }
        }

        gl.uniform1f(uPanX, state.panX);
        gl.uniform1f(uPanY, state.panY);
        gl.uniform1f(uZoom, state.zoom);
        gl.uniform1f(uPointSize, state.pointSize);
        gl.uniform3fv(uColor, colorSchemes[state.colorScheme]);

        const vertexCount = pointsData.length / 2;
        if(vertexCount === 0) return;
        if(state.renderMode === 0){
            gl.drawArrays(gl.POINTS, 0, vertexCount);
        }else if(state.renderMode === 1){
            gl.drawArrays(gl.LINES, 0, vertexCount);
        }else if(state.renderMode === 2){
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        }
    }
    regenerateVertices();
    renderLoop();
}
