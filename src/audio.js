export let ctx;
export let source;
export let panner;
export let filter;

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
