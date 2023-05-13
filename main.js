import { getValueById, renderControls } from "./controls.js";
import fragmentShaderSource from "./shaders/fragmentShader.glsl";
import vertexShaderSource from "./shaders/vertexShader.glsl";
import "./style.css";
import "./utils/m4.js";
import { TrackballRotator } from "./utils/trackball-rotator.js";
import { createWebcamTexture, getWebcamEnabled, handleWebcam } from "./webcam.js";

getValueById;
renderControls;
createWebcamTexture;
getWebcamEnabled;
handleWebcam;

let gl; // The webgl context
let surface; // A surface model
let background; // A background model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse
let texture, webcamTexture; // A textures
let video; // A video element

// Constructor of the Model
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

// Constructor of the Shader
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  // Normals
  this.iNormal = -1;
  this.iNormalMatrix = -1;

  // Ambient, diffuse, specular color
  this.iAmbientColor = -1;
  this.iDiffuseColor = -1;
  this.iSpecularColor = -1;

  // Shininess
  this.iShininess = -1;

  // Light position
  this.iLightPos = -1;
  this.iLightVec = -1;

  // Texture coordinates
  this.iTextureCoords = -1;
  this.iTextureU = -1;
  this.iTextureAngle = -1;
  this.iTexturePoint = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function leftProjection(stereoCamera) {
  const { conv, eyeSep, ratio, fov, near, far } = stereoCamera;

  const top = near * Math.tan(fov / 2.0);
  const bottom = -top;

  const a = ratio * Math.tan(fov / 2.0) * conv;
  const b = a - eyeSep / 2.0;
  const c = a + eyeSep / 2.0;

  const left = (-b * near) / conv;
  const right = (c * near) / conv;

  return m4.frustum(left, right, bottom, top, near, far);
}

function rightProjection(stereoCamera) {
  const { conv, eyeSep, ratio, fov, near, far } = stereoCamera;

  const top = near * Math.tan(fov / 2.0);
  const bottom = -top;

  const a = ratio * Math.tan(fov / 2.0) * conv;
  const b = a - eyeSep / 2.0;
  const c = a + eyeSep / 2.0;

  const left = (-c * near) / conv;
  const right = (b * near) / conv;

  return m4.frustum(left, right, bottom, top, near, far);
}

function drawLeft() {
  // Set the values of the projection transformation
  let projection = leftProjection(stereoCamera);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([1, 0, 1], -Math.PI / 3);
  let translateToPointZero = m4.translation(0, 0, zoomRange.value);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
         combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform3fv(shProgram.iLightPosition, lightCoordinates());
  gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0]);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));
  gl.uniform1f(shProgram.iShininess, 1.0);

  gl.uniform3fv(shProgram.iAmbientColor, [1, 1, 1]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1, 1, 1]);
  gl.uniform3fv(shProgram.iSpecularColor, [1, 1, 1]);

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 0]);

  gl.uniform1f(shProgram.iTextureAngle, rotAngleRange.value);

  const u = TEXTURE_POINT.x;
  const v = TEXTURE_POINT.y;

  gl.uniform2fv(shProgram.iTexturePoint, [
    getX(0, u, v, slopeAngleRange.value, radiusRange.value, 1, 1),
    getY(0, u, v, slopeAngleRange.value, radiusRange.value, 1, 1),
  ]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTextureU, 0);
  surface.Draw();
}

function drawRight() {
  // Set the values of the projection transformation
  let projection = rightProjection(stereoCamera);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([1, 0, 1], -Math.PI / 3);
  let translateToPointZero = m4.translation(0, 0, zoomRange.value);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
         combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform3fv(shProgram.iLightPosition, lightCoordinates());
  gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0]);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));
  gl.uniform1f(shProgram.iShininess, 1.0);

  gl.uniform3fv(shProgram.iAmbientColor, [1, 1, 1]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1, 1, 1]);
  gl.uniform3fv(shProgram.iSpecularColor, [1, 1, 1]);

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 0]);

  gl.uniform1f(shProgram.iTextureAngle, rotAngleRange.value);

  const u = TEXTURE_POINT.x;
  const v = TEXTURE_POINT.y;

  gl.uniform2fv(shProgram.iTexturePoint, [
    getX(0, u, v, slopeAngleRange.value, radiusRange.value, 1, 1),
    getY(0, u, v, slopeAngleRange.value, radiusRange.value, 1, 1),
  ]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTextureU, 0);
  surface.Draw();
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //

  gl.colorMask(true, false, false, true);
  drawLeft();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.colorMask(false, true, true, true);
  drawRight();
}

// Creates vertex list of the Surface
function CreateSurfaceData() {
  const alpha0 = 0;
  const theta = slopeAngleRange.value;
  const r = radiusRange.value;
  const c = 1;
  const d = 1;

  let vertexList = [];
  let textureList = [];

  const alphaMax = angleRange.value;
  const heightMax = heightRange.value;

  for (let alpha = MIN_ANGLE; alpha <= alphaMax; alpha += STEP_ANGLE) {
    for (let t = MIN_HEIGHT; t <= heightMax; t += STEP_HEIGHT) {
      let x = getX(alpha0, alpha, t, theta, r, c, d);
      let y = getY(alpha0, alpha, t, theta, r, c, d);
      let z = getZ(t, theta, c, d);
      vertexList.push(x, y, z);
      textureList.push(getU(alpha, alphaMax), getV(t, heightMax));

      let tNext = t + STEP_HEIGHT;
      let alphaNext = alpha + STEP_ANGLE;
      let x1 = getX(alpha0, alphaNext, t, theta, r, c, d);
      let y1 = getY(alpha0, alphaNext, t, theta, r, c, d);
      let z1 = getZ(t, theta, c, d);
      vertexList.push(x1, y1, z1);
      textureList.push(getU(alphaNext, alphaMax), getV(tNext, heightMax));
    }
  }
  return { vertexList, textureList };
}

// Calculate method for x coordinate
function getX(alpha0, alpha, t, theta, r, c, d) {
  return r * cos(alpha) - (r * (alpha0 - alpha) + t * cos(theta) - c * sin(d * t) * sin(theta)) * sin(alpha);
}

// Calculate method for y coordinate
function getY(alpha0, alpha, t, theta, r, c, d) {
  return r * sin(alpha) + (r * (alpha0 - alpha) + t * cos(theta) - c * sin(d * t) * sin(theta)) * cos(alpha);
}

// Calculate method for z coordinate
function getZ(t, theta, c, d) {
  return t * sin(theta) + c * sin(d * t) * cos(theta);
}

function getU(u, maxU) {
  return u / maxU;
}

function getV(v, maxV) {
  return v / maxV;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

  shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
  shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
  shProgram.iColor = gl.getUniformLocation(prog, "colorU");

  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
  shProgram.iLightVec = gl.getUniformLocation(prog, "lightVec");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");
  shProgram.iTextureAngle = gl.getUniformLocation(prog, "textureAngle");
  shProgram.iTexturePoint = gl.getUniformLocation(prog, "texturePoint");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  background = new Model("Back");
  background.BufferData(
    [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  stereoCamera = {
    eyeSep: eyeSepRange.value,
    conv: convRange.value,
    ratio: gl.canvas.width / gl.canvas.height,
    fov: fovRange.value,
    near: nearRange.value,
    far: 20,
  };

  loadTexture();

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

// Initialization function that will be called when the page has loaded
function init() {
  // Set zoom range
  zoomRange = document.getElementById("ZoomRange");
  zoomRange.value = DEFAULT_ZOOM;
  zoomRange.max = MAX_ZOOM;
  zoomRange.min = MIN_ZOOM;
  zoomRange.step = STEP_ZOOM;
  let zoomValueSpan = document.getElementById("ZoomValue");
  zoomValueSpan.innerHTML = zoomRange.value;

  // Set angle range
  angleRange = document.getElementById("AngleRange");
  angleRange.value = DEFAULT_ANGLE;
  angleRange.max = MAX_ANGLE;
  angleRange.min = MIN_ANGLE;
  angleRange.step = STEP_ANGLE;
  let angleValueSpan = document.getElementById("AngleValue");
  angleValueSpan.innerHTML = angleRange.value;

  // Set radius range
  radiusRange = document.getElementById("RadiusRange");
  radiusRange.value = DEFAULT_RADIUS;
  radiusRange.max = MAX_RADIUS;
  radiusRange.min = MIN_RADIUS;
  radiusRange.step = STEP_RADIUS;
  let radiusValueSpan = document.getElementById("RadiusValue");
  radiusValueSpan.innerHTML = radiusRange.value;

  // Set slope angle range
  slopeAngleRange = document.getElementById("SlopeAngleRange");
  slopeAngleRange.value = DEFAULT_SLOPE_ANGLE;
  slopeAngleRange.max = MAX_SLOPE_ANGLE;
  slopeAngleRange.min = MIN_SLOPE_ANGLE;
  slopeAngleRange.step = STEP_SLOPE_ANGLE;
  let slopeAngleValueSpan = document.getElementById("SlopeAngleValue");
  slopeAngleValueSpan.innerHTML = slopeAngleRange.value;

  // Set height range
  heightRange = document.getElementById("HeightRange");
  heightRange.value = DEFAULT_HEIGHT;
  heightRange.max = MAX_HEIGHT;
  heightRange.min = MIN_HEIGHT;
  heightRange.step = STEP_HEIGHT;
  let heightValueSpan = document.getElementById("HeightValue");
  heightValueSpan.innerHTML = heightRange.value;

  // Set rotation angle range
  rotAngleRange = document.getElementById("RotAngleRange");
  rotAngleRange.value = DEFAULT_ROTATION_ANGLE;
  rotAngleRange.max = MAX_ROTATION_ANGLE;
  rotAngleRange.min = MIN_ROTATION_ANGLE;
  rotAngleRange.step = STEP_ROTATION_ANGLE;
  let rotAngleValueSpan = document.getElementById("RotAngleValue");
  rotAngleValueSpan.innerHTML = rotAngleRange.value;

  // Set texture point x coordinate
  texPointXRange = document.getElementById("TexPointXRange");
  texPointXRange.value = DEFAULT_TEXTURE_POINT;
  texPointXRange.max = MAX_TEXTURE_POINT;
  texPointXRange.min = MIN_TEXTURE_POINT;
  texPointXRange.step = STEP_TEXTURE_POINT;
  let texturePointXValueSpan = document.getElementById("TexPointXValue");
  texturePointXValueSpan.innerHTML = texPointXRange.value;

  // Set rotation angle range
  texPointYRange = document.getElementById("TexPointYRange");
  texPointYRange.value = DEFAULT_TEXTURE_POINT;
  texPointYRange.max = MAX_TEXTURE_POINT;
  texPointYRange.min = MIN_TEXTURE_POINT;
  texPointYRange.step = STEP_TEXTURE_POINT;
  let texturePointYValueSpan = document.getElementById("TexPointYValue");
  texturePointYValueSpan.innerHTML = texPointYRange.value;

  // Set eye separation range
  eyeSepRange = document.getElementById("EyeSepRange");
  eyeSepRange.value = DEFAULT_EYE_SEPARATION;
  eyeSepRange.max = MAX_EYE_SEPARATION;
  eyeSepRange.min = MIN_EYE_SEPARATION;
  eyeSepRange.step = STEP_EYE_SEPARATION;
  let eyeSeparationRangeValueSpan = document.getElementById("EyeSepValue");
  eyeSeparationRangeValueSpan.innerHTML = eyeSepRange.value;

  // Set field of view range
  fovRange = document.getElementById("FOVRange");
  fovRange.value = DEFAULT_FOV;
  fovRange.max = MAX_FOV;
  fovRange.min = MIN_FOV;
  fovRange.step = STEP_FOV;
  let fovValueSpan = document.getElementById("FOVValue");
  fovValueSpan.innerHTML = fovRange.value;

  // Set near clipping distance range
  nearRange = document.getElementById("NearRange");
  nearRange.value = DEFAULT_NEAR;
  nearRange.max = MAX_NEAR;
  nearRange.min = MIN_NEAR;
  nearRange.step = STEP_NEAR;
  let nearValueSpan = document.getElementById("NearValue");
  nearValueSpan.innerHTML = nearRange.value;

  // Set convergence range
  convRange = document.getElementById("ConvRange");
  convRange.value = DEFAULT_CONVERGENCE;
  convRange.max = MAX_CONVERGENCE;
  convRange.min = MIN_CONVERGENCE;
  convRange.step = STEP_CONVERGENCE;
  let convergenceValueSpan = document.getElementById("ConvValue");
  convergenceValueSpan.innerHTML = convRange.value;

  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    video = document.createElement("video");
    video.setAttribute("autoplay", true);
    window.vid = video;
    getWebcam();
    tex = CreateWebCamTexture();
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  // draw();
  continuousDraw();
}

function continuousDraw() {
  draw();
  window.requestAnimationFrame(continuousDraw);
}

function reDraw() {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  draw();
}

function loadTexture() {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = `https://www.the3rdsequence.com/texturedb/download/116/texture/jpg/1024/irregular+wood+planks-1024x1024.jpg`;

  image.addEventListener("load", function () {
    tex1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // draw();
  });
}

// Updates surface when zoom is changes
function UpdateZoom() {
  let zoomValueSpan = document.getElementById("ZoomValue");
  zoomValueSpan.innerHTML = zoomRange.value;
  reDraw();
}

// Updates surface when angle is changes
function UpdateAngle() {
  let angleValueSpan = document.getElementById("AngleValue");
  angleValueSpan.innerHTML = angleRange.value;
  reDraw();
}

// Updates surface when radius is changes
function UpdateRadius() {
  let radiusValueSpan = document.getElementById("RadiusValue");
  radiusValueSpan.innerHTML = radiusRange.value;
  reDraw();
}

// Updates surface when slope angle is changes
function UpdateSlopeAngle() {
  let slopeAngleValueSpan = document.getElementById("SlopeAngleValue");
  slopeAngleValueSpan.innerHTML = slopeAngleRange.value;
  reDraw();
}

// Updates surface when height is changes
function UpdateHeight() {
  let heightValueSpan = document.getElementById("HeightValue");
  heightValueSpan.innerHTML = heightRange.value;
  reDraw();
}

// Updates texture when rotation angle is changes
function UpdateRotAngle() {
  let rotAngleValueSpan = document.getElementById("RotAngleValue");
  rotAngleValueSpan.innerHTML = rotAngleRange.value;
  reDraw();
}

// Updates texture when texture point x coordinate is changes
function UpdateTexPointX() {
  TEXTURE_POINT.x = Number(texPointXRange.value);
  let texturePointXValueSpan = document.getElementById("TexPointXValue");
  texturePointXValueSpan.innerHTML = texPointXRange.value;
  reDraw();
}

// Updates texture when texture point y coordinate is changes
function UpdateTexPointY() {
  TEXTURE_POINT.y = Number(texPointYRange.value);
  let texturePointYValueSpan = document.getElementById("TexPointYValue");
  texturePointYValueSpan.innerHTML = texPointYRange.value;
  reDraw();
}

// Updates when eye separation range is changed
function UpdateEyeSep() {
  let eyeSeparationValueSpan = document.getElementById("EyeSepValue");
  eyeSeparationValueSpan.innerHTML = eyeSepRange.value;
  reDraw();
}

// Updates when field of view range is changed
function UpdateFOV() {
  let fovValueSpan = document.getElementById("FOVValue");
  fovValueSpan.innerHTML = fovRange.value;
  reDraw();
}

// Updates when near clipping distance range is changed
function UpdateNear() {
  let nearValueSpan = document.getElementById("NearValue");
  nearValueSpan.innerHTML = nearRange.value;
  reDraw();
}

// Updates when convergence range is changed
function UpdateConv() {
  let convergenceValueSpan = document.getElementById("ConvValue");
  convergenceValueSpan.innerHTML = convRange.value;
  reDraw();
}

window.addEventListener("keydown", function (event) {
  switch (event.code) {
    case "ArrowLeft":
      pressArrowLeft();
      break;
    case "ArrowRight":
      pressArrowRight();
      break;
    case "KeyW":
      pressW();
      break;
    case "KeyS":
      pressS();
      break;
    case "KeyD":
      pressD();
      break;
    case "KeyA":
      pressA();
      break;
    case "KeyQ":
      pressQ();
      break;
    case "KeyE":
      pressE();
      break;
    default:
      return;
  }
});

function pressArrowLeft() {
  handlePosition -= 0.01;
  reDraw();
}

function pressArrowRight() {
  handlePosition += 0.01;
  reDraw();
}

function pressW() {
  TEXTURE_POINT.y += STEP_TEXTURE_POINT;
  TEXTURE_POINT.y = +Number(stab(TEXTURE_POINT.y, MIN_TEXTURE_POINT, MAX_TEXTURE_POINT)).toFixed(3);
  let texturePointYValueSpan = document.getElementById("TexturePointYValue");
  texturePointYValueSpan.innerHTML = TEXTURE_POINT.y;
  reDraw();
}

function pressS() {
  TEXTURE_POINT.y -= STEP_TEXTURE_POINT;
  TEXTURE_POINT.y = +Number(stab(TEXTURE_POINT.y, MIN_TEXTURE_POINT, MAX_TEXTURE_POINT)).toFixed(3);
  let texturePointYValueSpan = document.getElementById("TexturePointYValue");
  texturePointYValueSpan.innerHTML = TEXTURE_POINT.y;
  reDraw();
}

function pressA() {
  TEXTURE_POINT.x -= STEP_TEXTURE_POINT;
  TEXTURE_POINT.x = +Number(stab(TEXTURE_POINT.x, MIN_TEXTURE_POINT, MAX_TEXTURE_POINT)).toFixed(3);
  let texturePointXValueSpan = document.getElementById("TexturePointXValue");
  texturePointXValueSpan.innerHTML = TEXTURE_POINT.x;
  reDraw();
}

function pressD() {
  TEXTURE_POINT.x += STEP_TEXTURE_POINT;
  TEXTURE_POINT.x = +Number(stab(TEXTURE_POINT.x, MIN_TEXTURE_POINT, MAX_TEXTURE_POINT)).toFixed(3);
  let texturePointXValueSpan = document.getElementById("TexturePointXValue");
  texturePointXValueSpan.innerHTML = TEXTURE_POINT.x;
  reDraw();
}

function pressQ() {
  rotAngleRange.value -= STEP_ROTATION_ANGLE;
  let rotAngleValueSpan = document.getElementById("RotAngleValue");
  rotAngleValueSpan.innerHTML = rotAngleRange.value;
  reDraw();
}

function pressE() {
  rotAngleRange.value = +rotAngleRange.value + STEP_ROTATION_ANGLE;
  let rotAngleValueSpan = document.getElementById("RotAngleValue");
  rotAngleValueSpan.innerHTML = rotAngleRange.value;
  reDraw();
}

function lightCoordinates() {
  let angle = handlePosition * Math.PI * 2.0;
  let radius = 10;

  let x = radius * Math.cos(angle);
  let y = 0;
  let z = radius * Math.sin(angle);
  return [x, y, z];
}

function getWebcam() {
  navigator.getUserMedia(
    { video: true, audio: false },
    function (stream) {
      video.srcObject = stream;
      track = stream.getTracks()[0];
    },
    function (error) {
      console.log("Webcam error: ", error);
    }
  );
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}

// Light position value
let handlePosition = 0.0;

// First user point coordinates on surface
const TEXTURE_POINT = { x: DEFAULT_TEXTURE_POINT, y: DEFAULT_TEXTURE_POINT };

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

function cos(x) {
  return Math.cos(x);
}

function sin(x) {
  return Math.sin(x);
}

function stab(x, min, max) {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}
