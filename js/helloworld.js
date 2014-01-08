
var nCATEGORIES = 23;
var deltaK = 0.1;
var deltaR = 0.0;
var deltaH = 0.0;
var WIDTH = $(window).width();
var HEIGHT = $(window).height();

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(75, WIDTH/HEIGHT, 0.1, 1000);

var renderer = new THREE.CanvasRenderer();
renderer.setSize(WIDTH, HEIGHT);
$('body').append(renderer.domElement);

//tunnel
var geometryT = new THREE.CylinderGeometry(1,1,5,nCATEGORIES,1,true);
var materialT = new THREE.MeshBasicMaterial({color:0x222222});
materialT.side = THREE.BackSide;
var tunnel = new THREE.Mesh(geometryT, materialT);
scene.add(tunnel);

var geometryC = new THREE.CubeGeometry(1,1,1);
var materialC = new THREE.MeshLambertMaterial({map: THREE.ImageUtils.loadTexture('gattino.jpg')
      });
var cube = new THREE.Mesh(geometryC, materialC);
scene.add(cube);

camera.position.z = 3;

//application loop
function render(){
	requestAnimationFrame(render);
	
	//controls smoothing
	deltaR*=0.90;
	deltaH*=0.90;
	cube.rotation.y+=deltaR;	
	camera.position.y+=deltaH;
	
	//cube.lookAt(camera.position);
	
	renderer.render(scene, camera);
}
render();



//Controlsssz
$(document.body).on('keydown', function(e) {
    switch (e.which) {
        // left arrow
        case 37:
        	deltaR = -deltaK;
            break;
        // up arrow    
        case 38:
        	deltaH = deltaK;
            break;
        // right arrow    
        case 39:
        	deltaR = deltaK;
            break;
        // down arrow
        case 40:
        	deltaH = -deltaK;
            break;
    }
});
