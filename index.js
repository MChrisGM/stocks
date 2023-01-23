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
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

function NormSInv(p) {
    var a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    var a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    var b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    var b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
    var c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
    var c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
    var d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
    var p_low = 0.02425, p_high = 1 - p_low;
    var q, r;
    var retVal;

    if ((p < 0) || (p > 1))
    {
        alert("NormSInv: Argument out of range.");
        retVal = 0;
    }
    else if (p < p_low)
    {
        q = Math.sqrt(-2 * Math.log(p));
        retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    else if (p <= p_high)
    {
        q = p - 0.5;
        r = q * q;
        retVal = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }
    else
    {
        q = Math.sqrt(-2 * Math.log(1 - p));
        retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    return retVal;
}


