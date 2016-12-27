(function(){
  var fragments = 50;
  var coneRadius = 50;

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

  //Gui init
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var viewProjection = new Float32Array(makeOrtho(0, gl.viewportWidth, gl.viewportHeight, 0, -5, 5000).flatten());

  // Set up cone- and color arrays
  var green = () => [0.1 + Math.random() * 0.2,0.4,0.1 + Math.random() * 0.2,1];
  var blue = ratio => [ratio,ratio/2,0.5,1];
  var degToRad = Math.PI / 180.0;
  var degInc = 360.0/fragments;
  var coneHeight = coneRadius / Math.tan(45 * degToRad);

  var count = 30;

  var createWorldData = worldDataCreator([
    'positions',
    'positionDisplacements',
    'colors',
    'worldPositions',
    'clockOffsets',
    'clockSpeeds',
    'radiuses'
  ]);

  var data = createWorldData();

  var t1 = performance.now();
  for(var x = (width/count)/2; x < width; x += width/count) {
    var rowData = createWorldData();

    for(var y = (height/count)/2; y < height; y += height/count) {
      var color = y / height < 0.8 ? blue(y / height) : green()
      var worldPosition = [x, y, 0];
      var positionDisplacement = [Math.random()*5, Math.random()*5, 0];
      var clockOffset = [0, 0, 0];
      var clockSpeed = [Math.random()/300, Math.random()/300, 0];
      var radius = [Math.random()*10, Math.random()*10, 0];

      var elementData = createWorldData();

      var curDeg = 0;
      for(var i = 0; i < fragments; i++) {
        concatenateData(
          elementData,
          {
            positions: [0, 0, 0],
            positionDisplacements: positionDisplacement,
            worldPositions: worldPosition,
            colors: color,
            clockOffsets: clockOffset,
            clockSpeeds: clockSpeed,
            radiuses: radius
          }
        );

        concatenateData(
          elementData,
          {
            positions: [
              coneRadius * Math.cos(curDeg * degToRad),
              coneRadius * Math.sin(curDeg * degToRad),
              -1.0 * coneHeight
            ],
            positionDisplacements: positionDisplacement,
            worldPositions: worldPosition,
            colors: color,
            clockOffsets: clockOffset,
            clockSpeeds: clockSpeed,
            radiuses: radius
          }
        );

        concatenateData(
          elementData,
          {
            positions: [
              coneRadius * Math.cos((curDeg + degInc) * degToRad),
              coneRadius * Math.sin((curDeg + degInc) * degToRad),
              -1.0 * coneHeight
            ],
            positionDisplacements: positionDisplacement,
            worldPositions: worldPosition,
            colors: color,
            clockOffsets: clockOffset,
            clockSpeeds: clockSpeed,
            radiuses: radius
          }
        );

        curDeg += degInc;
      }

      concatenateData(rowData, elementData);
    }

    concatenateData(data, rowData);
  }
  console.log(performance.now() - t1);
  console.log(data);

  var {positions, positionDisplacements, colors, worldPositions, clockOffsets, clockSpeeds, radiuses} = data;

  // Set up buffers
  var positionBuffer = createArrayBuffer('position', 3, positions);
  var positionDisplacementBuffer = createArrayBuffer('positionDisplacement', 3, positionDisplacements);
  var colorBuffer = createArrayBuffer('color', 4, colors);
  var worldPositionBuffer = createArrayBuffer('worldPosition', 3, worldPositions);
  var clockOffsetBuffer = createArrayBuffer('clockOffset', 3, clockOffsets);
  var clockSpeedBuffer = createArrayBuffer('clockSpeed', 3, clockSpeeds);
  var radiusBuffer = createArrayBuffer('radius', 3, radiuses);

  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'viewProjection'), false, viewProjection);
  var clockLocation = gl.getUniformLocation(shaderProgram, 'clock');
  gl.uniform1f(clockLocation, 10.0);

  // Render
  var positionsToRender = new Float32Array(positions);
  var numberOfTrianglesToRender = positionsToRender.length / 3;
  function loop(timestamp) {
    gl.uniform1f(clockLocation, timestamp);
    gl.drawArrays(gl.TRIANGLES, 0, numberOfTrianglesToRender);
    window.requestAnimationFrame(loop);
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, positionDisplacementBuffer);
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

  function worldDataCreator(props) {
    return () => props.reduce((data, propertyName) => {
      data[propertyName] = [];
      return data;
    }, {});
  }

  function concatenateData(data, data2) {
    for(var key of Object.keys(data)) {
      data[key] = data[key].concat(data2[key]);
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
