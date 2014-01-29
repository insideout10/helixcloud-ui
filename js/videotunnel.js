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
	
	var nCATEGORIES = 10;
	var panelWidth = window.screen.availWidth*2;	//in pixels
	var tunnelRadius = panelWidth*nCATEGORIES/(Math.PI*2);
	var tunnelHeight = panelWidth;	//da sistemare
	
	var nVideos = 10;
	var videosPerRow = 3;
	var videosPerColumn = 4;
	
	var deltaK = 0.05;
	var deltaR = 0.0;
	var deltaH = 0.0;

	var zoomed = false;
	var cameraBeforeZooming;
	var videoBeforeZooming;
	var zoomedVideo;
	
	var animationTime = 100;
	
	var searchIsOn = false;
	
	var map;
	
	var goingBackInHistory = false;
	
	initCanvas();
	initCSS3D();
	initCamera();
	
	//does the URL specify a video?
	checkIfAskedVideo();
	
	animate();

	function initCanvas() {

		sceneGL = new THREE.Scene();
			
		//fallback for non-webGL browsers
		if(Detector.webgl)
			rendererGL = new THREE.WebGLRenderer({ antialiasing: true });
		else
			rendererGL = new THREE.CanvasRenderer({ antialiasing: true });

		//rendererGL.setClearColor( 0xdddddd, 1 );	
		rendererGL.setSize( window.innerWidth, window.innerHeight );
		rendererGL.domElement.style.position = 'absolute';
		document.body.appendChild( rendererGL.domElement );
	
		//creating cubes for debugging
		for(var c=100; c<1000; c++) {
			var geometryC = new THREE.CubeGeometry(5,7,10);
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
		//rendererCSS = new THREE.CSS2DRenderer();
		
		//rendererCSS.setClearColor( 0xbbbbbb, 1 );
		rendererCSS.setSize( window.innerWidth, window.innerHeight );
		rendererCSS.domElement.style.position = 'absolute';
		document.body.appendChild( rendererCSS.domElement );

		var sector = 2.0 * 3.14 / nCATEGORIES;
		for(var p=0; p<nCATEGORIES; p++) {
			var panelElement = generatePanel(p);
			var panel = new THREE.CSS3DObject( panelElement );
		
			var angle = 1 + sector * p;	///l'1 non servirebbe ma senza ho problemi
										//con la rotazione del pannello 0 (mistero)
										
			//angolo negativo per disporli in senso orario
			panel.position.x = Math.cos(-angle) * tunnelRadius;
			panel.position.y = Math.sin(-angle) * tunnelRadius;
			
			panel.up.set(0,0,1);			
			panel.lookAt(new THREE.Vector3(0,0,0));
		
			for(var v=0;v<nVideos;v++) {
				var videoElement = generateThumb( p*nVideos + v, panelElement);
				var video = new THREE.CSS3DObject( videoElement );	
				
				var wIndex = v % videosPerRow;
				video.position.x = -(panelWidth/2) + (panelWidth*wIndex/videosPerRow) + panelWidth/(2*videosPerRow);
				
				var hIndex = Math.floor(v/videosPerRow);
				var tunnelH = tunnelHeight - (tunnelHeight/videosPerColumn)/2;
				video.position.y = (tunnelH/2) - (tunnelH*hIndex/videosPerColumn) - tunnelH/(2*videosPerColumn);	
				
				video.position.z +=5;	//just a little before the panel
				
				panel.add(video);
				videos.push(video);
			}
			
			sceneCSS.add( panel );
			panels.push(panel);

		}
		
	}

	function initCamera() {
	
		var fov = getOptimalFov();
		camera = new THREE.PerspectiveCamera( fov, window.innerWidth/window.innerHeight, 1, tunnelRadius*5 );
		
		for(var p=0; p<nCATEGORIES; p++) {
			panels[p].updateMatrixWorld();		//su questa riga ho perso una mattina
		}
		
		var firstLooked = askedVideo();
		if(firstLooked === undefined)
			firstLooked = 1;	
		videoWorldPosition = videos[firstLooked].localToWorld( new THREE.Vector3() );
		camera.position.z = videoWorldPosition.z;
		camera.up.set(0,0,1);
		//camera.rotateX(Math.PI/2.0 + cameraInclination);
		camera.lookAt(videoWorldPosition);
		
		sceneCSS.add(camera);
		sceneGL.add(camera);
		
		//window resize event
		window.addEventListener('resize', function() {
		  rendererCSS.setSize(window.innerWidth, window.innerHeight);
		  rendererGL.setSize(window.innerWidth, window.innerHeight);
		  camera.aspect = window.innerWidth / window.innerHeight;
		  camera.fov = getOptimalFov();
		  camera.updateProjectionMatrix();
		});
	}
	
	function getOptimalFov() {
		
		var wh = window.innerHeight;
		var ww = window.innerWidth;
		var fovHeight;
		var zoomOut = 1.3;
		
		if(wh > ww)
			fovHeight = zoomOut * tunnelHeight * wh/ww;
		else
			fovHeight = zoomOut * tunnelHeight / ww*wh;

		//ORIGINAL fov FORMULA: /// camera.fov = 2 * Math.atan( height/(2 * dist) ) * ( 180/Math.PI );
		var fov = 2 * Math.atan( fovHeight/(2*tunnelRadius) ) * ( 180/Math.PI );
		return fov;
	}
	
	function animate() {

		requestAnimationFrame( animate );
		
		if(!zoomed) {
			
			//rotation controls (with smoothing)
			if(Math.abs(deltaR) > 0.00001) {
				deltaR *= 0.90;
				camera.rotateY(deltaR);
			}
			else
				deltaR = 0.0;
			
			//up/down controls (with smoothing)	
			if(Math.abs(deltaH) > 0.00001) {
				deltaH *= 0.90;
				camera.position.z += deltaH;
			}
			else
				deltaH *= 0.0;
	
			
			
		}
		
		//animations update
		TWEEN.update();
		
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
		element.idName = 'thumbdiv'+ id;
		element.style.height = 0.8 * $(panelElem).height() / (videosPerColumn + 1);
		element.style.width = 0.8 * $(panelElem).width() / videosPerRow + 1;
	
		//maybe better as an external html
		content =	'<h3 class="thumbtitle">Titolooooo ' + id + '</h3>' +
					'<div class="thumbimage" style="background-image:url(videos/' + ((id % nVideos) + 1) + '.jpg);">' +
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
	
	function initMap() {
		if(map === undefined) {
			map = L.map('map').setView([41.8941, 12.50772], 10);
			L.tileLayer('http://otile2.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',
						{
							attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
							maxZoom: 18
						}).addTo(map);
		
			//open the panel where there is a #map			
			$('.more').find('#map').parent().show();
		}
	}	
	
	///////////Single Page App URL managing
	
	function checkIfAskedVideo() {
			zoomedVideo = askedVideo();
			if(zoomedVideo)
				zoomToVideo();
	}
	
	function askedVideo() {
		var reqVideo = location.href.split("?");
		if(reqVideo.length > 1) {
			reqVideo = reqVideo[1].split("=");
			return reqVideo[1];
		}

		return undefined;
	}
	
	function changeURL() {
		if( ! goingBackInHistory) {
			var URL = location.pathname;
			if( zoomed )
				URL += "?v=" + zoomedVideo;
		
			history.pushState(URL, URL, URL);
			console.log("change URL to ", URL);
		}
	}
	
	/////////////////////////

	//ANIMATIONS
	
	function initTweens() {
		
	}
	
	function zoomToVideo() {
		
		zoomed=true;
		changeURL();
		
		initMap();
										
		var videoid = 1 + zoomedVideo % nVideos;

		$('.videodiv').show( animationTime );
		
  		$(videos[zoomedVideo].element).find('.thumbimage').html(
			'<video autoplay controls>' + 
			// FIX THIS URL !!!!!!!!
			'<source src="videos/' + (1 + (zoomedVideo % nVideos)) + '.mp4" type="video/mp4">' +
			'Your browser does not support the video tag.' +
			'</video>'
		).fadeIn( animationTime );
		
		cameraBeforeZooming = camera.clone();
		
		videoBeforeZooming = videos[zoomedVideo].clone();
		
		var videoWidth = $(videos[zoomedVideo].element).width();
		var videoHeight = $(videos[zoomedVideo].element).height();
	
		/////inizio animazione
		
		//metti la camera a altezza video
		var videoWorldPosition = videos[zoomedVideo].localToWorld( new THREE.Vector3() );
		camera.position.z = videoWorldPosition.z;
		
		//la camera guarda verso il video
		camera.lookAt( videoWorldPosition );
		
		//il video guarda verso la camera	  	
	  	var cameraToPanel = videos[zoomedVideo].parent.worldToLocal( camera.position.clone() );
	  	videos[zoomedVideo].lookAt( cameraToPanel );
		
		//sposta la camera verso il video
		var distance = (videoWorldPosition).distanceTo(camera.position);
		var zoomFactor = 4;
		var ratio = window.innerWidth / window.innerHeight;
		var height = videoHeight / ratio * zoomFactor;
		//ORIGINAL fov FORMULA: /// camera.fov = 2 * Math.atan( height/(2 * dist) ) * ( 180/Math.PI );
		var optimalDistance = height/ ( 2 * Math.tan( (Math.PI/180) * (camera.fov/2) ))
		camera.translateZ( - distance + optimalDistance);
	  	
	  	//il video si sposta verso la camera
	  	videos[zoomedVideo].translateZ(videoHeight);

	  	////////ANIMAZIONE!!!
		var start = {
						cpx: cameraBeforeZooming.position.x,
						cpy: cameraBeforeZooming.position.y,
						cpz: cameraBeforeZooming.position.z,
						crx: cameraBeforeZooming.rotation.x,
						cry: cameraBeforeZooming.rotation.y,
						//crz: cameraBeforeZooming.rotation.z,
						vpx: videoBeforeZooming.position.x,
						vpy: videoBeforeZooming.position.y,
						vpz: videoBeforeZooming.position.z,
						vrx: videoBeforeZooming.rotation.x,
						vry: videoBeforeZooming.rotation.y,
						vrz: videoBeforeZooming.rotation.z	
					};
		var finish = {	
						cpx: camera.position.x,
						cpy: camera.position.y,
						cpz: camera.position.z,
						crx: camera.rotation.x,
						cry: camera.rotation.y,
						//crz: camera.rotation.z,
						vpx: videos[zoomedVideo].position.x,
						vpy: videos[zoomedVideo].position.y,
						vpz: videos[zoomedVideo].position.z,
						vrx: videos[zoomedVideo].rotation.x,
						vry: videos[zoomedVideo].rotation.y,
						vrz: videos[zoomedVideo].rotation.z
					};
					
		zoomTween = new TWEEN.Tween( start )
									.to( finish, animationTime )
									.onUpdate( function() {
										camera.position.x = start.cpx,
										camera.position.y = start.cpy,
										camera.position.z = start.cpz,
										camera.rotation.x = start.crx,
										camera.rotation.y = start.cry,
										//camera.rotation.z = start.crz
										videos[zoomedVideo].position.x = start.vpx,
										videos[zoomedVideo].position.y = start.vpy,
										videos[zoomedVideo].position.z = start.vpz,
										videos[zoomedVideo].rotation.x = start.vrx,
										videos[zoomedVideo].rotation.y = start.vry,
										videos[zoomedVideo].rotation.z = start.vrz
									})
									.onComplete( function() {
										//nothing
									})
									.start();
	  	
	  	////////////////////
	  	
	}
	
	function zoomOutVideo(){
		
		zoomed = false;
		changeURL();
		zoomed = true;	//needs to be true until end of animation
		
		$('.videodiv').hide( animationTime );
		
		//console.log( $(videos[zoomedVideo].element).children('video') );
		$('video').fadeOut("slow", function(){
      		$(this).remove();
      	});
		//var videoDivId = '#thumbdiv' + zoomedVideo;
		//console.log(videoDivId);
		//console.log($('#thumbdiv9').parent());
		
		////////////////DO NOT DELETE - operations without animation:
		//camera.position = cameraBeforeZooming.position;
		//camera.rotation = cameraBeforeZooming.rotation;
		//videos[zoomedVideo].position = videoBeforeZooming.position;
		//videos[zoomedVideo].rotation = videoBeforeZooming.rotation;
		///////////////////////////////////////////////////
		
		var start = {
							cpx: camera.position.x,
							cpy: camera.position.y,
							cpz: camera.position.z,
							crx: camera.rotation.x,
							cry: camera.rotation.y,
							//crz: camera.rotation.z,
							vpx: videos[zoomedVideo].position.x,
							vpy: videos[zoomedVideo].position.y,
							vpz: videos[zoomedVideo].position.z,
							vrx: videos[zoomedVideo].rotation.x,
							vry: videos[zoomedVideo].rotation.y,
							vrz: videos[zoomedVideo].rotation.z
						};
		var finish = {
							cpx: cameraBeforeZooming.position.x,
							cpy: cameraBeforeZooming.position.y,
							cpz: cameraBeforeZooming.position.z,
							crx: cameraBeforeZooming.rotation.x,
							cry: cameraBeforeZooming.rotation.y,
							//crz: cameraBeforeZooming.rotation.z,
							vpx: videoBeforeZooming.position.x,
							vpy: videoBeforeZooming.position.y,
							vpz: videoBeforeZooming.position.z,
							vrx: videoBeforeZooming.rotation.x,
							vry: videoBeforeZooming.rotation.y,
							vrz: videoBeforeZooming.rotation.z
						};
		zoomTween = new TWEEN.Tween( start )
									.to( finish, animationTime )
									.onUpdate( function() {
										camera.position.x = start.cpx,
										camera.position.y = start.cpy,
										camera.position.z = start.cpz,
										camera.rotation.x = start.crx,
										camera.rotation.y = start.cry,
										//camera.rotation.z = start.crz
										videos[zoomedVideo].position.x = start.vpx,
										videos[zoomedVideo].position.y = start.vpy,
										videos[zoomedVideo].position.z = start.vpz,
										videos[zoomedVideo].rotation.x = start.vrx,
										videos[zoomedVideo].rotation.y = start.vry,
										videos[zoomedVideo].rotation.z = start.vrz
									})
									.onComplete( function() {
										zoomed=false;
										zoomedVideo=undefined;
									})
									.start();
	}

	function displaySearchResults( query ) {
		
		//chiamata a Helix per i risultati di ricerca
		console.log(query);
		
		//gira i pannelli e entra in modalità ricerca
		if( !searchIsOn ) {
			rotatePanels();
			searchIsOn = true;
		}
	}
	
	function hideSearchResults() {
		
		//qui togliere i ris della ricerca
			
		if( searchIsOn ) {
			rotatePanels();
			searchIsOn = false;			
		}
	}
	
	function rotatePanels() {
		if(zoomed)
			zoomOutVideo();
		
		var start = [];
		var finish = [];
		for(var pa=0; pa<nCATEGORIES; pa++) {
			start.push(panels[pa].rotation.y);
			finish.push(panels[pa].rotation.y + Math.PI);
		}
		
		//ruota pannelli
		new TWEEN.Tween( start )
					.to( finish , animationTime )
					.onUpdate( function() {
						for(var p=0; p<nCATEGORIES; p++)
							panels[p].rotation.y = this[p];
					})
					.start();
	}

	//EVENTS
	window.addEventListener('popstate', function(e) {
    	
    	goingBackInHistory = true;
    	
    	// DA SISTEMAREEEEE
    	asked = askedVideo();
    	
    	//è richiesto un video
    	if( asked !== undefined )
    	{
    		//se il video è diverso da dove sei già, vacci
    		if( asked !== zoomedVideo )
    		{
    			if(zoomed)
    				zoomOutVideo();

    			zoomedVideo = asked;
    			zoomToVideo();
    		}
    	} else {
    		//è richiesta la home
    		if(zoomed)
    			zoomOutVideo();
    	}
    	
    	goingBackInHistory = false;
	});
	
	$('.thumbdiv').on('click', function(e){	
		if(!zoomed)
		{
			zoomedVideo = (e.currentTarget.idName).replace('thumbdiv','');
			zoomToVideo();
		}
		else {
			//pause or play video
		}
	});

	$('#videoright .button').on('click', function(e){
		
		var div = $(this).children('.more');
		
		//se non è già aperto
		if( div.css('display') == 'none' )
		{
			//apri div
			div.show( animationTime );
			//chiudi le altre
			$('#videoright .more').not(div).hide( animationTime );
		}
	});
	
	$('#back').on('click', function(e){
		zoomOutVideo();
	});
	
	$('#share').on('click', function(e){
		var div = $(this).children('.more');
		if( div.css('display') == 'none' )
			div.show( animationTime );
		else
			div.hide( animationTime );
	});
	
	$('#advancedsearch').on('click', function(e){
		var div = $(this).children('.more');
		if( div.css('display') == 'none' )
			div.show( animationTime );
		else
			div.hide( animationTime );
	});

	$('#searchinput').on('click', function(e){
		$(this).val('');
		$(this).css('color', 'black');
		$('#deletesearch').show( animationTime );
		$('#advancedsearch').children('.more').hide( animationTime );
		$('#advancedsearch').show( animationTime );
	});
	
	$('#deletesearch').on('click', function(e){
		$('#searchinput').val('');
		$(this).hide();
		$('#advancedsearch').hide( animationTime );
		$('#advancedsearch').children('.more').hide( animationTime );
		hideSearchResults();
	});

	$('.searchbutton').on('click', function(e){
		var query = $('#searchinput').val();
		$('#advancedsearch').hide( animationTime );
		displaySearchResults( query );
	});










	//CONTROLSSSZ

	//Keyboard
	$(document.body).on('keydown', function(e) {
		if(!zoomed) {
			if(e.which == 37)
				deltaR = -deltaK;
			if(e.which == 38)
				deltaH = 2000*deltaK;
			if(e.which == 39)
				deltaR = deltaK;
			if(e.which == 40)
				deltaH = 2000*(-deltaK);
		}
		else {
			if( ! $('#searchinput').is(':focus') ) {
				zoomOutVideo();
			}
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
					deltaR = deltaK;
				else
					deltaR = -deltaK;
			}
			else {
				if(dy > 0.0)
					deltaH = 1000*deltaK;
				else
					deltaH = 1000*(-deltaK);
			}
		}
	});

	Hammer(document.body).on('touch', function(e) {
		if(!zoomed) {
		    deltaR = 0.0;
		    deltaH = 0.0;
		}
	});

	/*
	Hammer(document.body).on('tap', function(e) {
		if(!zoomed)
			zoomToVideo();
		else
			zoomOutVideo();
	});
	*/

	Hammer(document.body).on('swipe', function(e) {
		if(zoomed) {
			zoomOutVideo();
		}
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
