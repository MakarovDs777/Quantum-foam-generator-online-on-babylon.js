// Babylon Playground — Quantum Foam с биомами и полнофункциональным GUI (JS-only)

// ---- Perlin с возможностью инициализации seed'а ----
const Perlin = (function () {
  const basePerm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  let p = new Uint8Array(512);
  // init default
  for (let i = 0; i < 256; i++) p[i] = p[i + 256] = basePerm[i];

  function seededShuffle(seed) {
    // xorshift32-like PRNG
    let s = (seed >>> 0) || 1;
    function rnd() {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 0xFFFFFFFF;
    }
    const permBase = basePerm.slice();
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(rnd() * (i + 1));
      const t = permBase[i]; permBase[i] = permBase[r]; permBase[r] = t;
    }
    for (let i = 0; i < 256; i++) p[i] = p[i + 256] = permBase[i];
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  function noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x = x - Math.floor(x); y = y - Math.floor(y); z = z - Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

    return lerp(w,
      lerp(v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
      ),
      lerp(v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  return {
    noise,
    init: seededShuffle
  };
})();

// ---- Параметры по умолчанию ----
const params = {
  grid: { x: 32, y: 32, z: 32 },
  cubeSize: 10.0,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
  threshold: 0.5,
  baseScale: 0.5,
  seed: Math.floor(Math.random() * 1000000),
  autoRegen: false,
  autoRandom: false,
  randomInterval: 2000,
  tabNames: ["Quantum Foam", "Optional Tab"],
  randomRanges: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, zMin: -10, zMax: 10 },
  compressionX: 1.0,
  compressionY: 1.0,
  compressionZ: 1.0,
  // NEW: spacing multipliers (контролируют расстояние между инстансами)
  spacingX: 0.9,
  spacingY: 0.9,
  spacingZ: 0.9,
  smooth: false,
  smoothPasses: 1
};

// ---- Canvas + Engine ----
const canvas = document.getElementById("renderCanvas") || (function () {
  const c = document.createElement("canvas");
  c.id = "renderCanvas";
  document.body.style.margin = 0;
  document.body.style.overflow = "hidden";
  document.body.appendChild(c);
  c.style.width = "100%";
  c.style.height = "100%";
  c.width = window.innerWidth; c.height = window.innerHeight;
  return c;
})();

const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
let scene = null;
let density = null;
let protoInstances = [];
let biomePrototypes = [];
let protoMesh = null;

// ---- Простые "биомы" (используются примитивы для Playground) ----
const biomes = [
        {  // 1 
        vertices: [[1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, 1.001373], [-1.0, -1.0, -1.0], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, 1.001373], [-1.006586, -1.0, -1.0], [-0.006586, 1.0, 0.001373], [-1.006586, 0.000368, 0.001005], [0.000113, 0.000414, 0.001787], [-1.0, -1.0, -1.0], [-0.006702, 
-0.000116, -1.0], [-0.006651, -6.5e-05, 0.008809]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 2 
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 1.006685], [1.0, -1.0, -1.0], [-1.006586, 1.0, -1.0], [1.0, -1.0, -1.0], [-1.006586, 1.0, 1.006685], [1.0, -1.0, -1.0], [-0.006586, 1.0, 0.006685], [-0.003616, 0.000368, 0.006316], [1.0, 0.000414, 0.007099], [1.0, -1.0, -1.0], [-0.006702, -0.000116, 
-1.0], [-0.003952, -6.5e-05, 0.000681]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 3
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, 1.007598], [1.0, 1.0, 1.00681], [1.0, -1.0, 1.00681], [-1.006586, 1.0, -1.0], [1.0, -1.0, 1.016217], [-1.006586, 1.0, 
1.00681], [1.0, -1.0, 1.00681], [-0.006586, 1.0, 0.00681], [-0.006776, 0.000368, 0.016338], [1.0, 0.000414, 0.007224], [1.0, -1.0, 1.010906], [-0.006702, -0.000116, 0.013153], [-0.006651, -6.5e-05, 1.00681]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 4
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [1.0, -1.0, 1.010836], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, 1.010836], [-0.006586, 1.0, -1.0], [-1.006586, 0.000368, 0.010468], [1.0, 0.000414, 0.01125], [-0.006027, -1.0, 0.010277], [-0.006702, -0.000116, -1.0], [-0.006651, -6.5e-05, 0.061704]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 5
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.000553, -1.0], [1.0, -1.0, 1.004626], [1.0, 1.0, -1.0], [-1.006586, -1.0, -1.0], [1.0, 1.0, -1.0], [-1.006586, -1.0, 1.004626], [1.0, 1.0, -1.0], [-0.010857, 0.000368, 0.004258], [1.0, 0.000414, 0.00504], [-0.006027, -1.0, 0.004067], [1.0, -0.000116, -1.0], [-0.006651, -6.5e-05, -0.004368]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 6
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 1.014604], [1.0, -1.0, -1.0], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, 1.014604], [-1.006586, -1.0, -1.0], [-0.006586, 1.0, 0.014604], [-1.006586, 0.000368, 0.014235], [1.0, 0.000414, 0.015017], [-0.006027, -1.0, -1.0], [-0.006702, -0.000116, -1.0], [-0.006651, -6.5e-05, 0.006571]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 7
        vertices: [[1.0, 1.0, -1.011714], [-1.0, -1.0, -1.011714], [1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [-1.006586, 1.0, -1.011714], [-1.006586, -1.0, -1.011714], [-1.006586, 1.0, 1.0], [-1.006586, -1.0, 1.0], [-0.006586, 1.0, -0.011714], [-1.006586, 0.000368, -0.012083], [0.015981, 0.000414, -0.0113], [-1.0, -1.0, -0.012273], [-0.006702, -0.000116, -1.011714], [-0.006651, -6.5e-05, 1.0]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 8
        vertices: [[-1.005944, 1.0, -1.007567], [1.0, -1.0, -1.007567], [-1.007227, 1.0, -1.007111], [1.0, -1.0, 1.0], [-1.006586, 1.0, -1.007567], [-1.006586, -1.0, -1.007567], [-1.006586, 1.0, -1.005836], [-1.006586, -1.0, 1.0], [-1.001811, 1.0, -1.000282], [-1.006586, 0.000368, -0.007936], [-0.013007, 0.000414, -0.007154], [-0.006027, -1.0, -0.008126], [-0.006702, 
-0.000116, -1.007567], [-0.006651, -6.5e-05, -0.005439]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 9
        vertices: [[-1.004912, 1.0, 1.202143], [1.0, -1.0, -0.782674], [-1.0, 1.0, 1.217326], [1.0, -1.0, 1.217326], [-1.006586, 1.0, 1.200845], [-1.006586, -1.0, -0.782674], [-1.006586, 1.0, 1.217326], [-1.006586, -1.0, 1.217326], [-1.003457, 1.0, 1.201738], [-1.006586, 0.000368, 0.216958], [1.0, -1.0, 0.21774], [-0.006027, -1.0, 0.216767], [-0.006702, -1.000441, -0.782674], [-0.006651, -6.5e-05, 1.217326]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 10
        vertices: [[-1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [-1.0, 1.0, 1.006223], [1.0, -1.0, 1.006223], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, 1.006223], [-1.006586, -1.0, 1.006223], [-1.0, 1.0, 0.006223], [-1.006586, 0.000368, 0.005855], [-0.013187, 0.000414, 0.006637], [-0.006027, -1.0, 0.005665], [-0.006702, -0.000116, -1.0], [-0.006651, -6.5e-05, 1.006223]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 11
        vertices: [[1.0, 1.0, -1.0], [1.0, -0.0055, 0.012624], [1.0, 1.0, 1.010404], [1.0, -1.0, 1.010404], [-1.006586, 1.0, -1.0], [-1.006586, -0.0055, 0.012624], [-1.006586, 1.0, 1.010404], [-1.006586, -1.0, 1.010404], [-0.006586, 1.0, 0.010404], [-1.006586, 0.000368, 0.010036], [1.0, 0.000414, 0.010818], [-0.006027, -0.422215, 0.437034], [-0.006702, 
0.407556, -0.393162], [-0.006651, -6.5e-05, 1.010404]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 12
        vertices: [[1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 1.003487], [1.0, -1.0, 1.003487], [-1.006586, 1.0, 1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, 1.003487], [-1.006586, -1.0, 1.003487], [-0.006586, 1.0, 1.001166], [-1.006586, 0.000368, 0.003118], [1.0, 0.000414, 0.0039], [-0.006027, -1.0, 0.002928], [-0.006702, -0.000116, 0.015504], [-0.006651, -6.5e-05, 1.003487]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 13
        vertices: [[1.0, 1.0, 1.017809], [1.0, -1.0, -1.0], [1.0, 1.0, 1.012205], [1.0, -1.0, 1.012205], [1.0, 1.0, 1.0], [-1.006586, -1.0, -1.0], [1.0, 1.0, 1.012205], [-1.006586, -1.0, 1.012205], [1.0, 1.0, 1.0], [-0.012906, 0.000368, 0.011837], [1.0, 0.000414, 0.012619], [-0.006027, -1.0, 0.011646], [-0.006702, -0.000116, 0.017645], [-0.006651, -6.5e-05, 1.012205]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 14
        vertices: [[1.0, 1.0, -1.005945], [1.0, -1.0, -1.005945], [1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [-1.006586, 1.0, -1.005945], [1.0, -1.0, -1.005945], [-1.006586, 1.0, 1.0], [1.0, -1.0, 1.0], [-0.006586, 1.0, -0.005945], [-0.002788, 0.000368, -0.006313], [1.0, 0.000414, -0.005531], [1.0, -1.0, -0.006504], [-0.006702, -0.000116, -1.005945], [-0.006651, -6.5e-05, 1.0]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 15
        vertices: [[1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 1.002557], [1.0, -1.0, 1.002557], [-1.006586, 1.0, -1.0], [-1.006586, -1.0, -1.0], [-1.006586, 1.0, 1.002557], [-1.006586, -1.0, 1.002557], [-0.006586, 1.0, 0.002557], [-1.006586, 0.000368, 0.002188], [1.0, 0.000414, 0.00297], [-0.006027, -1.0, 0.001998], [-0.006702, -0.000116, -1.0], [-0.006651, -6.5e-05, 1.002557]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 16
        vertices: [[-1.003226, 1.0, -1.0], [-1.003225, -1.0, 1.0], [1.0, 1.0, -1.0], [-1.0, -1.0, 1.0], [-1.003225, 1.0, 1.000764], [-1.003225, -1.0, 1.000764], [1.0, 1.0, 1.000764], [-1.0, -1.0, 1.000764], [-0.003226, 1.0, 0.000764], [-0.003594, 0.000368, 1.000764], [-0.002812, 0.000414, -0.005936], [-1.0, -1.0, 1.0], [-1.003226, -0.000116, 0.00088], [0.004211, -6.5e-05, 0.000829]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{ // 17
        vertices: [[0.962199, 0.972476, 1.024668], [-1.037801, -1.027524, 1.024668], [0.962198, 0.972476, -0.981555], [-1.037802, -1.027524, -0.981555], [0.968785, 0.972476, 1.024668], [0.968785, -1.027524, 1.024668], [0.968784, 0.972476, -0.981555], [0.968784, -1.027524, -0.981555], [0.962199, 0.972476, 0.018445], [0.968785, -0.027155, 0.018813], [-0.024614, -0.02711, 0.018031], [-0.031774, -1.027524, 0.019003], [-0.031099, -0.02764, 1.024668], [-0.031151, -0.027588, -0.981555]],
        faces: [[0, 4, 8], [3, 2, 13], [7, 6, 9], [5, 1, 11], [1, 10, 3], [5, 4, 12], [2, 8, 6], [6, 8, 4], [8, 2, 0], [4, 5, 9], [9, 5, 7], [9, 6, 4], [2, 10, 0], [0, 10, 1], [3, 10, 2], [7, 11, 3], [3, 11, 1], [11, 7, 5], [0, 1, 12], [12, 4, 0], [12, 1, 5], [7, 13, 6], [13, 7, 3], [6, 13, 2]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 18
        vertices: [[-1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [-1.0, 1.0, -1.0], [1.0, -1.0, 1.0], [0.009245, 0.0, -1.0], [-1.0, 1.0, -1.0], [1.0, 8.4e-05, -8.4e-05], [-1.0, 0.0, -0.0], [0.0, -1.0, 5.9e-05], [0.0, 5.3e-05, 1.0]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 19
        vertices: [[1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 1.0], [-1.0, -1.0, -1.0], [0.0, 0.0, 1.0], [1.0, 1.0, 1.0], [-1.0, 8.4e-05, 8.4e-05], [1.0, 0.0, 0.0], [0.0, -1.0, -5.9e-05], [0.0, 5.3e-05, -1.0]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 20
        vertices: [[-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [-1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, 1.0], [0.97839, -1.0, 1.0], [-1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [-1.0, 0.0, -0.0], [-1.0, 1.0, 1.0], [-0.0, 8.4e-05, -1.0], [-0.0, 0.0, 1.0], [-0.0, -1.0, -5.9e-05], [1.0, 5.3e-05, -5.3e-05]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 21
        vertices: [[1.0, -1.0, 1.0], [1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [-1.0, -1.0, 1.0], [-1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [-1.0, 1.0, -1.0], [1.0, -0.0, -0.0], [1.0, -1.0, 1.0], [0.0, -8.4e-05, -1.0], [0.0, -0.0, 1.0], [0.0, 1.0, -5.8e-05], [-1.0, -5.3e-05, -5.3e-05]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 22
        vertices: [[-1.0, -1.0, 1.0], [-1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [1.0, 1.0, 1.0], [-1.0, -1.0, -1.0], [-1.0, 1.0, -1.0], [-1.0, -1.0, 1.0], [1.0, 1.0, -1.0], [0.0, -0.0, 1.0], [-1.0, -1.0, 1.0], [1.0, -8.4e-05, 8.4e-05], [-1.0, -0.0, 0.0], [0.0, 1.0, -5.8e-05], [0.0, -5.3e-05, -1.0]],     
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 23
        vertices: [[1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [-1.0, 1.0, -1.0], [1.0, -1.0, 1.0], [1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [-1.0, 1.0, 1.0], [0.0, -0.0, -1.0], [1.0, -1.0, -1.0], [-1.0, -8.4e-05, -8.4e-05], [1.0, -0.0, -0.0], [0.0, 1.0, 5.9e-05], [0.0, -5.3e-05, 1.0]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 24
        vertices: [[-1.0, -1.0, -1.0], [-1.0, 1.0, -1.0], [-1.0, -1.0, 1.0], [-1.0, 1.0, 1.0], [1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, 1.0], [-1.0, -0.0, 0.0], [-1.0, -1.0, -1.0], [-0.0, -8.5e-05, 1.0], [-0.0, -0.0, -1.0], [-0.0, 1.0, 5.9e-05], [1.0, -5.3e-05, 5.3e-05]],
        faces: [[0, 4, 9], [3, 10, 7], [7, 6, 13], [5, 1, 12], [1, 8, 3], [5, 4, 11], [2, 8, 0], [0, 8, 1], [3, 8, 2], [6, 2, 9], [9, 4, 6], [9, 2, 0], [7, 10, 6], [10, 3, 2], [6, 10, 2], [0, 1, 11], [11, 1, 5], [11, 4, 0], [7, 12, 3], [12, 7, 5], [3, 12, 1], [5, 13, 4], [13, 5, 7], [4, 13, 6]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
        },{  // 25
        vertices: [[-0.0, 0.0, 1.0], [-1.0, -1.0, 1.0], [-0.0, 0.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [1.0, 1.0, -1.0], [1.0, -1.0, -1.0], [1.0, 1.0, 2e-06], [-0.0, -0.0, -2e-05], [1.0, -9.1e-05, -9.1e-05], [-6e-06, -1.0, 6e-06], [0.0, -1.0, -1.0], [0.0, -1.0, 1.0]],
        faces: [[0, 4, 8], [3, 2, 12], [7, 6, 10], [5, 1, 11], [1, 9, 3], [5, 4, 13], [2, 8, 6], [8, 2, 0], [6, 8, 4], [2, 9, 0], [0, 9, 1], [3, 9, 2], [4, 5, 10], [10, 6, 4], [10, 5, 7], [7, 11, 3], [3, 11, 1], [11, 7, 5], [7, 12, 6], [6, 12, 2], [12, 7, 3], [0, 1, 13], [13, 4, 0], [13, 1, 5]],
        texture: "https://i.postimg.cc/Pq7xgZY0/wallpaper.jpg"
    }
];

// ---- fractal perlin ----
function perlin3oct(x, y, z, octaves, persistence, lacunarity, seed) {
  let amplitude = 1;
  let frequency = 1;
  let value = 0;
  let max = 0;
  for (let o = 0; o < octaves; o++) {
    const nx = x * frequency + (seed || 0) * 0.0001;
    const ny = y * frequency + (seed || 0) * 0.0001;
    const nz = z * frequency + (seed || 0) * 0.0001;
    value += amplitude * Perlin.noise(nx, ny, nz);
    max += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  const normalized = value / max; // roughly [-1,1]
  return (normalized + 1) * 0.5; // map to [0,1]
}

// ---- build density grid (применяется compression по осям) ----
function buildDensityGrid(seed, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const gx = params.grid.x, gy = params.grid.y, gz = params.grid.z;
  const total = gx * gy * gz;
  density = new Float32Array(total);
  const halfX = (gx - 1) / 2.0, halfY = (gy - 1) / 2.0, halfZ = (gz - 1) / 2.0;
  const baseScale = params.baseScale || 1.0 / 8.0;
  let idx = 0;
  for (let k = 0; k < gz; k++) {
    for (let j = 0; j < gy; j++) {
      for (let i = 0; i < gx; i++) {
        const nx = (i - halfX) / (gx - 1);
        const ny = (j - halfY) / (gy - 1);
        const nz = (k - halfZ) / (gz - 1);
        // применяем компрессию по осям
        const sx = ((nx * params.compressionX) + offsetX) / baseScale;
        const sy = ((ny * params.compressionY) + offsetY) / baseScale;
        const sz = ((nz * params.compressionZ) + offsetZ) / baseScale;
        density[idx++] = perlin3oct(sx, sy, sz, params.octaves, params.persistence, params.lacunarity, seed);
      }
    }
  }
  // при желании можно применить сглаживание здесь, но GUI предоставляет кнопку Apply
  return density;
}

// ---- utility: создать меш из массивов (если понадобятся реальные vertices/faces) ----
function createMeshFromArrays(vertices, faces, scene, meshName = "customMesh", textureURL = null) {
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let v of vertices) {
    positions.push(v[0], v[1], v[2]);
    uvs.push(0, 0);
  }
  for (let f of faces) {
    indices.push(f[0], f[1], f[2]);
  }
  const mesh = new BABYLON.Mesh(meshName, scene);
  const vd = new BABYLON.VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.uvs = uvs;
  vd.applyToMesh(mesh, true);
  const mat = new BABYLON.StandardMaterial("mat_" + meshName, scene);
  if (textureURL) mat.diffuseTexture = new BABYLON.Texture(textureURL, scene);
  else mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  mat.backFaceCulling = false;
  mesh.material = mat;
  return mesh;
}

// ---- создание/удаление прототипов ----
function disposeProtoAndInstances() {
  try {
    for (let inst of protoInstances) inst.dispose();
  } catch (e) { /* ignore */ }
  protoInstances.length = 0;
  try {
    for (let pm of biomePrototypes) pm.dispose();
  } catch (e) { /* ignore */ }
  biomePrototypes.length = 0;
  if (protoMesh) { try { protoMesh.dispose() } catch (e) { } protoMesh = null; }
}

// ---- строим биомные прототипы (используем primitives для playground) ----
function buildBiomePrototypes(cellSize) {
  disposeProtoAndInstances();
  for (let b = 0; b < biomes.length; b++) {
    const biome = biomes[b];
    let mesh = null;
    const name = `biome_proto_${b}`;
    if (biome.vertices && biome.faces) {
      mesh = createMeshFromArrays(biome.vertices, biome.faces, scene, name, biome.texture || null);
    } else {
      // примитивы: sphere, box, torus, icosphere (как пример)
      if (biome.type === "sphere") {
        mesh = BABYLON.MeshBuilder.CreateIcoSphere(name, { radius: 0.5, flat: false, subdivisions: 2 }, scene);
      } else if (biome.type === "box") {
        mesh = BABYLON.MeshBuilder.CreateBox(name, { size: 1.0 }, scene);
      } else if (biome.type === "torus") {
        mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter: 1.0, thickness: 0.3, tessellation: 24 }, scene);
      } else {
        mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 1.0, segments: 12 }, scene);
      }
      const mat = new BABYLON.StandardMaterial("mat_" + name, scene);
      if (biome.texture) mat.diffuseTexture = new BABYLON.Texture(biome.texture, scene);
      else mat.diffuseColor = new BABYLON.Color3(Math.random() * 0.6 + 0.4, Math.random() * 0.6 + 0.4, Math.random() * 0.6 + 0.4);
      mat.backFaceCulling = false;
      mesh.material = mat;
    }
    // масштабируем под cellSize (вписать в куб)
    const bbox = mesh.getBoundingInfo().boundingBox.extendSize;
    const maxDim = Math.max(bbox.x, bbox.y, bbox.z) * 2 || 1;
    const desiredSize = cellSize * 0.9;
    const uniformScale = desiredSize / maxDim;
    mesh.scaling = new BABYLON.Vector3(uniformScale, uniformScale, uniformScale);
    mesh.isVisible = false;
    biomePrototypes.push(mesh);
  }
  // fallback proto mesh если ничего нет
  if (biomePrototypes.length === 0) {
    protoMesh = BABYLON.MeshBuilder.CreatePlane("proto_plane", { size: 1.0 }, scene);
    protoMesh.isVisible = false;
  }
}

// ---- Выбор биома по соседям (реализация правил) ----
function pickBiomeByNeighbors(i, j, k, gx, gy, gz, threshold) {
    function hasAt(x, y, z) {
        if (x < 0 || y < 0 || z < 0 || x >= gx || y >= gy || z >= gz) return false;
        return density[z * gx * gy + y * gx + x] > threshold;
    }
    
    const xm = hasAt(i - 1, j, k);
    const xp = hasAt(i + 1, j, k);
    const ym = hasAt(i, j - 1, k);
    const yp = hasAt(i, j + 1, k);
    const zm = hasAt(i, j, k - 1);
    const zp = hasAt(i, j, k + 1);
    
    // Диагональные соседи для биомов 17-24
    const xp_zm = hasAt(i + 1, j, k - 1);  // X+ Z-
    const xm_zp = hasAt(i - 1, j, k + 1);  // X- Z+
    const xp_zp = hasAt(i + 1, j, k + 1);  // X+ Z+
    const xm_zm = hasAt(i - 1, j, k - 1);  // X- Z-
    
    function returnBiome(n) {
        return Math.max(0, Math.min(biomePrototypes.length - 1, n - 1));
    }
    
    // Существующая логика для биомов 1-16
    if (!xm && xp && !yp && ym && !zp && zm) return returnBiome(5);
    if (xm && xp && !yp && ym && !zp && zm) return returnBiome(4);
    if (xm && !xp && !yp && ym && !zp && zm) return returnBiome(8);
    if (!xm && xp && !yp && ym && zp && !zm) return returnBiome(13);
    if (xm && xp && !yp && ym && zp && !zm) return returnBiome(12);
    if (xm && !xp && !yp && ym && zp && !zm) return returnBiome(9);
    if (!xm && xp && !yp && ym && zp && zm) return returnBiome(25);
    if (!xm && xp && yp && !ym && !zp && zm) return returnBiome(1);
    if (xm && xp && yp && !ym && !zp && zm) return returnBiome(6);
    if (xm && !xp && yp && !ym && !zp && zm) return returnBiome(2);
    if (!xm && xp && yp && !ym && zp && !zm) return returnBiome(3);
    if (xm && xp && yp && !ym && zp && !zm) return returnBiome(11);
    if (xm && !xp && yp && !ym && zp && !zm) return returnBiome(16);
    if (xm && !xp && yp && !ym && zp && zm) return returnBiome(7);
    if (!xm && xp && yp && !ym && zp && zm) return returnBiome(14);
    
    // НОВАЯ ЛОГИКА для биомов 17-24
    // Биомы 17-20: Вверх нет (ym), вниз есть (yp), все стороны есть
    if (!yp && ym && xp && xm && zp && zm) {
        if (!xp_zp && xm_zp) return returnBiome(18);  // X+ Z+ нет, X- Z+ есть
        if (!xp_zm && xm_zp) return returnBiome(17);  // X+ Z- нет, X- Z+ есть
        if (xp_zm && !xm_zp) return returnBiome(20);  // X+ Z- есть, X- Z+ нет
        if (xp_zp && !xm_zm) return returnBiome(19);  // X+ Z+ есть, X- Z- нет
    }
    
    // Биомы 21-24: Вверх есть (yp), вниз нет (ym), все стороны есть
    if (yp && !ym && xp && xm && zp && zm) {
        if (!xp_zp && xm_zp) return returnBiome(22);  // X+ Z+ нет, X- Z+ есть
        if (!xp_zm && xm_zp) return returnBiome(21);  // X+ Z- нет, X- Z+ есть
        if (xp_zp && !xm_zp) return returnBiome(24);  // X+ Z+ есть, X- Z+ нет
        if (xp_zm && !xm_zm) return returnBiome(23);  // X+ Z- есть, X- Z- нет
    }
    
    // Биом 25: противоположность 10-му биому
    if (xm && !xp && yp && !ym && !zp && !zm) return returnBiome(10);
    
    return returnBiome(15); // По умолчанию биом 15
}

// ---- создание инстансов по density ----
function buildParticlesFromDensity() {
  disposeProtoAndInstances();
  const gx = params.grid.x, gy = params.grid.y, gz = params.grid.z;
  const threshold = params.threshold;
  const cellSize = params.cubeSize / Math.max(gx - 1, 1);
  const positionsList = [];
  let idx = 0;
  for (let k = 0; k < gz; k++) {
    for (let j = 0; j < gy; j++) {
      for (let i = 0; i < gx; i++) {
        const d = density[idx++];
        if (d > threshold) {
          const x = (i / (gx - 1) - 0.5) * params.cubeSize;
          const y = (j / (gy - 1) - 0.5) * params.cubeSize;
          const z = (k / (gz - 1) - 0.5) * params.cubeSize;
          // сохраняем также индексы i,j,k для выбора биома
          positionsList.push([x, y, z, i, j, k]);
        }
      }
    }
  }
  const particleCount = positionsList.length;
  if (particleCount === 0) {
    console.warn("No particles: density produced no cells above threshold.");
    return;
  }
  buildBiomePrototypes(cellSize);
  const warnLimit = 8000;
  if (particleCount > warnLimit) console.warn(`Создаётся ${particleCount} инстансов. Это может быть медленно для рендеринга.`);
  for (let p = 0; p < particleCount; p++) {
    const posMeta = positionsList[p];
    const pos = [posMeta[0], posMeta[1], posMeta[2]];
    const i = posMeta[3], j = posMeta[4], k = posMeta[5];
    let prototype = null;
    let protoIndex = null;
    if (biomePrototypes.length > 0) {
      // Выбор биома по правилам соседей
      protoIndex = pickBiomeByNeighbors(i, j, k, gx, gy, gz, params.threshold);
      prototype = biomePrototypes[protoIndex];
    } else if (protoMesh) {
      prototype = protoMesh;
    } else continue;
    const inst = prototype.createInstance('inst_' + p);
    // APPLY SPACING multipliers: позволяет сжимать/растягивать расстояния по осям X/Y/Z
    inst.position = new BABYLON.Vector3(
      pos[0] * params.spacingX,
      pos[1] * params.spacingY,
      pos[2] * params.spacingZ
    );
    protoInstances.push(inst);
  }
}

// ---- regenerate wrapper ----
function regenerate(seed = params.seed, offsetX = 0, offsetY = 0, offsetZ = 0) {
  if (typeof Perlin.init === "function") Perlin.init(seed);
  buildDensityGrid(seed, offsetX, offsetY, offsetZ);
  buildParticlesFromDensity();
}

// ---- smoothing utility ----
function smoothDensity(srcDensity, gx, gy, gz, passes = 1) {
  let dst = new Float32Array(srcDensity.length);
  dst.set(srcDensity);
  for (let pass = 0; pass < passes; pass++) {
    const tmp = dst.slice(0);
    let idx = 0;
    for (let z = 0; z < gz; z++) {
      for (let y = 0; y < gy; y++) {
        for (let x = 0; x < gx; x++) {
          let sum = 0, cnt = 0;
          for (let oz = -1; oz <= 1; oz++) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox, ny = y + oy, nz = z + oz;
            if (nx < 0 || ny < 0 || nz < 0 || nx >= gx || ny >= gy || nz >= gz) continue;
            sum += tmp[nz * gx * gy + ny * gx + nx]; cnt++;
          }
          dst[idx++] = sum / cnt;
        }
      }
    }
  }
  return dst;
}

// ---- Scene creation ----
function createScene() {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.98, 0.98, 0.98);
  const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2.3, 1.1, 30, new BABYLON.Vector3(0, 0, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5; camera.upperRadiusLimit = 600;
  new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0, 1, 0), scene);
  // ground or axis helper can be added if нужно
  return scene;
}

// ---- GUI (минимально скорректированный ваш интерфейс) ----
function createControls(onRegenerate) {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.right = '12px';
  container.style.top = '72px';
  container.style.padding = '10px';
  container.style.background = 'rgba(20,20,20,0.45)';
  container.style.borderRadius = '6px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '6px';
  container.style.zIndex = 999;
  document.body.appendChild(container);

  const tabContainer = document.createElement('div');
  tabContainer.style.display = 'flex';
  tabContainer.style.marginBottom = '6px';
  container.appendChild(tabContainer);

  const tabs = [];
  const tabContents = [];

  function createTabButton(tabIndex, tabName) {
    const tabButton = document.createElement('button');
    tabButton.textContent = tabName;
    tabButton.style.padding = '6px 12px';
    tabButton.style.border = 'none';
    tabButton.style.background = 'rgba(50, 50, 50, 0.7)';
    tabButton.style.color = 'white';
    tabButton.style.cursor = 'pointer';
    tabButton.style.borderRadius = '4px 4px 0 0';
    tabButton.addEventListener('click', () => setActiveTab(tabIndex));
    return tabButton;
  }
  function createTabContent() {
    const tabContent = document.createElement('div');
    tabContent.style.padding = '10px';
    tabContent.style.background = 'rgba(30, 30, 30, 0.7)';
    tabContent.style.borderRadius = '0 4px 4px 4px';
    return tabContent;
  }
  function setActiveTab(tabIndex) {
    tabs.forEach((t, i) => {
      t.style.background = i === tabIndex ? 'rgba(30,30,30,0.7)' : 'rgba(50,50,50,0.7)';
      tabContents[i].style.display = i === tabIndex ? 'block' : 'none';
    });
  }

  params.tabNames.forEach((name, i) => {
    const btn = createTabButton(i, name);
    tabs.push(btn); tabContainer.appendChild(btn);
    const content = createTabContent();
    tabContents.push(content); container.appendChild(content);
  });
  setActiveTab(0);
  const tab1 = tabContents[0];

  const title = document.createElement('div');
  title.textContent = "Quantum Foam Controls";
  title.style.color = "white";
  title.style.fontWeight = "600";
  title.style.marginBottom = "6px";
  tab1.appendChild(title);

  function createAxisRow(axis) {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '6px';
    const label = document.createElement('div'); label.textContent = axis; label.style.width = '18px'; label.style.color = 'white';
    row.appendChild(label);
    const btnMinus = document.createElement('button'); btnMinus.textContent = '◀'; btnMinus.style.padding = '4px 6px'; row.appendChild(btnMinus);
    const input = document.createElement('input'); input.type = 'number'; input.value = '0'; input.style.width = '68px'; input.style.background = 'rgba(30,30,30,0.9)'; input.style.color = 'white'; input.style.border = '1px solid rgba(255,255,255,0.08)'; input.style.padding = '4px 6px';
    row.appendChild(input);
    const btnPlus = document.createElement('button'); btnPlus.textContent = '▶'; btnPlus.style.padding = '4px 6px'; row.appendChild(btnPlus);
    tab1.appendChild(row);
    return { row, input, btnMinus, btnPlus };
  }

  function createSliderRow(label, min, max, step, value, onChange) {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.flexDirection = 'column'; row.style.gap = '4px';
    const labelEl = document.createElement('div'); labelEl.style.color = 'white'; labelEl.textContent = `${label}: ${value}`;
    row.appendChild(labelEl);
    const slider = document.createElement('input'); slider.type = 'range'; slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    slider.addEventListener('input', () => {
      const newValue = parseFloat(slider.value);
      labelEl.textContent = `${label}: ${newValue.toFixed(2)}`;
      onChange(newValue);
    });
    row.appendChild(slider);
    tab1.appendChild(row);
    return slider;
  }

  const ax = createAxisRow('X'), ay = createAxisRow('Y'), az = createAxisRow('Z');
  function getOffsets() { return { x: parseFloat(ax.input.value) || 0, y: parseFloat(ay.input.value) || 0, z: parseFloat(az.input.value) || 0 }; }
  [ax.input, ay.input, az.input].forEach(inp => { inp.addEventListener('change', onRegenerate); inp.addEventListener('keydown', (e) => { if (e.key === "Enter") onRegenerate(); }); });
  ax.btnMinus.addEventListener('click', () => { ax.input.value = String((parseFloat(ax.input.value) || 0) - 1); onRegenerate(); });
  ax.btnPlus.addEventListener('click', () => { ax.input.value = String((parseFloat(ax.input.value) || 0) + 1); onRegenerate(); });
  ay.btnMinus.addEventListener('click', () => { ay.input.value = String((parseFloat(ay.input.value) || 0) - 1); onRegenerate(); });
  ay.btnPlus.addEventListener('click', () => { ay.input.value = String((parseFloat(ay.input.value) || 0) + 1); onRegenerate(); });
  az.btnMinus.addEventListener('click', () => { az.input.value = String((parseFloat(az.input.value) || 0) - 1); onRegenerate(); });
  az.btnPlus.addEventListener('click', () => { az.input.value = String((parseFloat(az.input.value) || 0) + 1); onRegenerate(); });

  // Seed controls
  const seedRow = document.createElement('div'); seedRow.style.display = 'flex'; seedRow.style.alignItems = 'center'; seedRow.style.gap = '6px';
  const seedLabel = document.createElement('div'); seedLabel.textContent = 'Seed:'; seedLabel.style.color = 'white';
  seedRow.appendChild(seedLabel);
  const seedInput = document.createElement('input'); seedInput.type = 'number'; seedInput.value = params.seed; seedInput.style.width = '80px'; seedInput.style.background = 'rgba(30,30,30,0.9)'; seedInput.style.color = 'white'; seedInput.style.border = '1px solid rgba(255,255,255,0.08)'; seedInput.style.padding = '4px 6px';
  seedRow.appendChild(seedInput);
  const seedBtn = document.createElement('button'); seedBtn.textContent = 'Set Seed'; seedBtn.style.padding = '6px';
  seedRow.appendChild(seedBtn);
  tab1.appendChild(seedRow);
  seedBtn.addEventListener('click', () => {
    params.seed = parseInt(seedInput.value, 10) || params.seed; Perlin.init(params.seed); onRegenerate(); updateInfo();
  });

  const btnReseed = document.createElement('button'); btnReseed.textContent = "Reseed / Regenerate (R)"; btnReseed.style.padding = '6px'; btnReseed.style.marginTop = '6px';
  tab1.appendChild(btnReseed);
  btnReseed.addEventListener('click', () => {
    params.seed = Math.floor(Math.random() * 1000000); seedInput.value = params.seed; Perlin.init(params.seed); onRegenerate(); updateInfo();
  });

  // Smooth controls
  const smoothRow = document.createElement('div'); smoothRow.style.display = 'flex'; smoothRow.style.alignItems = 'center'; smoothRow.style.gap = '6px';
  const smoothLabel = document.createElement('div'); smoothLabel.textContent = 'Smooth:'; smoothLabel.style.color = 'white';
  smoothRow.appendChild(smoothLabel);
  const smoothCheckbox = document.createElement('input'); smoothCheckbox.type = 'checkbox'; smoothCheckbox.checked = params.smooth; smoothRow.appendChild(smoothCheckbox);
  const smoothPassesInput = document.createElement('input'); smoothPassesInput.type = 'number'; smoothPassesInput.value = params.smoothPasses; smoothPassesInput.style.width = '48px';
  smoothRow.appendChild(smoothPassesInput);
  const smoothApplyBtn = document.createElement('button'); smoothApplyBtn.textContent = 'Apply Smoothing Now'; smoothApplyBtn.style.padding = '6px';
  tab1.appendChild(smoothRow); tab1.appendChild(smoothApplyBtn);

  smoothCheckbox.addEventListener('change', () => { params.smooth = smoothCheckbox.checked; onRegenerate(); });
  smoothPassesInput.addEventListener('change', () => { params.smoothPasses = Math.max(0, parseInt(smoothPassesInput.value) || 0); onRegenerate(); });
  smoothApplyBtn.addEventListener('click', () => {
    if (density) {
      density = smoothDensity(density, params.grid.x, params.grid.y, params.grid.z, params.smoothPasses);
      buildParticlesFromDensity();
    } else onRegenerate();
  });

  // Threshold slider
  const thrRow = document.createElement('div'); thrRow.style.display = 'flex'; thrRow.style.flexDirection = 'column'; thrRow.style.gap = '4px';
  const thrLabel = document.createElement('div'); thrLabel.style.color = 'white'; thrLabel.textContent = 'Threshold: ' + params.threshold.toFixed(2); thrRow.appendChild(thrLabel);
  const thr = document.createElement('input'); thr.type = 'range'; thr.min = 0.01; thr.max = 0.99; thr.step = 0.01; thr.value = params.threshold;
  thr.addEventListener('input', () => { params.threshold = parseFloat(thr.value); thrLabel.textContent = 'Threshold: ' + params.threshold.toFixed(2); });
  thr.addEventListener('change', () => onRegenerate());
  thrRow.appendChild(thr); tab1.appendChild(thrRow);

  // cube size
  const cubeSizeRow = document.createElement('div'); cubeSizeRow.style.display = 'flex'; cubeSizeRow.style.alignItems = 'center'; cubeSizeRow.style.gap = '6px';
  const cubeSizeLabel = document.createElement('div'); cubeSizeLabel.textContent = 'Cube Size:'; cubeSizeLabel.style.color = 'white'; cubeSizeRow.appendChild(cubeSizeLabel);
  const cubeSizeInput = document.createElement('input'); cubeSizeInput.type = 'number'; cubeSizeInput.value = params.cubeSize; cubeSizeInput.style.width = '60px'; cubeSizeRow.appendChild(cubeSizeInput); tab1.appendChild(cubeSizeRow);
  cubeSizeInput.addEventListener('change', () => { params.cubeSize = parseFloat(cubeSizeInput.value) || params.cubeSize; onRegenerate(); });

  // Grid size inputs
  const gridRow = document.createElement('div'); gridRow.style.display = 'flex'; gridRow.style.flexDirection = 'column'; gridRow.style.gap = '4px';
  const gridXInput = document.createElement('input'); gridXInput.type = 'number'; gridXInput.value = params.grid.x; gridXInput.style.width = '60px';
  const gridYInput = document.createElement('input'); gridYInput.type = 'number'; gridYInput.value = params.grid.y; gridYInput.style.width = '60px';
  const gridZInput = document.createElement('input'); gridZInput.type = 'number'; gridZInput.value = params.grid.z; gridZInput.style.width = '60px';
  const gridLabel = document.createElement('div'); gridLabel.textContent = 'Grid X / Y / Z:'; gridLabel.style.color = 'white';
  const gridInputsRow = document.createElement('div'); gridInputsRow.style.display = 'flex'; gridInputsRow.style.gap = '6px'; gridInputsRow.appendChild(gridXInput); gridInputsRow.appendChild(gridYInput); gridInputsRow.appendChild(gridZInput);
  gridRow.appendChild(gridLabel); gridRow.appendChild(gridInputsRow); tab1.appendChild(gridRow);
  [gridXInput, gridYInput, gridZInput].forEach(input => input.addEventListener('change', () => {
    params.grid.x = Math.max(2, parseInt(gridXInput.value) || params.grid.x);
    params.grid.y = Math.max(2, parseInt(gridYInput.value) || params.grid.y);
    params.grid.z = Math.max(2, parseInt(gridZInput.value) || params.grid.z);
    onRegenerate(); updateInfo();
  }));

  // Perlin / noise params sliders
  createSliderRow('Octaves', 1, 8, 1, params.octaves, (v) => { params.octaves = Math.round(v); onRegenerate(); });
  createSliderRow('Persistence', 0.1, 0.9, 0.01, params.persistence, (v) => { params.persistence = v; onRegenerate(); });
  createSliderRow('Lacunarity', 1.0, 4.0, 0.1, params.lacunarity, (v) => { params.lacunarity = v; onRegenerate(); });
  createSliderRow('Base Scale', 0.01, 0.5, 0.01, params.baseScale, (v) => { params.baseScale = v; onRegenerate(); });

  // Compression sliders
  createSliderRow('Chudik Compression X', 0.1, 4.0, 0.01, params.compressionX, (v) => { params.compressionX = v; onRegenerate(); });
  createSliderRow('Chudik Compression Y', 0.1, 4.0, 0.01, params.compressionY, (v) => { params.compressionY = v; onRegenerate(); });
  createSliderRow('Chudik Compression Z', 0.1, 4.0, 0.01, params.compressionZ, (v) => { params.compressionZ = v; onRegenerate(); });

  // NEW: Spacing sliders (управляют расстояниями между инстансами)
  createSliderRow('Spacing X', 0.1, 2.0, 0.01, params.spacingX, (v) => { params.spacingX = v; onRegenerate(); });
  createSliderRow('Spacing Y', 0.1, 2.0, 0.01, params.spacingY, (v) => { params.spacingY = v; onRegenerate(); });
  createSliderRow('Spacing Z', 0.1, 2.0, 0.01, params.spacingZ, (v) => { params.spacingZ = v; onRegenerate(); });

  // info + download
  const info = document.createElement('div'); info.style.color = 'white'; info.style.marginTop = '6px';
  function updateInfo() { info.textContent = 'Seed: ' + params.seed + ' Grid: ' + params.grid.x + 'x' + params.grid.y + 'x' + params.grid.z + (params.smooth ? ' (Smooth:' + params.smoothPasses + ')' : '') + ' Spacing:(' + params.spacingX.toFixed(2) + ',' + params.spacingY.toFixed(2) + ',' + params.spacingZ.toFixed(2) +')'; }
  updateInfo(); tab1.appendChild(info);

  const downloadBtn = document.createElement('button'); downloadBtn.textContent = "Download OBJ"; downloadBtn.style.padding = '6px'; downloadBtn.style.marginTop = '6px';
  downloadBtn.addEventListener('click', () => { downloadOBJ(); });
  tab1.appendChild(downloadBtn);

  // auto-random
  const autoRandomBtn = document.createElement('button'); autoRandomBtn.textContent = params.autoRandom ? 'Stop Auto-Random' : 'Start Auto-Random'; autoRandomBtn.style.padding = '6px';
  const speedInput = document.createElement('input'); speedInput.type = 'number'; speedInput.value = params.randomInterval; speedInput.style.width = '68px';
  const autoRandomRow = document.createElement('div'); autoRandomRow.style.display = 'flex'; autoRandomRow.style.alignItems = 'center'; autoRandomRow.style.gap = '6px';
  autoRandomRow.appendChild(autoRandomBtn); autoRandomRow.appendChild(speedInput); tab1.appendChild(autoRandomRow);
  let autoRandomInterval = null;
  function toggleAutoRandom() {
    params.autoRandom = !params.autoRandom;
    autoRandomBtn.textContent = params.autoRandom ? 'Stop Auto-Random' : 'Start Auto-Random';
    if (params.autoRandom) {
      params.randomInterval = parseInt(speedInput.value, 10) || params.randomInterval;
      autoRandomInterval = setInterval(() => {
        const x = Math.floor(Math.random() * (params.randomRanges.xMax - params.randomRanges.xMin + 1)) + params.randomRanges.xMin;
        const y = Math.floor(Math.random() * (params.randomRanges.yMax - params.randomRanges.yMin + 1)) + params.randomRanges.yMin;
        const z = Math.floor(Math.random() * (params.randomRanges.zMax - params.randomRanges.zMin + 1)) + params.randomRanges.zMin;
        ax.input.value = x; ay.input.value = y; az.input.value = z;
        onRegenerate();
      }, params.randomInterval);
    } else {
      clearInterval(autoRandomInterval);
    }
  }
  autoRandomBtn.addEventListener('click', toggleAutoRandom);
  speedInput.addEventListener('change', () => {
    params.randomInterval = parseInt(speedInput.value, 10) || params.randomInterval;
    if (params.autoRandom) {
      clearInterval(autoRandomInterval);
      autoRandomInterval = setInterval(() => {
        const x = Math.floor(Math.random() * (params.randomRanges.xMax - params.randomRanges.xMin + 1)) + params.randomRanges.xMin;
        const y = Math.floor(Math.random() * (params.randomRanges.yMax - params.randomRanges.yMin + 1)) + params.randomRanges.yMin;
        const z = Math.floor(Math.random() * (params.randomRanges.zMax - params.randomRanges.zMin + 1)) + params.randomRanges.zMin;
        ax.input.value = x; ay.input.value = y; az.input.value = z;
        onRegenerate();
      }, params.randomInterval);
    }
  });

  // allow external access
  return {
    getOffsets,
    updateInfo,
    setSeed: (s) => { params.seed = s; Perlin.init(params.seed); updateInfo(); },
    updateInfo
  };
}

// ---- scene init & run ----
createScene();
const controls = createControls(() => { const offs = controls.getOffsets(); regenerate(params.seed, offs.x, offs.y, offs.z); });
controls.updateInfo();
regenerate(params.seed, 0, 0, 0);

window.addEventListener('keydown', (ev) => {
  const key = ev.key.toLowerCase();
  if (key === 'r') {
    params.seed = Math.floor(Math.random() * 1000000);
    controls.setSeed(params.seed);
    const offs = controls.getOffsets();
    regenerate(params.seed, offs.x, offs.y, offs.z);
    controls.updateInfo();
  }
});

engine.runRenderLoop(() => {
  if (params.autoRegen) {
    const offs = controls.getOffsets();
    regenerate(params.seed, offs.x, offs.y, offs.z);
  }
  if (scene) scene.render();
});
window.addEventListener('resize', () => engine.resize());

// ---- OBJ export (осталось как было, работает для инстансов) ----
function downloadOBJ() {
  if (protoInstances && protoInstances.length > 0) {
    let obj = '';
    let vertexOffset = 0;
    for (let i = 0; i < protoInstances.length; i++) {
      const inst = protoInstances[i];
      const src = inst.sourceMesh || (inst.getSourceMesh && inst.getSourceMesh());
      if (!src) continue;
      const positions = src.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = src.getIndices ? src.getIndices() : null;
      if (!positions) continue;
      const worldMatrix = inst.getWorldMatrix ? inst.getWorldMatrix() : null;
      if (!worldMatrix) { console.warn("No world matrix for instance", inst); continue; }
      for (let v = 0; v < positions.length; v += 3) {
        const p = new BABYLON.Vector3(positions[v], positions[v + 1], positions[v + 2]);
        const tp = BABYLON.Vector3.TransformCoordinates(p, worldMatrix);
        obj += `v ${tp.x.toFixed(6)} ${tp.y.toFixed(6)} ${tp.z.toFixed(6)}\n`;
      }
      if (indices && indices.length) {
        for (let f = 0; f < indices.length; f += 3) {
          const a = indices[f] + 1 + vertexOffset;
          const b = indices[f + 1] + 1 + vertexOffset;
          const c = indices[f + 2] + 1 + vertexOffset;
          obj += `f ${a} ${b} ${c}\n`;
        }
      } else {
        const triCount = positions.length / 3;
        for (let t = 0; t < triCount; t += 3) {
          const a = vertexOffset + t + 1;
          const b = vertexOffset + t + 2;
          const c = vertexOffset + t + 3;
          if (c <= vertexOffset + triCount) obj += `f ${a} ${b} ${c}\n`;
        }
      }
      vertexOffset += positions.length / 3;
    }
    if (obj.length === 0) { console.warn("Export: no vertex data generated for instances."); return; }
    const blob = new Blob([obj], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'quantum_foam_instances.obj'; a.click();
    URL.revokeObjectURL(url); return;
  }
  const meshToExport = (biomePrototypes && biomePrototypes[0]) || protoMesh;
  if (!meshToExport || !meshToExport.getVerticesData) { console.warn("No mesh to export (mesh missing)."); return; }
  const positions = meshToExport.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const indices = meshToExport.getIndices ? meshToExport.getIndices() : null;
  if (!positions) { console.warn("Missing vertex data."); return; }
  let obj = '';
  for (let i = 0; i < positions.length; i += 3) obj += `v ${positions[i].toFixed(6)} ${positions[i + 1].toFixed(6)} ${positions[i + 2].toFixed(6)}\n`;
  if (indices && indices.length) {
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] + 1, b = indices[i + 1] + 1, c = indices[i + 2] + 1;
      obj += `f ${a} ${b} ${c}\n`;
    }
  }
  const blob = new Blob([obj], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'quantum_foam_mesh.obj'; a.click();
  URL.revokeObjectURL(url);
}

export default createScene;
