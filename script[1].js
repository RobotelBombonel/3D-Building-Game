// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Light blue sky

// Camera and Renderer
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Pointer Lock Controls
const controls = new THREE.PointerLockControls(camera, document.body);

// Lock mouse on click
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
        const material = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Green ground
        const block = new THREE.Mesh(geometry, material);
        
        // Adjust platform Y position to align perfectly with block placement
        block.position.set(x * blockSize, -blockSize, z * blockSize); // Perfect alignment
        scene.add(block);
        blocks.push(block);
    }
}

// Fix player spawn above the ground
camera.position.set(0, 5, 0); // Start above the ground

// Block Selection
let selectedBlock = 'customBlock';
let selectedColor = new THREE.Color(1, 1, 1); // Default color (white)
const hotbarBlocks = document.querySelectorAll('.block');
const toolNameEl = document.getElementById('toolName');

// Color Palette
const colorPalette = document.getElementById('colorPalette');
const colorOptions = colorPalette.getElementsByClassName('colorOption');

// Add event listeners for hotbar selection (1, 2)
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

// Highlight the selected slot in the hotbar
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
        if (event.button === 0) { // Left Click: Remove Block
            if (selectedBlock === 'customBlock') {
                scene.remove(targetBlock);
                blocks.splice(blocks.indexOf(targetBlock), 1);
            } else if (selectedBlock === 'paintingTool') {
                targetBlock.material.color.set(selectedColor);
            }
        } else if (event.button === 2) { // Right Click: Place Block
            if (selectedBlock === 'customBlock') {
                const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
                const material = new THREE.MeshStandardMaterial({ color: selectedColor });
                const newBlock = new THREE.Mesh(geometry, material);
                
                // Ensure placement aligns to grid and adjacent to an existing block
                const normal = intersects[0].face.normal;
                const placementPoint = intersects[0].point.clone().add(normal.multiplyScalar(blockSize / 2));
                placementPoint.x = Math.round(placementPoint.x / blockSize) * blockSize;
                placementPoint.y = Math.round(placementPoint.y / blockSize) * blockSize;
                placementPoint.z = Math.round(placementPoint.z / blockSize) * blockSize;

                newBlock.position.set(placementPoint.x, placementPoint.y, placementPoint.z);

                // Add block only if no other block exists at the same position
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
        colorPalette.classList.add('hidden'); // Close palette after color selection
    });
});

// Movement System with Speed Control
let keys = {};
let velocity = new THREE.Vector3(0, 0, 0);
const baseSpeedNormal = 0.05; // Default speed
const baseSpeedFast = 0.1; // Fast speed
const baseSpeedSlow = 0.02; // Slow speed
let baseSpeed = baseSpeedNormal; // Current speed
const sprintMultiplier = 3; // Speed multiplier when pressing Ctrl
const damping = 0.9; // Smooth stop for movement

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function updateMovement() {
    if (controls.isLocked) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(camera.up, forward);
        right.normalize();

        // Determine current speed
        const currentSpeed = keys['Control'] ? baseSpeed * sprintMultiplier : baseSpeed;

        // Adjust velocity based on keys
        if (keys['w']) velocity.addScaledVector(forward, currentSpeed);
        if (keys['s']) velocity.addScaledVector(forward, -currentSpeed);
        if (keys['a']) velocity.addScaledVector(right, currentSpeed); // Move left
        if (keys['d']) velocity.addScaledVector(right, -currentSpeed); // Move right

        // Vertical movement
        if (keys[' ']) velocity.y += currentSpeed; // Ascend
        if (keys['Shift']) velocity.y -= currentSpeed; // Descend

        // Apply velocity to camera position
        camera.position.add(velocity);

        // Apply damping to reduce speed gradually
        velocity.multiplyScalar(damping);
    }
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    renderer.render(scene, camera);
}

animate();

// Setează butoanele de Save, Import și Speed Control
const saveWorldBtn = document.getElementById('saveWorldBtn');
const importWorldBtn = document.getElementById('importWorldBtn');
const speedControlBtn = document.getElementById('speedControlBtn');

// Funcționalitate Save World
saveWorldBtn.addEventListener('click', () => {
    // Crează obiectul cu informațiile despre blocuri
    const worldData = blocks.map(block => ({
        position: block.position,
        color: block.material.color.getHex()
    }));

    // Crează un fișier JSON
    const blob = new Blob([JSON.stringify(worldData)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'world.json';
    link.click();
});

// Funcționalitate Import World
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

                // Șterge toate blocurile din scenă înainte de a importa
                blocks.forEach(block => scene.remove(block));
                blocks.length = 0;

                // Reconstruiește blocurile
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

// Funcționalitate Speed Control
speedControlBtn.addEventListener('click', () => {
    // Toggle între viteze
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
