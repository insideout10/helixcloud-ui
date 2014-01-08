var camera;
var scene;
var renderer;
var scene2;
var renderer2;
var panel;
var cube;

initCanvas();
initCSS3D();
initCamera();
animate();

function initCanvas() {

	scene2 = new THREE.Scene();

	renderer2 = new THREE.CanvasRenderer();
	renderer2.setSize( window.innerWidth, window.innerHeight );
	renderer2.domElement.style.position = 'absolute';
	document.body.appendChild( renderer2.domElement );
	
	var geometryC = new THREE.CubeGeometry(20,20,50);
	var materialC = new THREE.MeshBasicMaterial({color:0x222222});
	cube = new THREE.Mesh(geometryC, materialC);
	scene2.add(cube);
}

function initCSS3D() {
	
	scene = new THREE.Scene();

	renderer = new THREE.CSS3DRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.domElement.style.position = 'absolute';
	document.body.appendChild( renderer.domElement );

	var element = document.createElement( 'div' );
	element.className = 'element';
	element.style.backgroundColor = 'yellow';
	element.style.width = '100px';
	element.innerHTML = '<a href="www.pieroit.org">mutande uomo</a>';
		
	panel = new THREE.CSS3DObject( element );
	panel.position.z -=100;
	scene.add( panel );
}

function initCamera() {
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.z = 100;	
}

function animate() {

	requestAnimationFrame( animate );
	
	cube.position.x+=1;
	panel.position.x-=1;
	
	renderer2.render( scene2, camera );
	renderer.render( scene, camera );
}
