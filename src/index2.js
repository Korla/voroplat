(function(){
  var fragments = 100;
  var coneRadius = 30;
  var pMatrix;
  var worldPosition = new Float32Array(2);

  var mainCanvas = document.getElementById('main-canvas');

  // InitGL
  var width = 900;
  var height = 600;
  var gl;
  try {
    gl = mainCanvas.getContext('experimental-webgl');
    gl.viewportWidth = 900;
    gl.viewportHeight = 600;
  } catch(e) { }
  if (!gl) { alert('Could not initialize WebGL.'); }

  // InitShaders
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

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'color');
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.viewProjection = gl.getUniformLocation(shaderProgram, 'viewProjection');
  shaderProgram.worldPosition = gl.getUniformLocation(shaderProgram, 'worldPosition');

  // genCone
  var coneVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexPositionBuffer);
  coneVertexPositionBuffer.itemSize = 3;
  coneVertexPositionBuffer.numItems = fragments * 3;

  var degInc = 360.0/fragments;
  var coneHeight = coneRadius / Math.tan(45 * Math.PI / 180.0);

  var vertices = [];

  var curDeg = 0;
  for(var i = 0; i < fragments; i++) {
    vertices = vertices.concat([0,0,0]);

    for(var j = 0; j < 2; j++){
      var x1 = coneRadius * Math.cos((curDeg + j*degInc) * Math.PI / 180.0);
      var y1 = coneRadius * Math.sin((curDeg + j*degInc) * Math.PI / 180.0);

      vertices = vertices.concat([x1, y1 , -1.0 * coneHeight]);
    }
    curDeg += degInc;
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  shaderProgram.position = gl.getAttribLocation(shaderProgram, 'position');
  gl.enableVertexAttribArray(shaderProgram.position);
  gl.vertexAttribPointer(shaderProgram.position, coneVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // pointColor
  var pointVertexColorBuffer = gl.createBuffer();
  pointVertexColorBuffer.itemSize = 4;
  pointVertexColorBuffer.numItems = fragments * 3;

  //Gui init
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var viewProjection = new Float32Array(makeOrtho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000).flatten());
  gl.uniformMatrix4fv(shaderProgram.viewProjection, false, viewProjection);
  gl.disable(gl.BLEND);

  var colors = range(1000)
    .map(i => [Math.random(),Math.random(),Math.random(),1])
    .map(fragmentsColor);

  var conesByColor = colors.map(() => []);
  currCol = 0;
  var count = 200;
  var cones = range(count)
    .forEach(x => range(count).map(y => {
      var colorIndex = currCol % colors.length;
      currCol++;
      conesByColor[colorIndex].push({x: x * width/count, y: y * height/count, colorArray: colors[colorIndex]});
    }));

  function loop(timestamp) {
    redraw();
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);

  function redraw() {
    conesByColor.forEach(conesForColor => {
      gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, conesForColor[0].colorArray, gl.STATIC_DRAW);
      gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
      conesForColor.forEach(drawPoint);
    });
  }

  function drawPoint(p) {
    if(
      p.x > (mainCanvas.width + coneRadius) ||
      p.x < (-1 * coneRadius) ||
      p.y > (mainCanvas.height + coneRadius) ||
      p.y < (-1 * coneRadius)) {
    	return;
    }

    worldPosition[0] = p.x;
    worldPosition[1] = p.y;
    gl.uniform2fv(shaderProgram.worldPosition, worldPosition);
    gl.drawArrays(gl.TRIANGLES, 0, coneVertexPositionBuffer.numItems);
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

  function fragmentsColor(color) {
    return new Float32Array(range(fragments * 3).map(() => color).reduce(...flatten()));
  }

  function range(nbr) {
    var retVal = [];
    for(var i = 0; i < nbr; i++) {
      retVal.push(i);
    }
    return retVal;
  }

  function flatten(){
    return [
      (prev, curr) => {
        prev = prev.concat(curr);
        return prev;
      },
      []
    ]
  }
})()
