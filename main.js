const scene = new THREE.Scene();

// Create both cameras
const aspect = window.innerWidth / window.innerHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
const orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

// Define a common start position for both cameras
const startPosition = new THREE.Vector3(0, 0, 2); // Start position for both cameras
const startRotation = new THREE.Euler(0, 0, 0); // Common initial rotation

// Set the initial camera
let currentCamera = perspectiveCamera;
perspectiveCamera.position.set(startPosition.x, startPosition.y, startPosition.z);
orthographicCamera.position.set(startPosition.x, startPosition.y, startPosition.z);

// Add the current camera to the scene
scene.add(currentCamera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setClearColor(0xffffff, 0.8); // White background with full opacity
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Lights and geometry setup
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.ShadowMaterial({
  opacity: 0.1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
scene.add(directionalLight);

const allowedThicknesses = [0.012, 0.018, 0.024, 0.03]; // Allowed values in meters

function closestAllowedThickness(value) {
  return allowedThicknesses.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
}

// Cube properties, dimensions, spacing, etc.
let viewProperties = {
  perspectiveView: true
};
let cubeProperties = {
  transparency: true,
  opacity: 1,
  thickness: 0.012,
  cubeWidth: 0.6,
  cubeHeight: 0.4,
  cubeDepth: 0.4,
  frontPanelVisible: true,
  backPanelVisible: true,
  leftPanelVisible: true,
  rightPanelVisible: true,
  topPanelVisible: true,
  bottomPanelVisible: true,
  showHorizontalPanels: true,
  selectedTexture: 'Red Lamination',
};

let dimensions = {
  width: 0.6,
  height: 0.6,
  depth: 0.6
};

let spacing = {
  cubeSpacing: 0.02,
  frontPanelGap: 0.005
};

let numCubes = {
  numCubesX: 1,
  numCubesY: 1,
  numCubesZ: 1
};

let panelProperties = {
  showLargePanel: false,
  showFloorPanel: false,
};

// Function: Smooth reset camera to start position
function resetCamera() {
  const duration = 1; // Transition duration in seconds
  const startPos = currentCamera.position.clone(); // Clone the current position
  const startRot = currentCamera.rotation.clone(); // Clone the current rotation

  // Calculate bounding box center and distance based on geometry dimensions
  const center = new THREE.Vector3(0, dimensions.height / 2, 0); // Center of the geometry
  const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth); // Get the largest dimension
  // Adjust the distance factor based on the geometry width to avoid going too far
  const widthFactor = Math.min(1, dimensions.width / dimensions.height); // Limit width contribution
  const distanceFactor = 1 + widthFactor / 2; // Base distance factor with smaller width contribution

  // Calculate target position based on geometry size and aspect ratio
  const targetPos = new THREE.Vector3(center.x, center.y, maxDimension * distanceFactor);
  const targetRot = new THREE.Euler(0, 0, 0); // Keep the rotation looking forward
  const startTime = performance.now();

  function animateReset(time) {
    const elapsedTime = (time - startTime) / 1000; // Convert to seconds
    const t = Math.min(elapsedTime / duration, 1); // Normalize time to [0, 1]

    // Smoothly interpolate the position and rotation
    currentCamera.position.lerpVectors(startPos, targetPos, t);

    // Interpolate the rotation smoothly using slerp (for Euler angles, manually interpolate each axis)
    currentCamera.rotation.set(
      THREE.MathUtils.lerp(startRot.x, targetRot.x, t),
      THREE.MathUtils.lerp(startRot.y, targetRot.y, t),
      THREE.MathUtils.lerp(startRot.z, targetRot.z, t)
    );

    // Update the controls target to the center of the geometry
    controls.target.lerp(center, t)

    // Update controls for the current frame
    controls.update();

    // Continue the animation if not done
    if (t < 1) {
      requestAnimationFrame(animateReset);
    }
  }

  requestAnimationFrame(animateReset);
}

function updateCameraView() {
  if (viewProperties.perspectiveView) {
    currentCamera = perspectiveCamera;
  } else {
    // Update orthographic camera parameters
    const frustumSize = 1;
    orthographicCamera.left = -frustumSize * aspect;
    orthographicCamera.right = frustumSize * aspect;
    orthographicCamera.top = frustumSize;
    orthographicCamera.bottom = -frustumSize;
    orthographicCamera.updateProjectionMatrix();

    currentCamera = orthographicCamera;
  }

  // Sync camera position and rotation
  currentCamera.position.copy(perspectiveCamera.position);
  currentCamera.rotation.copy(perspectiveCamera.rotation);
  controls.object = currentCamera;
  controls.update();
}

function updateDimensions() {
  const cubeWidth = cubeProperties.cubeWidth;
  const cubeHeight = cubeProperties.cubeHeight;
  const cubeDepth = cubeProperties.cubeDepth;
  const cubeSpacing = spacing.cubeSpacing;

  dimensions.width = numCubes.numCubesX * cubeWidth + (numCubes.numCubesX - 1) * cubeSpacing;
  dimensions.height = numCubes.numCubesY * cubeHeight + (numCubes.numCubesY - 1) * cubeSpacing;
  dimensions.depth = numCubes.numCubesZ * cubeDepth + (numCubes.numCubesZ - 1) * cubeSpacing;
}
let largePanel = null; // Initialize largePanel outside the function
let floorPanel = null; // Initialize floorPanel outside the function

function updateCubeGeometry() {
  scene.children = scene.children.filter(child => !child.userData.isCube && child !== largePanel && child !== floorPanel);
  updateDimensions();

  endGrainMaterial.opacity = cubeProperties.opacity;
  rotatedEndGrainMaterial.opacity = cubeProperties.opacity;
  laminatedMaterial.opacity = cubeProperties.opacity;
  cylinderMaterial.opacity = cubeProperties.opacity;

  const cubeWidth = cubeProperties.cubeWidth;
  const cubeHeight = cubeProperties.cubeHeight;
  const cubeDepth = cubeProperties.cubeDepth;
  const cubeSpacing = spacing.cubeSpacing;

  const sectionSizeX = cubeWidth + cubeSpacing;
  const sectionSizeY = cubeHeight + cubeSpacing;
  const sectionSizeZ = cubeDepth + cubeSpacing;

  const numSectionsX = numCubes.numCubesX;
  const numSectionsY = numCubes.numCubesY;
  const numSectionsZ = numCubes.numCubesZ;

  for (let x = 0; x < numSectionsX; x++) {
    for (let z = 0; z < numSectionsZ; z++) {
      for (let y = 0; y < numSectionsY; y++) {
        const offsetX = (x * sectionSizeX) - (dimensions.width / 2);
        const offsetY = y * sectionSizeY;
        const offsetZ = z * sectionSizeZ;
        const mesh = createSectionMesh(cubeProperties.cubeWidth, cubeProperties.cubeHeight, cubeProperties.cubeDepth, offsetX, offsetY, offsetZ);
        scene.add(mesh);
      }
    }
  }

  // Handle largePanel
  if (largePanel) {
    scene.remove(largePanel);
  }

  if (panelProperties.showLargePanel) {
    const panelWidth = 8;
    const panelHeight = 3;
    const panelDepth = 0.1;

    const largePanelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
    const largePanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888
    });
    largePanel = new THREE.Mesh(largePanelGeometry, largePanelMaterial);

    largePanel.position.set(panelWidth / 2 - 3, panelHeight / 2, -panelDepth / 2);
    largePanel.userData.isCube = true;
    scene.add(largePanel);
  }

  // Handle floorPanel
  if (floorPanel) {
    scene.remove(floorPanel);
  }

  if (panelProperties.showFloorPanel) {
    const floorWidth = 8;
    const floorDepth = 4;
    const floorThickness = 0.1;

    const floorPanelGeometry = new THREE.BoxGeometry(floorWidth, floorThickness, floorDepth);
    const floorPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888
    });
    floorPanel = new THREE.Mesh(floorPanelGeometry, floorPanelMaterial);

    floorPanel.position.set(floorWidth / 2 - 3, -floorThickness / 2, floorDepth / 2);
    floorPanel.userData.isCube = true;
    scene.add(floorPanel);
  }
}

const textureLoader = new THREE.TextureLoader();

const greyLaminatedTexture = textureLoader.load('https://i.imgur.com/0yEgr94.jpeg');
const whiteLaminatedTexture = textureLoader.load('https://i.imgur.com/EjW8L4E.jpeg');
const yellowLaminatedTexture = textureLoader.load('https://i.imgur.com/QrapdXF.jpeg');
const naturalFinishTexture = textureLoader.load('https://i.imgur.com/P9YMPBs.jpg');
const redLaminatedTexture = textureLoader.load('https://i.imgur.com/30oAplv.jpeg'); // New Red Texture
const blueLaminatedTexture = textureLoader.load('https://i.imgur.com/AEN7fTa.jpeg'); // New Blue Texture

const endGrainTexture = textureLoader.load(
  'https://i.imgur.com/azPNWoQ.jpeg',
  (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.1, 0.1);
  }
);

const rotatedEndGrainTexture = textureLoader.load(
  'https://i.imgur.com/azPNWoQ.jpeg',
  (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.1, 0.1);
    texture.rotation = Math.PI / 2;
    texture.center.set(0.5, 0.5);
  }
);

let laminatedMaterial = new THREE.MeshStandardMaterial({
  map: redLaminatedTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.5,
  metalness: 0.1,
});

let cylinderMaterial = new THREE.MeshStandardMaterial({
  map: greyLaminatedTexture, // Initial texture matching the selected lamination
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.5,
  metalness: 0.1,
});

const endGrainMaterial = new THREE.MeshStandardMaterial({
  map: endGrainTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.8,
  metalness: 0.1,
});

const rotatedEndGrainMaterial = new THREE.MeshStandardMaterial({
  map: rotatedEndGrainTexture,
  transparent: cubeProperties.transparency,
  opacity: cubeProperties.opacity,
  roughness: 0.8,
  metalness: 0.1,
});

function updateLaminatedMaterial() {
  switch (cubeProperties.selectedTexture) {
    case 'Grey Lamination':
      laminatedMaterial.map = greyLaminatedTexture;
      break;
    case 'White Lamination':
      laminatedMaterial.map = whiteLaminatedTexture;
      break;
    case 'Yellow Lamination':
      laminatedMaterial.map = yellowLaminatedTexture;
      break;
    case 'Natural Finish':
      laminatedMaterial.map = naturalFinishTexture;
      break;
    case 'Red Lamination':
      laminatedMaterial.map = redLaminatedTexture;
      break;
    case 'Blue Lamination':
      laminatedMaterial.map = blueLaminatedTexture;
      break;
  }
  laminatedMaterial.needsUpdate = true;
  cylinderMaterial.needsUpdate = true;
  updateCubeGeometry();
}

function createSectionMesh(width, height, depth, offsetX, offsetY, offsetZ) {
  const thickness = cubeProperties.thickness;
  const offset = 0; // 0mm offset from the edges for the horizontal panels!!!
  const frontPanelGap = spacing.frontPanelGap; // 10mm -> 0.01 meters

  const group = new THREE.Group();

  // Top and Bottom Panels
  const panelWidth = width;
  const topPanelGeometry = new THREE.BoxGeometry(panelWidth, thickness, depth);
  const topPanelMaterials = [
    endGrainMaterial,
    endGrainMaterial,
    laminatedMaterial,
    laminatedMaterial,
    endGrainMaterial,
    endGrainMaterial,
  ];
  const topPanel = new THREE.Mesh(topPanelGeometry, topPanelMaterials);
  topPanel.position.set(0, height / 2 - thickness / 2, 0);
  topPanel.visible = cubeProperties.topPanelVisible;
  topPanel.castShadow = true;
  topPanel.receiveShadow = true;
  group.add(topPanel);

  const bottomPanelGeometry = new THREE.BoxGeometry(panelWidth, thickness, depth);
  const bottomPanel = new THREE.Mesh(bottomPanelGeometry, topPanelMaterials);
  bottomPanel.position.set(0, -height / 2 + thickness / 2, 0);
  bottomPanel.visible = cubeProperties.bottomPanelVisible;
  bottomPanel.castShadow = true;
  bottomPanel.receiveShadow = true;
  group.add(bottomPanel);

  // Left and Right Panels
  const sidePanelHeight = height - 2 * thickness;
  const leftPanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, depth);
  const leftPanelMaterials = [
    laminatedMaterial,
    laminatedMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
  ];
  const leftPanel = new THREE.Mesh(leftPanelGeometry, leftPanelMaterials);
  leftPanel.position.set(-width / 2 + thickness / 2, 0, 0);
  leftPanel.visible = cubeProperties.leftPanelVisible;
  leftPanel.castShadow = true;
  leftPanel.receiveShadow = true;
  group.add(leftPanel);

  const rightPanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, depth);
  const rightPanel = new THREE.Mesh(rightPanelGeometry, leftPanelMaterials);
  rightPanel.position.set(width / 2 - thickness / 2, 0, 0);
  rightPanel.visible = cubeProperties.rightPanelVisible;
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;
  group.add(rightPanel);

  // Calculate the number of middle panels along the width
  const availableWidth = width - 2 * thickness; // Available width after edge offsets
  const numMiddlePanelX = Math.floor(availableWidth / 0.5) + 2; // At least 1 middle panel, add more if needed
  const numMiddlePanelZ = Math.floor(depth / 0.5) + 2; // At least 1 middle panel, add more if needed
  // Middle Panels
  const middlePanelDepth = depth - cubeProperties.thickness;
  const middlePanelWidth = availableWidth / (numMiddlePanelX - 1);
  const middlePanelZ = depth / (numMiddlePanelZ - 1);

  for (let i = 1; i < numMiddlePanelX - 1; i++) {
    const middlePanelGeometry = new THREE.BoxGeometry(thickness, sidePanelHeight, middlePanelDepth);
    const middlePanel = new THREE.Mesh(middlePanelGeometry, leftPanelMaterials);

    const posX = -availableWidth / 2 + i * middlePanelWidth;
    middlePanel.position.set(posX, 0, thickness / 2);
    middlePanel.castShadow = true;
    middlePanel.receiveShadow = true;
    group.add(middlePanel);
  }

  // Create arrays of horizontal panels along the X-axis if toggle is enabled
  if (cubeProperties.showHorizontalPanels) {
    for (let i = 0; i < numMiddlePanelX - 1; i++) {
      const startX = -availableWidth / 2 + i * middlePanelWidth;
      const endX = startX + middlePanelWidth;

      const availableHeight = height - 2 * thickness;
      const numHorizontalPanels = Math.floor(availableHeight / 0.5) + 2;

      const panelHeight = availableHeight / (numHorizontalPanels - 1);

      for (let j = 1; j < numHorizontalPanels - 1; j++) {
        const horizontalPanelGeometry = new THREE.BoxGeometry(middlePanelWidth - 2 * offset - thickness, thickness, middlePanelDepth);
        const horizontalPanel = new THREE.Mesh(horizontalPanelGeometry, topPanelMaterials);

        const posY = -availableHeight / 2 + j * panelHeight;
        const posX = startX + middlePanelWidth / 2;

        horizontalPanel.position.set(posX, posY, thickness / 2);
        horizontalPanel.castShadow = true;
        horizontalPanel.receiveShadow = true;
        group.add(horizontalPanel);
      }
    }
  }

  // Front Panels with offset for the front panel (Rest of your code remains unchanged)
  const panelWidthFrontBack = width - 2 * thickness;
  const panelHeightFrontBack = height - 2 * thickness;
  const frontPanelWidthWithOffset = middlePanelWidth - 2 * frontPanelGap - thickness;
  const frontPanelHeightWithOffset = panelHeightFrontBack - 2 * frontPanelGap;

  const frontPanelMaterials = [
    rotatedEndGrainMaterial,
    rotatedEndGrainMaterial,
    endGrainMaterial,
    endGrainMaterial,
    laminatedMaterial,
    laminatedMaterial,
  ];

  for (let i = 0; i < numMiddlePanelX - 1; i++) {
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(frontPanelWidthWithOffset, frontPanelHeightWithOffset, thickness),
      frontPanelMaterials
    );

    const posX = -availableWidth / 2 + i * middlePanelWidth + middlePanelWidth / 2;
    const posZ = depth / 2 - thickness / 2 - 0.01;

    frontPanel.position.set(posX, 0, posZ);
    frontPanel.visible = cubeProperties.frontPanelVisible;
    frontPanel.castShadow = true;
    frontPanel.receiveShadow = true;
    group.add(frontPanel);
  }

  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidthFrontBack, panelHeightFrontBack, thickness),
    frontPanelMaterials
  );
  backPanel.position.set(0, 0, -depth / 2 + thickness / 2);
  backPanel.visible = cubeProperties.backPanelVisible;
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  group.add(backPanel);

  // Add Cylinders with updated material based on selected lamination
  const cylinderRadius = 0.015; // 15mm radius
  const cylinderHeight = spacing.cubeSpacing; // Already in meters
  const edgeOffsetX = 0.04; // 40mm offset in meters
  const edgeOffsetZ = 0.04; // 40mm offset converted to meters
  const numCylindersX = Math.floor(availableWidth / 0.5) + 2;
  const numCylindersZ = Math.floor(depth / 0.5) + 2;

  const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32);

  for (let i = 0; i < numCylindersX; i++) {
    for (let j = 0; j < numCylindersZ; j++) {
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

      let posX = -availableWidth / 2 + i * middlePanelWidth;
      if (i === 0) {
        posX += edgeOffsetX; // Apply offset only to the first cylinder
      } else if (i === numCylindersX - 1) {
        posX -= edgeOffsetX; // Apply offset only to the last cylinder
      }
      let posZ = -depth / 2 + j * middlePanelZ;
      if (j === 0) {
        posZ += edgeOffsetZ; // Apply offset to the first cylinder
      } else if (j === numCylindersZ - 1) {
        posZ -= edgeOffsetZ; // Apply offset to the last cylinder
      }

      const posY = -height / 2 - cylinderHeight / 2;

      cylinder.position.set(posX, posY, posZ);
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;

      group.add(cylinder);
    }
  }

  // Position the entire group and lift on the Y axis by the value of cubeSpacing
  group.position.set(offsetX + width / 2, offsetY + height / 2 + spacing.cubeSpacing, offsetZ + depth / 2);

  group.userData.isCube = true;

  return group;
}

// Orbit Controls and Animation Loop
const controls = new OrbitControls(currentCamera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2; // No downward rotation beyond horizontal view
controls.minDistance = 1; // Minimum zoom distance
controls.maxDistance = 6; // Maximum zoom distance

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, currentCamera);
}

animate();
updateCubeGeometry();


const gui = new dat.GUI();

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add({
  resetCamera: () => resetCamera()
}, 'resetCamera').name('Reset Camera');
cameraFolder.add(viewProperties, 'perspectiveView').name('Perspective View').onChange(updateCameraView);
cameraFolder.open(); // Automatically open the folder

const overallFolder = gui.addFolder('Overall Size');
overallFolder.add(dimensions, 'width').name('Width (m)').listen();
overallFolder.add(dimensions, 'height').name('Height (m)').listen();
overallFolder.add(dimensions, 'depth').name('Depth (m)').listen();
overallFolder.open(); // Automatically open the folder

const cubeFolder = gui.addFolder('Cube Properties');
cubeFolder.add(cubeProperties, 'cubeWidth', 0.01, 2.4).name('Cube Width (m)').onChange(updateCubeGeometry);
cubeFolder.add(cubeProperties, 'cubeHeight', 0.01, 2.4).name('Cube Height (m)').onChange(updateCubeGeometry);
cubeFolder.add(cubeProperties, 'cubeDepth', 0.01, 2.4).name('Cube Depth (m)').onChange(updateCubeGeometry);
cubeFolder.add(cubeProperties, 'thickness', 0.012, 0.03) // Slider between 12mm (0.012m) and 30mm (0.03m)
  .step(0.001) // Small step size to allow smooth sliding
  .name('Thickness (m)')
  .onChange((value) => {
    cubeProperties.thickness = closestAllowedThickness(value); // Snap to closest allowed thickness
    updateCubeGeometry();
  });
cubeFolder.add(spacing, 'cubeSpacing', 0, 0.1, 0.001).name('Cube Spacing (m)').onChange(updateCubeGeometry);
cubeFolder.add(spacing, 'frontPanelGap', 0, 0.05, 0.001).name('Front Panel Gap (m)').onChange(updateCubeGeometry);
cubeFolder.open(); // Automatically open the folder

const visibilityFolder = gui.addFolder('Visibility');
visibilityFolder.add(cubeProperties, 'opacity', 0, 1).name('Transparency').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'frontPanelVisible').name('Front On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'backPanelVisible').name('Back On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'topPanelVisible').name('Top On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'bottomPanelVisible').name('Bottom On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'leftPanelVisible').name('Left On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'rightPanelVisible').name('Right On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(cubeProperties, 'showHorizontalPanels').name('Shelves On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(panelProperties, 'showLargePanel').name('Wall On/Off').onChange(updateCubeGeometry);
visibilityFolder.add(panelProperties, 'showFloorPanel').name('Floor On/Off').onChange(updateCubeGeometry);
visibilityFolder.open(); // Automatically open the folder

const repetitionFolder = gui.addFolder('Repetition');
repetitionFolder.add(numCubes, 'numCubesX', 1, 10, 1).name('Number of Cubes X').onChange(updateCubeGeometry);
repetitionFolder.add(numCubes, 'numCubesY', 1, 10, 1).name('Number of Cubes Y').onChange(updateCubeGeometry);
repetitionFolder.add(numCubes, 'numCubesZ', 1, 2, 1).name('Number of Cubes Z').onChange(updateCubeGeometry);
repetitionFolder.close(); // Automatically open the folder

const textureFolder = gui.addFolder('Texture Selection');

// Create a container for the lamination checkboxes
const laminationContainer = document.createElement('div');
laminationContainer.classList.add('cr'); // Class to match the visibility section

// Add a label to the left side
const laminationLabel = document.createElement('span');
laminationLabel.textContent = 'Lamination';
laminationLabel.classList.add('lamination-label'); // Apply label styling
laminationContainer.appendChild(laminationLabel);

// Colors for each checkbox option
const laminationOptions = ['Grey', 'White', 'Yellow', 'Natural', 'Red', 'Blue'];
const colors = ['#888888', '#ffffff', '#ffd700', '#8B4513', '#ff0000', '#0000ff'];

laminationOptions.forEach((option, index) => {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.classList.add('lamination-checkbox');
  checkbox.style.backgroundColor = colors[index]; // Set the checkbox color

  checkbox.addEventListener('change', function() {
    // Only one checkbox should be selected at a time
    document.querySelectorAll('.lamination-checkbox').forEach(cb => cb.checked = false);
    checkbox.checked = true;

    // Update the selected texture in the cube properties
    cubeProperties.selectedTexture = option === 'Natural' ? 'Natural Finish' : `${option} Lamination`;

    updateLaminatedMaterial();
  });

  laminationContainer.appendChild(checkbox);
});


// Add the container to the texture folder
textureFolder.__ul.appendChild(laminationContainer);
