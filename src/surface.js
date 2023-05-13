import { controls, getValueById } from "./controls";

function cos(x) {
  return Math.cos(x);
}

function sin(x) {
  return Math.sin(x);
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

// Creates vertex list of the Surface
export function CreateSurfaceData() {
  const alpha0 = 0;
  const theta = getValueById("slopeAngle");
  const r = getValueById("radius");
  const c = 1;
  const d = 1;

  let vertexList = [];
  let textureList = [];

  const alphaMax = getValueById("angle");
  const heightMax = getValueById("height");

  const min_angle = controls.find((control) => control.id === "angle").min;
  const step_angle = controls.find((control) => control.id === "angle").step;
  const min_height = controls.find((control) => control.id === "height").min;
  const step_height = controls.find((control) => control.id === "height").step;

  for (let alpha = min_angle; alpha <= alphaMax; alpha += step_angle) {
    for (let t = min_height; t <= heightMax; t += step_height) {
      let x = getX(alpha0, alpha, t, theta, r, c, d);
      let y = getY(alpha0, alpha, t, theta, r, c, d);
      let z = getZ(t, theta, c, d);
      vertexList.push(x, y, z);
      textureList.push(getU(alpha, alphaMax), getV(t, heightMax));

      let tNext = t + step_height;
      let alphaNext = alpha + step_angle;
      let x1 = getX(alpha0, alphaNext, t, theta, r, c, d);
      let y1 = getY(alpha0, alphaNext, t, theta, r, c, d);
      let z1 = getZ(t, theta, c, d);
      vertexList.push(x1, y1, z1);
      textureList.push(getU(alphaNext, alphaMax), getV(tNext, heightMax));
    }
  }
  return { vertexList, textureList };
}
