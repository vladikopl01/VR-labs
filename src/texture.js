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
