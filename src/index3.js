(function(){
  var fragments = 10;
  var coneRadius = 30;

  var mainCanvas = document.getElementById('main-canvas');

  // InitGL
  var width = 900;
  var height = 600;
  var gl;
  try {
    gl = mainCanvas.getContext('experimental-webgl');
    gl.viewportWidth = width;
    gl.viewportHeight = height;
  } catch(e) { }
  if (!gl) { console.log('Could not initialize WebGL.'); }

  // InitShaders
  var fragmentShader = getShader(gl, 'shader-fs');
  var vertexShader = getShader(gl, 'shader-vs');

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log('Could not initialize shaders');
  }

  gl.useProgram(shaderProgram);

  // Set up cone- and color arrays
  var getNextColor = colorFactory(1000);
  var degToRad = Math.PI / 180.0;
  var degInc = 360.0/fragments;
  var coneHeight = coneRadius / Math.tan(45 * degToRad);

  var count = 100;
  var colors = [];
  var positions = [];
  var worldPositions = [];
  var t1 = performance.now();
  for(var x = (width/count)/2; x < width; x += width/count) {
    var rowPositions = [];
    var rowWorldPositions = [];
    var rowColors = [];
    for(var y = (height/count)/2; y < height; y += height/count) {
      var color = getNextColor();
      var worldPosition = [x, y, 0];

      var elementPositions = [];
      var elementWorldPositions = [];
      var elementColors = [];

      var curDeg = 0;
      for(var i = 0; i < fragments; i++) {
        elementPositions = elementPositions.concat([0,0,0]);
        elementWorldPositions = elementWorldPositions.concat(worldPosition);
        elementColors = elementColors.concat(color);

        elementPositions = elementPositions.concat([
          coneRadius * Math.cos(curDeg * degToRad),
          coneRadius * Math.sin(curDeg * degToRad),
          -1.0 * coneHeight
        ]);
        elementWorldPositions = elementWorldPositions.concat(worldPosition);
        elementColors = elementColors.concat(color);

        elementPositions = elementPositions.concat([
          coneRadius * Math.cos((curDeg + degInc) * degToRad),
          coneRadius * Math.sin((curDeg + degInc) * degToRad),
          -1.0 * coneHeight
        ]);
        elementWorldPositions = elementWorldPositions.concat(worldPosition);
        elementColors = elementColors.concat(color);

        curDeg += degInc;
      }

      rowPositions = rowPositions.concat(elementPositions);
      rowWorldPositions = rowWorldPositions.concat(elementWorldPositions);
      rowColors = rowColors.concat(elementColors);
    }

    positions = positions.concat(rowPositions);
    worldPositions = worldPositions.concat(rowWorldPositions);
    colors = colors.concat(rowColors);
  }
  console.log(performance.now() - t1);

  console.log(colors.length / 4, worldPositions.length / 3, positions.length / 3, count * count * fragments);
  console.log({colors, worldPositions, positions});

  // Set up buffers
  var positionBuffer = createArrayBuffer('position', 3, positions);
  var colorBuffer = createArrayBuffer('color', 4, colors);
  var worldPositionBuffer = createArrayBuffer('worldPosition', 3, worldPositions);

  //Gui init
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var viewProjection = new Float32Array(makeOrtho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000).flatten());
  shaderProgram.viewProjection = gl.getUniformLocation(shaderProgram, 'viewProjection');
  gl.uniformMatrix4fv(shaderProgram.viewProjection, false, viewProjection);
  gl.disable(gl.BLEND);

  function loop(timestamp) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
    window.requestAnimationFrame(loop);
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  window.requestAnimationFrame(loop);

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
      console.log(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  function fragmentsColor(color) {
    return new Float32Array(range(fragments * 3).map(() => color).reduce(...flatten()));
  }

  function createArrayBuffer(attribName, itemSize, bufferData) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    var attribLocation = gl.getAttribLocation(shaderProgram, attribName);
    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(attribLocation, itemSize, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
    return buffer;
  }

  function colorFactory(colorCount) {
    var colors = range(colorCount).map(i => [Math.random(),Math.random(),Math.random(),1]);
    var currCol = 0;
    return () => {
      var colorIndex = currCol % colors.length;
      currCol++;
      return colors[colorIndex];
    }
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
})();
