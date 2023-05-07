var express = require('express');
var app = express();
var fs = require('fs');

var stockInfo = require('./stock_info.json');
var vol_matrix = require('./volatilities.json');

const Market = require('./market.js');

var server = app.listen(process.env.PORT || 3000, listen);
var io = require('socket.io')(server);

let market_update = 0.25;
let market = new Market(stockInfo, vol_matrix, market_update);

function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Started server at https://' + host + ':' + port);

  setInterval(function() {
    mainStockMarket();
  }, (1000*market_update));

  setInterval(function() {
    io.sockets.emit("stocks", market.getStocks());
  }, 1000);

  setInterval(function() {
    // market.getSeriesInfo();
  }, 1000);

}

app.use(express.static('public'));

io.sockets.on('connection',
  function(socket) {
    console.log("Socket connected: " + socket.id);

    setInterval(function() {
      socket.emit("returnStock", market.getStock(socket._ticker, socket._requestN));
    }, 1000);

    socket.on("getStock", function(stock) {
      socket._ticker = stock.ticker;
      socket._requestN = stock.n;
      socket.emit("returnStock", market.getStock(stock.ticker,stock.n));
    });

    socket.on("setLength", function(n) {
      socket._requestN = n;
      console.log("Set ",n);
      socket.emit("returnStock", market.getStock(socket._ticker, socket._requestN));
    });

  }
);

function mainStockMarket() {
  market.update();
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}


