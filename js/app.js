var gameApp = angular.module('gameApp', []);

gameApp.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        controller: 'JoinController',
        templateUrl: '../html/join.html'
    })
    .when('/game', {
        controller: 'GameController',
        templateUrl: '../html/game.html'
    })
    .otherwise({ redirectTo: '/' });
});

gameApp.factory('constFactory', function() {
    var factory = {};

    factory.BOX_WIDTH = 110;
    factory.BOX_HEIGHT = 110;
    factory.BOX_GAP = 10;

    factory.BOX_COLOR = "#EFE6E8";
    factory.HIGHLIGHT_COLOR = "#DA8097";

    factory.CANVAS_WIDTH = 350;
    factory.CANVAS_HEIGHT = 350;

    factory.WEBSOCKET_URL = "ws://localhost:8888/websocket";
    //factory.WEBSOCKET_URL = "ws://crossandknots.herokuapp.com/websocket";

    factory.WON_OUTCOME = 'won';
    factory.LOST_OUTCOME = 'lost';
    factory.LEFT_OUTCOME = 'left';
    factory.DRAW_OUTCOME = 'draw';
    factory.TURN_OUTCOME = 'turn';
    factory.WAIT_OUTCOME = 'wait';

    factory.ERROR_COMMAND = 'error';
    factory.START_COMMAND = 'start';
    factory.MOVE_COMMAND = 'move';
    factory.JOIN_COMMAND = 'join';

    return factory;
});

gameApp.factory('gameFactory', ['constFactory', function(constFactory) {

    var factory = {};

    var imageObj = {};

    imageObj.cross = new Image();
    imageObj.knot = new Image();

    imageObj.cross.src = "../images/cross.png";
    imageObj.knot.src = "../images/knot.png";

    var myCharacter = "O";
    var canMove = false;
    var player1Name;
    var player2Name;
    var game = null;

    // These are the call back functions which call the drawing functions
    var drawCallback = function() {};
    var outcomeDisplayCallback = function(outcome) {};
    var showCanvasCallback = function(player1Name, player2Name) {};
    var errorCallback = function() {};

    var playerName = null;

    var ws;

    factory.connectToServer = function () {

        ws = new WebSocket(constFactory.WEBSOCKET_URL);

        ws.onopen = function() {

            // Join the game once the socket is open
            var msg = JSON.stringify({
                'command': constFactory.JOIN_COMMAND,
                'name': playerName
            });

            ws.send(msg);
        };

        ws.onerror = function() {
            errorCallback();
        };

        ws.onmessage = function (evt) {
            var message = JSON.parse(evt.data);

            console.log(message);

            if (message.command === constFactory.ERROR_COMMAND) {
                console.log(message.error_message);
            }

            if (message.command === constFactory.START_COMMAND) {
                // Get the data from the message
                player1Name = message.player1Name;
                player2Name = message.player2Name;
                game = message.gameState;
                myCharacter = message.character;

                if (message.turn === "Y") {
                    canMove = true;
                    outcomeDisplayCallback(constFactory.TURN_OUTCOME);
                } else {
                    canMove = false;
                    outcomeDisplayCallback(constFactory.WAIT_OUTCOME);
                }

                showCanvasCallback(player1Name, player2Name)
                drawCallback();
            }

            if (message.command === constFactory.MOVE_COMMAND) {

                game = message.gameState;

                if (message.outcome === constFactory.TURN_OUTCOME) {
                    canMove = true;
                } else {
                    canMove = false;
                }

                outcomeDisplayCallback(message.outcome);
                drawCallback();
            }
        };
    }


    factory.getGameState = function() {
        return game;
    }

    factory.setGameState = function(row, column, state) {

        if (state === myCharacter) {
            canMove = false;
            var msg = JSON.stringify({
                'command': constFactory.MOVE_COMMAND,
                'row': row,
                'column': column
            });

            ws.send(msg);

        } else {
            // If its just highlighting then change state
            // directly
            game[row][column] = state;
        }
    }

    factory.images = function() {
        return imageObj;
    }

    factory.myCharacter = function() {
        return myCharacter;
    }

    factory.canMove = function() {
        return canMove;
    }

    factory.player1Name = function() {
        return player1Name;
    }

    factory.player2Name = function() {
        return player2Name;
    }

    factory.setCallbacks = function(
        showCanvasCallbackFn, drawCallbackFn, outcomeDisplayCallbackFn,
        errorCallbackfn) {

        showCanvasCallback = showCanvasCallbackFn
        drawCallback = drawCallbackFn;
        outcomeDisplayCallback = outcomeDisplayCallbackFn;
        errorCallback = errorCallbackfn;
    }

    factory.setPlayerName = function(name) {
        playerName = name;
    }

    return factory;
}]);

gameApp.controller('JoinController', function($scope, gameFactory) {

    $scope.playerName = "";

    chrome.storage.sync.get("playerName", function(item) {
        $scope.playerName = item.playerName;
        $("#playerName").val($scope.playerName);
    });


    $scope.joinGame = function() {
        if ($scope.playerName == "") {
            $scope.playerName = "Unamed Player";
        }

        gameFactory.setPlayerName($scope.playerName);

        chrome.storage.sync.set({"playerName": $scope.playerName},
            function() {});
    };

});

gameApp.controller('GameController', function($scope, $route, $location,
    gameFactory, constFactory) {

    init();

    function drawBox(color, x, y) {

        $scope.ctx.fillStyle = color;

        $scope.ctx.fillRect(
            x,
            y,
            constFactory.BOX_WIDTH,
            constFactory.BOX_HEIGHT);
    }

    function drawImage(image, x, y) {
        $scope.ctx.drawImage(image, x, y);
    }

    function drawBoard() {

        $scope.ctx.clearRect(
            0,
            0,
            constFactory.CANVAS_WIDTH,
            constFactory.CANVAS_HEIGHT
        );

        var game = gameFactory.getGameState();

        if (game !== null) {
            for (j = 0; j < 3; j++) {
                for (i = 0; i < 3; i++) {

                    var xCoord = i * (constFactory.BOX_WIDTH + constFactory.BOX_GAP);
                    var yCoord = j * (constFactory.BOX_HEIGHT + constFactory.BOX_GAP);

                    if (game[j][i] === "H") {

                        drawBox(constFactory.HIGHLIGHT_COLOR, xCoord, yCoord);

                    } else if (game[j][i] === "X") {

                        drawImage($scope.images.cross, xCoord, yCoord);

                    } else if (game[j][i] === "O") {

                        drawImage($scope.images.knot, xCoord, yCoord);

                    } else {
                        drawBox(constFactory.BOX_COLOR, xCoord, yCoord);
                    }
                }
            }
        }
    }

    function getBox(X, Y) {

        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {

                var boxLeft = i * (constFactory.BOX_WIDTH + constFactory.BOX_GAP)
                var boxTop = j * (constFactory.BOX_HEIGHT + constFactory.BOX_GAP)

                if ((X >= boxLeft &&
                    X <= boxLeft + constFactory.BOX_WIDTH) &&
                    (Y >= boxTop &&
                    Y <= boxTop + constFactory.BOX_HEIGHT)) {

                    return [i, j];
                }
            }
        }

        return null;
    }

    function highlightBox(mouseX, mouseY) {

        var coords = getBox(mouseX, mouseY);
        var game = gameFactory.getGameState();

        if (coords != null) {

            // Reset the existing highlighted row
            for (i = 0; i < 3; i++) {
                for (j = 0; j < 3; j++) {
                    if (game[i][j] == "H") {
                        gameFactory.setGameState(
                            i,
                            j,
                            ""
                        );
                    }
                }
            }

            // Highlight the new box
            if (game[coords[1]][coords[0]] === "") {
                gameFactory.setGameState(
                    coords[1],
                    coords[0],
                    "H"
                );
            }
        }

        drawBoard();
    }

    $scope.mouseMove = function(event) {

        if (gameFactory.canMove()) {
            var rect = $scope.canvas.getBoundingClientRect();

            var mouseX = event.pageX - rect.left;
            var mouseY = event.pageY - rect.top;

            highlightBox(mouseX, mouseY);
        }
    };

    $scope.mouseClick = function(event) {

        if (gameFactory.canMove()) {
            var rect = $scope.canvas.getBoundingClientRect();
            var mouseX = event.pageX - rect.left;
            var mouseY = event.pageY - rect.top;

            var coords = getBox(mouseX, mouseY);

            if (coords != null) {

                var game = gameFactory.getGameState();
                var charAtLocation = game[coords[1]][coords[0]];

                if (charAtLocation === "" || charAtLocation === "H") {
                    gameFactory.setGameState(
                        coords[1],
                        coords[0],
                        gameFactory.myCharacter()
                    );
                }

                drawBoard();
            }
        }
    };

    $scope.restart = function() {
        $route.reload();
    };

    function showCanvas(player1Name, player2Name) {
        // Show the game canvas
        $("#loading").hide();
        $("#gameDivs").show();
        $("#player1").html(player1Name);
        $("#player2").html(player2Name);
    }

    function displayOutcome(outcome) {
        // This function displays the correct alert according to the
        // outcome
        $("#states").children().hide();
        $("#outcome_" + outcome).show();
    }

    function errorHandler() {
        // This function is called when the application is not able to
        // connect to the server
        $("#error").show();
        $("#loading").hide();
        $("#gameDivs").hide();
    }

    function init() {

        // Get the context
        $scope.canvas = document.getElementById('gameCanvas');
        $scope.ctx = $scope.canvas.getContext('2d');

        // Get the images
        $scope.images = gameFactory.images();
        gameFactory.setCallbacks(showCanvas, drawBoard, displayOutcome, errorHandler);
        gameFactory.connectToServer();
    }
});
