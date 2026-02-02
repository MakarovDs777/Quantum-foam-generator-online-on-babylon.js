let createScene = function () {
    let scene = new BABYLON.Scene(engine);
    let camera = new BABYLON.ArcRotateCamera("Camera",
        BABYLON.Tools.ToRadians(90),
        BABYLON.Tools.ToRadians(60),
        60,
        new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);

    let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    const shape = { x: 10, y: 10, z: 10 }; // Размер сетки 10x10x10
    const scale = 10.0;
    let planes = []; // Данный массив будет хранить плоскости для градиентов
    const cube_size = 10;

    // Простая функция для генерации шума
    const simplexNoise = (x, y, z) => {
        return Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
    };

    // Генерация 3D-массива шума
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

    // Основной рендеринг
    let base = 0;
    scene.registerAfterRender(() => {
        let noiseValues = generateNoise(base);
        base += 0.1; // Компонент для изменения базового значения

        // Удаляем предыдущие плоскости
        planes.forEach(plane => scene.removeMesh(plane));
        planes = [];

        // Генерация плоскостей с градиентом
        for (let i = 0; i < noiseValues.length; i++) {
            const size = noiseValues[i]; // Используем значение шума для градиента
            if (size > 0.5) { // Если значение выше порога 0.5, создаём градиент
                let gradientMaterial = new BABYLON.StandardMaterial(`gradientMaterial-${i}`, scene);
                gradientMaterial.diffuseColor = new BABYLON.Color3(size, 0, 1 - size); // Градиент от синего к красному

                let plane = BABYLON.MeshBuilder.CreatePlane(`plane-${i}`, { size: 1 }, scene);
                plane.material = gradientMaterial;

                plane.position.set(
                    (i % shape.x) * (cube_size / shape.x),
                    Math.floor((i / shape.x) % shape.y) * (cube_size / shape.y),
                    Math.floor(i / (shape.x * shape.y)) * (cube_size / shape.z)
                );
                planes.push(plane);
            }
        }
    });

    return scene;
};
export default createScene
