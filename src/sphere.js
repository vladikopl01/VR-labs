export function CreateSphereData(multiplier, iSegments, jSegments) {
  const vertexList = [];
  const textureList = [];

  for (let i = 0; i <= iSegments; i++) {
    const theta = (i * Math.PI) / iSegments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let j = 0; j <= jSegments; j++) {
      const phi = (j * 2 * Math.PI) / jSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = multiplier * cosPhi * sinTheta;
      const y = multiplier * cosTheta;
      const z = multiplier * sinPhi * sinTheta;

      vertexList.push(x, y, z);

      const u = 1 - j / jSegments;
      const v = 1 - i / iSegments;
      textureList.push(u, v);
    }
  }

  return { vertexList, textureList };
}

export function moveSphere(sphereCoords, angle, offsetX = 0, offsetZ = -5, radius = 4) {
  sphereCoords[0] = radius * Math.cos(angle) + offsetX;
  sphereCoords[2] = radius * Math.sin(angle) + offsetZ;
  return sphereCoords;
}
