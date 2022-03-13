var express = require('express');
var app = express();
var fs = require('fs');

var server = app.listen(process.env.PORT || 3000, listen);

function listen() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Started server at https://' + host + ':' + port);
}

app.use(express.static('public'));

var io = require('socket.io')(server);

io.sockets.on('connection',
    function (socket) {

        
    }
);

// setInterval(function () {
//     printPlayers();
// }, 5000);


//-----------------------------------------------------------Create Lobby code---------------------------------------------------------------------
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}