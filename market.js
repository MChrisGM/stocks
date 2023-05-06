const Stock = require('./stock.js');
const crypto = require('crypto').webcrypto;
const calculateCorrelation = require("calculate-correlation");

class Market {
  constructor(stock_info, vol_matrix) {
    this.market_info = stock_info;
    this.stocks = {};

    for (let ticker of Object.keys(this.market_info)) {
      this.stocks[ticker] = new Stock(ticker, this.market_info[ticker]);
    }

    let ticker = Object.keys(this.market_info)[0];
    this.stocks[ticker] = new Stock(ticker, this.market_info[ticker]);

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

    // for(let i=0;i<100;i++){
    //   let time = Date.now()-(250 * (100-i));
    //   console.log("Market update: ",i, "Time: ",new Date(time).toLocaleString(), time);
    //   this.update(time);
    //   console.log(this.stocks[Object.keys(this.stocks)[0]])
    // }
    // console.log(new Date(Date.now()).toLocaleString());
    // console.log(this.stocks[Object.keys(this.stocks)[0]])

  }

  update(timestamp) {

    let uncorr = Array.from({ length: Object.keys(this.stocks).length }, () => this.rand(-1, 1));
    let corr_random = this.matrix_dot(this.cholesky_matrix, uncorr);

    let idx_list = {}
    for (let s in Object.keys(this.stocks)) {
      idx_list[Object.keys(this.stocks)[s]] = s;
    }

    for (let stock of Object.keys(this.stocks)) {
      let S = this.stocks[stock].last();
      let mu = 0.5;
      let vol = this.stocks[stock].vol();
      let period = 1 / (5896800);

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

  getStock(ticker) {
    if (!(this.getTickers()).map(tic => tic.TKR).includes(ticker)) { return {} };
    return this.stocks[ticker].getData();
  }

  getCorrelations(){
    let close_series = {};
    for (let stock of Object.keys(this.stocks)) {
      let series = {};
      for(let ts of Object.keys(this.stocks[stock].historical)){
        series[ts] = this.stocks[stock].historical[ts].CLOSE;
      }
      close_series[stock] = series;
    }

    let correlation_table = Array.from(Array(Object.keys(this.stocks).length), () => new Array(Object.keys(this.stocks).length))

    for (let stock1 of Object.keys(this.stocks)) {
      for (let stock2 of Object.keys(this.stocks)) {
        let series1 = Object.values(close_series[stock1]);
        let series2 = Object.values(close_series[stock2]);
        let corr = correlationCoefficient(series1,series2,series1.length);
        correlation_table[Object.keys(this.stocks).indexOf(stock1)][Object.keys(this.stocks).indexOf(stock2)] = corr;
      }
    }

    console.log();
    this.print2D(correlation_table);

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

module.exports = Market;