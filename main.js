import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r127/three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.7/build/dat.gui.module.js';

const scene = new THREE.Scene();

// Create both cameras
const aspect = window.innerWidth / window.innerHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
const orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

// Set the initial camera
let currentCamera = perspectiveCamera;
const startPosition = {
  x: 0,
  y: 0,
  z: 2
}; // Right in front of the cubes
perspectiveCamera.position.set(startPosition.x, startPosition.y, startPosition.z);
orthographicCamera.position.set(startPosition.x, startPosition.y, startPosition.z);
scene.add(currentCamera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

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
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.0005;

scene.add(directionalLight);

let dimensions = {
  width: 0.6, // 600mm -> 0.6 meters
  height: 0.6, // 600mm -> 0.6 meters
  depth: 0.6 // 600mm -> 0.6 meters
};

let cubeProperties = {
  transparency: true,
  opacity: 1,
  thickness: 0.02,
  cubeWidth: 0.6,
  cubeHeight: 0.4,
  cubeDepth: 0.4,
  frontPanelVisible: true,
  backPanelVisible: true,
  leftPanelVisible: true,
  rightPanelVisible: true,
  topPanelVisible: true,
  bottomPanelVisible: true,
  showHorizontalPanels: true, // Toggle for horizontal panels
  selectedTexture: 'Grey Lamination',
};


let spacing = {
  cubeSpacing: 0.02, // 20mm -> 0.02 meters for cube spacing
  frontPanelGap: 0.005 // 5mm -> 0.005 meters for front panel gap
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
        const offsetX = x * sectionSizeX;
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

  gui.__controllers.forEach(controller => controller.updateDisplay());
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
  map: greyLaminatedTexture,
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
      cylinderMaterial.map = greyLaminatedTexture; // Update cylinder material
      break;
    case 'White Lamination':
      laminatedMaterial.map = whiteLaminatedTexture;
      cylinderMaterial.map = whiteLaminatedTexture; // Update cylinder material
      break;
    case 'Yellow Lamination':
      laminatedMaterial.map = yellowLaminatedTexture;
      cylinderMaterial.map = yellowLaminatedTexture; // Update cylinder material
      break;
    case 'Natural Finish':
      laminatedMaterial.map = naturalFinishTexture;
      cylinderMaterial.map = naturalFinishTexture; // Update cylinder material
      break;
    case 'Red Lamination':
      laminatedMaterial.map = redLaminatedTexture;
      cylinderMaterial.map = redLaminatedTexture; // Update cylinder material
      break;
    case 'Blue Lamination':
      laminatedMaterial.map = blueLaminatedTexture;
      cylinderMaterial.map = blueLaminatedTexture; // Update cylinder material
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

  // Middle Panels
  const middlePanelDepth = depth - cubeProperties.thickness;
  const middlePanelWidth = availableWidth / (numMiddlePanelX - 1);

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
  const numCylindersX = Math.floor(availableWidth / 0.5) + 2;

  const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32);

  const numCylindersZ = 2; // Place two cylinders along the depth
  const edgeOffset = 0.04; // 40mm offset converted to meters

  for (let i = 0; i < numCylindersX; i++) {
    for (let j = 0; j < numCylindersZ; j++) {
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

      const posX = -availableWidth / 2 + i * middlePanelWidth;
      const posZ = -depth / 2 + edgeOffset + j * (depth - 2 * edgeOffset);
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




const gui = new GUI();
gui.add(cubeProperties, 'opacity', 0, 1).name('Transparency').onChange(updateCubeGeometry);
gui.add(dimensions, 'width').name('Width (m)').listen();
gui.add(dimensions, 'height').name('Height (m)').listen();
gui.add(dimensions, 'depth').name('Depth (m)').listen();
gui.add(cubeProperties, 'thickness', 0.01, 0.04).name('Thickness (m)').onChange(updateCubeGeometry);

gui.add(cubeProperties, 'frontPanelVisible').name('Front On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'backPanelVisible').name('Back On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'topPanelVisible').name('Top On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'bottomPanelVisible').name('Bottom On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'leftPanelVisible').name('Left On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'rightPanelVisible').name('Right On/Off').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'showHorizontalPanels').name('Shelves On/Off').onChange(updateCubeGeometry);


gui.add(cubeProperties, 'cubeWidth', 0.01, 2.4, 0.01).name('Cube Width (m)').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'cubeHeight', 0.01, 2.4, 0.01).name('Cube Height (m)').onChange(updateCubeGeometry);
gui.add(cubeProperties, 'cubeDepth', 0.01, 2.4, 0.01).name('Cube Depth (m)').onChange(updateCubeGeometry);
gui.add(spacing, 'cubeSpacing', 0, 0.1, 0.001).name('Cube Spacing (m)').onChange(updateCubeGeometry);
gui.add(spacing, 'frontPanelGap', 0, 0.05, 0.001).name('Front Panel Gap (m)').onChange(updateCubeGeometry);

gui.add(numCubes, 'numCubesX', 1, 10, 1).name('Number of Cubes X').onChange(updateCubeGeometry);
gui.add(numCubes, 'numCubesY', 1, 10, 1).name('Number of Cubes Y').onChange(updateCubeGeometry);
gui.add(numCubes, 'numCubesZ', 1, 2, 1).name('Number of Cubes Z').onChange(updateCubeGeometry);

gui.add(cubeProperties, 'selectedTexture', ['White Lamination', 'Yellow Lamination', 'Grey Lamination', 'Natural Finish', 'Red Lamination', 'Blue Lamination'])
  .name('Lamination Texture')
  .onChange(updateLaminatedMaterial);

gui.add(panelProperties, 'showLargePanel').name('Large Panel On/Off').onChange(updateCubeGeometry);
gui.add(panelProperties, 'showFloorPanel').name('Floor Panel On/Off').onChange(updateCubeGeometry);

// Camera toggle between perspective and orthogonal
let viewProperties = {
  perspectiveView: true
};

gui.add(viewProperties, 'perspectiveView').name('Perspective View').onChange(updateCameraView);

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
const controls = new OrbitControls(currentCamera, renderer.domElement);
// Check if controls are properly initialized
if (controls) {
    controls.enableDamping = true; // enable damping (inertia) for smoother controls
    controls.dampingFactor = 0.25; // set damping factor (adjust this value to your preference)
    controls.screenSpacePanning = false; // if false, pan orthogonal to world-space direction camera.up
    controls.minDistance = 1; // minimum zoom distance
    controls.maxDistance = 500; // maximum zoom distance

    console.log("Controls initialized: ", controls);
} else {
    console.error("Controls failed to initialize.");
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, currentCamera);
}

animate();
updateCubeGeometry();
