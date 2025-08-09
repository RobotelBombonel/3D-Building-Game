// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera and Renderer
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Prevent the default context menu for right-click actions
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Pointer Lock Controls
const controls = new THREE.PointerLockControls(camera, document.body);

document.body.addEventListener('click', () => {
    controls.lock();
});

// Light Setup
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Block Variables
const blockSize = 2;
const gridSize = 10;
const blocks = [];

// Create Ground (Align Platform to Blocks)
for (let x = -gridSize / 2; x < gridSize / 2; x++) {
    for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        const material = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x * blockSize, -blockSize, z * blockSize);
        scene.add(block);
        blocks.push(block);
    }
}

// Fix player spawn above the ground
camera.position.set(0, 5, 0);

// Block Selection
let selectedBlock = 'customBlock';
let selectedColor = new THREE.Color(1, 1, 1);
const hotbarBlocks = document.querySelectorAll('.block');
const toolNameEl = document.getElementById('toolName');

// Color Palette
const colorPalette = document.getElementById('colorPalette');
const colorOptions = colorPalette.getElementsByClassName('colorOption');

// Hotbar selection via keyboard (1, 2)
document.addEventListener('keydown', (event) => {
    if (event.key === '1') {
        selectedBlock = 'customBlock';
        toolNameEl.innerText = 'Tool: Custom Block';
        updateHotbarSelection(0);
        colorPalette.classList.add('hidden');
    } else if (event.key === '2') {
        selectedBlock = 'paintingTool';
        toolNameEl.innerText = 'Tool: Painting Tool';
        updateHotbarSelection(1);
        colorPalette.classList.remove('hidden');
    }
});

function updateHotbarSelection(index) {
    hotbarBlocks.forEach((block, i) => {
        block.classList.remove('selected');
        if (i === index) {
            block.classList.add('selected');
        }
    });
}

// Block Placement and Removal
document.addEventListener('mousedown', (event) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObjects(blocks);
    if (intersects.length > 0) {
        const targetBlock = intersects[0].object;
        if (event.button === 0) {
            if (selectedBlock === 'customBlock') {
                scene.remove(targetBlock);
                blocks.splice(blocks.indexOf(targetBlock), 1);
            } else if (selectedBlock === 'paintingTool') {
                targetBlock.material.color.set(selectedColor);
            }
        } else if (event.button === 2) {
            if (selectedBlock === 'customBlock') {
                const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
                const material = new THREE.MeshStandardMaterial({ color: selectedColor });
                const newBlock = new THREE.Mesh(geometry, material);

                const normal = intersects[0].face.normal;
                const placementPoint = intersects[0].point.clone().add(normal.multiplyScalar(blockSize / 2));
                placementPoint.x = Math.round(placementPoint.x / blockSize) * blockSize;
                placementPoint.y = Math.round(placementPoint.y / blockSize) * blockSize;
                placementPoint.z = Math.round(placementPoint.z / blockSize) * blockSize;

                newBlock.position.set(placementPoint.x, placementPoint.y, placementPoint.z);

                const existingBlock = blocks.find(b => b.position.equals(newBlock.position));
                if (!existingBlock) {
                    scene.add(newBlock);
                    blocks.push(newBlock);
                }
            }
        }
    }
});

// Update Color Palette Selection
Array.from(colorOptions).forEach(option => {
    option.addEventListener('click', () => {
        selectedColor.set(option.style.backgroundColor);
        colorPalette.classList.add('hidden');
    });
});

// Movement System with Speed Control
let keys = {};
let velocity = new THREE.Vector3(0, 0, 0);
const baseSpeedNormal = 0.05;
const baseSpeedFast = 0.1;
const baseSpeedSlow = 0.02;
let baseSpeed = baseSpeedNormal;
const sprintMultiplier = 3;
const damping = 0.9;

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function updateMovement() {
    if (controls.isLocked) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(camera.up, forward).normalize();

        const currentSpeed = keys['Control'] ? baseSpeed * sprintMultiplier : baseSpeed;

        if (keys['w']) velocity.addScaledVector(forward, currentSpeed);
        if (keys['s']) velocity.addScaledVector(forward, -currentSpeed);
        if (keys['a']) velocity.addScaledVector(right, -currentSpeed); // Move left
        if (keys['d']) velocity.addScaledVector(right, currentSpeed);  // Move right

        if (keys[' ']) velocity.y += currentSpeed;
        if (keys['Shift']) velocity.y -= currentSpeed;

        camera.position.add(velocity);
        velocity.multiplyScalar(damping);
    }
}

// HUD coordinate update
const coordinatesEl = document.getElementById('coordinates');
function updateHUD() {
    coordinatesEl.innerText = `Coordinates: X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`;
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    updateHUD();
    renderer.render(scene, camera);
}

animate();

// Save / Import / Speed Control
const saveWorldBtn = document.getElementById('saveWorldBtn');
const importWorldBtn = document.getElementById('importWorldBtn');
const speedControlBtn = document.getElementById('speedControlBtn');

saveWorldBtn.addEventListener('click', () => {
    const worldData = blocks.map(block => ({
        position: block.position,
        color: block.material.color.getHex()
    }));

    const blob = new Blob([JSON.stringify(worldData)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'world.json';
    link.click();
});

importWorldBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const worldData = JSON.parse(reader.result);

                blocks.forEach(block => scene.remove(block));
                blocks.length = 0;

                worldData.forEach(data => {
                    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
                    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(data.color) });
                    const block = new THREE.Mesh(geometry, material);
                    block.position.set(data.position.x, data.position.y, data.position.z);
                    scene.add(block);
                    blocks.push(block);
                });
            } catch (error) {
                alert('Eroare la încărcarea fișierului!');
            }
        };
        reader.readAsText(file);
    });
    input.click();
});

speedControlBtn.addEventListener('click', () => {
    if (baseSpeed === baseSpeedNormal) {
        baseSpeed = baseSpeedFast;
        speedControlBtn.innerText = 'Speed: Fast';
    } else if (baseSpeed === baseSpeedFast) {
        baseSpeed = baseSpeedSlow;
        speedControlBtn.innerText = 'Speed: Slow';
    } else {
        baseSpeed = baseSpeedNormal;
        speedControlBtn.innerText = 'Speed: Normal';
    }
});