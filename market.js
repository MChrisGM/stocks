const Stock = require('./stock.js');
const crypto = require('crypto').webcrypto;

class Market {
  constructor(stock_info, vol_matrix, market_upd_per_sec) {
    this.market_info = stock_info;
    this.stocks = {};
    this.market_update_time = market_upd_per_sec;

    for (let ticker of Object.keys(this.market_info)) {
      this.stocks[ticker] = new Stock(ticker, this.market_info[ticker]);
    }

    this.sigma_matrix = [];
    for (let i = 0; i < Object.keys(vol_matrix).length; i++) {
      this.sigma_matrix[i] = Object.values(vol_matrix)[i];
    }
    this.covariance_matrix = this.volToCov(this.sigma_matrix);
    this.cholesky_matrix = this.cholDecomp(this.covariance_matrix);

    console.log("\nSigma: ");
    this.print2D(this.sigma_matrix);

    console.log("\nCovariance: ");
    this.print2D(this.covariance_matrix);

    console.log("\nCholesky: ");
    this.print2D(this.cholesky_matrix);

    let points = 2000;
    let ts = Date.now();
    let loops = 500;

    let vol = Array.from(new Array(Object.keys(this.stocks).length), () => 0);
    let corr = Array.from(new Array(Object.keys(this.stocks).length), () => Array.from(new Array(Object.keys(this.stocks).length), () => 0));

    for(let j=0;j<loops;j++){
      console.log("Loop: "+j);

      for (let ticker of Object.keys(this.market_info)) {
        this.stocks[ticker] = new Stock(ticker, this.market_info[ticker]);
      }

      for(let i=0;i<points;i++){
        let time = (ts - (ts % 1000))-((1000*this.market_update_time) * (points-i));
        this.update(time);
        console.log(Number((j*100)/loops).toFixed(1)+"%","Progress: "+Number((i*100)/points).toFixed(1)+"%");
      }

      let inf = this.getSeriesInfo(false);

      for(let i=0;i<Object.keys(this.stocks).length;i++){
        for(let j=0;j<Object.keys(this.stocks).length;j++){
          corr[i][j] = (corr[i][j]+inf.correlation[i][j])/2; 
        }
        vol[i] = (vol[i] + inf.volatility[i])/2;
      }

      console.log();
      this.print2D(corr);
      console.log();
      console.log(vol.map(a => (a/(Math.sqrt(1/(252*6.5*60))))).map(a=>a.toFixed(3)).join(" "));
    }

    console.log();
    console.log("Final:");
    console.log();
    this.print2D(corr);
    console.log();
    console.log(vol.map(a => (a/(Math.sqrt(1/(252*6.5*60))))).map(a=>a.toFixed(3)).join(" "));
    
  }

  update(timestamp) {

    let uncorr = Array.from({ length: Object.keys(this.stocks).length }, () => [this.rand(-1, 1)]);
    let corr_random = this.matrix_dot(this.cholesky_matrix, uncorr);

    let idx_list = {}
    for (let s in Object.keys(this.stocks)) {
      idx_list[Object.keys(this.stocks)[s]] = s;
    }

    for (let stock of Object.keys(this.stocks)) {
      let S = this.stocks[stock].last();
      let mu = 0.5;
      let vol = this.stocks[stock].vol();
      let period = 1 / (5896800 * (1/this.market_update_time));

      let cholesky_correlated_random = corr_random[idx_list[stock]];

      let SN = this.newPriceCalc(S, mu, vol, period, cholesky_correlated_random);
      if (timestamp) {
        this.stocks[stock].addHist(SN, timestamp);
      } else {
        this.stocks[stock].update(SN);
      }
    }
  }

  getTickers() {
    let stks = [];
    for (let stock of Object.keys(this.stocks)) {
      stks.push(this.stocks[stock].getTicker());
    }
    return stks;
  }

  getStocks() {
    let stks = [];
    for (let stock of Object.keys(this.stocks)) {
      stks.push(this.stocks[stock].getData());
    }
    return stks;
  }

  getStock(ticker, n) {
    if (!(this.getTickers()).map(tic => tic.TKR).includes(ticker)) { return {} };
    let s = this.stocks[ticker].getData();
    let his_data = Object.values(s["HIS"]).slice(-n);
    s["HIS"] = {};
    his_data.forEach(item => { s["HIS"][item["TS"]] = item} );
    return s;
  }

  getSeriesInfo(display){
    let close_series = {};
    for (let stock of Object.keys(this.stocks)) {
      let series = {};
      for(let ts of Object.keys(this.stocks[stock].historical)){
        series[ts] = this.stocks[stock].historical[ts].CLOSE;
      }
      close_series[stock] = series;
    }

    let correlation_table = Array.from(Array(Object.keys(this.stocks).length), () => new Array(Object.keys(this.stocks).length));
    let volatilities = Array.from(Array(Object.keys(this.stocks).length), () => 0);

    for (let stock1 of Object.keys(this.stocks)) {
      for (let stock2 of Object.keys(this.stocks)) {
        let series1 = Object.values(close_series[stock1]).slice(0, -1);
        let series2 = Object.values(close_series[stock2]).slice(0, -1);
        let corr = correlationCoefficient(series1, series2, series1.length);
        correlation_table[Object.keys(this.stocks).indexOf(stock1)][Object.keys(this.stocks).indexOf(stock2)] = corr;
      }

      volatilities[Object.keys(this.stocks).indexOf(stock1)] = Number(calculateVolatility(Object.values(close_series[stock1]).slice(0, -1)));


    }
    if(display){
      console.log();
      this.print2D(correlation_table);
      console.log();
      console.log(volatilities.map(a => (a/(Math.sqrt(1/(252*6.5*60))))).map(a=>a.toFixed(3)).join(" "));
    }

    return {
      correlation: correlation_table,
      volatility: volatilities
    }
  }

  volToCov(Sigma) {
    let m = Sigma.length, n = Sigma[0].length;
    let Cov = new Array(m).fill(0).map(() => new Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        Cov[i][j] = Number(Math.pow(Sigma[i][j], 2).toPrecision(5));
      }
    }
    return Cov;
  }

  newPriceCalc(So, mu, sigma, period, Ran) {
    let drift = (mu - (sigma * sigma) / 2) * period;
    let volatility = sigma * Math.sqrt(period) * Ran;
    let newS = So * Math.exp(drift + volatility);
    return newS;

  }

  cholDecomp(A) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
      if (A[i][i] <= 0) return null;
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (A[i][j] != A[j][i]) return null;
      }
    }
    const L = new Array(n).fill(0).map(_ => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = (i == j) ? Number(Math.sqrt(A[i][i] - sum).toPrecision(5)) : Number(((A[i][j] - sum) / L[j][j]).toPrecision(5));
      }
    }
    return L;
  }

  matrix_dot(matrix, vector) {
    const n = matrix.length; // Get the size of the matrix

    if (n !== vector.length) { // Check if the matrices are compatible for multiplication
      throw new Error('Matrix and vector have incompatible sizes.');
    }

    const result = []; // Create an empty array to store the result

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += matrix[i][j] * vector[j]; // Multiply corresponding elements and sum the results
      }
      result.push(sum); // Add the result to the result array
    }

    return result; // Return the result
  }

  rand(min, max) {
    const randomBuffer = new Uint32Array(1);

    crypto.getRandomValues(randomBuffer);

    let randomNumber = randomBuffer[0] / (0xffffffff + 1);

    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(randomNumber * (max - min + 1)) + min;
  }

  print2D(array) {
    for (let row in array) {
      let r = "";
      for (let item in array[row]) {
        r += " " + (Number(array[row][item]) >= 0 ? ' ' : '') + Number(array[row][item]).toFixed(2);
      }
      console.log(r);
    }
  }

}

function correlationCoefficient(X, Y, n){
    let sum_X = 0, sum_Y = 0, sum_XY = 0;
    let squareSum_X = 0, squareSum_Y = 0;
    for(let i = 0; i < n; i++){
        sum_X = sum_X + X[i];
        sum_Y = sum_Y + Y[i];
        sum_XY = sum_XY + X[i] * Y[i];
        squareSum_X = squareSum_X + X[i] * X[i];
        squareSum_Y = squareSum_Y + Y[i] * Y[i];
    }
    let corr = (n * sum_XY - sum_X * sum_Y)/(Math.sqrt((n * squareSum_X - sum_X * sum_X) * (n * squareSum_Y - sum_Y * sum_Y)));
    return corr;
}

function calculateVolatility(array) {
  const n = array.length
  const mean = array.reduce((a, b) => (a + b), 0) / n
  const deviation = array.reduce((dev, val) => (dev + (val - mean) * (val - mean)), 0)
  return Math.sqrt(deviation / n)
}

module.exports = Market;