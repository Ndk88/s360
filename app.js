import * as THREE from "three";
import { OrbitControls } from "../threejs/examples/jsm/controls/OrbitControls.js";
import { gsap } from "../gsap/gsap-core.js";
import { GLTFLoader } from "../threejs/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "../threejs/examples/jsm/loaders/DRACOLoader.js";

const screen = document.querySelector('#page-screen');

const mobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (mobile.Android() || mobile.BlackBerry() || mobile.iOS() || mobile.Opera() || mobile.Windows());
    }
	/*
	How to use
	if(mobile.any()) alert('Mobile');
	To check to see if the user is on a specific mobile device:
	if(mobile.iOS()) alert('iOS');
	*/
};

let fov = {
	default: 100,
	zoomIn: 55
};

let app = {
	scene: new THREE.Scene(),
	renderer: new THREE.WebGLRenderer({antialias: true}),
	camera: new THREE.PerspectiveCamera(fov.default, screen.offsetWidth / screen.offsetHeight, 0.1, 100),
	cameraControl: null,
	loadingManager: new THREE.LoadingManager(),
	geoSphereDay: null,
	geoSphereNight: null
};

let plArray = [];
let pv, INTERSECTED;
let interactive = {
	raycaster: new THREE.Raycaster(),
	pointer: new THREE.Vector2()
};

const mapLoader = new THREE.TextureLoader(app.loadingManager);
const dracoLoader = new DRACOLoader(app.loadingManager);
const gltfLoader = new GLTFLoader(app.loadingManager);
dracoLoader.setDecoderPath("./threejs/examples/jsm/libs/draco/gltf/");
gltfLoader.setDRACOLoader(dracoLoader);

function appInit() {
	// const screenLoad = document.createElement('div');
	// screen.appendChild(screenLoad);
	// screenLoad.id = 'screen-load';
	// screenLoad.textContent = 'sssssssssssssssssss'
	// screenLoad.style.position = 'absolute';
	// screenLoad.style.width = '40%';
	// screenLoad.style.width = '40%';
	// screenLoad.style.backgroundColor = 'white';

	function sceneInit() {
		app.renderer.setAnimationLoop(render);
		app.renderer.setPixelRatio(window.devicePixelRatio);
		app.renderer.setSize(screen.offsetWidth, screen.offsetHeight);
		app.renderer.outputColorSpace = THREE.SRGBColorSpace;
		app.renderer.toneMapping = THREE.LinearToneMapping;
		app.renderer.toneMappingExposure = 1;
		/*
		THREE.NoToneMapping 
		THREE.LinearToneMapping 
		THREE.ReinhardToneMapping
		THREE.CineonToneMapping 
		THREE.ACESFilmicToneMapping
		THREE.AgXToneMapping
		THREE.NeutralToneMapping
		THREE.CustomToneMapping
		*/
		screen.appendChild(app.renderer.domElement);
		app.camera.position.set(0, 0, 0.001);
		app.cameraControl = new OrbitControls(app.camera, app.renderer.domElement);
		app.cameraControl.enableZoom = false;
		app.cameraControl.enablePan = false;
		app.cameraControl.enableDamping = true;
		app.cameraControl.rotateSpeed = - 0.25;
		app.cameraControl.touches = {
			ONE: THREE.TOUCH.ROTATE,
			// TWO: THREE.TOUCH.DOLLY_PAN
		};
		app.cameraControl.update();
	}; sceneInit();

	function loadEnvMap(path) {
		const pano = mapLoader.load(path, (map)=> {
			map.colorSpace = THREE.SRGBColorSpace;
			map.flipY = false;
			map.mapping = THREE.EquirectangularReflectionMapping;
			map.minFilter = map.magFilter = THREE.LinearFilter; // ?
		});
		return pano;
	};

	function loadMapByDevice() {
		if (mobile.any()) {
			// 2K Resolution for Mobile
			console.log('mobile mode');
			pv = {
				hargitaMainDay: loadEnvMap('./assets/2k_pano/hrg_main_day.jpg'),
				hargitaMainNight: loadEnvMap('./assets/2k_pano/hrg_main_night.jpg'),
			
				hargitaStairDay: loadEnvMap('./assets/2k_pano/hrg_stair_day.jpg'),
				hargitaStairNight: loadEnvMap('./assets/2k_pano/hrg_stair_night.jpg'),
			
				hargitaBathDay: loadEnvMap('./assets/2k_pano/hrg_bath_day.jpg'),
				hargitaBathNight: loadEnvMap('./assets/2k_pano/hrg_bath_night.jpg'),
			};

			app.cameraControl.rotateSpeed = 1;
			app.cameraControl.update();
		} else {
			// 8K Resolution for Desktop
			console.log('desktop mode');
			pv = {
				hargitaMainDay: loadEnvMap('./assets/8k_pano/hrg_main_day.jpg'),
				hargitaMainNight: loadEnvMap('./assets/8k_pano/hrg_main_night.jpg'),
			
				hargitaStairDay: loadEnvMap('./assets/8k_pano/hrg_stair_day.jpg'),
				hargitaStairNight: loadEnvMap('./assets/8k_pano/hrg_stair_night.jpg'),
			
				hargitaBathDay: loadEnvMap('./assets/8k_pano/hrg_bath_day.jpg'),
				hargitaBathNight: loadEnvMap('./assets/8k_pano/hrg_bath_night.jpg'),
			};

			app.cameraControl.rotateSpeed = - 0.25;
			app.cameraControl.update();
		};
	}; loadMapByDevice();

	function loadLocator() {
		gltfLoader.load('./assets/locator.gltf', function (gltf) {
			app.scene.add(gltf.scene);
			// Main Locator [0]
			gltf.scene.children[0].name = 'pl_main';
			gltf.scene.children[0].position.set(0, 0, 0);
			gltf.scene.children[0].material = new THREE.MeshBasicMaterial({
				color: 0xffffff,
				side: THREE.DoubleSide
			});
			// Stair Locator [1]
			const stairLocator = gltf.scene.children[0].clone();
			stairLocator.name = 'pl_stair';
			stairLocator.position.set(0.94, 0.77, -1.3);
			stairLocator.material = new THREE.MeshBasicMaterial({
				color: 0xffffff,
				side: THREE.DoubleSide
			});
			// Bath Locator [2]
			const bathLocator = gltf.scene.children[0].clone();
			bathLocator.name = 'pl_bath';
			bathLocator.position.set(0.13, -0.77, -2);
			bathLocator.material = new THREE.MeshBasicMaterial({
				color: 0xffffff,
				side: THREE.DoubleSide
			});
			gltf.scene.add(stairLocator, bathLocator);
			plArray.push(gltf.scene.children[0], stairLocator, bathLocator);
		});
	}; loadLocator();

	function geoEnv() {
		app.geoSphereDay = new THREE.Mesh(
			new THREE.SphereGeometry(50, 32, 32),
			new THREE.MeshBasicMaterial({
				depthTest: true,
				depthWrite: false,
				transparent: true,
				opacity: 1,
				side: THREE.BackSide,
				envMap: pv.hargitaMainDay
			})
		);
		app.scene.add(app.geoSphereDay);

		app.geoSphereNight = new THREE.Mesh(
			new THREE.SphereGeometry(50.01, 32, 32),
			new THREE.MeshBasicMaterial({
				wireframe: false,
				side: THREE.BackSide,
				envMap: pv.hargitaMainNight
			})
		);
		app.scene.add(app.geoSphereNight);
		
	}; geoEnv();

	function uiActions() {
		// Zoom Iin Out of Camera
		document.addEventListener("wheel", (e) => {
			if (e.deltaY > 0) {
				gsap.to(app.camera, {fov: fov.default, duration: 0.4, onUpdate: function upd(){
					app.camera.updateProjectionMatrix();
				}});
			};
			if (e.deltaY < 0) {
				gsap.to(app.camera, {fov: fov.zoomIn, duration: 0.4, onUpdate: function upd(){
					app.camera.updateProjectionMatrix();
				}});
			};
		});
		// Jumping to Point Views
		document.addEventListener('mousedown', (e)=> {
			if (e.button == 0 && INTERSECTED !== null) {
				switch (INTERSECTED.name) {
					case 'pl_main':
						//fadeIn exposure
						gsap.to(app.renderer, {toneMappingExposure: 0, duration: 0.7, onComplete: ()=> {
							app.geoSphereDay.material.envMap = pv.hargitaMainDay;
							app.geoSphereNight.material.envMap = pv.hargitaMainNight;
							// main locator
							plArray[0].visible = true;
							plArray[0].position.set(0, 100, 0);
							// stair locator
							plArray[1].visible = true;
							plArray[1].position.set(0.94, 0.77, -1.3);
							// bath locator
							plArray[2].visible = true;
							plArray[2].position.set(0.13, -0.77, -2);
							//correction camera position & fov
							app.camera.position.set(0, 0, 0.001);
							app.camera.fov = fov.default;
							app.camera.updateProjectionMatrix();
							//place name
							document.getElementById('house-place-text').textContent = '/ Living Room';
							//fadeOut exposure
							gsap.to(app.renderer, {toneMappingExposure: 1, duration: 1});
						}});
					break;
					case 'pl_bath':
						//fadeIn exposure
						gsap.to(app.renderer, {toneMappingExposure: 0, duration: 0.7, onComplete: ()=>{
							app.geoSphereDay.material.envMap = pv.hargitaBathDay;
							app.geoSphereNight.material.envMap = pv.hargitaBathNight;
							// main locator
							plArray[0].visible = true;
							plArray[0].position.set(2, -0.8, 0.13);
							plArray[0].rotation.z = Math.PI/2;
							// stair locator
							plArray[1].visible = true;
							plArray[1].position.set(0, 100, 0);
							// bath locator
							plArray[2].visible = true;
							plArray[2].position.set(0, 100, 0);
							//place name
							document.getElementById('house-place-text').textContent = '/ Bathroom';
							// normalize camera position & fov 
							app.camera.position.set(0.001, 0, 0);
							app.camera.fov = fov.default;
							app.camera.updateProjectionMatrix();
							//fadeOut exposure
							gsap.to(app.renderer, {toneMappingExposure: 1, duration: 1});
						}});
					break;
					case 'pl_stair':
						//fadeIn exposure
						gsap.to(app.renderer, {toneMappingExposure: 0, duration: 0.7, onComplete: ()=>{
							app.geoSphereDay.material.envMap = pv.hargitaStairDay;
							app.geoSphereNight.material.envMap = pv.hargitaStairNight;
							// main locator
							plArray[0].visible = true;
							plArray[0].position.set(-0.6, -1.3, 0.4);
							plArray[0].rotation.z = Math.PI/2;
							// stair locator
							plArray[1].visible = true;
							plArray[1].position.set(0, 100, 0);
							// bath locator
							plArray[2].visible = true;
							plArray[2].position.set(0, 100, 0);
							// place name
							document.getElementById('house-place-text').textContent = '/ Bedroom';
							// normalize camera position & fov 
							app.camera.position.set(0.001, 0.0003, 0.001);
							app.camera.fov = fov.default;
							app.camera.updateProjectionMatrix();
							//fadeOut exposure
							gsap.to(app.renderer, {toneMappingExposure: 1, duration: 1});
						}});
					break;
					default:
						console.log('default case');
				};
			}
		});
		// Postion of Cursor
		screen.addEventListener("mousemove", (e)=> {
			interactive.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			interactive.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
		});
		// Type of Cursor
		document.getElementById('page-screen').addEventListener('mouseover', (e)=>{
			document.getElementById('page-screen').style.cursor = 'grab';
		});
		document.getElementById('page-screen').addEventListener('mousedown', (e)=>{
			if (e.button == 0) {
				document.getElementById('page-screen').style.cursor = 'grabbing';
			};
		});
		document.getElementById('page-screen').addEventListener('mouseup', (e)=>{
			document.getElementById('page-screen').style.cursor = 'grab';
		});
		// Resize Window
		window.addEventListener( "resize", () => {
			app.camera.aspect = screen.offsetWidth / screen.offsetHeight;
			app.camera.updateProjectionMatrix();
			app.renderer.setSize(screen.offsetWidth, screen.offsetHeight);
		}, false);
		// Fullscreen Mode
		document.getElementById('fullscreen').addEventListener('mouseup', (e)=>{
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		});
		// Day Night Mode
		document.getElementById('day').addEventListener('mouseup', (e)=>{
			if (e.button == 0) {
				document.getElementById('day').style.pointerEvents = 'none';
				document.getElementById('day').style.filter = 'invert(20%) sepia(100%) saturate(200%) brightness(3)';
				document.getElementById('night').style.pointerEvents = 'auto';
				document.getElementById('night').style.filter = 'invert(100%)';

				gsap.to(app.geoSphereDay.material, {opacity: 1, duration: 2});
			};
		});
		document.getElementById('night').addEventListener('mouseup', (e)=>{
			if (e.button == 0) {
				
				document.getElementById('night').style.pointerEvents = 'none';
				document.getElementById('night').style.filter = 'invert(20%) sepia(100%) saturate(200%) brightness(3)';
				document.getElementById('day').style.pointerEvents = 'auto';
				document.getElementById('day').style.filter = 'invert(100%)';

				gsap.to(app.geoSphereDay.material, {opacity: 0, duration: 2});
				gsap.to(app.renderer, {toneMappingExposure: 0.6, duration: 1, onComplete: ()=> {
					gsap.to(app.renderer, {toneMappingExposure: 1, duration: 3});
				}});
			};
		});
	}; uiActions();
}; appInit();

function render() {
	interactive.raycaster.setFromCamera(interactive.pointer, app.camera);
	const intersects = interactive.raycaster.intersectObjects(plArray);
	if (intersects.length > 0) {
		if (INTERSECTED !== intersects[0].object) {
			if (INTERSECTED) {
				INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
				document.getElementById('page-screen').style.cursor = 'grab';
			}
			INTERSECTED = intersects[0].object;
			INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
			INTERSECTED.material.color.setHex(0xffd186);
			document.getElementById('page-screen').style.cursor = 'pointer';
		}
	} else {
		if (INTERSECTED) {
			INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
			document.getElementById('page-screen').style.cursor = 'grab';
		}
		INTERSECTED = null;
	}

	app.renderer.render(app.scene, app.camera);
	app.cameraControl.update();
};
