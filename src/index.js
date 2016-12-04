(function() {
  var mainCanvas = $('main-canvas');
  var canvas2d = $('2d-canvas');

  var grid = {xSize: 20, ySize: 20};

  var coneRadius = 1000;
  var fragments = 50;

  var {gl, gl2d, width, height} = initGL(mainCanvas, canvas2d);
  var pMatrix;
  var mvMatrix;

  var shaderProgram = initShaders();
  var coneVertexPositionBuffer = genCone();
  var pointVertexPositionBuffer = genPointCone();

  var points = [];

  var pointVertexColorBuffer = pointColor();

  var drawTools = {
    mouseIsDown: false,
    curColor: null
  };

  initEventListeners(mainCanvas, canvas2d);

  var xRange = range(grid.xSize);
  var yRange = range(grid.ySize);
  var green = () => fragmentsColor(fragments * 3, [0.1 + Math.random() * 0.2,0.4,0.1 + Math.random() * 0.2,1]);
  var blue = ratio => fragmentsColor(fragments * 3, [ratio,ratio/2,0.5,1]);
  var coordinates = xRange
    .reduce((prev, x) => {
      prev = prev.concat(yRange.map(y => ({x, y})));
      return prev;
    }, []);
  coordinates
    .map(({x,y}) => ({
      x: width * (x + 0.5) / grid.xSize,
      y: height * (y + 0.5) / grid.ySize,
      col: y < 13 ? blue(y / grid.ySize) : green()
    }))
    .map(addCone);

  redraw();

  function initGL(mainCanvas, canvas2d) {
    var width = mainCanvas.width;
    var height = mainCanvas.height;
    var gl;
  	try {
  		gl = mainCanvas.getContext('experimental-webgl');
  		gl.viewportWidth = mainCanvas.width;
  		gl.viewportHeight = mainCanvas.height;
  	} catch(e) { }
  	if (!gl) { alert('Could not initialize WebGL, sorry :-('); }
  	canvas2d.style.zIndex = '100';
  	var gl2d = canvas2d.getContext('2d');
    return {gl, gl2d, width, height};
  }

  function initEventListeners(...canvases) {
    canvases.forEach(canvas => {
    	canvas.addEventListener('mousedown', startDown, false);
    	canvas.addEventListener('mousemove', canvasMouseMove, false);
    	canvas.addEventListener('mouseup', canvasClick, false);
    });
  }

  function initShaders() {
  	var fragmentShader = getShader(gl, 'shader-fs');
  	var vertexShader = getShader(gl, 'shader-vs');

  	var shaderProgram = gl.createProgram();
  	gl.attachShader(shaderProgram, vertexShader);
  	gl.attachShader(shaderProgram, fragmentShader);
  	gl.linkProgram(shaderProgram);

  	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  		alert('Could not initialize shaders');
  	}

  	gl.useProgram(shaderProgram);

  	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'aVertexColor');
  	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
  	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    return shaderProgram;
  }

  function genCone() {
  	var coneVertexPositionBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);

  	var degInc = 360.0/fragments;
  	var height = coneRadius / Math.tan(45 * Math.PI / 180.0);

  	var vertices = [];

  	var curDeg = 0;
  	for(var i = 0; i < fragments; i++) {

  		vertices = vertices.concat([0,0,0]);

  		for(var j = 0; j < 2; j++){
  			var x1 = coneRadius * Math.cos((curDeg + j*degInc) * Math.PI / 180.0);
  			var y1 = coneRadius * Math.sin((curDeg + j*degInc) * Math.PI / 180.0);

  			vertices = vertices.concat([x1,y1,-1.0 * height]);
  		}
  		curDeg += degInc;
  	}
  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  	coneVertexPositionBuffer.itemSize = 3;
  	coneVertexPositionBuffer.numItems = fragments * 3;
    return coneVertexPositionBuffer;
  }

  function genPointCone() {
  	var pointVertexPositionBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexPositionBuffer);

  	var degInc = 360.0/20;

  	var vertices = [];

  	var curDeg = 0;
  	for(var i = 0; i < 20; i++) {

  		vertices = vertices.concat([0,0,0.1]);

  		for(var j = 0; j < 2; j++){
  			var x1 = 3 * Math.cos((curDeg + j*degInc) * Math.PI / 180.0);
  			var y1 = 3 * Math.sin((curDeg + j*degInc) * Math.PI / 180.0);

  			vertices = vertices.concat([x1,y1,0]);
  		}
  		curDeg += degInc;
  	}
  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  	pointVertexPositionBuffer.itemSize = 3;
  	pointVertexPositionBuffer.numItems = 20 * 3;
    return pointVertexPositionBuffer;
  }

  function pointColor() {
  	var size = 20*3;
  	var pointVertexColorBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexColorBuffer);

  	var color = [];
  	for(var i = 0; i < size; i++)
  		color = color.concat([0.0, 0.0, 0.0, 1.0]);

  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
  	pointVertexColorBuffer.itemSize = 4;
  	pointVertexColorBuffer.numItems = size;
    return pointVertexColorBuffer;
  }

  function getColorBuffer(color, size) {
  	var tempVertexColorBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, tempVertexColorBuffer);

  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
  	tempVertexColorBuffer.itemSize = 4;
  	tempVertexColorBuffer.numItems = size;
  	return tempVertexColorBuffer;
  }

  function drawCircle2D(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI*2, false);
    ctx.closePath();
    ctx.strokeStyle = '#000';
    ctx.stroke();
  	ctx.fillStyle = '#000';
  	ctx.fill();
  }

  function addCone({x, y, col}) {
  	var c = new Point();
  	if(!col) col = fragmentsColor(fragments * 3);
  	c.x = x;
  	c.y = y;
  	c.colorArray = col;
  	c.colorSize = fragments*3;
  	points = points.concat(c);
  	return c;
  }

  function drawCone(p) {
  	if(
      p.x > ($('main-canvas').width + coneRadius) ||
      p.x < (-1 * coneRadius) ||
      p.y > ($('main-canvas').height + coneRadius) ||
      p.y < (-1 * coneRadius)) {
       //cone will not influence anything and is just slow, dont plot it
  		return;
  	}

  	loadIdentity();
  	mvTranslate([p.x, p.y, 0.0]);

  	gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);
  	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, coneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  	gl.bindBuffer(gl.ARRAY_BUFFER, getColorBuffer(p.colorArray,p.colorSize));
  	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
  	gl.drawArrays(gl.TRIANGLES, 0, coneVertexPositionBuffer.numItems);

  	drawCircle2D(gl2d, p.x,p.y, 2.5);

  	gl.disable(gl.BLEND);
  }

  function ortho(left, right, bottom, top, znear, zfar){
  	pMatrix = makeOrtho(left, right, bottom, top, znear, zfar)
  }

  function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, new Float32Array(pMatrix.flatten()));
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, new Float32Array(mvMatrix.flatten()));
  }

  function loadIdentity() { mvMatrix = Matrix.I(4); }

  function mvTranslate(v) {
    var m = Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
    mvMatrix = mvMatrix.x(m);
  }

  function canvasClick(e) {
    drawTools.mouseIsDown = false;
    var [x, y] = getCursorPosition(e);
    var col = drawTools.curColor;
    addCone({x, y, col});
    drawTools.curColor = null;
    redraw();
  }

  function getCursorPosition(e) {
  	var x, y;
  	if (e.pageX || e.pageY) {
  		x = e.pageX;
  		y = e.pageY;
    } else {
  		x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  		y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
  	x -= mainCanvas.offsetLeft;
    y -= mainCanvas.offsetTop;

  	return [x,y];
  }

  function startDown(e) {
  	drawTools.mouseIsDown = true;
  	drawTools.curColor = fragmentsColor(fragments * 3);
  	canvasMouseMove(e);
  }

  function canvasMouseMove(e) {
  	if(!drawTools.mouseIsDown) return;

  	var p = getCursorPosition(e);

  	var c = new Point();
  	c.x = p[0];
  	c.y = p[1];
  	c.colorArray = drawTools.curColor;
  	c.colorSize = fragments*3;

  	redraw(c);
  }

  function redraw(p) {
  	gl2d.clearRect(0,0,canvas2d.width, canvas2d.height);

  	gl.clearColor(0.0, 0.0, 0.0, 1.0);
  	gl.clearDepth(1.0);
  	gl.enable(gl.DEPTH_TEST);
  	gl.depthMask(true);
  	gl.depthFunc(gl.LEQUAL);

  	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  	ortho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000);
    loadIdentity();

  	for(var i = 0; i < points.length; i++) {
  		drawCone(points[i]);
  	}

  	if(p) {
  		drawCone(p);
  	}

  	gl.depthMask(false);
  }

  function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
      return null;
    }

    var str = '';
    var k = shaderScript.firstChild;
    while (k) {
      if (k.nodeType == 3) {
        str += k.textContent;
      }
      k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == 'x-shader/x-fragment') {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == 'x-shader/x-vertex') {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  function Point() {
  	var colorBuffer;
  	var colorArray;
  	var colorSize;
  	var x, y;
  	var vx, vy;

  	var angle;
  	var vfunc;
  }

  function fragmentsColor(size, color) {
    color = color || [Math.random(), Math.random(), Math.random(), 1.0];

    return range(size)
      .map(() => color)
      .reduce(...flatten());
  }

  function getDataForLog() {
  	var sites = [];
  	var queries = [];
  	for(var i = 0; i < points.length; i++) {
  		var ar = [points[i].x, points[i].y];
  		sites = sites.concat(ar);
  	}
  	return {sites, queries}
  }

  function range(nbr) {
    var retVal = [];
    for(var i = 0; i < nbr; i++) {
      retVal.push(i);
    }
    return retVal;
  }

  function flatten() {
    return [
      (prev, curr) => {
        prev = prev.concat(curr);
        return prev;
      },
      []
    ]
  }

  function $(id) { return document.getElementById(id); }
})();
