import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        

const canvas = document.querySelector('.canvas');
const scene = new THREE.Scene();

let touchControls;

// Loading progress tracking
let modelsLoaded = 0;
const totalModels = 1; // Update this if you load more models

// Camera setup
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80.21954626648072, 39.0888887446244, 278.2953267000209);
camera.rotation.set(-0.17155681062643696, -0.013253588181707663, -0.0022962445718362895);

const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// First-person controls variables
const moveSpeed = 30;
const lookSpeed = 0.002;
const verticalLookLimit = Math.PI / 3; // Limit vertical look angle

// Movement state
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};

// Mouse movement variables
let isMouseLocked = false;
let previousMouseX = 0;
let previousMouseY = 0;

// Setup mouse lock
function setupMouseLock() {
       canvas.addEventListener('click', (e) => {
        // Only request pointer lock if clicking directly on canvas (not UI elements)
        if (!isMouseLocked && 
            !e.target.closest('#instruction-content') && 
            !e.target.closest('close-instructions') &&
            !e.target.closest('#exhibit-ui') &&
            !e.target.closest('#video-container')) {
            canvas.requestPointerLock = canvas.requestPointerLock || 
                                     canvas.mozRequestPointerLock || 
                                     canvas.webkitRequestPointerLock;
            canvas.requestPointerLock();
        }
    });
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

    function lockChangeAlert() {
        if (document.pointerLockElement === canvas || 
            document.mozPointerLockElement === canvas || 
            document.webkitPointerLockElement === canvas) {
            if (exhibitUI.style.display === 'block' || document.getElementById('video-container')) {
                document.exitPointerLock();
                return;
            }
            isMouseLocked = true;
            document.addEventListener('mousemove', onMouseMove, false);
        } 
        else {
            isMouseLocked = false;
            document.removeEventListener('mousemove', onMouseMove, false);
        }
    }
}

// Mouse movement handler
function onMouseMove(e) {
    if (!isMouseLocked) return;

    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    // Horizontal rotation (left/right)
    camera.rotation.y -= movementX * lookSpeed;

    camera.rotation.x = 0;
}

// Keyboard controls
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w': movement.forward = true; break;
            case 's': movement.backward = true; break;
            case 'a': movement.left = true; break;
            case 'd': movement.right = true; break;
            case 'q': movement.up = true; break;
            case 'e': movement.down = true; break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w': movement.forward = false; break;
            case 's': movement.backward = false; break;
            case 'a': movement.left = false; break;
            case 'd': movement.right = false; break;
            case 'q': movement.up = false; break;
            case 'e': movement.down = false; break;
        }
    });
}

// Movement update function
function updateMovement(delta) {
    const actualMoveSpeed = moveSpeed * delta;

    // Forward/backward movement
    if (movement.forward) {
        camera.translateZ(-actualMoveSpeed);
    }
    if (movement.backward) {
        camera.translateZ(actualMoveSpeed);
    }

    // Left/right movement
    if (movement.left) {
        camera.translateX(-actualMoveSpeed);
    }
    if (movement.right) {
        camera.translateX(actualMoveSpeed);
    }

    // Up/down movement
    if (movement.up) {
        camera.position.y += actualMoveSpeed;
    }
    if (movement.down) {
        camera.position.y -= actualMoveSpeed;
    }
}

// Add touch controls for movement
function setupTouchControls() {
    // Create controls container
    const touchControls = document.createElement('div');
    touchControls.id = 'touch-controls';
    touchControls.style.position = 'fixed';
    touchControls.style.bottom = '20px';
    touchControls.style.left = '50%';
    touchControls.style.transform = 'translateX(-50%)';
    touchControls.style.width = '150px';
    touchControls.style.height = '150px';
    touchControls.style.display = 'none'; // Start hidden
    touchControls.style.pointerEvents = 'none';
    touchControls.style.zIndex = '1000';
    document.body.appendChild(touchControls);

    // Movement pad (joystick background)
    const movePad = document.createElement('div');
    movePad.id = 'move-pad';
    movePad.style.width = '100%';
    movePad.style.height = '100%';
    movePad.style.backgroundColor = 'rgba(0,0,0,0.2)';
    movePad.style.borderRadius = '50%';
    movePad.style.position = 'relative';
    movePad.style.pointerEvents = 'auto';
    movePad.style.touchAction = 'none'; // Important for mobile
    movePad.style.userSelect = 'none'; // Prevent text selection
    touchControls.appendChild(movePad);

    // Joystick handle
    const joystick = document.createElement('div');
    joystick.id = 'joystick';
    joystick.style.width = '40%';
    joystick.style.height = '40%';
    joystick.style.backgroundColor = 'rgba(255,255,255,0.5)';
    joystick.style.borderRadius = '50%';
    joystick.style.position = 'absolute';
    joystick.style.top = '50%';
    joystick.style.left = '50%';
    joystick.style.transform = 'translate(-50%, -50%)';
    joystick.style.pointerEvents = 'none';
    joystick.style.transition = 'transform 0.1s';
    joystick.style.opacity = '0.5';
    movePad.appendChild(joystick);

    let activeTouchId = null;
    const maxDistance = 45; // Max distance joystick can move from center

    // Touch start handler
    movePad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (activeTouchId === null && e.touches.length > 0) {
            activeTouchId = e.touches[0].identifier;
            updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    // Touch move handler
    document.addEventListener('touchmove', (e) => {
        if (activeTouchId !== null) {
            const touch = Array.from(e.touches).find(t => t.identifier === activeTouchId);
            if (touch) {
                e.preventDefault();
                updateJoystickPosition(touch.clientX, touch.clientY);
                
                const rect = movePad.getBoundingClientRect();
                const centerX = rect.left + rect.width/2;
                const centerY = rect.top + rect.height/2;
                
                const deltaX = touch.clientX - centerX;
                const deltaY = touch.clientY - centerY;
                const distance = Math.min(Math.sqrt(deltaX*deltaX + deltaY*deltaY), maxDistance);
                
                // Calculate movement direction (normalized values between 0 and 1)
                const forwardAmount = Math.max(0, -deltaY / maxDistance);
                const backwardAmount = Math.max(0, deltaY / maxDistance);
                const leftAmount = Math.max(0, -deltaX / maxDistance);
                const rightAmount = Math.max(0, deltaX / maxDistance);
                
                // Apply thresholds to prevent accidental movements
                movement.forward = forwardAmount > 0.2;
                movement.backward = backwardAmount > 0.2;
                movement.left = leftAmount > 0.2;
                movement.right = rightAmount > 0.2;
            }
        }
    }, { passive: false });

    // Touch end handler
    document.addEventListener('touchend', (e) => {
        if (activeTouchId !== null && 
            Array.from(e.changedTouches).some(t => t.identifier === activeTouchId)) {
            resetJoystick();
            activeTouchId = null;
            // Reset movement
            movement.forward = false;
            movement.backward = false;
            movement.left = false;
            movement.right = false;
        }
    });

    function updateJoystickPosition(x, y) {
        const rect = movePad.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        const distance = Math.min(Math.sqrt(deltaX*deltaX + deltaY*deltaY), maxDistance);
        const angle = Math.atan2(deltaY, deltaX);
        
        const joystickX = distance * Math.cos(angle);
        const joystickY = distance * Math.sin(angle);
        
        joystick.style.transform = `translate(calc(-50% + ${joystickX}px), calc(-50% + ${joystickY}px))`;
        joystick.style.opacity = '1';
    }

    function resetJoystick() {
        joystick.style.transform = 'translate(-50%, -50%)';
        joystick.style.opacity = '0.5';
    }

    // Show controls after loading
    document.querySelector('.loading-screen').addEventListener('transitionend', () => {
        touchControls.style.display = 'block';
    });
}

        // Modify your initialization
        function initControls() {
            if (isMobile) {
                setupTouchControls();

                 renderer.antialias = false;
                 renderer.shadowMap.enabled = false;
                
                // Show fullscreen button on mobile
                const fsButton = document.getElementById('fullscreen-button');
                fsButton.style.display = 'block';
                fsButton.addEventListener('click', () => {
                    if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        document.documentElement.webkitRequestFullscreen();
                    }
                });
                
                // Show controls after loading
                document.querySelector('.loading-screen').addEventListener('transitionend', () => {
                    document.getElementById('touch-controls').style.display = 'flex';
                });
            } else {
                setupMouseLock();
                setupKeyboardControls();
            }
        }


//lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(-165.01445413093128, 539.25437520156, -216.11550290035518);
ambientLight.position.set(86.73729926481377, 140.41787049838712, 17.54735020570745);
scene.add(ambientLight);
scene.add(directionalLight);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();



/// 16 invisible hotspots data
const hotspotData = [
    {
            position: new THREE.Vector3(-40, 18, -165),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/ANKLE_RATTLES.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_8.mp3',
            title: "Ankle Rattles",
            description: "These are ankle rattles for wearing on the unkles to enhance the sound of music at celebrations like marriages and royal fuctions."
        },
          {
            position: new THREE.Vector3(-100, -4, -500),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/AXE.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_4.mp3',
            title: "Axe",
            description: "This is a male traditional hoe called Eligo. It is held by the chief to show leadersip and was used as awar tool."
        },
        {
            position: new THREE.Vector3(-100, 40, -510),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/BOW.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_3.mp3',
            title: "Bow",
            description: "Bow model."
        },
        {
            position: new THREE.Vector3(-100, 90, -515),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/ELEGU.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_3.mp3',
            title: "Elegu",
            description: "The is also called Eligo it is the female one held by the chiefs wife as a symbol of leadership also used in war.."
        },
        {
            position: new THREE.Vector3(-40, 18, -118),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/GOAT_SUCK.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_6.mp3',
            title: "Goat sack",
            description: "This is a goat's hide, during the Kebu medieval times it was used as a carrying suck. When an elder went to visit and there was leftover food, it would be parked in this suck for him to take back with him."
        },
        {
            position: new THREE.Vector3(-40, 20, -207),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/KEBU_HORN.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_6.mp3',
            title: "Kebu Horn",
            description: "These horns are found in the neck of every Kebu man. They are for signaling danger or general mobilization depending on the pattern of how they are being blown."
        },
        {
            position: new THREE.Vector3(-250, 22, -151),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/KEBU_POT.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_6.mp3',
            title: "Kebu Pot",
            description: "The pot is a very important commodity to the Kebu society and home. The Kebu people never used iron to cook. Clay pots were used for cooking, collecting water and preserving food itself."
        },
        {
            position: new THREE.Vector3(-40, 18, -30),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(15, 15, 15),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/MIYA_SKIN.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_6.mp3',
            title: "Miya Skin",
            description: "This is a Miya cat skin, it is one of the Kebu people's artifacts. It used to be used to ward away epidemics that broke out during medieval times. It used to be waved by the chief as he cast out sickness from his land."
        },
        {
            position: new THREE.Vector3(202, 17, -194),
            modelOffset: new THREE.Vector3(100, 30, -250),
            modelScale: new THREE.Vector3(0.5, 0.5, 0.5),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/NANAGA.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_8.mp3',
            title: "Enanga",
            description: "Is an instrument that the Batwa used to play after a succfesful hunt. it is made of a flattended wooden slade with nylon or animal skin cut into stings and tied from end to end horizontally to produce different pitches when played. "
        },
        {
            position: new THREE.Vector3(-40, 20, -65),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/OGOROGOGO%20.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_8.mp3',
            title: "Ogorogogo",
            description: "This is a farming tool used by the Ukebhu for harrowing, it is called Agorogoro. It normally has got an iron fixed on its sharp end."
        },
        {
            position: new THREE.Vector3(-255, 25, -367),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/SHAKER.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_2.mp3',
            title: "Shaker",
            description: "This is a shaker made out of calabash. It is used to evoc spirits of the ancestors. But now its used as a music instrument."
        },
        {
            position: new THREE.Vector3(211, 17, -60),
            modelOffset: new THREE.Vector3(100, 30, 0),
            modelScale: new THREE.Vector3(5, 5, 5),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/STICKS.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_2.mp3',
            title: "Sticks",
            description: "These are sticks called Imirosho used by the Batwa in cultural dances and performances. They are used for drumming or as dance props."
        },
        {
            position: new THREE.Vector3(206, 20, -444),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/THUMB_PIANO.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_2.mp3',
            title: "Ikumbi (Thumb Piano)",
            description: "This is a wooden box instrument found in the Batwa community like in most Ugandan cultures, it has a box wooden body and metal pokes tied to its neck in diferent pitches. Its played using both thumb fingers to create sound."
        },
        {
            position: new THREE.Vector3(-52, 12, -336),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/THUMB_PIANO.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_2.mp3',
            title: "Thumb Piano",
            description: "The Lukembe is one of the musical instrumenets of the Ukebhu, it is made of a sqaure wooden box and metallic pokes tided to its neck with different pitches. Lekembe is played using two finger thumbs by strumming the pokes rythmically to create sound."
        },
          // remember to give the second thumb piano a different position
        {
            position: new THREE.Vector3(-52, 12, 107),
            modelOffset: new THREE.Vector3(-150, 30, -118),
            modelScale: new THREE.Vector3(10, 10, 10),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/VACCUM.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_6.mp3',
            title: "Vaccum",
            description: "This is a food warmer called Abhoro. It is used to keep food fresh and warm."
        },
        {
            position: new THREE.Vector3(10, -5, -115),
            modelOffset: new THREE.Vector3(100, 30, 0),
            modelScale: new THREE.Vector3(5, 5, 5),
            modelPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/UMUNAHI.glb',
            soundPath: 'https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/audio_2.mp3',
            title: "Umunahi",
            description: "This is an istrument found among the Batwa, it is used for playing music while telling stories at the fire place. It is made of out of  Macademia nut tree branches and a gourd at the bottom to creat low end sound."
        }

    ]
const pictureHotspotData = [
    {
        position: new THREE.Vector3(-255, 45, -40), 
        videoId: "A9P7MDe9xfQ", 
        title: "Sembagare",
        description: "Sembagare"
    },
    {
        position: new THREE.Vector3(-255, 45, -250), 
        videoId: "2YNjtXqCO_Q",
        title: "Paskazia Nyiragaromba",
        description: "Paskazia Nyiragaromba"
    },
    {
        position: new THREE.Vector3(-255, 45, -470), 
        videoId: "VXkjMivVNc8", 
        title: "Birara Dance",
        description: "Birara Dance"
    },
    {
        position: new THREE.Vector3(170, 0, -106), 
        videoId: "SV6mbdtQ_qw", 
        title: "The fire making stick",
        description: "The fire making stick"
    },
    {
        position: new THREE.Vector3(10, 50, -115), 
        videoId: "5ps75Q-4Zi4", 
        title: "Batwa Dance",
        description: "Batwa Dance"
    },
    {
        position: new THREE.Vector3(170, 0, -125), 
        videoId: "z6iG4wFgZfc", 
        title: "Enanga",
        description: "Enanga"
    },
    {
        position: new THREE.Vector3(206, 40, -330), 
        videoId: "llJWRdh4zIc", 
        title: "Thumb Piano",
        description: "Thumb Piano"
    },
    {
        position: new THREE.Vector3(90, 20, -520),
        videoId: "i78wqPZQfb0", 
        title: "Seeke",
        description: "Seeke"
    }
];

let hotspots = [];
let exhibitHotspots = [];
let isAnimating = false;
let currentExhibit = null;
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);

// Create UI elements for exhibit display
const exhibitUI = document.createElement('div');
exhibitUI.id = 'exhibit-ui';
exhibitUI.style.display = 'none';
document.body.appendChild(exhibitUI);

const exhibitTitle = document.createElement('h2');
exhibitTitle.id = 'exhibit-title';
exhibitUI.appendChild(exhibitTitle);

const exhibitDescription = document.createElement('p');
exhibitDescription.id = 'exhibit-description';
exhibitUI.appendChild(exhibitDescription);

const closeButton = document.createElement('button');
closeButton.id = 'close-exhibit';
closeButton.textContent = 'Close';
closeButton.addEventListener('click', (event) => closeExhibit(event));
exhibitUI.appendChild(closeButton);


function createPictureHotspots() {
    pictureHotspotData.forEach((data) => {
        const geometry = new THREE.BoxGeometry(50, 50, 5); 
        const material = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0 // change back after adjusting
        });
        const pictureFrame = new THREE.Mesh(geometry, material);
        pictureFrame.position.copy(data.position);
        pictureFrame.userData = { 
            isPicture: true,
            videoId: data.videoId,
            title: data.title,
            description: data.description
        };
        scene.add(pictureFrame);
    });
}

function createExhibitHotspots() {
    // Clear existing exhibit hotspots
    exhibitHotspots.forEach(hotspot => {
        scene.remove(hotspot.mesh);
    });
    exhibitHotspots = [];
    
    // Create 16 invisible hotspots
    hotspotData.forEach((data, index) => {
        const geometry = new THREE.SphereGeometry(13, 24, 24);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0 // Completely invisible
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(data.position);
        sphere.userData = { exhibitData: data };
        scene.add(sphere);
        
        exhibitHotspots.push({
            mesh: sphere,
            exhibitData: data
        });
    });
}

function showExhibit(data) {
    // Show loading indicator
    const exhibitLoader = document.getElementById('exhibit-loader');
    if (exhibitLoader) exhibitLoader.style.display = 'flex';

    closeExhibit();

    // Populate UI first
    exhibitTitle.textContent = data.title;
    exhibitDescription.textContent = data.description;
    exhibitUI.style.display = 'block';

    // Load and display the 3D model
    const loader = new GLTFLoader();
    loader.load(data.modelPath, 
        (gltf) => {
            // Remove previous model if exists
            if (currentExhibit && currentExhibit.model) {
                scene.remove(currentExhibit.model);
            }
            
            const model = gltf.scene;
            model.scale.set(0, 0, 0);
            model.position.copy(data.modelOffset);
            scene.add(model);
            
            currentExhibit = {
                model: model,
                sound: null
            };
            
            // Load and play sound
            audioLoader.load(data.soundPath, (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(false);
                sound.setVolume(0.5);
                sound.play();
                currentExhibit.sound = sound;
                
                // Hide loader when both model and sound are loaded
                if (exhibitLoader) exhibitLoader.style.display = 'none';
            });
        },
        undefined, // Progress callback
        (error) => {
            console.error('Error loading model:', error);
            if (exhibitLoader) exhibitLoader.style.display = 'none';
        }
    );
}
function closeExhibit(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // Hide loader immediately
    const exhibitLoader = document.getElementById('exhibit-loader');
    if (exhibitLoader) {
        exhibitLoader.style.display = 'none';
    }

    if (currentExhibit) {
        // Remove model
        if (currentExhibit.model && currentExhibit.model.parent) {
            scene.remove(currentExhibit.model);
            
            // Dispose of model resources if needed
            if (currentExhibit.model.traverse) {
                currentExhibit.model.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (child.material.map) child.material.map.dispose();
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        
        // Stop sound
        if (currentExhibit.sound) {
            currentExhibit.sound.stop();
            currentExhibit.sound.disconnect();
        }
        
        currentExhibit = null;
    }
    
    // Hide UI
    exhibitUI.style.display = 'none';

    if (!isMobile && !isMouseLocked && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    if (isAnimating || exhibitUI.style.display === 'block' || document.getElementById('video-container')) return;
    
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check for navigation hotspots first
    const allNavObjects = [];
    hotspots.forEach(h => {
        allNavObjects.push(h.mesh);
        h.mesh.children.forEach(child => allNavObjects.push(child));
    });
    
    let navIntersects = raycaster.intersectObjects(allNavObjects);
    
    if (navIntersects.length > 0) {
        let clickedObject = navIntersects[0].object;
        while (clickedObject.parent && !hotspots.some(h => h.mesh === clickedObject)) {
            clickedObject = clickedObject.parent;
        }
        
        const clickedNavHotspot = hotspots.find(h => h.mesh === clickedObject);
        if (clickedNavHotspot) {
            moveCameraToPosition(clickedNavHotspot.targetPosition);
            return;
        }
        else {
            console.warn("Clicked on a navigation hotspot but no data found.");
        }
    }
    
    // Check for exhibit hotspots
    const allExhibitObjects = exhibitHotspots.map(h => h.mesh);
    const exhibitIntersects = raycaster.intersectObjects(allExhibitObjects);
    
    if (exhibitIntersects.length > 0) {
        const clickedHotspot = exhibitHotspots.find(h => h.mesh === exhibitIntersects[0].object);
        if (clickedHotspot) {
            showExhibit(clickedHotspot.exhibitData);
        }
        else {
            console.warn("Clicked on an exhibit hotspot but no data found.");
        }
    }

    //for the videos 
    // Check for picture hotspots
    const pictureIntersects = raycaster.intersectObjects(scene.children.filter(obj => obj.userData.isPicture));
    if (pictureIntersects.length > 0) {
        const clickedPicture = pictureIntersects[0].object;
        showYouTubeVideo(clickedPicture.userData.videoId, clickedPicture.userData.title, clickedPicture.userData.description);

        if( clickedPicture) {
            console.log("Clicked on a picture hotspot:", clickedPicture.userData.title);
        }

        else {
            console.warn("Clicked on a picture hotspot but no data found.");
    }
    
    }
}

// Replace click event with pointerup for better mobile support
canvas.addEventListener('pointerup', onMouseClick, false);

window.addEventListener('click', onMouseClick, false);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function showYouTubeVideo(videoId, title, description) {
    // Create or show video container
    let videoContainer = document.getElementById('video-container');
    
    if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.id = 'video-container';
        videoContainer.style.position = 'fixed';
        videoContainer.style.top = '0';
        videoContainer.style.left = '0';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        videoContainer.style.backgroundColor = 'rgba(0,0,0,0.9)';
        videoContainer.style.zIndex = '1000';
        videoContainer.style.display = 'flex';
        videoContainer.style.flexDirection = 'column';
        videoContainer.style.justifyContent = 'center';
        videoContainer.style.alignItems = 'center';
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.zIndex = '1001';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(videoContainer);
        });
        videoContainer.appendChild(closeButton);
        
        // Video info
        const infoDiv = document.createElement('div');
        infoDiv.style.color = 'white';
        infoDiv.style.textAlign = 'center';
        infoDiv.style.marginBottom = '20px';
        infoDiv.style.maxWidth = '800px';
        
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        infoDiv.appendChild(titleElement);
        
        const descElement = document.createElement('p');
        descElement.textContent = description;
        infoDiv.appendChild(descElement);
        
        videoContainer.appendChild(infoDiv);
        
        // YouTube iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'youtube-iframe';
        iframe.style.border = 'none';
        iframe.style.width = '80%';
        iframe.style.height = '60%';
        iframe.style.maxWidth = '1200px';
        iframe.allowFullscreen = true;
        videoContainer.appendChild(iframe);
        
        document.body.appendChild(videoContainer);
    } else {
        videoContainer.style.display = 'flex';
    }
    
    // Set the video source
    const iframe = document.getElementById('youtube-iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    
    // Update title and description
    const titleElement = videoContainer.querySelector('h2');
    const descElement = videoContainer.querySelector('p');
    titleElement.textContent = title;
    descElement.textContent = description;
}


function createHomeButton() {
    const homeButton = document.createElement('div');
    homeButton.id = 'home-button';
    homeButton.innerHTML = 'Home';
    homeButton.title = 'Return to homepage';
    
    homeButton.addEventListener('click', () => {
        window.location.href = 'https://pearlrhythmfoundation.org/category/art-archive/';
    });
    
    document.body.appendChild(homeButton);
}

function updateLoadingProgress(progress) {
    const percentage = Math.round(progress * 100);
    document.getElementById('loading-percentage').textContent = percentage;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;

    if (percentage >= 100) {
        setTimeout(() => {
            document.querySelector('.loading-screen').classList.add('fade-out');
        }, 500);
    }
}

// loading manager for better progress tracking
const loadingManager = new THREE.LoadingManager(
    () => {
        // When all assets are loaded
        updateLoadingProgress(1);
    },
    (item, loaded, total) => {
        // Progress update
        updateLoadingProgress(loaded / total);
    }
);

// Load HDR
new RGBELoader()
    .setPath('https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/')
    .load('environment.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
                        
        const loader = new GLTFLoader(loadingManager);
        loader.load('https://storage.googleapis.com/pearl-artifacts-cdn/museum_model/museum_test_1blend.gltf', (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            model.scale.set(2, 2, 2);
            scene.add(model);

            createExhibitHotspots();
            createPictureHotspots();
            
            // Setup controls after everything is loaded
            setupMouseLock();
            setupKeyboardControls();
            initControls();

             },
    undefined, // Progress callback
    (error) => {
        console.error('Error loading museum model:', error);

        });
    });

    //instruction button
function createInstructionButton() {
    const instructionButton = document.createElement('div');
    instructionButton.id = 'instruction-button';
    instructionButton.innerHTML = 'How to Navigate';
    instructionButton.title = 'Show instructions';
    
    // Create instruction content (previously in the popup)
    const instructionContent = document.createElement('div');
    instructionContent.id = 'instruction-content';
    instructionContent.style.display = 'none';
    instructionContent.style.position = 'fixed';
    instructionContent.style.top = '50%';
    instructionContent.style.left = '50%';
    instructionContent.style.transform = 'translate(-50%, -50%)';
    instructionContent.style.backgroundColor = 'rgba(0,0,0,0.8)';
    instructionContent.style.color = 'white';
    instructionContent.style.padding = '20px';
    instructionContent.style.borderRadius = '10px';
    instructionContent.style.zIndex = '1001';
    instructionContent.style.maxWidth = '80%';
    instructionContent.style.maxHeight = '80%';
    instructionContent.style.overflow = 'auto';
    
    instructionContent.innerHTML = `
        <h2>Welcome to the Pearl Rhythm Virtual Museum! Here's how to navigate:</h2>
            <p>With desktop: Use the following keys to navigate:</p>
            <ul>
                <li><strong>W</strong>: Move forward</li>
                <li><strong>S</strong>: Move backward</li>
                <li><strong>A</strong>: Move left</li>
                <li><strong>D</strong>: Move right</li>
                <li><strong>Q</strong>: Move up</li>
                <li><strong>E</strong>: Move down</li>
                <li><strong>Mouse</strong>: Look around</li>
                <li><strong>Esc</strong>: To return the cursor</li>
                <li><strong>Click on the artifacts and pictures to reveal details</strong></li>
            </ul>
        
        <button id="close-instructions" style="margin-top: 15px; padding: 8px 16px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">Got it!</button>
    `;
    
    document.body.appendChild(instructionContent);
    
    // Toggle instructions when button is clicked
    instructionButton.addEventListener('click', () => {
        if (instructionContent.style.display === 'none') {
            
            instructionContent.style.display = 'block';
            }
    });
    
    // Close instructions when button is clicked
    document.getElementById('instruction-content')?.addEventListener('click', (e) => {
        if (e.target.id === 'close-instructions') {
             e.stopPropagation();
            instructionContent.style.display = 'none';
        }
        
    });
    
    document.body.appendChild(instructionButton);
}


document.addEventListener('DOMContentLoaded', function() {
    createHomeButton();
    createInstructionButton(); 
});

renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio)); // Cap pixel ratio

let clock = new THREE.Clock();
let delta = 0;

const animate = () => {
    delta = clock.getDelta();
    
    // Update movement if mouse is locked (in first-person mode)
    if (isMouseLocked) {
        updateMovement(delta);
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

document.addEventListener('DOMContentLoaded', function() {
    createHomeButton();
    createInstructionButton();
});