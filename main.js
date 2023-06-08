import fragmentShaderSource from "./shaders/fragmentShader.glsl";
import vertexShaderSource from "./shaders/vertexShader.glsl";
import { handleAudioSlider, handleFilterChange } from "./src/audio";
import { getValueById, renderControls } from "./src/controls.js";
import { handleRequestButton, latestEvent } from "./src/deviceOrientation.js";
import { CreateSphereData, moveSphere } from "./src/sphere";
import { CreateSurfaceData } from "./src/surface.js";
import { createWebcamTexture, getWebcamEnabled, handleWebcam } from "./src/webcam.js";
import "./style.css";
import "./utils/m4.js";
import { TrackballRotator } from "./utils/trackball-rotator.js";

let gl; // The webgl context
let surface; // A surface model
let background; // A background model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse
let texture, webcamTexture; // A textures
let video; // A video element
let deviceOrientation; // A device orientation state

let audio; // An audio element
let panner; // A panner node

let sphere; // A sphere model
let sphereStep = 0;
let sphereCoords = [0, 0, 0];

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

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

  this.DrawSphere = function () {
    this.Draw();
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  };
}

// Constructor of the Shader
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Texture coordinates
  this.iTextureCoords = -1;
  // Texture unit
  this.iTextureUnit = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const eyeSeparation = getValueById("eyeSeparation");
  const fov = getValueById("fov");
  const nearClippingDistance = getValueById("nearClippingDistance");
  const convergenceDistance = getValueById("convergenceDistance");

  const far = 2000;
  let left, right, top, bottom;

  top = nearClippingDistance * Math.tan(fov / 2.0);
  bottom = -top;

  const a = Math.tan(fov / 2.0) * convergenceDistance;
  const b = a - eyeSeparation / 2.0;
  const c = a + eyeSeparation / 2.0;

  left = (-b * nearClippingDistance) / convergenceDistance;
  right = (c * nearClippingDistance) / convergenceDistance;
  const projectionLeft = m4.orthographic(left, right, bottom, top, nearClippingDistance, far);

  left = (-c * nearClippingDistance) / convergenceDistance;
  right = (b * nearClippingDistance) / convergenceDistance;
  const projectionRight = m4.orthographic(left, right, bottom, top, nearClippingDistance, far);

  let modelView;
  if (deviceOrientation.checked && latestEvent.alpha && latestEvent.beta && latestEvent.gamma) {
    const alphaRad = (latestEvent.alpha * Math.PI) / 180;
    sphereCoords = moveSphere(sphereCoords, alphaRad + Math.PI / 2);
  } else {
    sphereStep += 0.015;
    sphereCoords = moveSphere(sphereCoords, sphereStep);
  }
  modelView = spaceball.getViewMatrix();

  const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  const translateToLeft = m4.translation(-0.01, 0, -20);
  const translateToRight = m4.translation(0.01, 0, -20);

  if (getWebcamEnabled()) {
    const projection = m4.orthographic(0, 1, 0, 1, -1, 1);
    const noRotation = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRotation);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.bindTexture(gl.TEXTURE_2D, webcamTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    background.Draw();
  }

  panner?.setPosition(...sphereCoords);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const projection = m4.perspective(degToRad(90), 1, 0.1, 100);
  const translationShere = m4.translation(...sphereCoords);
  const modelViewMatrix = m4.multiply(translationShere, modelView);

  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
  sphere.DrawSphere();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  const matrixLeft = m4.multiply(translateToLeft, modelView);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matrixLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const matrixRight = m4.multiply(translateToRight, modelView);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matrixRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

  gl.colorMask(true, true, true, true);
}

// Initialize the WebGL context
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureUnit = gl.getUniformLocation(prog, "textureUnit");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  background = new Model("Background");
  background.BufferData(
    [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  const sphereData = CreateSphereData(0.5, 500, 500);
  sphere = new Model("Sphere");
  sphere.BufferData(sphereData.vertexList, sphereData.textureList);

  LoadTexture();
  gl.enable(gl.DEPTH_TEST);
}

function infiniteDraw() {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  draw();
  window.requestAnimationFrame(infiniteDraw);
}

// Create a program with the source text given by shader
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
async function init() {
  renderControls("#controls");

  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    video = document.createElement("video");
    video.setAttribute("autoplay", "true");
    deviceOrientation = document.getElementById("device-orientation");
    webcamTexture = createWebcamTexture(gl);

    handleWebcam(video);
    handleRequestButton();

    handleAudioSlider();
    handleFilterChange();
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

  infiniteDraw();
}

async function LoadImage() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = "../assets/texture.png";
    image.crossOrigin = "anonymous";
    image.addEventListener("load", function () {
      resolve(image);
    });
  });
}

export async function LoadTexture() {
  const image = await LoadImage();
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

document.addEventListener("DOMContentLoaded", init);
