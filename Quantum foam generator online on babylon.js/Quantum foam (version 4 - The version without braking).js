let createScene = function () {
    var scene = new BABYLON.Scene(engine);

    // Камера
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -20), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    // Свет
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    const shape = { x: 50, y: 50, z: 50 }; // Размер области
    const scale = 10.0;
    const particleCount = shape.x * shape.y * shape.z; // Общее число точек

    // Массив для позиций
    const positions = new Float32Array(particleCount * 3);
    // Создаем VertexData
    const vertexData = new BABYLON.VertexData();

    // Создаем меш для точек
    const pointsMesh = new BABYLON.Mesh("points", scene);
    // Изначально заполняем позициями (можно оставить пустыми, обновим позже)
    vertexData.positions = positions;
    vertexData.applyToMesh(pointsMesh, true);

    // Настраиваем материал для точечного облака
    const material = new BABYLON.StandardMaterial("mat", scene);
    material.pointsCloud = true;
    material.pointSize = 4;
    pointsMesh.material = material;

    // Простая функция шума
    const simplexNoise = (x, y, z) => {
        return Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
    };

    // Генерация шума
    const generateNoise = (base) => {
        let noise = [];
        for (let i = 0; i < shape.x; i++) {
            for (let j = 0; j < shape.y; j++) {
                for (let k = 0; k < shape.z; k++) {
                    let value = simplexNoise(i + base, j + base, k + base);
                    noise.push(value);
                }
            }
        }
        return noise;
    };

    // Время для анимации
    let base = 0;

    scene.registerBeforeRender(() => {
        const noiseValues = generateNoise(base);
        base += 0.1;

        let index = 0;
        for (let i = 0; i < shape.x; i++) {
            for (let j = 0; j < shape.y; j++) {
                for (let k = 0; k < shape.z; k++) {
                    const size = noiseValues[index];
                    index++;
                    if (size > 0.5) {
                        // Расчет позиции
                        const x = (i - shape.x / 2) * (scale / shape.x);
                        const y = (j - shape.y / 2) * (scale / shape.y);
                        const z = (k - shape.z / 2) * (scale / shape.z);
                        // Заполняем массив
                        positions[3 * index] = x;
                        positions[3 * index + 1] = y;
                        positions[3 * index + 2] = z;
                    } else {
                        // Если не создаем точку, ставим в позицию вне области
                        positions[3 * index] = 9999;
                        positions[3 * index + 1] = 9999;
                        positions[3 * index + 2] = 9999;
                    }
                }
            }
        }
        // Обновляем меш
        vertexData.positions = positions;
        vertexData.applyToMesh(pointsMesh, true);
    });

    return scene;
};
export default createScene
