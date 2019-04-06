//* переназначаем requestAnimationFrame для устранения возможных конфликтов с разными браузеами  */
var requestAnimationFrame =  window.requestAnimationFrame ||
             window.webkitRequestAnimationFrame ||
             window.mozRequestAnimationFrame ||
             window.oRequestAnimationFrame ||
             window.msRequestAnimationFrame ||
             function (callback) {
                     window.setTimeout(callback, 1000 / 60);
             };
    window.requestAnimationFrame = requestAnimationFrame;

    let planeCnv = document.getElementById('plane');
    let backgroundCnv = document.getElementById('background');
    let obstacleCnv = document.getElementById('obstacle');
    let planeCtx = planeCnv.getContext('2d');
    let obstacleCtx = obstacleCnv.getContext('2d') 
    let backgroundCtx = backgroundCnv.getContext('2d');
    let btnStart = document.getElementById('btn-start');
    let modal = document.getElementById('modal');
    //*Создаем глобальный объект в котором храним основные параметры игры */
    //** loadImage - функция подгрузчик изображений */
    let gameParams = {
        play: false,
        pause: true,
        time: {
            minutes: 0, 
            seconds: 0, 
            ms: 0,
            logo: loadImage('assets/images/clock.png', 24,24),  //иконка для игрового таймера
            timer: function(){
                if(!gameParams.pause){
                    this.seconds = Math.floor(this.ms%1000)
                        if(this.seconds == 60){
                            this.seconds = 0
                            this.ms = 0
                            this.minutes++
                        }
                        setTimeout(() => {
                        
                                this.ms++;
                                this.timer()
                            
                    }, 1000);
                }
            }
        },
        plane: {
            img: 'assets/images/airplane.png', //изображение самолета
            imgFuel: 'assets/images/fuel.png', //изображение топливного бака для индикатора топлива
            width: 110,  //размеры самолета
            height: 40,
            fuel: 10, //вместимость бензобака
            fuelConsumption: 1, //расход топлива за 100мс
            fallingSpeed: 1 //скрость свободного падения
        },
        clouds: {
            cloudsImg:[
                //Массив изображения облаков
                {image:'assets/images/clouds/cloud-1.png',width:226,height:111},
                {image:'assets/images/clouds/cloud-2.png',width:294,height:99},
                {image:'assets/images/clouds/cloud-3.png',width:467,height:172},
                {image:'assets/images/clouds/cloud-4.png',width:201,height:83},
                {image:'assets/images/clouds/cloud-5.png',width:375,height:159},
                {image:'assets/images/clouds/cloud-6.png',width:273,height:128},
                {image:'assets/images/clouds/cloud-7.png',width:340,height:159},
            ]
        },
        obstacle: {
            //возможные преграды - птицы, парашюты, звезды, и шанс их появления в %
            stars: {
                img: loadImage('assets/images/star.png', 28,24),
                count: 0,
                chance: 15  //шанс появления звезды
            },
            parachute:{
                img: loadImage('assets/images/parachute.png',41,40),
                chance: 25 //шанс появления парашюта
            },
            bird: {
                img: loadImage('assets/images/sprite.png',4096,512,8),
                chance: 60 //шанс появления птицы
            }
        },
        //размеры канваса
        gameWindow:{
            width: 1024,
            height: 768
        },
        volume: {
            music: 0.2,// громкость игровой музыки
            effects: 0.2// громкость игровых эффектов
        } 
    }



    let canvas = document.querySelectorAll('.canvas')
    //* устанавливаем канвасу размеры и стили необходимые */
    for(let i = 0; i<canvas.length; i++){
        canvas[i].setAttribute('width', gameParams.gameWindow.width)
        canvas[i].setAttribute('height', gameParams.gameWindow.height)
    }
    backgroundCtx.font = "18px Filmotype Quiet";
    backgroundCtx.fillStyle = "red";

    //основной объект самолета 
    let plane = {
        img: loadImage(gameParams.plane.img,gameParams.plane.width,gameParams.plane.height),
        fuelLogo: loadImage(gameParams.plane.imgFuel,17,24),  
        fuel: gameParams.plane.fuel,
        x: 457,
        y: 324,
        state: false,
        actions: function(){
            this.drop()
        },
        drop: function(){
            this.y+= gameParams.plane.fallingSpeed // функция свободного падения
        },
        up: function(){
            this.y-= 3    //функция подъема самолета вверх
        },
        down: function(){
            this.y+= 3  //функция опускания самолета вниз
        },
        fuelConsumption: function(){
            if(!gameParams.pause && gameParams.play ){
                setTimeout(() => {
                    this.fuel-= gameParams.plane.fuelConsumption;  //функция расхода топлива
                    this.fuelConsumption();  
                }, 1000);
            }       
        }
    }
    // конструктор создания облаков
    let Cloud = function(img,w,h,x,y,speed){
        this.image = img;
        this.width = w;
        this.height = h;
        this.x = x;
        this.y = y;
        this.speed = speed;
    }
    Cloud.prototype = {
        move: function(){
            this.x -= this.speed
        }
    }

    let parachuteAudio = loadAudio(['assets/audio/parachute.mp3'],gameParams.volume.music)
// конструктор создания парашютов
    let Parachute = function(x,y,w,h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    Parachute.prototype = {
        img: gameParams.obstacle.parachute.img,
        move: function(){
            this.x -= 1  //функция движения парашюта
            this.y+= 1
        },
        audio: loadAudio(['assets/audio/parachute.mp3'],gameParams.volume.music),
        //функция проверки на пересечения с самолетом
        checkplane: function(){
            let polygonParachute = [{x:this.x,y:this.y},{x:this.x+40,y:this.y},{x:this.x+27,y:this.y+40},{x:this.x+13,y:this.y+40}]
            let polygonPlane = [{x:plane.x,y:plane.y},{x:plane.x+110,y:plane.y+13},{x:plane.x+91,y:plane.y+31},{x:plane.x+14,y:plane.y+35}]
            for (var i = 0; i < polygonParachute.length; i++) {
                    var p0 = polygonParachute[i],
                        p1 = polygonParachute[(i + 1) % polygonParachute.length];

                    for (var j = 0; j < polygonPlane.length; j++) {
                        var p2 = polygonPlane[j],
                            p3 = polygonPlane[(j + 1) % polygonPlane.length];

                        if (segmentIntersect(p0, p1, p2, p3)) {
                            parachuteAudio.play()
                            plane.fuel = gameParams.plane.fuel
                            this.width = 0;
                            this.height = 0;
                            this.x = 0;
                            this.y = 0;
                            return true;
                        }
                    }
                }
                return false;
        }
    }
    // конструктор создания здвезд
    let Star = function(x,y,w,h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    Star.prototype = {
        img: gameParams.obstacle.stars.img,
        move: function(){
            this.x -= 1
            this.y+= 1
        },
        audio: loadAudio(['assets/audio/star.mp3'],gameParams.volume.music),
        //функция проверки на пересечения с самолетом
        checkplane: function(){
            let polygonParachute = [{x:this.x,y:this.y},{x:this.x+this.width,y:this.y},{x:this.x+this.width,y:this.y+24},{x:this.x,y:this.y+24}]
            let polygonPlane = [{x:plane.x,y:plane.y},{x:plane.x+110,y:plane.y+13},{x:plane.x+91,y:plane.y+31},{x:plane.x+14,y:plane.y+35}]
            for (var i = 0; i < polygonParachute.length; i++) {
                    var p0 = polygonParachute[i],
                        p1 = polygonParachute[(i + 1) % polygonParachute.length];
                    for (var j = 0; j < polygonPlane.length; j++) {
                        var p2 = polygonPlane[j],
                            p3 = polygonPlane[(j + 1) % polygonPlane.length];

                        if (segmentIntersect(p0, p1, p2, p3)) {
                            this.audio.play()
                            gameParams.obstacle.stars.count++
                            this.width = 0;
                            this.height = 0;
                            this.x = 0;
                            this.y = 0;
                            return true;
                        }
                    }
                }
                return false;
        }
    }

    
    // конструктор создания птиц
    let Bird = function(x,y,w,h,speed){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.num = 1;
        this.speed = speed;
    }
    Bird.prototype = {
        img : gameParams.obstacle.bird.img,
        move: function(){
            this.x -= this.speed
        },
        audio: loadAudio(['assets/audio/bird.mp3'],gameParams.volume.music),
        checkplane: function(){
            let polygonParachute = [{x:this.x+15,y:this.y+25},{x:this.x+60,y:this.y+25},{x:this.x+51,y:this.y+43},{x:this.x+13,y:this.y+40}]
            let polygonPlane = [{x:plane.x,y:plane.y},{x:plane.x+110,y:plane.y+13},{x:plane.x+91,y:plane.y+31},{x:plane.x+14,y:plane.y+35}]
            for (var i = 0; i < polygonParachute.length; i++) {
                    var p0 = polygonParachute[i],
                        p1 = polygonParachute[(i + 1) % polygonParachute.length];

                    for (var j = 0; j < polygonPlane.length; j++) {
                        var p2 = polygonPlane[j],
                            p3 = polygonPlane[(j + 1) % polygonPlane.length];

                        if (segmentIntersect(p0, p1, p2, p3)) {
                            this.width = 0;
                            this.height = 0;
                            this.x = 0;
                            this.y = 0;
                            this.audio.play()
                           gameOver()
                            return true;
                        }
                    }
                }
                return false;
        }
    }
    //функция для сверки координат преграды и самолета
    function segmentIntersect(p0, p1, p2, p3) {
            var A1 = p1.y - p0.y,
                B1 = p0.x - p1.x,
                C1 = A1 * p0.x + B1 * p0.y,
                A2 = p3.y - p2.y,
                B2 = p2.x - p3.x,
                C2 = A2 * p2.x + B2 * p2.y,
                denominator = A1 * B2 - A2 * B1;

            if (denominator == 0) {
                return null;
            }

            var intersectX = (B2 * C1 - B1 * C2) / denominator,
                intersectY = (A1 * C2 - A2 * C1) / denominator,
                rx0 = (intersectX - p0.x) / (p1.x - p0.x),
                ry0 = (intersectY - p0.y) / (p1.y - p0.y),
                rx1 = (intersectX - p2.x) / (p3.x - p2.x),
                ry1 = (intersectY - p2.y) / (p3.y - p2.y);

            if (((rx0 >= 0 && rx0 <= 1) || (ry0 >= 0 && ry0 <= 1)) &&
                ((rx1 >= 0 && rx1 <= 1) || (ry1 >= 0 && ry1 <= 1))) {
                return {
                    x: intersectX,
                    y: intersectY
                };
            }
            else {
                return null;
            }
        }
    //загружаем изображения облаков     
    function getCloudsImg(){
    let clouds = []
        for(cloudImg of gameParams.clouds.cloudsImg){
            let cloud = loadImage(cloudImg.image,cloudImg.width,cloudImg.height )
            clouds.push(cloud)
        }
        return clouds
    }
    let cloudsImg = getCloudsImg()

    let clouds = []
    //произвольно рендерим их справой стороны экрана
    function getClouds(){
        if(!gameParams.pause && gameParams.play){
            let random = Math.floor(Math.random() * cloudsImg.length) //получаем случайный индекс элемента массива
            let randomY = (Math.floor(Math.random() * 660))-15 //поулчаем случайную высоту для отрисовки в пределах высота экрана
            let randomTime = Math.floor(Math.random() * 5000) //случайное время для повторного вызова функции в течении 5 секунд
            let cloud = new Cloud(cloudsImg[random].dom,cloudsImg[random].width,cloudsImg[random].height,1024,randomY,2)  //добавляем случайные облака в массив из которого будет в дальнейшем отрисовывать их
            clouds.push(cloud)
            setTimeout(() => {
                getClouds()
            }, randomTime);
        }
    } 
    
    
    let obstacle = []
    //получаем случайную преграду на пути
    function getRandomObstacle(){
        if(!gameParams.pause && gameParams.play){
            let random = Math.floor(Math.random() * 100)
            let randomX = (Math.floor(Math.random() * (gameParams.gameWindow.width/2)))+(gameParams.gameWindow.width/1.75)
            let randomY = (Math.floor(Math.random() * 660))-15
            let randomTime = Math.floor(Math.random() * 1500)
            let randomBirdSpeed = Math.floor(Math.random() * 4)+1
            let birdChance = gameParams.obstacle.bird.chance;
            let starChance = gameParams.obstacle.stars.chance;
            //взависимости от шанса добавляем преграды в массив из которого в дальнейшем будем их отрисовывать
            if(random <= birdChance){
                obstacle.push(new Bird(1024,randomY,gameParams.obstacle.bird.img.width,gameParams.obstacle.bird.img.height,randomBirdSpeed))
            }else if(random > birdChance && random < starChance+birdChance){
                obstacle.push(new Parachute(randomX ,-30, gameParams.obstacle.parachute.img.width,gameParams.obstacle.parachute.img.height))
            }else{
                obstacle.push(new Star(randomX ,-30, gameParams.obstacle.stars.img.width,gameParams.obstacle.stars.img.height))
            }
            setTimeout(() => {
                getRandomObstacle()
            }, randomTime);
        }
    }
    //отрисовываем облака из массива
    function drawClouds(){
        for(let i = 0; i<clouds.length; i++){        
            clouds[i].move()
            backgroundCtx.drawImage(clouds[i].image,clouds[i].x,clouds[i].y,clouds[i].width,clouds[i].height);
            if(clouds[i].x <= -1000){
                clouds.splice(i,1) //удаляем облако из массива после его выхода за пределы экрана для особождения памяти
            }
        }
    }
    //отрисовываем преграды из массыва
    function drawObstacle(){
        for(let i = 0; i<obstacle.length; i++){
            
            obstacle[i].move() //двигаем преграды
            obstacle[i].checkplane() //провеяем на наличие пересечений с самолетом
            if(obstacle[i].img.count == 1){
                //если у изображения один слайд рисуем его полностью
                obstacleCtx.drawImage(obstacle[i].img.dom,obstacle[i].x,obstacle[i].y,obstacle[i].width,obstacle[i].height)
            }else{
                //если изображение имеет несколько слайдов, для его анимации рисуем его частами и сдигаем на 1 слайд при каждом шаге
                if (obstacle[i].num>= obstacle[i].img.count) {obstacle[i].num = 0};
                obstacleCtx.drawImage(obstacle[i].img.dom,(obstacle[i].width/8)*obstacle[i].num,0,obstacle[i].width/8,obstacle[i].height,obstacle[i].x,obstacle[i].y,64,64)
                obstacle[i].num++;
            }
            if(obstacle[i].x<=-500){
                obstacle.splice(i,1) //если преграда вышла за пределы экрана, удаляем ее из массива для особождения памяти
            }
        }
    }
    //отрисовываем игровое время
    function drawTime(){
        let time = gameParams.time.seconds
        if(gameParams.time.minutes) {
            time = gameParams.time.minutes +' : '+gameParams.time.seconds
            
        }
        backgroundCtx.drawImage(gameParams.time.logo.dom, 105, 5, gameParams.time.logo.width,gameParams.time.logo.height)
        backgroundCtx.fillText(time,140,23)
    }
    //отрисовываем топливо
    function drawFuel(){
        let fuelCurrentPercent = (plane.fuel/gameParams.plane.fuel)*100
        backgroundCtx.drawImage(plane.fuelLogo.dom,13,119,plane.fuelLogo.width,plane.fuelLogo.height);
        backgroundCtx.rect(40,143,20,-fuelCurrentPercent);
        backgroundCtx.fillRect(40,143,20,-fuelCurrentPercent)
        if(plane.fuel <= 0){
            gameOver()   //если топливо кончилось игра окончена
        }
    }
    //отрисовываем количество собраных звезд
    function drawStarsCount(){
        backgroundCtx.drawImage(gameParams.obstacle.stars.img.dom,10,5,gameParams.obstacle.stars.img.width-3,gameParams.obstacle.stars.img.height-2);
        backgroundCtx.fillText(gameParams.obstacle.stars.count,45,23)
    }

    //отрисовываем самолет
    function drawPlane(){

        if(plane.y > gameParams.gameWindow.height-plane.img.height || plane.y < 0){
            gameOver() // если самолет вышел за пределы экрана ->
        }
        if(plane.x > gameParams.gameWindow.width-plane.img.width || plane.x < 0 ){
            gameOver() // <- игра окончена 
        }
        plane.actions(); //выполняем различные действия самолетом в зависимоти от манипуляции игроком
        planeCtx.drawImage(plane.img.dom,plane.x,plane.y,plane.img.width,plane.img.height);
    }

    //функция запуска игры
    function startGame(){
        gameParams.play = !gameParams.play;
        gameParams.obstacle.stars.count = 0;
        gameParams.time.ms = 0;
        gameParams.time.minutes = 0;
        plane.fuel = gameParams.plane.fuel
        plane.x = 457;
        plane.y = 324;
        clouds = [];
        obstacle = [];
        gamePause();
        setTimeout(() => {
            plane.fuelConsumption();  //Включаем расход топлива через 5 секунд после старта
        }, 5000);
    }
    //функция приостановки игры
    function gamePause(){
        gameParams.pause = !gameParams.pause
        if(!gameParams.pause){
            theme.play()
        }else{
            theme.pause()
        }
        gameParams.time.timer();
        gameLoop();
        getClouds();
        getRandomObstacle();

    }
    //функция проигрыша 
    function gameOver(){
        endOfFuel.play()
        plane.state = true;
        gameParams.pause = !gameParams.pause
        gameParams.play = !gameParams.play;
        theme.pause()  //останавливаем музыку
        setTimeout(() => {
            modal.style.display = "flex"
            plane.state = false;
        }, 50);
    }

    //функция подгрузчик изображения для канваса
    function loadImage(path,width,height,count){
        let image = document.createElement('img');
        let result = {
            dom: image,
            width: width,
            height: height,
            count: count || 1,
            loaded: false
        }
        image.onload = function(){
            result.loaded = true;
        }
        image.src = path;
        return result;
    }
    //игровая петля для анимирования и отображения каких-либо изменений на экране
    function gameLoop(){
        if(!gameParams.pause){
            planeCtx.clearRect(0,0,1024,768);
            backgroundCtx.clearRect(0,0,1024,768);
            obstacleCtx.clearRect(0,0,1024,768);
            drawPlane()
            drawClouds();
            drawObstacle()
            drawTime();
            drawFuel();
            drawStarsCount();
            requestAnimationFrame(gameLoop);
        }
    }
    //отслеживания команд от пользователя
    document.onkeydown = function(e){
        //Пауза
        if(e.keyCode == 27 ){  // escape
            if(gameParams.play){
                gamePause();
            }
            
        }
        //движение вверх
        if(e.keyCode == 87 || e.keyCode == 38){  // W или cтрелочка вверх
           if(!plane.state){
            plane.state = true
            plane.actions = plane.up
            setTimeout(() => {
                plane.actions = plane.drop
                plane.state = false
            }, 300);
           }
            
        }
        //движение вниз
        if(e.keyCode == 83 || e.keyCode == 40){ // S или cтрелочка вниз
            if(!plane.state){
                plane.state = true
                plane.actions = plane.down
                setTimeout(() => {
                    plane.actions = plane.drop
                    plane.state = false
                }, 300);
           }
        }
        //движение влево 
        if(e.keyCode == 65 || e.keyCode == 37) {  // А или cтрелочка влево
            plane.x-=8;
            }
        //движение вправо 
        if(e.keyCode == 68 || e.keyCode == 39){ // D или стрелочка вправо
            plane.x+=8;
        }
        if(e.keyCode == 80){
            theme.stop()
        }
    }
    //функция подгрузчик аудио
    function loadAudio(arr, vol){
        var audio = document.createElement('audio');
        for(var i = 0, len=arr.length; i<len; i+=1) {
        var source = document.createElement('source');
        source.src = arr[i];
        audio.appendChild(source);
        }
        
        audio.volume = vol || 1;
    var a= {
        dom: false,
        state: 'stop',
        play: function(){
            this.dom.currentTime = 0;
            this.dom.play();
            this.state = 'play';
        },
        pause: function(){
            this.dom.pause();
            this.state = 'pause';
        },
        stop: function(){
            this.dom.pause();
            this.dom.currentTime = 0;
            this.state = 'stop';
        },
        setVolume : function(vol){
        this.dom.volume = vol;
        }
    }
    a.dom  = audio;
        return a;
    }
    var theme = loadAudio(['assets/audio/theme.mp3'],gameParams.volume.music);
    var endOfFuel = loadAudio(['assets/audio/endOfFuel.mp3'],gameParams.volume.music);
    //клик по кнопке страрта игры
    btnStart.onclick = function(){
        modal.style.display = "none"
        startGame()
    }
    

