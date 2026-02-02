function createScene() {
    const scene = new BABYLON.Scene(engine);

    // Камера и свет
    const camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(90), BABYLON.Tools.ToRadians(60), 20, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Параметры сетки
    const countX = 16;
    const countY = 16;
    const countZ = 16;
    const cubeSize = 10;
    const threshold = 0.3; // порог для отображения линий

    // Генерация точек
    const points = [];
    for (let y = 0; y < countY; y++) {
        for (let z = 0; z < countZ; z++) {
            for (let x = 0; x < countX; x++) {
                points.push({ x, y, z });
            }
        }
    }

    // Создаем массив случайных значений для каждой точки
    const randomValues = [];
    for (let i = 0; i < points.length; i++) {
        // Генерируем случайное значение для каждой точки
        randomValues.push(Math.random() * 2 - 1); // диапазон [-1, 1]
    }

    // Создаем линии между соседними точками, если случайное значение превышает порог
    for (let y = 0; y < countY; y++) {
        for (let z = 0; z < countZ; z++) {
            for (let x = 0; x < countX; x++) {
                const idx = y * countZ * countX + z * countX + x;
                const current = points[idx];

                // Проверка и создание линий по X
                if (x < countX - 1) {
                    const neighborIdx = y * countZ * countX + z * countX + (x + 1);
                    const neighbor = points[neighborIdx];

                    if (randomValues[idx] > threshold && randomValues[neighborIdx] > threshold) {
                        const line = BABYLON.MeshBuilder.CreateLines("lineX", {
                            points: [
                                new BABYLON.Vector3(current.x / countX * cubeSize, current.y / countY * cubeSize, current.z / countZ * cubeSize),
                                new BABYLON.Vector3(neighbor.x / countX * cubeSize, neighbor.y / countY * cubeSize, neighbor.z / countZ * cubeSize)
                            ]
                        }, scene);
                        line.color = new BABYLON.Color3(0, 1, 0);
                    }
                }

                // Проверка и создание линий по Z
                if (z < countZ - 1) {
                    const neighborIdx = y * countZ * countX + (z + 1) * countX + x;
                    const neighbor = points[neighborIdx];

                    if (randomValues[idx] > threshold && randomValues[neighborIdx] > threshold) {
                        const line = BABYLON.MeshBuilder.CreateLines("lineZ", {
                            points: [
                                new BABYLON.Vector3(current.x / countX * cubeSize, current.y / countY * cubeSize, current.z / countZ * cubeSize),
                                new BABYLON.Vector3(neighbor.x / countX * cubeSize, neighbor.y / countY * cubeSize, neighbor.z / countZ * cubeSize)
                            ]
                        }, scene);
                        line.color = new BABYLON.Color3(0, 1, 0);
                    }
                }

                // Проверка и создание линий по Y
                if (y < countY - 1) {
                    const neighborIdx = (y + 1) * countZ * countX + z * countX + x;
                    const neighbor = points[neighborIdx];

                    if (randomValues[idx] > threshold && randomValues[neighborIdx] > threshold) {
                        const line = BABYLON.MeshBuilder.CreateLines("lineY", {
                            points: [
                                new BABYLON.Vector3(current.x / countX * cubeSize, current.y / countY * cubeSize, current.z / countZ * cubeSize),
                                new BABYLON.Vector3(neighbor.x / countX * cubeSize, neighbor.y / countY * cubeSize, neighbor.z / countZ * cubeSize)
                            ]
                        }, scene);
                        line.color = new BABYLON.Color3(0, 1, 0);
                    }
                }
            }
        }
    }

    return scene;
}

export default createScene
