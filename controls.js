// Zoom range element
let zoomRange;
// Angle range element
let angleRange;
// Radius range element
let radiusRange;
// Slope angle range element
let slopeAngleRange;
// Height range element
let heightRange;
// Texture angle
let rotAngleRange;
// Texture point x coordinate range
let texPointXRange;
// Texture point y coordinate range
let texPointYRange;

// Eye separation
let eyeSepRange;
// Field of view
let fovRange;
// Near clipping distance
let nearRange;
// Convergence
let convRange;

// Constant values for zoom range
const MAX_ZOOM = 50.0;
const MIN_ZOOM = -100.0;
const STEP_ZOOM = 1.0;
const DEFAULT_ZOOM = -80.0;
// Constant values for slope angle range
const MAX_SLOPE_ANGLE = 2 * Math.PI;
const MIN_SLOPE_ANGLE = 0;
const STEP_SLOPE_ANGLE = Math.PI / 10;
const DEFAULT_SLOPE_ANGLE = Math.PI / 2;
// Constant values for radius range
const MAX_RADIUS = 5;
const MIN_RADIUS = 0;
const STEP_RADIUS = 0.5;
const DEFAULT_RADIUS = 1;
// Constant values of extension angle range
const MAX_ANGLE = 8 * Math.PI;
const MIN_ANGLE = 0;
const STEP_ANGLE = Math.PI / 50;
const DEFAULT_ANGLE = 4 * Math.PI;
// Constant values of height range
const MAX_HEIGHT = 10;
const MIN_HEIGHT = 0;
const STEP_HEIGHT = 0.1;
const DEFAULT_HEIGHT = 2;

// Constant values of rotation angle for texture range
const MAX_ROTATION_ANGLE = Math.PI;
const MIN_ROTATION_ANGLE = -Math.PI;
const STEP_ROTATION_ANGLE = Math.PI / 50;
const DEFAULT_ROTATION_ANGLE = 0.0;
// Constant values of texture point
const MAX_TEXTURE_POINT = 1.0;
const MIN_TEXTURE_POINT = -1.0;
const DEFAULT_TEXTURE_POINT = 0.0;
const STEP_TEXTURE_POINT = 0.005;

// Constant values of eye separation
const MAX_EYE_SEPARATION = 200.0;
const MIN_EYE_SEPARATION = 0.0;
const STEP_EYE_SEPARATION = 1;
const DEFAULT_EYE_SEPARATION = 70;
// Constant values of field of view
const MAX_FOV = 100;
const MIN_FOV = -100;
const STEP_FOV = 1;
const DEFAULT_FOV = 10;
// Constant values of near clipping distance
const MAX_NEAR = 20;
const MIN_NEAR = 0;
const STEP_NEAR = 1;
const DEFAULT_NEAR = 10;
// Constant values of convergence
const MAX_CONVERGENCE = 3000;
const MIN_CONVERGENCE = 100;
const STEP_CONVERGENCE = 50;
const DEFAULT_CONVERGENCE = 2000;

export const controls = [
  {
    id: "eyeSeparation",
    label: "Eye Separation",
    min: 0,
    max: 10,
    step: 0.01,
    value: 2,
    elementRef: null,
  },
  {
    id: "fov",
    label: "Field of View",
    min: 0.5,
    max: 3,
    step: 0.01,
    value: 1.45,
    elementRef: null,
  },
  {
    id: "nearClippingDistance",
    label: "Near Clipping Distance",
    min: 1,
    max: 20,
    step: 0.5,
    value: 10,
    elementRef: null,
  },
  {
    id: "convergenceDistance",
    label: "Convergence distance",
    min: 1,
    max: 100,
    step: 1,
    value: 40,
    elementRef: null,
  },
];

export const renderControls = (selector) => {
  const container = document.querySelector(selector);
  container.innerHTML = "";
  controls.forEach((control) => {
    const div = document.createElement("div");
    const divWrapper = document.createElement("div");
    divWrapper.classList.add("title-wrapper");

    const label = document.createElement("label");
    label.setAttribute("for", control.id);
    label.innerHTML = control.label;

    const span = document.createElement("span");
    span.setAttribute("class", "slider-value");
    span.innerHTML = control.value;

    const input = document.createElement("input");
    input.setAttribute("id", control.id);
    input.setAttribute("type", "range");
    input.setAttribute("min", control.min);
    input.setAttribute("max", control.max);
    input.setAttribute("step", control.step);
    input.setAttribute("value", control.value);
    input.addEventListener("input", (e) => {
      span.innerHTML = e.target.value;
    });
    control.elementRef = input;

    divWrapper.appendChild(label);
    divWrapper.appendChild(span);

    div.appendChild(divWrapper);
    div.appendChild(input);

    container.appendChild(div);
  });
};

export const getValueById = (controlId) => {
  const control = controls.find((control) => control.id === controlId);
  return parseFloat(control?.elementRef?.value, 10);
};
