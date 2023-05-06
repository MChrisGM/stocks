var express = require('express');
var app = express();
var fs = require('fs');

var stockInfo = require('./stock_info.json');
var vol_matrix = require('./volatilities.json');

const Market = require('./market.js');

var server = app.listen(process.env.PORT || 3000, listen);
var io = require('socket.io')(server);

let market = new Market(stockInfo, vol_matrix);

function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Started server at https://' + host + ':' + port);

  setInterval(function() {
    mainStockMarket();
  }, 250);

  setInterval(function() {
    io.sockets.emit("stocks", market.getStocks());
  }, 1000);

}

app.use(express.static('public'));

io.sockets.on('connection',
  function(socket) {
    console.log("Socket connected: " + socket.id);

    setInterval(function() {
      socket.emit("returnStock", market.getStock(socket._ticker));
    }, 1000);

    socket.on("getStock", function(ticker) {
      socket._ticker = ticker;
      socket.emit("returnStock", market.getStock(ticker));
    });

  }
);

function mainStockMarket() {
  market.update();
  market.getCorrelations();
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}


