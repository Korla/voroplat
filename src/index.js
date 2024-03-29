(function() {
  var point = ({x, y, colorArray, rand}) => {
    return {
      cones: [{x, y, colorArray: new Float32Array(colorArray), rand}]
    };
  }

  var player = (x, y, color) => {
    var colorArray = new Float32Array(color);
    var state = {
      cones: [
        {x: x, y: y, colorArray, rand: Math.random()},
        {x: x + 10, y: y, colorArray, rand: Math.random()},
        {x: x, y: y + 10, colorArray, rand: Math.random()},
        {x: x + 10, y: y + 10, colorArray, rand: Math.random()}
      ],
      xSpeed: 0.1,
      ySpeed: 0,
      keys: {
        '68': () => state.xSpeed += 1,
        '65': () => state.xSpeed -= 1,
        '87': () => state.ySpeed -= 1,
        '83': () => state.ySpeed += 1
      },
      onKeyDown: key => state.keys[key] && state.keys[key](),
      gravityValue: 10,
      // gravity: () => state.ySpeed += delta * state.gravityValue / 10,
      gravity: () => undefined,
      move: () => state.cones.forEach(c => {
        c.x += state.xSpeed * delta;
        c.y += state.ySpeed * delta;
      }),
      decelerate: () => {
        state.xSpeed *= 0.98;
        // if(Math.abs(state.xSpeed) < 1) {
        //   state.xSpeed = 0;
        // }
      },
      tick: () => {
        state.gravity(delta);
        state.move(delta);
        state.decelerate(delta);
      }
    };
    return state;
  }

  var mainCanvas = document.getElementById('main-canvas');
  var canvas2d = document.getElementById('2d-canvas');

  var pMatrix;
  var mvMatrix;
  var coneRadius = 30;
  var fragments = 100;

  var ratio = 1.5;
  var size = 30;
  var grid = {xSize: size * ratio, ySize: size};

  var setup = {
    initGL: (mainCanvas, canvas2d) => {
      var width = mainCanvas.width;
      var height = mainCanvas.height;
      var gl;
    	try {
    		gl = mainCanvas.getContext('experimental-webgl');
    		gl.viewportWidth = mainCanvas.width;
    		gl.viewportHeight = mainCanvas.height;
    	} catch(e) { }
    	if (!gl) { alert('Could not initialize WebGL, sorry :-('); }
      var gl2d = canvas2d.getContext('2d');
      return {gl, gl2d, width, height};
    },
    initShaders: () => {
    	var fragmentShader = setup.getShader(gl, 'shader-fs');
    	var vertexShader = setup.getShader(gl, 'shader-vs');

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
    },
    getShader: (gl, id) => {
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
    },
    genCone: () => {
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
    },
    genPointCone: () => {
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
    },
    pointColor: () => {
    	var size = fragments * 3;
    	var pointVertexColorBuffer = gl.createBuffer();
    	gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexColorBuffer);

    	var color = [];
    	for(var i = 0; i < size; i++)
    		color = color.concat([0.0, 0.0, 0.0, 1.0]);

    	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
    	pointVertexColorBuffer.itemSize = 4;
    	pointVertexColorBuffer.numItems = size;
      return pointVertexColorBuffer;
    },
    initEventListeners: (...canvases) => {
      canvases.forEach(canvas => {
      	canvas.addEventListener('mousedown', drawTools.startDown, false);
      	canvas.addEventListener('mousemove', drawTools.canvasMouseMove, false);
      	canvas.addEventListener('mouseup', drawTools.canvasClick, false);
      });
    },
    generateEnv: (grid) => {
      var xRange = utils.range(grid.xSize);
      var yRange = utils.range(grid.ySize);
      var green = () => fragmentsColor(fragments * 3, [0.1 + Math.random() * 0.2,0.4,0.1 + Math.random() * 0.2,1]);
      var blue = ratio => fragmentsColor(fragments * 3, [ratio,ratio/2,0.5,1]);
      var coordinates = xRange
        .reduce((prev, x) => {
          prev = prev.concat(yRange.map(y => ({x, y})));
          return prev;
        }, []);
      return coordinates
        .map(({x,y}, i) => {
          var yDelta = x%2 === 0 ? 0 : 0.5;
          // var xDelta = y%2 === 0 ? 0 : 0.5;
          var xDelta = 0.5;
          return {
            x: width / grid.xSize * (x + xDelta),
            y: height / grid.ySize * (y + yDelta),
            colorArray: y/grid.ySize < 0.8 ? blue(y / grid.ySize) : green(),
            rand: Math.random() * 10
          }
        });
    },
    createPlayer: () => {
      var x = 50;
      var y = 460;
      var colorArray = fragmentsColor(fragments * 3, [0.5,0.5,0.5,1]);
      return player(x, y, colorArray);
    }
  }

  var drawTools = {
    mouseIsDown: false,
    curColor: null,
    x: null,
    y: null,
    canvasClick: (e) => {
      drawTools.mouseIsDown = false;
    },
    getCursorPosition: (e) => {
    	if (e.pageX || e.pageY) {
    		drawTools.x = e.pageX;
    		drawTools.y = e.pageY;
      } else {
    		drawTools.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    		drawTools.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
    	drawTools.x -= mainCanvas.offsetLeft;
      drawTools.y -= mainCanvas.offsetTop;

    	return [drawTools.x, drawTools.y];
    },
    startDown: (e) => {
    	drawTools.mouseIsDown = true;
    	drawTools.curColor = fragmentsColor(fragments * 3);
    },
    canvasMouseMove: (e) => {
    	if(!drawTools.mouseIsDown) return;

    	var [x,y] = drawTools.getCursorPosition(e);

      player[0].x = x;
      player[0].y = y;
      player[1].x = x + 10;
      player[1].y = y;
      player[2].x = x;
      player[2].y = y + 10;
      player[3].x = x + 10;
      player[3].y = y + 10;
    }
  };

  var utils = {
    range: (nbr) => {
      var retVal = [];
      for(var i = 0; i < nbr; i++) {
        retVal.push(i);
      }
      return retVal;
    },
    flatten: () => {
      return [
        (prev, curr) => {
          prev = prev.concat(curr);
          return prev;
        },
        []
      ]
    }
  }

  var game = {
    elems: [],
    keysDown: {},
    keyDownListeners: [],
    init: () => {
      document.addEventListener('keydown', (e) => game.keysDown[e.keyCode] = true, false);
      document.addEventListener('keyup', (e) => delete game.keysDown['' + e.keyCode], false);
    },
    tick: () => {
      for(key in game.keysDown) {
        player.onKeyDown(key);
      }
      game.elems.forEach(elem => elem.tick());
    },
    add: elem => {
      game.elems.push(elem);
    }
  };

  var gui = {
    cones: [],
    init: () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);
      gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, coneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      ortho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000);
      gl.disable(gl.BLEND);
    },
    cos: null,
    sin: null,
    redraw: () => {
      gui.cos = Math.cos(elapsed/300);
      gui.sin = Math.sin(elapsed/300);
      gl2d.clearRect(0, 0, canvas2d.width, canvas2d.height);
      gui.cones.forEach(gui.drawCone);
    },
    drawCone: p => {
      if(
        p.x > (mainCanvas.width + coneRadius) ||
        p.x < (-1 * coneRadius) ||
        p.y > (mainCanvas.height + coneRadius) ||
        p.y < (-1 * coneRadius)) {
         //cone will not influence anything and is just slow, dont plot it
      	return;
      }

      mvMatrix = Matrix.Translation($V([p.x + gui.cos * p.rand, p.y + gui.sin * p.rand, 0.0])).ensure4x4();

      gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, p.colorArray, gl.STATIC_DRAW);

      gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, new Float32Array(pMatrix.flatten()));
      gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, new Float32Array(mvMatrix.flatten()));

      gl.drawArrays(gl.TRIANGLES, 0, coneVertexPositionBuffer.numItems);
      // gui.drawCircle2D(gl2d, p.x, p.y, 1);
    },
    drawCircle2D: (ctx, x, y, radius) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI*2, false);
      ctx.closePath();
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.fill();
    },
    add: elem => {
      if(elem.cones) {
        gui.cones = gui.cones.concat(elem.cones);
      }
    }
  };

  var {gl, gl2d, width, height} = setup.initGL(mainCanvas, canvas2d);
  var shaderProgram = setup.initShaders();
  var coneVertexPositionBuffer = setup.genCone();
  var pointVertexPositionBuffer = setup.genPointCone();
  var pointVertexColorBuffer = setup.pointColor();
  setup.initEventListeners(mainCanvas, canvas2d);
  setup.generateEnv(grid)
    .map(point)
    .forEach(gui.add);
  var player = setup.createPlayer();
  gui.add(player);
  game.add(player);

  game.init();
  gui.init();

  var elapsed = 0;
  var delta;
  function loop(timestamp) {
    delta = (timestamp - elapsed) / 100;
    elapsed = timestamp;
    game.tick();
    gui.redraw();
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);

  function ortho(left, right, bottom, top, znear, zfar){
  	pMatrix = makeOrtho(left, right, bottom, top, znear, zfar)
  }

  function fragmentsColor(size, color) {
    color = color || [Math.random(), Math.random(), Math.random(), 1.0];

    return utils.range(size)
      .map(() => color)
      .reduce(...utils.flatten());
  }
})();
