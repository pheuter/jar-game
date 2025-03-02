import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        score: 0,
        attempts: 10,
        round: 1,
        jars: [],
        maxJars: 20,
        maxAttempts: 10,
        highScore: localStorage.getItem('jarGameHighScore') || 0,
        playerControls: {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            canJump: true
        }
    };

    // DOM elements
    const scoreElement = document.getElementById('score');
    const attemptsElement = document.getElementById('attempts');
    const roundElement = document.getElementById('round');
    const sceneContainer = document.getElementById('3d-scene-container');
    const messageElement = document.getElementById('message');
    const nextRoundButton = document.getElementById('next-round');
    const roundCompleteModal = document.getElementById('round-complete-modal');
    const modalRoundElement = document.getElementById('modal-round');
    const modalScoreElement = document.getElementById('modal-score');
    const modalHighScoreElement = document.getElementById('modal-high-score');
    const controlsHintElement = document.getElementById('controls-hint');

    // Three.js variables
    let scene, camera, renderer, controls, raycaster, mouse, composer;
    let jarObjects = [];
    let isAnimating = false;
    let clock = new THREE.Clock();
    
    // Player variables
    let paddingtonModel;
    let paddingtonMixer;
    let paddingtonActions = {};
    let playerVelocity = new THREE.Vector3();
    let playerDirection = new THREE.Vector3();
    let playerPosition = new THREE.Vector3(0, 0, 15); // Starting position
    let cameraOffset = new THREE.Vector3(0, 15, 8); // More top-down view
    // We only have one control mode now - character with direct clicking
    
    // 3D Models and textures
    let jarModels = {
        jar: null,
        lid: null
    };
    
    // Materials for different jar contents
    const contentMaterials = {
        worms: new THREE.MeshStandardMaterial({ 
            color: 0x8B4513, 
            roughness: 0.7, 
            metalness: 0.2,
            emissive: 0x221100,
            emissiveIntensity: 0.2
        }),
        orangeMarmalade: new THREE.MeshStandardMaterial({ 
            color: 0xFFA500, 
            roughness: 0.4, 
            metalness: 0.1,
            emissive: 0xFF6B00,
            emissiveIntensity: 0.2
        }),
        lemonMarmalade: new THREE.MeshStandardMaterial({ 
            color: 0xFFD700, 
            roughness: 0.4, 
            metalness: 0.1,
            emissive: 0xFFB000,
            emissiveIntensity: 0.2
        }),
        specialMarmalade: new THREE.MeshStandardMaterial({ 
            color: 0xFF6B00, 
            roughness: 0.3, 
            metalness: 0.3,
            emissive: 0xFF4000,
            emissiveIntensity: 0.3
        })
    };
    
    // Glass material for jar body
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.5,
        envMapIntensity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
    
    // Lid material
    const lidMaterial = new THREE.MeshStandardMaterial({
        color: 0xCD1818,
        roughness: 0.5,
        metalness: 0.6,
        envMapIntensity: 0.8
    });

    // Audio context for all sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Play sound function using Web Audio API
    function playSound(type) {
        // Make sure to initialize audio context on user interaction
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        switch(type) {
            case 'openJar':
                playClickSound();
                break;
            case 'goodResult':
                playGoodSound();
                break;
            case 'badResult':
                playBadSound();
                break;
            case 'roundComplete':
                playCompleteSound();
                break;
        }
    }
    
    // Click/open jar sound
    function playClickSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // Good result sound (finding marmalade)
    function playGoodSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // Bad result sound (finding worms)
    function playBadSound() {
        // Create oscillators for the buzzing effect
        const oscillator1 = audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.value = 220;
        
        const oscillator2 = audioContext.createOscillator();
        oscillator2.type = 'square';
        oscillator2.frequency.value = 180;
        
        // Create gain nodes
        const gain1 = audioContext.createGain();
        gain1.gain.value = 0.15;
        
        const gain2 = audioContext.createGain();
        gain2.gain.value = 0.05;
        
        const mainGain = audioContext.createGain();
        mainGain.gain.value = 0.2;
        
        // Connect oscillators through gains
        oscillator1.connect(gain1);
        oscillator2.connect(gain2);
        
        gain1.connect(mainGain);
        gain2.connect(mainGain);
        mainGain.connect(audioContext.destination);
        
        // Start the oscillators
        oscillator1.start();
        oscillator2.start();
        
        // Set up envelope
        mainGain.gain.setValueAtTime(0, audioContext.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        mainGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        // Stop the oscillators after 0.5 seconds
        setTimeout(() => {
            oscillator1.stop();
            oscillator2.stop();
        }, 500);
    }
    
    // Round complete sound
    function playCompleteSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'triangle';
        
        // Play a little fanfare
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6);
    }

    // Jar contents and their scores
    const jarContents = [
        { type: 'worms', score: -5, color: '#8B4513', emoji: '🪱', message: 'Oh no! Worms! Paddington won\'t like these!', material: contentMaterials.worms },
        { type: 'orange-marmalade', score: 5, color: '#FFA500', emoji: '🍊', message: 'Paddington\'s favorite orange marmalade!', material: contentMaterials.orangeMarmalade },
        { type: 'lemon-marmalade', score: 3, color: '#FFD700', emoji: '🍋', message: 'Tasty lemon marmalade for Paddington!', material: contentMaterials.lemonMarmalade },
        { type: 'special-marmalade', score: 10, color: '#FF6B00', emoji: '🥪', message: 'A marmalade sandwich! Paddington\'s favorite!', material: contentMaterials.specialMarmalade }
    ];

    // Initialize the game
    init3DScene();
    initGame();
    loadPaddingtonModel();

    // Event listeners
    nextRoundButton.addEventListener('click', startNextRound);
    window.addEventListener('resize', onWindowResize);
    
    // Set up keyboard controls
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // Initial resize to ensure proper fullscreen
    onWindowResize();

    // Initialize Three.js scene
    function init3DScene() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF0F8FF);
        
        // Add fog for depth
        scene.fog = new THREE.FogExp2(0xF0F8FF, 0.03);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.copy(playerPosition).add(cameraOffset);
        camera.lookAt(playerPosition);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        sceneContainer.appendChild(renderer.domElement);
        
        // Setup post-processing
        setupPostProcessing();
        
        // Initialize raycaster for interaction
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        
        // Add lighting
        addLights();
        
        // Add environment
        createEnvironment();
        
        // Create jar models
        createJarModels();
        
        // Start animation loop
        animate();
    }
    
    function setupPostProcessing() {
        // Create composer
        composer = new EffectComposer(renderer);
        
        // Add render pass
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        // Add bloom pass for glow effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(sceneContainer.clientWidth, sceneContainer.clientHeight),
            0.3,    // strength
            0.2,    // radius
            0.7     // threshold
        );
        composer.addPass(bloomPass);
    }
    
    function addLights() {
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xFFFFDD, 1);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        
        // Adjust shadow properties for better quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.001;
        
        scene.add(directionalLight);
        
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xCCE0FF, 0.6);
        scene.add(ambientLight);
        
        // Add some colored rim lights for atmosphere
        const blueLight = new THREE.PointLight(0x0051A8, 0.8, 50);
        blueLight.position.set(-15, 8, -15);
        scene.add(blueLight);
        
        const orangeLight = new THREE.PointLight(0xFF9000, 0.6, 40);
        orangeLight.position.set(15, 5, -10);
        scene.add(orangeLight);
    }
    
    // Function to load Paddington character model
    function loadPaddingtonModel() {
        // For our demo, we'll create a simple Paddington model using primitives
        // In a real game, you would load a proper GLTF model using GLTFLoader
        
        // Create Paddington group
        paddingtonModel = new THREE.Group();
        
        // Body (blue coat)
        const bodyGeometry = new THREE.CylinderGeometry(0.8, 1, 2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0051A8, // Blue
            roughness: 0.5,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5;
        body.castShadow = true;
        
        // Head (brown fur)
        const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x784421, // Brown
            roughness: 0.9,
            metalness: 0.0
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 3;
        head.castShadow = true;
        
        // Hat (red)
        const hatGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.5, 16);
        const hatMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCD1818, // Red
            roughness: 0.3,
            metalness: 0.2
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 3.7;
        hat.castShadow = true;
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const eyePupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        leftEye.position.set(-0.35, 3.1, 0.6);
        leftEye.scale.z = 0.5;
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        rightEye.position.set(0.35, 3.1, 0.6);
        rightEye.scale.z = 0.5;
        
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyePupilMaterial);
        leftPupil.position.set(-0.35, 3.1, 0.7);
        
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyePupilMaterial);
        rightPupil.position.set(0.35, 3.1, 0.7);
        
        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.18, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 2.9, 0.7);
        nose.scale.z = 0.5;
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-1, 1.8, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(1, 1.8, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x241B17, // Dark brown
            roughness: 0.7,
            metalness: 0.0
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.4, 0.5, 0);
        leftLeg.castShadow = true;
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.4, 0.5, 0);
        rightLeg.castShadow = true;
        
        // Add all parts to the group
        paddingtonModel.add(body, head, hat, leftEye, rightEye, leftPupil, rightPupil, nose, leftArm, rightArm, leftLeg, rightLeg);
        
        // Position at starting point
        paddingtonModel.position.set(playerPosition.x, 0, playerPosition.z);
        paddingtonModel.castShadow = true;
        scene.add(paddingtonModel);
        
        // Create mixer for animations
        paddingtonMixer = new THREE.AnimationMixer(paddingtonModel);
        
        // Create animations programmatically
        createPaddingtonAnimations();
    }
    
    function createPaddingtonAnimations() {
        // For a real game, you would load animations from your GLTF model
        // Here we're creating simple procedural animations
        
        // Create a simple bobbing idle animation
        const idleKF = new THREE.KeyframeTrack(
            '.position[y]', 
            [0, 0.5, 1], 
            [0, 0.1, 0]
        );
        
        const idleClip = new THREE.AnimationClip('idle', 1, [idleKF]);
        paddingtonActions.idle = paddingtonMixer.clipAction(idleClip);
        paddingtonActions.idle.play();
        
        // Name references for animation
        const leftLeg = paddingtonModel.children[10];
        const rightLeg = paddingtonModel.children[11];
        const leftArm = paddingtonModel.children[8];
        const rightArm = paddingtonModel.children[9];
        
        leftLeg.name = "leftLeg";
        rightLeg.name = "rightLeg";
        leftArm.name = "leftArm";
        rightArm.name = "rightArm";
        
        // Create a walking animation (moving legs)
        const leftLegKF = new THREE.KeyframeTrack(
            'leftLeg.rotation[x]', 
            [0, 0.25, 0.5, 0.75, 1], 
            [0, Math.PI/6, 0, -Math.PI/6, 0]
        );
        
        const rightLegKF = new THREE.KeyframeTrack(
            'rightLeg.rotation[x]', 
            [0, 0.25, 0.5, 0.75, 1], 
            [0, -Math.PI/6, 0, Math.PI/6, 0]
        );
        
        const leftArmKF = new THREE.KeyframeTrack(
            'leftArm.rotation[x]', 
            [0, 0.25, 0.5, 0.75, 1], 
            [0, -Math.PI/12, 0, Math.PI/12, 0]
        );
        
        const rightArmKF = new THREE.KeyframeTrack(
            'rightArm.rotation[x]', 
            [0, 0.25, 0.5, 0.75, 1], 
            [0, Math.PI/12, 0, -Math.PI/12, 0]
        );
        
        const walkClip = new THREE.AnimationClip('walk', 1, [leftLegKF, rightLegKF, leftArmKF, rightArmKF]);
        paddingtonActions.walk = paddingtonMixer.clipAction(walkClip);
        paddingtonActions.walk.setEffectiveWeight(0);
        paddingtonActions.walk.play();
        
        // Create a happy animation (moving arms up)
        const leftArmHappyKF = new THREE.KeyframeTrack(
            'leftArm.rotation[z]', 
            [0, 0.2, 0.5, 0.8, 1], 
            [Math.PI/6, Math.PI/4, Math.PI/3, Math.PI/4, Math.PI/6]
        );
        
        const rightArmHappyKF = new THREE.KeyframeTrack(
            'rightArm.rotation[z]', 
            [0, 0.2, 0.5, 0.8, 1], 
            [-Math.PI/6, -Math.PI/4, -Math.PI/3, -Math.PI/4, -Math.PI/6]
        );
        
        const jumpKF = new THREE.KeyframeTrack(
            '.position[y]', 
            [0, 0.3, 0.5, 0.7, 1], 
            [0, 0.4, 0.5, 0.3, 0]
        );
        
        const happyClip = new THREE.AnimationClip('happy', 1, [leftArmHappyKF, rightArmHappyKF, jumpKF]);
        paddingtonActions.happy = paddingtonMixer.clipAction(happyClip);
        paddingtonActions.happy.setLoop(THREE.LoopOnce);
        paddingtonActions.happy.clampWhenFinished = true;
    }

    function createEnvironment() {
        // Create floor
        const floorGeometry = new THREE.CircleGeometry(30, 32);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE6F2FF,
            roughness: 0.8,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Add decorative elements
        
        // Paddington's hat
        const hatGeometry = new THREE.CylinderGeometry(3, 4, 2, 32);
        const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xCD1818 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(-15, 1, -15);
        hat.castShadow = true;
        hat.receiveShadow = true;
        scene.add(hat);
        
        // Hat brim
        const brimGeometry = new THREE.CylinderGeometry(5, 5, 0.3, 32);
        const brim = new THREE.Mesh(brimGeometry, hatMaterial);
        brim.position.set(-15, 0, -15);
        brim.castShadow = true;
        brim.receiveShadow = true;
        scene.add(brim);
        
        // Hat band
        const bandGeometry = new THREE.CylinderGeometry(3.05, 3.05, 0.4, 32);
        const bandMaterial = new THREE.MeshStandardMaterial({ color: 0x0051A8 });
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.position.set(-15, 1.5, -15);
        scene.add(band);
        
        // Add a few marmalade sandwiches scattered around
        const sandwichGeometry = new THREE.BoxGeometry(2, 0.5, 2);
        const sandwichMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFDD99,
            roughness: 0.9 
        });
        
        const sandwichPositions = [
            { x: 12, y: 0.25, z: -12 },
            { x: -10, y: 0.25, z: 10 },
            { x: 8, y: 0.25, z: 15 }
        ];
        
        sandwichPositions.forEach(pos => {
            const sandwich = new THREE.Mesh(sandwichGeometry, sandwichMaterial);
            sandwich.position.set(pos.x, pos.y, pos.z);
            sandwich.rotation.y = Math.random() * Math.PI * 2;
            sandwich.castShadow = true;
            sandwich.receiveShadow = true;
            scene.add(sandwich);
            
            // Add marmalade layer
            const marmaladeGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.5);
            const marmaladeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xFFA500,
                roughness: 0.4,
                emissive: 0xFF6B00,
                emissiveIntensity: 0.2
            });
            const marmalade = new THREE.Mesh(marmaladeGeometry, marmaladeMaterial);
            marmalade.position.set(pos.x, pos.y + 0.3, pos.z);
            marmalade.rotation.y = sandwich.rotation.y;
            scene.add(marmalade);
        });
    }
    
    function createJarModels() {
        // Create base jar geometry - smaller jars for better scale with character
        const jarGeometry = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 32);
        
        // Create lid geometry
        const lidGeometry = new THREE.CylinderGeometry(1.3, 1.3, 0.5, 32);
        
        // Store models
        jarModels.jar = jarGeometry;
        jarModels.lid = lidGeometry;
    }
    
    function onWindowResize() {
        // Update camera
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer and composer
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Click interaction removed - we only use proximity-based interaction now
    
    // Check if Paddington is close to any jars and automatically interact with them
    function checkJarInteraction() {
        if (!paddingtonModel || isAnimating) return;
        
        // Find closest unopened jar
        let closestJar = null;
        let closestDistance = 2; // Very close interaction distance - must be right next to jar
        
        jarObjects.forEach(jar => {
            if (!jar.userData.jarData.opened) {
                const distance = paddingtonModel.position.distanceTo(jar.position);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestJar = jar;
                }
            }
        });
        
        // If we found a jar in range, highlight it and automatically open it
        jarObjects.forEach(jar => {
            if (jar === closestJar) {
                // Highlight jar
                jar.traverse(child => {
                    if (child.isMesh) {
                        child.material.emissiveIntensity = 0.5;
                    }
                });
                
                // Make Paddington face the jar
                const angle = Math.atan2(
                    jar.position.x - paddingtonModel.position.x,
                    jar.position.z - paddingtonModel.position.z
                );
                paddingtonModel.rotation.y = angle;
                
                // Open the jar automatically after a small delay (to give time to see highlight)
                if (!jar.userData.interactionTimer) {
                    jar.userData.interactionTimer = setTimeout(() => {
                        // Open the jar
                        openJar(jar.userData.jarData.id);
                        
                        // Clear the timer
                        jar.userData.interactionTimer = null;
                        
                        // Play happy animation
                        if (paddingtonActions.happy) {
                            paddingtonActions.happy.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
                            setTimeout(() => {
                                paddingtonActions.happy.fadeOut(0.5);
                            }, 1000);
                        }
                    }, 300); // Short delay for better user experience
                }
            } else {
                // Reset other jars
                jar.traverse(child => {
                    if (child.isMesh && child.material.emissiveIntensity > 0.2) {
                        child.material.emissiveIntensity = 0.2;
                    }
                });
                
                // Clear timer if we move away
                if (jar.userData.interactionTimer) {
                    clearTimeout(jar.userData.interactionTimer);
                    jar.userData.interactionTimer = null;
                }
            }
        });
    }
    
    // Mouse hover interaction removed - we only use proximity-based interaction now
    
    // Create interactive jar label for nearby jars 
    function updateJarLabels() {
        // Hide all existing labels first
        document.querySelectorAll('.jar-label-3d').forEach(label => {
            label.classList.remove('visible');
        });
        
        // Find the closest jar
        if (!paddingtonModel) return;
        
        let closestJar = null;
        let closestDistance = 4; // Show label from slightly further away than interaction
        
        jarObjects.forEach(jar => {
            if (!jar.userData.jarData.opened) {
                const distance = paddingtonModel.position.distanceTo(jar.position);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestJar = jar;
                }
            }
        });
        
        // Show label for closest unopened jar
        if (closestJar) {
            // Get or create label
            let label = document.getElementById(`jar-label-${closestJar.userData.jarData.id}`);
            
            if (!label) {
                label = document.createElement('div');
                label.id = `jar-label-${closestJar.userData.jarData.id}`;
                label.className = 'jar-label-3d';
                label.textContent = 'Walk closer to open';
                sceneContainer.appendChild(label);
            }
            
            // Position label
            const vector = new THREE.Vector3();
            vector.setFromMatrixPosition(closestJar.matrixWorld);
            vector.project(camera);
            
            const x = (vector.x * 0.5 + 0.5) * sceneContainer.clientWidth;
            const y = (vector.y * -0.5 + 0.5) * sceneContainer.clientHeight;
            
            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
            label.classList.add('visible');
            
            // If very close, change the label text
            if (closestDistance < 2.5) {
                label.textContent = 'Getting closer...';
            }
            
            if (closestDistance < 2) {
                label.textContent = 'Opening jar...';
            }
        }
    }
    
    // Keyboard controls for Paddington movement
    function onKeyDown(event) {
        if (event.repeat) return;
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                gameState.playerControls.moveForward = true;
                break;
                
            case 'ArrowDown':
            case 'KeyS':
                gameState.playerControls.moveBackward = true;
                break;
                
            case 'ArrowLeft':
            case 'KeyA':
                gameState.playerControls.moveLeft = true;
                break;
                
            case 'ArrowRight':
            case 'KeyD':
                gameState.playerControls.moveRight = true;
                break;
        }
    }
    
    function onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                gameState.playerControls.moveForward = false;
                break;
                
            case 'ArrowDown':
            case 'KeyS':
                gameState.playerControls.moveBackward = false;
                break;
                
            case 'ArrowLeft':
            case 'KeyA':
                gameState.playerControls.moveLeft = false;
                break;
                
            case 'ArrowRight':
            case 'KeyD':
                gameState.playerControls.moveRight = false;
                break;
        }
    }
    
    // Control mode functions removed - we only have one mode now
    
    function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Update character animations and movement
        if (paddingtonMixer) {
            paddingtonMixer.update(delta);
            updatePlayerMovement(delta);
        }
        
        // Update any animations
        animateJars();
        
        // Update jar labels based on proximity
        updateJarLabels();
        
        // Render using post-processing composer
        composer.render();
    }
    
    function updatePlayerMovement(delta) {
        // Calculate movement direction - based on camera's perspective for more intuitive controls
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        cameraForward.y = 0; // Keep movement on ground plane
        cameraForward.normalize();
        
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        cameraRight.y = 0; // Keep movement on ground plane
        cameraRight.normalize();
        
        // Reset direction
        playerDirection.set(0, 0, 0);
        
        // Add each movement component based on player input
        if (gameState.playerControls.moveForward) {
            playerDirection.add(cameraForward);
        }
        if (gameState.playerControls.moveBackward) {
            playerDirection.sub(cameraForward);
        }
        if (gameState.playerControls.moveRight) {
            playerDirection.add(cameraRight);
        }
        if (gameState.playerControls.moveLeft) {
            playerDirection.sub(cameraRight);
        }
        
        // Normalize if we have any movement
        if (playerDirection.lengthSq() > 0) {
            playerDirection.normalize();
        }
        
        // Set animation state based on movement
        const isMoving = playerDirection.lengthSq() > 0;
        if (isMoving) {
            if (paddingtonActions.idle) paddingtonActions.idle.weight = 0;
            if (paddingtonActions.walk) paddingtonActions.walk.weight = 1;
        } else {
            if (paddingtonActions.idle) paddingtonActions.idle.weight = 1;
            if (paddingtonActions.walk) paddingtonActions.walk.weight = 0;
        }
        
        // Apply movement to velocity - increased speed for better gameplay
        const moveSpeed = 10;
        if (isMoving) {
            playerVelocity.x = playerDirection.x * moveSpeed * delta;
            playerVelocity.z = playerDirection.z * moveSpeed * delta;
            
            // Rotate character to face movement direction
            if (paddingtonModel) {
                const angle = Math.atan2(playerDirection.x, playerDirection.z);
                paddingtonModel.rotation.y = angle;
            }
        } else {
            // Apply friction to slow down
            playerVelocity.x *= 0.9;
            playerVelocity.z *= 0.9;
        }
        
        // Move the character
        if (paddingtonModel) {
            paddingtonModel.position.x += playerVelocity.x;
            paddingtonModel.position.z += playerVelocity.z;
            
            // Constrain movement to floor area
            const floorRadius = 28;
            const distanceFromCenter = Math.sqrt(
                paddingtonModel.position.x * paddingtonModel.position.x + 
                paddingtonModel.position.z * paddingtonModel.position.z
            );
            
            if (distanceFromCenter > floorRadius) {
                const ratio = floorRadius / distanceFromCenter;
                paddingtonModel.position.x *= ratio;
                paddingtonModel.position.z *= ratio;
            }
            
            // Update camera to follow character
            playerPosition.copy(paddingtonModel.position);
            camera.position.copy(playerPosition).add(cameraOffset);
            camera.lookAt(playerPosition);
            
            // Check for jar interaction
            checkJarInteraction();
        }
    }
    
    function animateJars() {
        // Animate jars with subtle floating movement
        const time = Date.now() * 0.001;
        
        jarObjects.forEach(jar => {
            // Only animate unopened jars
            if (!jar.userData.jarData.opened) {
                // Create subtle bobbing movement
                jar.position.y = jar.userData.baseY + Math.sin(time + jar.userData.offset) * 0.2;
                
                // Create subtle rotation
                jar.rotation.y = Math.sin(time * 0.5 + jar.userData.offset) * 0.1;
            }
        });
    }

    // Functions
    function initGame() {
        generateJars();
        updateUI();
        animateTitle();
    }

    function animateTitle() {
        const title = document.querySelector('h1');
        title.innerHTML = title.textContent.split('').map(char => 
            char === ' ' ? ' ' : `<span class="letter">${char}</span>`
        ).join('');
        
        document.querySelectorAll('.letter').forEach((letter, index) => {
            letter.style.animationDelay = `${index * 0.1}s`;
            letter.classList.add('animate-in');
        });
    }

    function generateJars() {
        // Clear jars array
        gameState.jars = [];
        
        // Clear 3D jar objects
        clearJars3D();
        
        // Generate random distribution for current round
        const distribution = generateDistribution(gameState.round);
        
        // Create jars based on distribution
        for (let i = 0; i < gameState.maxJars; i++) {
            let contentType;
            if (i < distribution.worms) {
                contentType = jarContents[0]; // Worms
            } else if (i < distribution.worms + distribution.orangeMarmalade) {
                contentType = jarContents[1]; // Orange marmalade
            } else if (i < distribution.worms + distribution.orangeMarmalade + distribution.lemonMarmalade) {
                contentType = jarContents[2]; // Lemon marmalade
            } else {
                contentType = jarContents[3]; // Special marmalade sandwich
            }
            
            gameState.jars.push({
                id: i,
                opened: false,
                content: contentType
            });
        }
        
        // Shuffle jars
        shuffleArray(gameState.jars);
        
        // Render 3D jars
        renderJars3D();
    }

    function generateDistribution(round) {
        // Different distributions for each round
        let worms, orangeMarmalade, lemonMarmalade, specialMarmalade;
        
        switch (round) {
            case 1: // Balanced - Paddington's first adventure
                worms = 7;
                orangeMarmalade = 7;
                lemonMarmalade = 5;
                specialMarmalade = 1;
                break;
            case 2: // More worms - Paddington at the garden
                worms = 10;
                orangeMarmalade = 5;
                lemonMarmalade = 4;
                specialMarmalade = 1;
                break;
            case 3: // More orange marmalade - Paddington visits the pantry
                worms = 5;
                orangeMarmalade = 9;
                lemonMarmalade = 5;
                specialMarmalade = 1;
                break;
            case 4: // More lemon marmalade - Paddington's tea time
                worms = 5;
                orangeMarmalade = 5;
                lemonMarmalade = 8;
                specialMarmalade = 2;
                break;
            case 5: // Very risky - Paddington's adventure in the garden shed
                worms = 14;
                orangeMarmalade = 3;
                lemonMarmalade = 2;
                specialMarmalade = 1;
                break;
            default: // Random distribution for rounds beyond 5 - Paddington explores the world
                const total = gameState.maxJars;
                worms = Math.floor(Math.random() * (total - 4)) + 1; // At least 1 worm
                let remaining = total - worms;
                orangeMarmalade = Math.floor(Math.random() * (remaining - 3)) + 1; // At least 1 orange
                remaining -= orangeMarmalade;
                lemonMarmalade = Math.floor(Math.random() * (remaining - 2)) + 1; // At least 1 lemon
                specialMarmalade = total - worms - orangeMarmalade - lemonMarmalade; // The rest are special
                break;
        }
        
        return { worms, orangeMarmalade, lemonMarmalade, specialMarmalade };
    }

    function clearJars3D() {
        // Remove existing jars from the scene
        jarObjects.forEach(jar => {
            scene.remove(jar);
        });
        
        // Clear array
        jarObjects = [];
        
        // Remove any labels
        document.querySelectorAll('.jar-label-3d').forEach(label => {
            label.remove();
        });
    }

    function renderJars3D() {
        // Calculate grid layout - more spread out for better movement
        const rows = 4;
        const cols = 5;
        const spacing = 8;  // Increased spacing
        const startX = -(cols - 1) * spacing / 2;
        const startZ = -(rows - 1) * spacing / 2;
        
        // Create 3D jars
        gameState.jars.forEach((jar, index) => {
            // Calculate position in grid
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            const x = startX + col * spacing;
            const z = startZ + row * spacing;
            
            // Create jar 3D object
            const jar3D = createJar3D(jar);
            
            // Position jar - lower height for smaller jars
            jar3D.position.set(x, 1.25, z);
            jar3D.userData.baseY = 1.25;
            jar3D.userData.offset = Math.random() * Math.PI * 2; // Random offset for animation
            
            // Add to scene
            scene.add(jar3D);
            jarObjects.push(jar3D);
            
            // Add entrance animation
            jar3D.scale.set(0.01, 0.01, 0.01);
            jar3D.userData.targetScale = 1;
            
            // Animate jar appearance with delay based on index
            setTimeout(() => {
                const duration = 0.7;
                const startTime = Date.now();
                
                function animateEntrance() {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Ease out cubic
                    const scale = 0.01 + (jar3D.userData.targetScale - 0.01) * 
                                  (1 - Math.pow(1 - progress, 3));
                    
                    jar3D.scale.set(scale, scale, scale);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateEntrance);
                    }
                }
                
                animateEntrance();
            }, index * 70); // Staggered animation
        });
    }

    function createJar3D(jarData) {
        // Create jar body
        const jarBody = new THREE.Mesh(jarModels.jar, glassMaterial.clone());
        jarBody.castShadow = true;
        jarBody.receiveShadow = true;
        
        // Create jar lid
        const jarLid = new THREE.Mesh(jarModels.lid, lidMaterial.clone());
        jarLid.position.y = 1.5; // Adjusted for smaller jar
        jarLid.castShadow = true;
        jarLid.userData.isLid = true;
        
        // Create content (not visible initially)
        const contentGeometry = new THREE.CylinderGeometry(1.0, 1.0, 2, 32);
        const content = new THREE.Mesh(contentGeometry, jarData.content.material);
        content.position.y = 0;
        content.visible = false;
        content.userData.isContent = true;
        
        // Create jar group
        const jarGroup = new THREE.Group();
        jarGroup.add(jarBody);
        jarGroup.add(jarLid);
        jarGroup.add(content);
        
        // Store reference to jar data
        jarGroup.userData.jarData = jarData;
        jarBody.userData.jarData = jarData;
        jarLid.userData.jarData = jarData;
        content.userData.jarData = jarData;
        
        return jarGroup;
    }

    function openJar(jarId) {
        // Check if we still have attempts
        if (gameState.attempts <= 0) return;
        
        // Find the jar
        const jar = gameState.jars.find(j => j.id === jarId);
        
        // Update jar state
        jar.opened = true;
        
        // Play sound
        playSound('openJar');
        
        // Find 3D jar object
        const jar3D = jarObjects.find(obj => obj.userData.jarData.id === jarId);
        
        if (!jar3D) return;
        
        // Set animating flag
        isAnimating = true;
        
        // Animate lid opening
        const lid = jar3D.children.find(child => child.userData.isLid);
        const content = jar3D.children.find(child => child.userData.isContent);
        
        if (lid && content) {
            // Store initial lid position
            const initialLidY = lid.position.y;
            
            // Animation values
            const duration = 0.8;
            const startTime = Date.now();
            
            function animateLid() {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                
                // Animate lid floating up and rotating
                const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                // Move up - adjusted for smaller jars
                lid.position.y = initialLidY + easedProgress * 2;
                
                // Rotate
                lid.rotation.x = easedProgress * Math.PI * 0.5;
                
                // Fade out - use opacity only if material supports it
                if (lid.material.transparent) {
                    lid.material.opacity = 1 - easedProgress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateLid);
                } else {
                    // Show content
                    content.visible = true;
                    
                    // Reset animating flag
                    isAnimating = false;
                    
                    // Update game state and UI
                    gameState.score += jar.content.score;
                    gameState.attempts--;
                    updateUI();
                    
                    // Show message based on content
                    const emoji = jar.content.score > 0 ? '✨' : '😖';
                    const scoreChange = jar.content.score > 0 ? `+${jar.content.score}` : `${jar.content.score}`;
                    showMessage(`${emoji} ${jar.content.message} ${scoreChange} points`);
                    
                    // Play appropriate sound
                    if (jar.content.score > 0) {
                        playSound('goodResult');
                    } else {
                        playSound('badResult');
                    }
                    
                    // Show 3D score popup
                    showScorePopup3D(jar3D.position, scoreChange, jar.content.score > 0);
                    
                    // Check if round is over
                    if (gameState.attempts === 0) {
                        endRound();
                    }
                }
            }
            
            // Start animation
            animateLid();
        }
    }

    function showScorePopup3D(position, scoreText, isPositive) {
        // Convert 3D position to screen coordinates
        const vector = new THREE.Vector3(position.x, position.y + 5, position.z);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * sceneContainer.clientWidth;
        const y = (vector.y * -0.5 + 0.5) * sceneContainer.clientHeight;
        
        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'score-popup-3d';
        popup.textContent = scoreText;
        popup.style.color = isPositive ? '#4CAF50' : '#F44336';
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        // Add to container
        sceneContainer.appendChild(popup);
        
        // Remove after animation
        setTimeout(() => {
            popup.remove();
        }, 1500);
    }

    function updateUI() {
        scoreElement.textContent = gameState.score;
        attemptsElement.textContent = gameState.attempts;
        roundElement.textContent = gameState.round;
        
        // Update high score if needed
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('jarGameHighScore', gameState.highScore);
        }
    }

    function showMessage(msg) {
        messageElement.innerHTML = msg;
        messageElement.style.display = 'block';
        
        // Add animation class
        messageElement.classList.remove('fade-in');
        void messageElement.offsetWidth; // Force reflow to restart animation
        messageElement.classList.add('fade-in');
    }

    function endRound() {
        playSound('roundComplete');
        
        // Check if it's a new high score
        const isHighScore = gameState.score > gameState.highScore - gameState.score;
        
        // Update modal content
        modalRoundElement.textContent = gameState.round;
        modalScoreElement.textContent = gameState.score;
        
        // Show/hide high score message
        if (isHighScore) {
            modalHighScoreElement.style.display = 'block';
        } else {
            modalHighScoreElement.style.display = 'none';
        }
        
        // Show brief message in the game area
        showMessage(`Paddington's Adventure #${gameState.round} complete!`);
        
        // Show the modal with animation
        setTimeout(() => {
            roundCompleteModal.classList.add('show');
        }, 1000);
        
        // Add confetti effect for high score
        if (isHighScore) {
            createConfetti();
        }
    }
    
    function createConfetti() {
        // Add 3D confetti particles
        const confettiColors = [
            0xFFD700, // Gold
            0xFF6B00, // Orange
            0x0051A8, // Blue
            0xCD1818, // Red
            0xFFFFFF  // White
        ];
        
        // Create confetti geometry
        const confettiGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        
        // Add confetti particles
        for (let i = 0; i < 100; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                side: THREE.DoubleSide
            });
            
            const confetti = new THREE.Mesh(confettiGeometry, material);
            
            // Random position above scene
            confetti.position.set(
                (Math.random() - 0.5) * 30,
                20,
                (Math.random() - 0.5) * 30
            );
            
            // Random rotation
            confetti.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Add physics properties
            confetti.userData.velocity = {
                x: (Math.random() - 0.5) * 0.2,
                y: -Math.random() * 0.1 - 0.05,
                z: (Math.random() - 0.5) * 0.2
            };
            
            confetti.userData.rotationVel = {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.01
            };
            
            // Add to scene
            scene.add(confetti);
            
            // Remove after animation
            setTimeout(() => {
                scene.remove(confetti);
                confetti.material.dispose();
                confetti.geometry.dispose();
            }, 5000);
        }
    }

    function startNextRound() {
        // Hide the modal with animation
        roundCompleteModal.classList.remove('show');
        
        // Increment round
        gameState.round++;
        
        // Reset attempts
        gameState.attempts = gameState.maxAttempts;
        
        // Generate new jars
        generateJars();
        
        // Update UI
        updateUI();
        
        // Clear message
        messageElement.innerHTML = '';
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});