export function getSoundBuffer(fileName) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", fileName, true);
    request.responseType = "arraybuffer";
    request.onload = function (e) {
      resolve(request.response);
    };
    request.send();
  });
}

export async function loadAudio(fileName) {
  const ctx = new AudioContext();
  const volume = ctx.createGain();
  volume.connect(ctx.destination);
  const sound = {
    source: ctx.createBufferSource(),
    volume: ctx.createGain(),
  };

  sound.source.connect(sound.volume);
  sound.volume.connect(volume);
  sound.source.loop = true;

  const soundBuffer = await getSoundBuffer(fileName);
  try {
    sound.buffer = await ctx.decodeAudioData(soundBuffer);
    sound.source.buffer = sound.buffer;
    sound.source.start(ctx.currentTime);
  } catch (e) {
    console.error(e);
  }

  const panner = ctx.createPanner();
  const filter = ctx.createBiquadFilter();

  sound.source.connect(panner);
  panner.connect(filter);
  filter.connect(ctx.destination);

  filter.type = "lowpass";
  filter.frequency.value = 1000;
  filter.gain.value = 25;
  filter.Q.value = 1;

  return [sound, panner];
}

export function handleAudioButton() {
  const button = document.getElementById("audio");

  button.addEventListener("click", async function (e) {
    [audio, panner] = await loadAudio("assets/rose_golden.mp3").catch(console.error);
  });
}
