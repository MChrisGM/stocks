class Stock {
  constructor(ticker, stock_info) {
    this.ticker = ticker;
    this.price = {
      LAST_BID: 0,
      LAST_ASK: 0
    };
    this.last_close = stock_info["EQP"];
    this.last_time = Math.floor(Date.now() / 1000);
    this.volatility = stock_info["VOL"];
    this.quantity = stock_info["QTY"];
    this.description = stock_info["DES"];
    this.equity = this.quantity * this.last_close;
    this.historical = {
      [Math.floor((Date.now() / 1000) / 60)] : {
        TS    : Math.floor((Date.now() / 1000) / 60),
        OPEN  : this.last_close,
        HIGH  : this.last_close,
        LOW   : this.last_close,
        CLOSE : this.last_close
      }
    };
  }

  addHist(new_price, timestamp){
    let c_sec = Math.floor(timestamp / 1000);
    let c_min = Math.floor(c_sec / 60);

    if(c_sec - this.last_time >= 1){
      this.last_close = new_price;
      this.last_time = Math.floor(timestamp / 1000);
    }

    let last_timestamp = Object.keys(this.historical).sort(function(a, b) {return b - a;})[0];

    if(c_min - last_timestamp >= 1){
      this.historical[c_min] = {
        TS: c_min,
        OPEN: new_price,
        HIGH: new_price,
        LOW:  new_price,
        CLOSE: new_price
      };
    }else{
      if(Object.keys(this.historical).includes(last_timestamp)){
        if(new_price > this.historical[last_timestamp].HIGH){
          this.historical[last_timestamp].HIGH = new_price;
        }else if(new_price < this.historical[last_timestamp].LOW){
          this.historical[last_timestamp].LOW = new_price;
        }
        this.historical[last_timestamp].CLOSE = new_price;
      }
    }
  }

  update(new_price) {    
    let c_sec = Math.floor(Date.now() / 1000);
    let c_min = Math.floor(c_sec / 60);

    if(c_sec - this.last_time >= 1){
      this.last_close = new_price;
      this.last_time = Math.floor(Date.now() / 1000);
    }

    let last_timestamp = Object.keys(this.historical).sort(function(a, b) {return b - a;})[0];

    if(c_min - last_timestamp >= 1){
      this.historical[c_min] = {
        TS: c_min,
        OPEN: new_price,
        HIGH: new_price,
        LOW:  new_price,
        CLOSE: new_price
      };
    }else{
      if(Object.keys(this.historical).includes(last_timestamp)){
        if(new_price > this.historical[last_timestamp].HIGH){
          this.historical[last_timestamp].HIGH = new_price;
        }else if(new_price < this.historical[last_timestamp].LOW){
          this.historical[last_timestamp].LOW = new_price;
        }
        this.historical[last_timestamp].CLOSE = new_price;
      }
    }
  }
  vol(){
    return this.volatility;
  }

  last(){
    return this.last_close;
  }

  getData() {
    return {
      "TKR": this.ticker,
      "PRC": {
        "BID": this.price.LAST_BID,
        "ASK": this.price.LAST_ASK,
      },
      "QTY": this.quantity,
      "DES": this.description,
      "HIS": this.historical,
      "EQT": this.equity,
      "CLS": this.last_close,
      "CLT": this.last_time
    }
  }

  getTicker() {
    return {
      "TKR": this.ticker
    }
  }

}

module.exports = Stock;