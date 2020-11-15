'use strict';

//const socket = io();

let MAX_NAME_LENGTH = 32;
let MAP_WIDTH = 500;
let MAP_HEIGHT = 500;
let PIXEL_SIZE = 14;
let CAMERA_SPEED = 0.25;
let MAX_STARS = 2500;

let PLAYER_ID = -1;
let WORLD_SCALE = 1.0;
let isMobile = false;

const pixelRatio = window.devicePixelRatio;
// const ratioPixelSize = PIXEL_SIZE * pixelRatio;
// const adjustedWidth = Math.floor(ratioPixelSize * MAP_WIDTH);
// const adjustedHeight = Math.floor(ratioPixelSize * MAP_HEIGHT);

let backgroundImage;
let game;
let grid;
let cameraFollow;

let map;
let food;
let tails;
let players;
let names;
let ui;

let toolKeys;
let wasdKeys;
let arrowKeys;
let powerKeys;
let mouse;
let mouseWheel;
let uiTouchControl;
let uiGamepad;
let uiButton;

let elements = {};

/* Server ping */
let startTime;


const decode = (msg = '') => {
    return JSON.parse(msg);
};
const encode = (msg = {}) => {
    const strMsg = JSON.stringify(msg);
    const encoder = new TextEncoder();
    const view = encoder.encode(strMsg);
    return view;
};

const ws = new WebSocket('ws://' + window.location.host + ':1337');
ws.binaryType = 'ArrayBuffer';
ws.onerror = (evt) => {
    console.log('error', evt);
};
ws.onclose = (evt) => {
    console.log('close', evt);
};
ws.onopen = (evt) => {
    // console.log('open', evt);
    setInterval(() => {
        startTime = Date.now();
        // ws.send(JSON.stringify({t: 1}));
        ws.send(encode({t: 1}));
    }, 2000);
};
ws.onmessage = (messsage) => {
    // const msg = JSON.parse(messsage.data) || messsage;
    // console.log('messsage', messsage);
    const msg = decode(messsage.data) || messsage;
    // console.log('msg', msg);
    switch (msg.t) {
        case 0: // gamestate
            gamestate(msg);
            break;
        case 1: // death
            death(msg);
            break;
        case 2: // spawn
            spawn(msg);
            break;
        case 3: // id
            const tmpConf = msg.conf;
            MAX_NAME_LENGTH = tmpConf.MAX_NAME_LENGTH;
            MAP_WIDTH = tmpConf.MAP_WIDTH;
            MAP_HEIGHT = tmpConf.MAP_HEIGHT;
            PIXEL_SIZE = tmpConf.PIXEL_SIZE;
            CAMERA_SPEED = tmpConf.CAMERA_SPEED;
            PLAYER_ID = msg.pId;
            console.log('Your id is ' + PLAYER_ID);
            break;
        case 4: // pong
            const latency = Date.now() - startTime;
            const fast = (latency < 100);
            elements.pingBadge.classList.remove((fast ? 'badge-danger' : 'badge-success'));
            elements.pingBadge.classList.add((fast ? 'badge-success' : 'badge-danger'));
            elements.serverPing.textContent = latency;
            break;
        default:
    };
};

/*
setInterval(() => {
  startTime = Date.now();
  socket.emit('ping2');
}, 2000);

socket.on('pong2', () => {
	let latency = Date.now() - startTime;
    const fast = (latency < 100);
    elements.pingBadge.classList.remove((fast ? 'badge-danger' : 'badge-success'));
    elements.pingBadge.classList.add((fast ? 'badge-success' : 'badge-danger'));
	elements.serverPing.textContent = latency;
});
*/
const emitKeyPress = (inputId) => {
    // ws.send(JSON.stringify({t: 0, key: inputId}));
    ws.send(encode({t: 0, key: inputId}));
//    socket.emit('keyPress', {
//        inputId: inputId,
//        state: true
//    });
};

/* Init game engine*/
const preload = () => {
    isMobile = game.device.touch;
//    isMobile = (game.device.touch && !game.device.mspointer);
	game.load.image('FoodType0', '/client/img/sprite/FoodType0.png');
	game.load.image('FoodType1', '/client/img/sprite/FoodType1.png');
	game.load.image('FoodType2', '/client/img/sprite/FoodType2.png');
	game.load.image('FoodType3', '/client/img/sprite/FoodType3.png');
	game.load.image('FoodType4', '/client/img/sprite/FoodType4.png');
	game.load.image('FoodType5', '/client/img/sprite/FoodType5.png');
	game.load.image('FoodType6', '/client/img/sprite/FoodType6.png');
	game.load.image('FoodType7', '/client/img/sprite/FoodType7.png');
	game.load.image('FoodType8', '/client/img/sprite/FoodType8.png');
	game.load.image('FoodType9', '/client/img/sprite/FoodType9.png');
	game.load.image('FoodType10', '/client/img/sprite/FoodType10.png');
	game.load.image('FoodType11', '/client/img/sprite/FoodType11.png');
	game.load.image('FoodType12', '/client/img/sprite/FoodType12.png');
    if (isMobile) {
        game.load.image('uiButtons', '/client/img/game/uiButtons.png');
    };
//    game.kineticScrolling = game.plugins.add(Phaser.Plugin.KineticScrolling);
};

const create = () => {
    if (isMobile) {
        WORLD_SCALE = 2.0;
    };
    game.stage.smoothed = false;
    game.stage.backgroundColor = "#000";
    game.stage.disableVisibilityChange = true;
    game.world.useHandCursor = true;
    game.world.setBounds(0, 0, MAP_WIDTH * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);
    game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE);

	game.scale.parentIsWindow = false;

    map = game.add.group();
	food = game.add.group();
	tails = game.add.group();
	players = game.add.group();
	names = game.add.group();
    ui = game.add.group();
    game.world.sendToBack(map);
    game.world.bringToTop(food);
    game.world.bringToTop(tails);
    game.world.bringToTop(players);
    game.world.bringToTop(names);
    game.world.bringToTop(ui);

	// backgroundSprite = game.add.tileSprite(0, 0, MAP_WIDTH * ratioPixelSize, MAP_HEIGHT * ratioPixelSize, 'background1');
    // backgroundSprite.alpha = 1;
    if (!isMobile) {
        game.create.grid('grid', MAP_WIDTH * PIXEL_SIZE * pixelRatio, MAP_HEIGHT * PIXEL_SIZE * pixelRatio, PIXEL_SIZE * pixelRatio, PIXEL_SIZE * pixelRatio, 'rgba(255,255,255,0.2)', true, () => {
            grid = game.add.image(0, 0, 'grid', 0);
            map.add(grid);
        });
    };

	game.camera.x = game.world.centerX;
	game.camera.y = game.world.centerY;
	game.camera.roundPx = true;
	cameraFollow = game.add.sprite(game.world.centerX, game.world.centerY);
	// game.camera.follow(cameraFollow, Phaser.Camera.FOLLOW_LOCKON, (CAMERA_SPEED / PIXEL_SIZE), (CAMERA_SPEED / PIXEL_SIZE));

	let g = game.add.graphics(0, 0);

	g.beginFill(0xFF0000, 0.5);
	g.drawRect(0, 0, MAP_WIDTH * PIXEL_SIZE, PIXEL_SIZE);
	g.drawRect(0, 0, PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);

	g.drawRect(0, (MAP_HEIGHT - 1) * PIXEL_SIZE, MAP_WIDTH * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);
	g.drawRect((MAP_WIDTH - 1) * PIXEL_SIZE, 0, (MAP_HEIGHT) * PIXEL_SIZE, MAP_HEIGHT * PIXEL_SIZE);
	g.endFill();
    map.add(g);

    const randomCoordsOffGrid = () => {
        return {
            x: ((Math.random() * (MAP_WIDTH * PIXEL_SIZE - 4)) + 2) | 0,
            y: ((Math.random() * (MAP_HEIGHT * PIXEL_SIZE - 4)) + 2) | 0
        };
    };

    const STARS = Array.from({length: (isMobile) ? (MAX_STARS / 2) : MAX_STARS}, () => {
        const tmpCoords = randomCoordsOffGrid();
        return {
            x: tmpCoords.x,
            y: tmpCoords.y,
            d: ((Math.random() * 5) + 1) | 0,
            b: ((Math.random() * (10 - 6) + 6) | 0) / 10
        };
    });

    for (let i = STARS.length - 1; i > -1; --i) {
        const tmpItem = STARS[i];
        const s = game.add.graphics(0, 0);
        s.beginFill(0xFFFFFF, tmpItem.b);
        s.drawCircle(tmpItem.x, tmpItem.y, tmpItem.d);
        s.endFill();
        map.add(s);
    };

    if (isMobile) {
        game.input.pointer1 = game.input.addPointer();
        game.input.pointer2 = game.input.addPointer();
        game.input.pointer3 = game.input.addPointer();
        game.input.pointer4 = game.input.addPointer();
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.RESIZE;
        game.scale.forceOrientation(true, false);
        // game.scale.startFullScreen(false, false, { navigationUI: 'hide' });
        // game.scale.enterIncorrectOrientation(callback, this);
        // game.scale.leaveIncorrectOrientation(callback, this);
        // game.scale.onOrientationChange.add(() => { console.log(game.scale.screenOrientation); });
        // 'portrait-primary', 'landscape-primary', 'portrait-secondary', 'landscape-secondary'
        uiButton = game.add.button(0, 0, 'uiButtons', (evt) => {
            console.log(evt);
        });
        uiButton.anchor.set(0.5, 0.5);
        uiButton.width = 250;
        uiButton.height = 250;
        uiButton.fixedToCamera = true;
        uiButton.cameraOffset.setTo(135, 135);
        uiButton.alpha = 0.5;
        ui.add(uiButton);
    } else {
        toolKeys = game.input.keyboard.addKeys({
            g: Phaser.Keyboard.G,
            minus: Phaser.Keyboard.MINUS,
            plus: Phaser.Keyboard.PLUS,
            numpadMinus: Phaser.Keyboard.NUMPAD_SUBTRACT,
            numpadPlus: Phaser.Keyboard.NUMPAD_ADD
        });
        toolKeys.g.onDown.add(() => { grid.visible = !grid.visible; });
        toolKeys.minus.onDown.add(() => { WORLD_SCALE -= 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
        toolKeys.plus.onDown.add(() => { WORLD_SCALE += 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
        toolKeys.numpadMinus.onDown.add(() => { WORLD_SCALE -= 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });
        toolKeys.numpadPlus.onDown.add(() => { WORLD_SCALE += 0.1; game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE); });

        arrowKeys = game.input.keyboard.createCursorKeys();
        wasdKeys = game.input.keyboard.addKeys({
            up: Phaser.Keyboard.W,
            down: Phaser.Keyboard.S,
            left: Phaser.Keyboard.A,
            right: Phaser.Keyboard.D
        });
    // Directions: 0 = up (-y), 1 = right (+x), 2 = down = (+y), 3 = left (-x)
        arrowKeys.up.onDown.add(() => { emitKeyPress(0); });
        arrowKeys.down.onDown.add(() => { emitKeyPress(2); });
        arrowKeys.left.onDown.add(() => { emitKeyPress(3); });
        arrowKeys.right.onDown.add(() => { emitKeyPress(1); });
        wasdKeys.up.onDown.add(() => { emitKeyPress(0); });
        wasdKeys.down.onDown.add(() => { emitKeyPress(2); });
        wasdKeys.left.onDown.add(() => { emitKeyPress(3); });
        wasdKeys.right.onDown.add(() => { emitKeyPress(1); });

        powerKeys = game.input.keyboard.addKeys({
            shift: Phaser.Keyboard.SHIFT
        });
        powerKeys.shift.onDown.add(() => { emitKeyPress(4); });

        // mouse = game.input.mouse;
    };
};

const update = () => {
    if (isMobile) {
        if (game.input.pointer1.isDown && game.input.pointer2.isDown) {
            if (game.origPinchPoint1 && game.origPinchPoint2) {
                if ((game.origPinchPoint1.x >= game.input.pointer1.position.x)
                    && (game.origPinchPoint2.x >= game.input.pointer2.position.x)
                    && (game.origPinchPoint1.y >= game.input.pointer1.position.y)
                    && (game.origPinchPoint2.y >= game.input.pointer2.position.y))
                {
                    WORLD_SCALE -= 0.1;
                    game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE);
                } else if ((game.origPinchPoint1.x <= game.input.pointer1.position.x)
                    && (game.origPinchPoint2.x <= game.input.pointer2.position.x)
                    && (game.origPinchPoint1.y <= game.input.pointer1.position.y)
                    && (game.origPinchPoint2.y <= game.input.pointer2.position.y))
                {
                    WORLD_SCALE += 0.1;
                    game.world.scale.setTo(WORLD_SCALE, WORLD_SCALE);
                };
            };
            game.origPinchPoint1 = game.input.pointer1.position.clone();
            game.origPinchPoint2 = game.input.pointer2.position.clone();
        } else  if (game.input.pointer1.isDown) {
            if (game.origDragPoint) { // move the camera by the amount the mouse has moved since last update
                game.camera.x += game.origDragPoint.x - game.input.pointer1.position.x;
                game.camera.y += game.origDragPoint.y - game.input.pointer1.position.y;
            };
            game.origDragPoint = game.input.pointer1.position.clone();	// set new drag origin to current position
        } else {
            game.origDragPoint = null;
            game.origPinchPoint1 = null;
            game.origPinchPoint2 = null;
        };
    } else {
        game.input.enabled = (game.input.activePointer.withinGame && (document.activeElement !== elements.name));
        if (!game.input.enabled) { return; };
        if (game.input.activePointer.isDown) {
            if (game.origDragPoint) { // move the camera by the amount the mouse has moved since last update
                game.camera.x += game.origDragPoint.x - game.input.activePointer.position.x;
                game.camera.y += game.origDragPoint.y - game.input.activePointer.position.y;
            };
            game.origDragPoint = game.input.activePointer.position.clone();	// set new drag origin to current position
        } else {
            game.origDragPoint = null;
        };
    };
};

/* Socket events */
//socket.on('id', (data) => {
//	PLAYER_ID = data.id;
//    MAX_NAME_LENGTH = data.config.MAX_NAME_LENGTH;
//    MAP_WIDTH = data.config.MAP_WIDTH;
//    MAP_HEIGHT = data.config.MAP_HEIGHT;
//    PIXEL_SIZE = data.config.PIXEL_SIZE;
//    CAMERA_SPEED = data.config.CAMERA_SPEED;
//	console.log('Your id is ' + PLAYER_ID);
//});

// socket.on('death', (data) => {
const death = (data) => {
	elements.totalScore.textContent = data.score;
	elements.finalScore.style.display = 'block';
	elements.menu.style.display = 'block';
    setTimeout(() => {
        elements.menu.classList.remove('fadeOut', 'ms500');
        elements.playerInfo.classList.remove('fadeIn', 'ms500');
        elements.menu.classList.add('fadeIn', 'ms1000');
        elements.playerInfo.classList.add('fadeOut', 'ms1000');
        setTimeout(() => { elements.playerInfo.style.display = 'none'; }, 1000);
		elements.btnPlay.focus();
	}, 1000);
    game.camera.target = null;
};

// socket.on('spawn', (data) => {
const spawn = (data) => {
    elements.menu.classList.remove('fadeIn', 'ms1000');
    elements.playerInfo.classList.remove('fadeOut', 'ms1000');
    elements.menu.classList.add('ms500', 'fadeOut');
    setTimeout(() => { elements.menu.style.display = 'none'; }, 500);
    elements.playerInfo.classList.add('ms500', 'fadeIn');
    elements.playerInfo.style.display = 'inline-block';
	try {
		game.camera.follow(null, Phaser.Camera.FOLLOW_LOCKON, 1, 1);
		game.camera.x = data.x * PIXEL_SIZE;
		game.camera.y = data.y * PIXEL_SIZE;
		game.camera.follow(cameraFollow, Phaser.Camera.FOLLOW_LOCKON, (CAMERA_SPEED / PIXEL_SIZE), (CAMERA_SPEED / PIXEL_SIZE));
	} catch(err) {
		console.log(err);
	};
};

// socket.on('gamestate', (data) => {
const gamestate = (data) => {
    if (players == undefined || tails == undefined || food == undefined || names == undefined) {
		console.log('Waiting for engine to start...');
		return;
	};

    let leaderboardcontent = '';
	while (data.leaderboard.length > 0) {
		const entry = data.leaderboard.pop();
		leaderboardcontent += '<div class="lb-entry ' + ((entry.id === PLAYER_ID) ? 'lb-entry-self' : '') + '">' + (entry.place + 1) + ': ' + encodeHTML(entry.name) + '</div>';
	};

	elements.leaderboardContent.innerHTML = leaderboardcontent;

	food.removeAll();
	for (let i = data.food.length - 1; i > -1; --i) {
		const foodData = data.food[i];
        if (foodData && foodData.type) {
            const g = game.add.sprite((foodData.x * PIXEL_SIZE) - 1, (foodData.y * PIXEL_SIZE) - 1, 'FoodType' + foodData.type);
            g.width = PIXEL_SIZE * pixelRatio + 4;
            g.height = PIXEL_SIZE * pixelRatio + 4;
            food.add(g);
        };
	};

	tails.removeAll();
	for (let i = data.playerTails.length - 1; i > -1; --i) {
		const tail = data.playerTails[i];
		const g = game.add.graphics(tail.x * PIXEL_SIZE, tail.y * PIXEL_SIZE);
		g.beginFill(hslToHex(tail.color, 100, 25), 1);
		g.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
		g.endFill();
        tails.add(g);
	};

	players.removeAll();
	names.removeAll();
	for (let i = data.players.length - 1; i > -1; --i) {
		const player = data.players[i];
        const playerX = player.x * PIXEL_SIZE;
        const playerY = player.y * PIXEL_SIZE;

		if (player.id === PLAYER_ID) {
			cameraFollow.x = playerX;
			cameraFollow.y = playerY;
            const prevScore = elements.playerScore.textContent;
            const score = player.score;
            if (prevScore !== score) {
                const floatingScore = new FloatingText(game, {
                    text: score - prevScore,
                    animation: "smoke",
                    distance: 70,
                    textOptions: {
                        fontSize: 24,
                        fill: "#FF18AA"
                    },
                    x: playerX,
                    y: playerY,
                    timeToLive: 1500 // ms
                });
            };
			elements.playerScore.textContent = score;
			elements.position.textContent = "X: " + playerX + " Y: " + playerY;
		};

		const g = game.add.graphics(playerX, playerY);
		g.beginFill(hslToHex(player.color, 100, 50), 1);
		g.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
		g.endFill();
        players.add(g);

		const t = game.add.text(playerX, playerY - 10, player.name, {fill: '#FFF', fontSize: '16px', stroke: '#000', strokeThickness: 1});
		t.anchor.setTo(0.5);
        t.smoothed = false;
        t.resolution = window.devicePixelRatio;
        if (player.invincible) {
            t.setStyle({
                fontSize: '20px',
                fill: 'rgba(255,243,0,1)',
                stroke: 'rgba(255,0,0,0.8)',
                strokeThickness: 9
            });
        };
        names.add(t);
	};
};

/* Functions */
const encodeHTML = (s) => {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
};

const componentToHex = (c) => {
	const hex = c.toString(16);
	return hex.length === 1 ? '0' + hex : hex;
};

const hslToHex = (h,s,l) => {
	const rgb = Phaser.Color.HSLtoRGB(h / 360, s / 100, l / 100);
	return '0x'+componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
};

const rgbToHex = (r, g, b) => {
	return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const play = () => {
	// socket.emit('spawn', {name: elements.name.value || ''});
    // ws.send(JSON.stringify({t: 2, name: elements.name.value || ''}));
    ws.send(encode({t: 2, name: elements.name.value || ''}));
};

/* Load */
document.addEventListener('DOMContentLoaded', () => {
    elements = {
        playerInfo: document.querySelector('#player-info'),
        playerScore: document.querySelector('#player-score'),
        finalScore: document.querySelector('#final-score'),
        totalScore: document.querySelector('#total-score'),
        btnPlay: document.querySelector('#btn_play'),
        form: document.querySelector('form'),
        name: document.querySelector('#name'),
        menu: document.querySelector('#menu'),
        position: document.querySelector('#position'),
        leaderboardContent: document.querySelector('#leaderboard-content'),
        serverPing: document.querySelector('#server-ping'),
        pingBadge: document.querySelector('#ping-badge'),
        snakeGame: document.querySelector('#snake-game')
    };

	elements.finalScore.style.display = 'none';
    elements.name.setAttribute('maxlength', MAX_NAME_LENGTH);
	elements.name.focus();

    elements.btnPlay.addEventListener('click', () => {
		play();
	}, {capture: true, once: false, passive: true});

	elements.form.addEventListener('submit',(e) => {
		e.preventDefault();
		play();
	}, {capture: true, once: false, passive: false});

    elements.name.addEventListener('change', () => {
        (elements.name.value.length && window.localStorage.setItem('MultiplayerSnake-name', elements.name.value));
    }, {capture: true, once: false, passive: true});

	game = new Phaser.Game({
        width: elements.snakeGame.clientWidth * pixelRatio,
        height: elements.snakeGame.clientHeight * pixelRatio,
        parent: elements.snakeGame,
        renderer: Phaser.CANVAS,
        transparent: true,
        antialias: false,
        multiTexture: true,
        backgroundColor: 'rgba(0,0,0,0)',
        clearBeforeRender: true,
        crisp: true,
        enableDebug: false,
        fullScreenScaleMode: Phaser.ScaleManager.RESIZE,
        resolution: pixelRatio,
        roundPixels: true,
        scaleMode: Phaser.ScaleManager.RESIZE,
        state: {
            preload: preload,
            create: create,
            update: update
        }
    });

	try {
        let name = window.localStorage.getItem('MultiplayerSnake-name');
		if (name && name.length > 0 && name.length <= 32) {
			console.log('Loaded name from localStorage: ' + name);
			elements.name.value = name;
		};
	} catch(err) {
		console.log(err);
	};
});