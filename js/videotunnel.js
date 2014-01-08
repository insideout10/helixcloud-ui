$( document ).ready(function() {

	var camera;
	var cameraInclination = 0.0;	//in radianti!
	var sceneGL;
	var rendererGL;
	var sceneCSS;
	var rendererCSS;
	var cube;
	var panels = [];
	var videos = [];

	var nCATEGORIES = 13;
	var nVideos = 10;
	var videosPerRow = 3;
	var videosPerColumn = 4;
	var tunnelRadius = nCATEGORIES*180;
	var tunnelHeight = tunnelRadius/2;	//da sistemare
	var panelWidth = Math.floor(2*3.14*tunnelRadius/nCATEGORIES);
	var deltaK = 0.02;
	var deltaR = 0.0;
	var deltaH = 0.0;

	var zoomed = false;




	initCanvas();
	initCSS3D();
	initCamera();
	animate();

	function initCanvas() {

		sceneGL = new THREE.Scene();
	
		var supportsWebGL = function() {
								try {
									return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
								} catch( e ) {	
									return false;
								}
							};
		if(supportsWebGL)
			rendererGL = new THREE.WebGLRenderer();
		else
			rendererGL = new THREE.CanvasRenderer();
		rendererGL.setSize( window.innerWidth, window.innerHeight );
		rendererGL.domElement.style.position = 'absolute';
		document.body.appendChild( rendererGL.domElement );
	
		//creating cubes for debugging
		for(var c=100; c<1000; c++) {
			var geometryC = new THREE.CubeGeometry(5,10,15);
			var materialC = new THREE.MeshBasicMaterial({color:0xdddd22});
			materialC.wireframe = true;
			var cube = new THREE.Mesh(geometryC, materialC);
		
			var d = 10;
			var x = Math.random()*c*d*randomSign();
			var y = Math.random()*c*d*randomSign();
			var z = Math.random()*c*d*randomSign();
			cube.position = new THREE.Vector3(x,y,z);
			x = Math.random()*Math.PI*2;
			y = Math.random()*Math.PI*2;
			z = Math.random()*Math.PI*2;
			cube.rotation.x = x;
			cube.rotation.y = y;
			cube.rotation.z = z;
			sceneGL.add(cube);
		}
	}

	function randomSign() {
		var sign = 1;
		if(Math.random() > 0.5)
			sign = -1;
		return sign;
	}

	function initCSS3D() {
	
		sceneCSS = new THREE.Scene();

		rendererCSS = new THREE.CSS3DRenderer();
		rendererCSS.setSize( window.innerWidth, window.innerHeight );
		rendererCSS.domElement.style.position = 'absolute';
		document.body.appendChild( rendererCSS.domElement );

		var sector = 2.0 * 3.14 / nCATEGORIES;
		for(var p=0; p<nCATEGORIES; p++) {
			var panelElement = generatePanel(p);
			var panel = new THREE.CSS3DObject( panelElement );
		
			angle = -sector * p;	//negativo per disporli in senso orario
			panel.position.x = Math.cos(angle) * (tunnelRadius);
			panel.position.y = Math.sin(angle) * (tunnelRadius);
			panel.rotation.x = Math.PI/2.0;
			panel.up.set(0,0,1);
			panel.lookAt(new THREE.Vector3());
		
			for(var v=0;v<nVideos;v++) {
				var videoElement = generateThumb( p*nVideos + v, panelElement);
				var video = new THREE.CSS3DObject( videoElement );	
				
				var wIndex = v % videosPerRow;
				video.position.x = -(panelWidth/2) + (panelWidth*wIndex/videosPerRow) + panelWidth/(2*videosPerRow);
				
				var hIndex = Math.floor(v/videosPerRow);
				var tunnelH = tunnelHeight - (tunnelHeight/videosPerColumn);
				video.position.y = (tunnelH/2) - (tunnelH*hIndex/videosPerColumn) - tunnelH/(2*videosPerColumn);	
				
				panel.add(video);
				videos.push(video);					
								
				
			}
			//video.applyMatrix( panel.matrixWorld );
			sceneCSS.add( panel );
			panels.push(panel);
		}
	}

	function initCamera() {
		//fitted from http://www.xuru.org/rt/PR.asp#Manually with four points (can be improoved)
		fov = 0.07*(Math.pow(nCATEGORIES,2)) - (3.8*nCATEGORIES) + 58.375;
		camera = new THREE.PerspectiveCamera( fov, window.innerWidth/window.innerHeight, 1, tunnelRadius*10 );
		camera.position.z += tunnelHeight/3.0;
		camera.rotation.x += Math.PI/2.0 + cameraInclination;
		
		sceneCSS.add(camera);
		sceneGL.add(camera);
		
		//window resize event
		window.addEventListener('resize', function() {
		  rendererCSS.setSize(window.innerWidth, window.innerHeight);
		  rendererGL.setSize(window.innerWidth, window.innerHeight);
		  camera.aspect = window.innerWidth / window.innerHeight;
		  camera.updateProjectionMatrix();
		});
	}

	function animate() {

		requestAnimationFrame( animate );
	
	
		//controls smoothing (OCCHIO AI CALCOLI SULLO 0)
		if(Math.abs(deltaR) > 0.00001)
			deltaR *= 0.90;
		else
			deltaR = 0.0;
		if(Math.abs(deltaH) > 0.00001)
			deltaH *= 0.90;
		else
			deltaH *= 0.0;
	
		camera.rotation.y -= deltaR;	
		//camera.rotation.x += Math.PI/2.0 + cameraInclination;
	
		camera.position.z += deltaH;
	
	
		//camera.lookAt(videos[3].position);
		//camera.lookAt(cube.position);
	
		render();
	}

	function render() {
		rendererCSS.render( sceneCSS, camera );
		rendererGL.render( sceneGL, camera );
	}

	//HTML stuff

	function generatePanel(catid) {
		var element = document.createElement( 'div' );
		element.className = 'panel';
		element.style.height = tunnelHeight;
		element.style.width = panelWidth;
	
		element.innerHTML = '<h1 class="categoryName" id="categoryName' + catid + '">' + 
								'Categoria ' + catid +
							'</h1>';
	
		return element;
	}

	//get video thumb with info (call to Helix API for details on video)
	function generateThumb(id, panelElem) {
	
		var element = document.createElement( 'div' );
		element.className = 'thumbdiv';
		element.idName = 'thumbdiv'+ id;	//important! to couple css with 3d object
		element.style.height = 0.8 * $(panelElem).height() / (videosPerColumn + 1);
		element.style.width = 0.8 * $(panelElem).width() / videosPerRow + 1;
	
		//maybe better as an external html
		content = '<h3 class="thumbtitle">Titolooooo ' + id + '</h3>' +
					'<div class="thumbimage" style="background-image:url(./videos/' + ((id % nVideos) + 1) + '.jpg);">' +
						'<div class="playicon"></div>' +
						'<div class="thumbduration">' +
							'01:34' +
						'</div>' +
					'</div>' +
					'<p class="thumbdescription">' +
						id*37 + ' visite' +
					'</p>';
	
		element.innerHTML = content;		
		return element;
	}



	//ANIMATIONS
	function zoomToPanel(e) {

	}

	function displaySearchResults( query ) {
		//chiamata a Helix per i risultati di ricerca
		console.log(query);
		
		//ruota pannelli
		for(var p=0; p<nCATEGORIES; p++) {
			panels[p].rotation.z += Math.PI/100;
			console.log(panels[p].children);
		}
	}





	//jQuery EVENTS
	$('.thumbdiv').on('click', function(e){
		zoomToPanel(e);
		if(!zoomed)
		{
			zoomed = true;
	
			var click = (e.currentTarget.idName).replace('thumbdiv','');
			//get 3D coords of clicked video
		
			// DA ANIMARE
			camera.position.z = videos[click].position.z;
			camera.up.set(0,0,1);
			camera.lookAt( videos[click].position );
		
		
			//camera.fov *= 0.7;
			var distance = (videos[click].position).distanceTo(camera.position);
			var height = tunnelHeight/videosPerColumn;
			console.log(height);
			//camera.fov = 2 * Math.atan( height/(2 * dist) ) * ( 180/Math.PI );
			var optimalDistance = height/ ( 2 * Math.tan( (Math.PI/180) * (camera.fov/2) ))
			camera.translateZ( - distance + optimalDistance); 
		
		  	//camera.updateProjectionMatrix();
		  	
		  	
		  	//CREARE UNA DIV A PARTE O SOSTITUIRE SOLO I CONTENUTI?
		  	/*var element = document.createElement('div');*/
		  	
		  	//var w = $(e.currentTarget).children('.thumbimage').width();
		  	//var h = $(e.currentTarget).children('.thumbimage').height();
		  	
		  	videoid = 1 + click % nVideos;
		  	$(e.currentTarget).children('.thumbimage').html(
		  				'<video autoplay controls>' + 
	  					'<source src="./videos/' + videoid + '.mp4" type="video/mp4">' +
						'Your browser does not support the video tag.' +
						'</video>');
		  	/*var playerdiv = new THREE.CSS3DObject( element );
		
			playerdiv.position.x = videos[click].position.x;
			playerdiv.position.y = videos[click].position.y;
			playerdiv.position.z = videos[click].position.z;
			playerdiv.rotation.x = videos[click].rotation.x;
			playerdiv.rotation.y = videos[click].rotation.y;
			playerdiv.rotation.z = videos[click].rotation.z;
		
			sceneCSS.add( playerdiv );*/
		  	
		  	
		 }
		 else {
		 	//pause or play video
		 }
	});


	$('h1').on('click', function(e){
		//console.log( e );
	});

	$('div').on('click', function(e){
		//console.log( e.currentTarget );
	});

	$('#searchinput').on('click', function(e){
		$(this).text('');
	});

	$('#searchbutton').on('click', function(e){
		var query = $('#searchinput').val();
		displaySearchResults( query );
	});










	//CONTROLSSSZ

	//Keyboard
	$(document.body).on('keydown', function(e) {
		if(!zoomed) {
			if(e.which == 37)
				deltaR = -deltaK;
			if(e.which == 38)
				deltaH = 500*deltaK;
			if(e.which == 39)
				deltaR = deltaK;
			if(e.which == 40)
				deltaH = 500*(-deltaK);
		}
	});

	//Touch
	Hammer(document.body).on('drag', function(e) {
		if(!zoomed) {
			var vx = e.gesture.velocityX;
			var vy = e.gesture.velocityY;
			var dx = e.gesture.deltaX;
			var dy = e.gesture.deltaY;
		
			if(vx > vy) {
				if(dx > 0.0)
					deltaR = -deltaK*2;
				else
					deltaR = deltaK*2;
			}
			else {
				if(dy > 0.0)
					deltaH = 2000*deltaK;
				else
					deltaH = 2000*(-deltaK);
			}
		}
	});

	Hammer(document.body).on('touch', function(e) {
		if(!zoomed) {
		    deltaR = 0.0;
		    deltaH = 0.0;
		}
	});

	Hammer(document.body).on('tap', function(e) {
		zoomToPanel(e);
	});



//end of $(document).ready()
});








////////////////////////////////////////////
/// old code for non-independent videos ////
/////////////////////////////////////////////


/*function generatePanel(catid) {
	var panelWidth = Math.floor(2*3.14*tunnelRadius/nCATEGORIES) + 'px';
	var element = document.createElement( 'div' );
	element.className = 'panel';
	element.style.height = tunnelHeight + 'px';
	element.style.width = panelWidth;
	
	nVideos = 10;
	var content = '<h1> Categoria ' + catid + '</h1>';
	for(var v=1;v<=nVideos;v++) {
		content += '<div style="float:left;height:' +  100/videosPerColumn + '%;width:' + 100/videosPerRow + '%;">';
		content += generateThumb(v);
		content += '</div>';
	}
	
	element.innerHTML = content;
	return element;
}

/*function generateThumb(id) {

	return '<div class="thumbdiv">' +
				'<h3 class="thumbtitle">Titolooooo ' + id + '</h3>' +
				'<div class="thumbdiv thumbimage" style="background-image:url(./videos/' + id + '.jpg);">' +
					'<div class="playicon"></div>' +
					'<div class="thumbduration">' +
						id + ':' + id*8 +
					'</div>' +
				'</div>' +
				'<p class="thumbdescription">' +
					id*37 + ' visite' +
				'</p>' +
			'</div>';
}*/
