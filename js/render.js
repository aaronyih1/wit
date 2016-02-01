

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

// var hash = document.location.hash.substr( 1 );
var hash = 64; //or power of 2 (affects bird count)

// if (hash) hash = parseInt(hash, 0);

console.log("hash: " + hash)
/* TEXTURE WIDTH FOR SIMULATION */
var WIDTH = hash || 32;

var BIRDS = WIDTH * WIDTH;

// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
THREE.BirdGeometry = function () {

    var triangles = BIRDS * 3;
    var points = triangles * 3;

    THREE.BufferGeometry.call( this );

    var vertices = new THREE.BufferAttribute( new Float32Array( points * 3 ), 3 );
    var birdColors = new THREE.BufferAttribute( new Float32Array( points * 3 ), 3 );
    var references = new THREE.BufferAttribute( new Float32Array( points * 2 ), 2 );
    var birdVertex = new THREE.BufferAttribute( new Float32Array( points ), 1 );

    this.addAttribute( 'position', vertices );
    this.addAttribute( 'birdColor', birdColors );
    this.addAttribute( 'reference', references );
    this.addAttribute( 'birdVertex', birdVertex );

    // this.addAttribute( 'normal', new Float32Array( points * 3 ), 3 );


    var v = 0;

    function verts_push() {
        for (var i=0; i < arguments.length; i++) {
            vertices.array[v++] = arguments[i];
        }
    }

    var wingsSpan = 20;

    for (var f = 0; f<BIRDS; f++ ) {

        // Body
        verts_push(
            0, -0, -20,
            0, 4, -20,
            0, 0, 30
        );

        // Left Wing
        verts_push(
            0, 0, -15,
            -wingsSpan, 0, 0,
            0, 0, 15
        );

        // Right Wing
        verts_push(
            0, 0, 15,
            wingsSpan, 0, 0,
            0, 0, -15
        );

    }

    for( var v = 0; v < triangles * 3; v++ ) {

        var i = ~~(v / 3);
        var x = (i % WIDTH) / WIDTH;
        var y = ~~(i / WIDTH) / WIDTH;

        var c = new THREE.Color(
            0x444444 +
            ~~(v / 9) / BIRDS * 0x666666
        );

        birdColors.array[ v * 3 + 0 ] = c.r;
        birdColors.array[ v * 3 + 1 ] = c.g;
        birdColors.array[ v * 3 + 2 ] = c.b;

        references.array[ v * 2     ] = x;
        references.array[ v * 2 + 1 ] = y;

        birdVertex.array[ v         ] = v % 9;

    }

    this.scale( 0.2, 0.2, 0.2 );

};

THREE.BirdGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );


var container, stats;
var camera, scene, renderer, geometry, i, h, color;
var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var PARTICLES = WIDTH * WIDTH;
var BOUNDS = 800, BOUNDS_HALF = BOUNDS / 2;

// document.getElementById('birds').innerText = PARTICLES;

function change(n) {
    location.hash = n;
    location.reload();
    return false;
}


// var options = '';
// for (i=1; i<7; i++) {
//  var j = Math.pow(2, i);
//  options += '<a href="#" onclick="return change(' + j + ')">' + (j * j) + '</a> ';
// }
// document.getElementById('options').innerHTML = options;

var last = performance.now();

var simulator;

init();
animate();

function init() {

    container = document.getElementById('bats' );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
    camera.position.z = 350;

    scene = new THREE.Scene();

    scene.fog = new THREE.Fog( 0xffffff, 100, 1000 );

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( scene.fog.color );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    simulator = new SimulationRenderer(WIDTH, renderer);
    simulator.init();

    // stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild( stats.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );

    //

    window.addEventListener( 'resize', onWindowResize, false );



    // var gui = new dat.GUI();


    var effectController = {
        seperation: 20.0,
        alignment: 20.0,
        cohesion: 20.0,
        freedom: 0.75
    };

    var valuesChanger = function() {

        simulator.velocityUniforms.seperationDistance.value = effectController.seperation;
        simulator.velocityUniforms.alignmentDistance.value = effectController.alignment;
        simulator.velocityUniforms.cohesionDistance.value = effectController.cohesion;
        simulator.velocityUniforms.freedomFactor.value = effectController.freedom;

    };

    valuesChanger();


    // gui.add( effectController, "seperation", 0.0, 100.0, 1.0 ).onChange( valuesChanger );
    // gui.add( effectController, "alignment", 0.0, 100, 0.001 ).onChange( valuesChanger );
    // gui.add( effectController, "cohesion", 0.0, 100, 0.025 ).onChange( valuesChanger );
    // gui.close();

    initBirds();

}


function initBirds() {

    var geometry = new THREE.BirdGeometry();

    // For Vertex and Fragment
    birdUniforms = {
        color: { type: "c", value: new THREE.Color( 0xff2200 ) },
        texturePosition: { type: "t", value: null },
        textureVelocity: { type: "t", value: null },
        time: { type: "f", value: 1.0 },
        delta: { type: "f", value: 0.0 }
    };

    // ShaderMaterial
    var material = new THREE.ShaderMaterial( {
        uniforms:       birdUniforms,
        vertexShader:   document.getElementById( 'birdVS' ).textContent,
        fragmentShader: document.getElementById( 'birdFS' ).textContent,
        side: THREE.DoubleSide

    });

    birdMesh = new THREE.Mesh( geometry, material );
    birdMesh.rotation.y = Math.PI / 2;
    birdMesh.matrixAutoUpdate = false;
    birdMesh.updateMatrix();

    scene.add(birdMesh);

}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseMove( event ) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

}

function onDocumentTouchStart( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

//

function animate() {

    requestAnimationFrame( animate );

    render();
    // stats.update();

}

function render() {

    var now = performance.now();
    var delta = (now - last) / 1000;

    if (delta > 1) delta = 1; // safety cap on large deltas
    last = now;

    birdUniforms.time.value = now;
    birdUniforms.delta.value = delta;

    simulator.simulate( delta );
    simulator.velocityUniforms.predator.value.set( mouseX / windowHalfX, -mouseY / windowHalfY, 0 );

    mouseX = 10000;
    mouseY = 10000;

    renderer.render( scene, camera );

}
