import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js'
import {lerp} from './lerp.js';

  export const game = (() => {
    
    class Game{

    OBSTACLE_PREFAB = new THREE.BoxBufferGeometry(1,1,1);
    OBSTACLE_MATERIAL = new THREE.ShaderMaterial({
        uniforms: 
        { 
          glowColor: { type: "c", value: new THREE.Color("rgb(252,225,14)") }
        },
        
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      })

    BONUS_PREFAB = new THREE.SphereGeometry( 1, 60, 60);
    BONUS_MATERIAL = new THREE.MeshBasicMaterial({color: 0xccdeee});

    COLLISION_THRESHOLD =0.2

    constructor(scene,camera){
      this.running = false;
      this.translateX = 0;
      this.speedZ = 20;
      this.speedX = 0;
      this.camera = camera;
      this.scene = scene;

      this.obstacleAmount = 0.0005;

      this.rotationLerp = null;

      this.gameOverPanel = document.getElementById("game-over-panel")
      this.gameOverScore = document.getElementById("game-over-score")

     this.ScoreInput = document.getElementById("score");

     this.StartBtn = document.getElementById("start-game");
     this.RestartBtn = document.getElementById("restart-game");
    
     this.StartBtn.addEventListener('click' ,(e) => { 
     this.running = true;      
     document.getElementById("intro-panel").className = "animation"});


      this.RestartBtn.addEventListener('click' ,(e) => { 
          this.running = true;      
          this.gameOverPanel.style.display = "none"}); 
          
          
      this._reset(false);
      document.addEventListener('keydown', this._keydown.bind(this));
      document.addEventListener('keyup', this._keyup.bind(this));
    }   
    
    update(){
      if(!this.running)
      return
      this.obstacleAmount+=0.0005;
      if(this.obstacleAmount>1){
        this._obstacle();
        this.obstacleAmount=0;
      }
        this.timeDelta = this.clock.getDelta();
        this.time += this.timeDelta;

        if(this.rotationLerp != null)
        this.rotationLerp.update(this.timeDelta);

        this.translateX += this.speedX * -0.05;
       
        this._updateGrid();
        this._chceckCollisions();
        this._updateInfoPanel();
    }


    _reset(replay){
      this.translateX = 0;
      this.speedZ = 15;
      this.speedX = 0;  


      this.health = 3; 
      this.score = 0;
      this.obstacleAmount = 0.0005;


      this._initializeScene(this.scene,this.camera, replay);
      this.ScoreInput.innerText = this.score;
      this._addHeartIcon();
      this._addHeartIcon();
      this._addHeartIcon();

      
      this.time = 0;
      this.clock = new THREE.Clock();
    }


    _addLights(scene){
      var light1, light2, light3, light4, light5, light6, light7, light8;

    }


    _createGrid(scene){
    let divisions = 30;
    let gridLimit = 50;
    this.grid = new THREE.GridHelper(gridLimit * 2, divisions, 0xFF00E7,0xFF00E7);

    const moveableX = [];
    const moveableZ = [];
    for (let i = 0; i <= divisions; i++) {
      moveableX.push(0, 0, 1, 1); // vertical lines
      moveableZ.push(1, 1, 0, 0); // horizontal lines
    }
    this.grid.geometry.setAttribute('moveableX', new THREE.BufferAttribute(new Uint8Array(moveableX), 1));
    this.grid.geometry.setAttribute('moveableZ', new THREE.BufferAttribute(new Uint8Array(moveableZ), 1));

    this.grid.material = new THREE.ShaderMaterial({
        uniforms: {
          speedZ: {
            value: this.speedZ
          },
          translateX: {
            value: this.translateX
          },
          gridLimits: {
            value: new THREE.Vector2(-gridLimit, gridLimit)
          },
          time: {
            value: 0
          }
        },
        vertexShader: `
          uniform float time;
          uniform vec2 gridLimits;
          uniform float speedZ;
          uniform float translateX;
          
          attribute float moveableX;
          attribute float moveableZ;
          
          varying vec3 vColor;
        
          void main() {
           
            float limLen = gridLimits.y - gridLimits.x;
            vec3 pos = position;
            if (floor(moveableX + 0.5) > 0.5) {
              float xDist = translateX;
              float curXPos = mod((pos.x + xDist) - gridLimits.x, limLen) + gridLimits.x;
              pos.x = curXPos;
            }
            if (floor(moveableZ + 0.5) > 0.5) { // if a point has "moveableZ" attribute = 1 
                float zDist = speedZ * time;
                float curZPos = mod((pos.z + zDist) - gridLimits.x, limLen) + gridLimits.x;
                pos.z = curZPos;
              }
               float k = 1.0 - (-pos.z / 50.0);
               vColor = color * k;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
      fragmentShader: `
        varying vec3 vColor;
      
        void main() {
          gl_FragColor = vec4(vColor, 1.); // r, g, b channels + alpha (transparency)
        }
      `,
      vertexColors: THREE.VertexColors
    });

    scene.add(this.grid);

    }

    
    _keydown(event){
        let newSpeedX;
        switch(event.key){
            case 'ArrowLeft':
                newSpeedX = -1.0; break;
            case 'ArrowRight':
                newSpeedX = 1.0; break;
            default:
            return;
        }

        if(this.speedX !== newSpeedX){
          this.speedX = newSpeedX;
          this._rotationPlayer(-this.speedX * 5 * Math.PI / 180, 0.8); //0.8 trwanie animacji rotacji
        }
        
    }

    _keyup(event){
        this.speedX = 0
        this._rotationPlayer(0, 0.5);
    }

    _rotationPlayer(target, delay){
      const $this = this;
      this.rotationLerp = new lerp.Lerp(this.player.rotation.y, target, delay)
        .onUpdate((value)=>{$this.player.rotation.y = value})
        .onFinish(()=>{$this.rotationLerp = null});
    }

    _updateGrid(){
      this.speedZ +=0.005;

        this.grid.material.uniforms.speedZ.value = this.speedZ;
        this.grid.material.uniforms.time.value = this.time;
        this.objectsParent.position.z = this.speedZ * this.time;
        
        this.grid.material.uniforms.translateX.value = this.translateX;
        this.objectsParent.position.x = this.translateX;

        this.objectsParent.traverse((child) =>{
            if(child.userData.type === 'obstacle' || child.userData.type === 'bonus' || child.userData.type === 'heart'){
                const childZPos = child.position.z + this.objectsParent.position.z;

                if(childZPos > 0){
                    if(child.userData.type === 'bonus'){
                      const price = this._setupBonus(child, -this.translateX, -this.objectsParent.position.z)
                      child.userData.price = price; 
                    } 
                    else if (child.userData.type === 'obstacle') 
                    this._setupObstacle(child,  -this.translateX,-this.objectsParent.position.z)
                    else if (child.userData.type === 'heart') 
                    this._setupHeart(child,  -this.translateX,-this.objectsParent.position.z)
                }
                
            }
        })
    }

    _chceckCollisions(){
      this.objectsParent.traverse((child) =>{
        if(child.userData.type === 'obstacle' || child.userData.type === 'bonus' || child.userData.type === 'heart' ){
             // pos in world space
        const childZPos = child.position.z + this.objectsParent.position.z;

        // threshold distances
        const thresholdX = 1.5;
        const thresholdZ = 1.5
        ;

        if (childZPos > -thresholdZ &&Math.abs(child.position.x + this.translateX) < thresholdX) {
          if (child.userData.type === 'obstacle') {
            this.health -= 1;
            this._removeHeartIcon();
            if(soundAudio)
              soundAudio.play('crash');
      
             this._setupObstacle(child,  -this.translateX,-this.objectsParent.position.z) 
            if(this.health==0){
              this._gameOver();
            } 
          
          }
          else if(child.userData.type === 'bonus') {
            this.score += child.userData.price;
            if(soundAudio)
            soundAudio.play('bonus');
            this.ScoreInput.innerText = this.score
            this._createScorePopup(child.userData.price)
            child.userData.price = this._setupBonus(child, -this.translateX, -this.objectsParent.position.z)
          }
          else if(child.userData.type === 'heart') {

           console.log("tu")
            if(this.health<3){
              this.health += 1;
              this._addHeartIcon();
            }
            if(soundAudio)
            soundAudio.play('bonus');
            child.userData.price = this._setupHeart(child, -this.translateX, -this.objectsParent.position.z)
        }
      }

        }
    })
    }

    _updateInfoPanel(){
    }

    _createScorePopup(score){
      const scorePopup = document.createElement('div');
      scorePopup.innerText = `+${score}`;
      scorePopup.className = 'score-popup';
      document.body.appendChild(scorePopup);
      setTimeout(()=> {
        scorePopup.remove();
      },1000)
    }

    _gameOver(){
      this.running = false;
     
      this.gameOverScore.innerText = this.score;
      setTimeout(()=>{
        this.gameOverPanel.style.display = "grid";
        this._reset(true);
      }, 500)
      
    }

    _createPlayer(scene){
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.cube = new THREE.Mesh(geometry, material);
        this.cube.position.set(0,0,1)
        this.cube.scale.setScalar(0.5);
        this.cube.material.transparent = true;
        //scene.add(this.cube)
        
        var parent= new THREE.Object3D();
        const loader = new GLTFLoader();
      
        loader.load('car/scene.gltf', function(gltf){
          gltf.scene.traverse(c => {
            c.castShadow = true ;
          });
         gltf.scene.scale.set(0.5,0.5,0.5);
         gltf.scene.position.set(0,0,-3);
         parent.add(gltf.scene);
         console.log(parent);
        });
        this.player = parent;
        this.player.rotateX(Math.PI)
        this.player.rotateZ(Math.PI)
        console.log(this.player);
        scene.add(this.player);
    }

    _setupScene(scene){
      scene.fog = new THREE.Fog( 0x777777, 0, 10000 );  //mgla (kolor, near, far)


        var light = new THREE.HemisphereLight(0xFF00E7, 0xFF00E7,1)
        light = new THREE.HemisphereLight(0xFF00E7, 0xeff1ff,2)
        scene.add(light)

        var spotLight =  new THREE.SpotLight( 0x053f95, 25,50, Math.PI/2 , 0.9);

        spotLight.position.set(0, 1, 0);
       // spotLight.target.position = 
        //spotLight.add(new THREE.Mesh(this.BONUS_PREFAB, this.BONUS_MATERIAL))
      	//spotLight.layers.set(0);
       scene.add(spotLight);
      
        let materialArray = [];
        let texture_ft = new THREE.TextureLoader().load( 'skybox/front.png');
        let texture_bk = new THREE.TextureLoader().load( 'skybox/left.png');
        let texture_up = new THREE.TextureLoader().load( 'skybox/top.png');
        let texture_dn = new THREE.TextureLoader().load( 'skybox/bottom.png');
        let texture_rt = new THREE.TextureLoader().load( 'skybox/right.png');
        let texture_lf = new THREE.TextureLoader().load( 'skybox/left.png');


         texture_ft.rotateY=Math.Pi
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_rt }));
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_ft }));
      materialArray.push(new THREE.MeshBasicMaterial( { map: texture_bk }));


     
  
      for (let i = 0; i < 6; i++)
        materialArray[i].side = THREE.BackSide;
         
      let skyboxGeo = new THREE.BoxGeometry( 500, 500, 500);
      let skybox = new THREE.Mesh( skyboxGeo, materialArray );
      
       skybox.rotation.x = Math.PI;
       skybox.rotation.z = Math.PI;
       skybox.position.y -=20;
       skybox.position.z -=25
       
       scene.add( skybox );
        
        
          let planeGeometry = new THREE.CubeGeometry( 100, 1, 100 );
    
          let 	plane = new THREE.Mesh( planeGeometry, new THREE.MeshStandardMaterial({color: 0x0c0605}));
          plane.position.y -= 2;
          scene.add(plane);
    }

    _initializeScene(scene, camera, replay){

      if(!replay){

          this._setupScene(scene);
          this._createPlayer(scene);

          this.objectsParent = new THREE.Group();
          scene.add(this.objectsParent)


          for(let i = 0 ; i< 12; i++){
            this._obstacle()
            this._obstacle2();
          }

          for(let i = 0 ; i< 6 ; i++){
            this._bonus()
          }

          this._heart();
          this._heart();
        
          //  camera.rotateX(-30 *Math.PI/180)
           this.camera.position.set(0, 20 ,20)
           //  this.camera.rotateX(-90 *Math.PI/180)
              this.camera.position.set(0, 2 ,5)
           //this.scene.background = new THREE.Color("rgb(129,120,106)")
          
          this._createGrid(scene)
      }
      else{

          this.objectsParent.traverse((item)=>{
            if(item.userData.type === 'obstacle' || item.userData.type === 'bonus' || item.userData.type === 'heart' ){
              if (item.userData.type === 'obstacle') {
                this._setupObstacle(item)
              }
              else if(item.userData.type === 'heart'){
                this._setupHeart(item)
              }
              else{
                item.userData.price = this._setupBonus(item)
              }
                if(this.health==0){
                  this._gameOver();
                }
            }
            else{
              item.position.set(0,0,0);
            }
          })
      }

    
    /*const loader = new THREE.TextureLoader();
    const star = loader.load( 'star.jpg' );
		
    const star2 = loader.load( 'star.png' );
    scene.background = star2;
    var planeMaterial = star
		var planeGeometry = new THREE.CubeGeometry( 5000, 10, 4000 );  //"cienki" prostopadloscian
		var	plane = new THREE.Mesh( planeGeometry, star2 );
		plane.position.y -= 50;
		plane.position.z -=0;
		scene.add( plane ); */
    }

    _addHeartIcon(){
       const heartdiv = document.querySelector('#health-icons');
        const iconHeart = document.createElement('div');
        iconHeart.id = "heartIcon";

        iconHeart.innerHTML= `
        <img class="icon" src="heart_icon.png" alt=""> `;

        heartdiv.appendChild(iconHeart)
    }

    _removeHeartIcon(){
      var el = document.getElementById("heartIcon");
      console.log(el);
      el.remove();
    }

    _obstacle(){
      
        
      var obj= new THREE.Object3D();
      const loader = new GLTFLoader();
    
      loader.load('oc_model4/scene.gltf', function(gltf){
        gltf.scene.traverse(c => {
          c.castShadow = true ;
        });
     /*  gltf.scene.scale.set(0.5,0.5,0.5);
       gltf.scene.position.set(0,0,1);*/
       obj.add(gltf.scene);
       
      });
            obj.rotateY(Math.PI/2);
            this._setupObstacle(obj);
            obj.userData = {type : 'obstacle'}

            obj.scale.set(
            this._randomFloat(1,2),
            this._randomFloat(1,2),
            this._randomFloat(1,2),
        );
            this.objectsParent.add(obj)
            obj.rotateY(Math.PI/2);
     
    }

    _obstacle2(){
      var obj= new THREE.Object3D();
      const loader = new GLTFLoader();
    
      loader.load('oc_model2/scene.gltf', function(gltf){
        gltf.scene.traverse(c => {
          c.castShadow = true ;
        });
     /*  gltf.scene.scale.set(0.5,0.5,0.5);
       gltf.scene.position.set(0,0,1);*/
       obj.add(gltf.scene);
       
      });
            obj.rotateY(Math.PI/2);
            this._setupObstacle(obj);
            obj.userData = {type : 'obstacle'}

            obj.scale.set(
            this._randomFloat(0.5,1),
            this._randomFloat(0.5,1),
            this._randomFloat(0.5,1),
        );
            this.objectsParent.add(obj)
    }

    _setupObstacle(obj, refXPos = 0, refZpos = 0){
        

        obj.position.set(
            refXPos + this._randomFloat(-30,30),
           0,
            refZpos - 100 -this._randomFloat(0,100)
        );
    }

    _bonus(){

        var obj= new THREE.Object3D();
        const loader = new GLTFLoader();
      
        loader.load('stack_of_dollars/scene.gltf', function(gltf){
          gltf.scene.traverse(c => {
            c.castShadow = true ;
          });
       /*  gltf.scene.scale.set(0.5,0.5,0.5);
         gltf.scene.position.set(0,0,1);*/
         obj.add(gltf.scene);
         
        });

        const price = this._setupBonus(obj);
        obj.userData = {type : 'bonus', price}
        this.objectsParent.add(obj)
    }

    _setupBonus(obj, refXPos = 0, refZpos = 0){

        const price = this._randomInit(5,20);
 
        obj.scale.set(10 , 10, 10 );

        obj.position.set(
            refXPos + this._randomFloat(-30,30),
            1,
            refZpos - 100 -this._randomFloat(0,100)
        );

        obj.rotation.x = Math.PI/2


      return price;
    }

    _heart(){
      var obj= new THREE.Object3D();
      const loader = new GLTFLoader();
    
      loader.load('heart/scene.gltf', function(gltf){

     /*  gltf.scene.scale.set(0.5,0.5,0.5);
         gltf.scene.position.set(0,0,1);*/
       obj.add(gltf.scene);
       
      });
     
      obj.userData = {type : 'heart'}
      this._setupHeart(obj);
      this.objectsParent.add(obj)
      obj.rotation.y = Math.PI/2
    }

    _setupHeart(obj, refXPos = 0, refZpos = 0){
      obj.scale.set(0.1 ,0.1, 0.1);

      obj.position.set(
        refXPos + this._randomFloat(-30,30),
        1,
        refZpos - 100 -this._randomFloat(0,100)
    );
    }
    


    _randomInit(min, max){
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random()*(max - min + 1)) + min;
    }

    _randomFloat(min, max){
        return Math.random()*  (max - min) + min;
    };
};
    return {
     Game: Game,
  };
  
})();