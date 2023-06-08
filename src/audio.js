let ctx;
let source;
let panner;
let filter;

export function handleAudioSlider() {
  const audio = document.getElementById("audio");
  audio.addEventListener("play", (e) => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      source = ctx.createMediaElementSource(audio);
      panner = ctx.createPanner();
      filter = ctx.createBiquadFilter();

      source.connect(panner);
      panner.connect(filter);
      filter.connect(ctx.destination);

      filter.type = "lowpass";
      filter.frequency.value = 1500;
      ctx.resume();
    }
  });
}

export function handleFilterChange() {
  const filterCheckbox = document.getElementById("filter");
  filterCheckbox.addEventListener("change", async function (e) {
    const isChecked = e.target.checked;
    if (isChecked) {
      panner?.disconnect();
      panner?.connect?.(filter);
      filter?.connect?.(ctx.destination);
    } else {
      panner?.disconnect();
      panner?.connect?.(ctx.destination);
    }
  });
}

// export function getSoundBuffer(fileName) {
//   return new Promise((resolve, reject) => {
//     const request = new XMLHttpRequest();
//     request.open("GET", fileName, true);
//     request.responseType = "arraybuffer";
//     request.onload = function (e) {
//       resolve(request.response);
//     };
//     request.send();
//   });
// }

// export async function loadAudio(fileName) {
//   ctx = new AudioContext();
//   const volume = ctx.createGain();
//   volume.connect(ctx.destination);
//   const sound = {
//     source: ctx.createBufferSource(),
//     volume: ctx.createGain(),
//   };

//   sound.source.connect(sound.volume);
//   sound.volume.connect(volume);
//   sound.source.loop = true;

//   const soundBuffer = await getSoundBuffer(fileName);
//   try {
//     sound.buffer = await ctx.decodeAudioData(soundBuffer);
//     sound.source.buffer = sound.buffer;
//     sound.source.start(ctx.currentTime);
//   } catch (e) {
//     console.error(e);
//   }

//   panner = ctx.createPanner();
//   filter = ctx.createBiquadFilter();

//   sound.source.connect(panner);
//   panner.connect(filter);
//   filter.connect(ctx.destination);

//   filter.type = "lowpass";
//   filter.frequency.value = 1000;
//   filter.gain.value = 25;
//   filter.Q.value = 1;

//   return [sound, panner];
// }

// export function handleAudioButton() {
//   const button = document.getElementById("audio");

//   button.addEventListener("click", async function (e) {
//     [audio, panner] = await loadAudio("assets/rose_golden.mp3").catch(console.error);
//   });
// }
