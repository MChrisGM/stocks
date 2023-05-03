const Stock = require('./stock.js');

let numeric = require('numeric');

function isPositiveDefinite(A) {
  let eigenvalues = numeric.eig(A);
  for (let i = 0; i < eigenvalues.length; i++) {
    if (eigenvalues[i] <= 0) return false;
  }
  return true;
}

function isSymmetric(A) {
  let m = A.length, n = A[0].length;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (A[i][j] != A[j][i]) return false;
    }
  }
  return true;
}

function isInvertible(A) {
  let m = A.length, n = A[0].length;
  if (m != n) return false;  // matrix must be square
  let det = numeric.det(A);
  return det != 0;
}



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
    for (let i=0;i<Object.keys(vol_matrix).length;i++) {
      this.sigma_matrix[i] = Object.values(vol_matrix)[i];
    }
    this.covariance_matrix = this.volToCov(this.sigma_matrix);
    this.cholesky_matrix = this.chol(this.covariance_matrix);

    // console.log(this.stocks);

    console.log("\nSigma: ");
    print2D(this.sigma_matrix);
    
    console.log("\nCovariance: ");
    print2D(this.covariance_matrix);

    // console.log("isSymmetric: ", isSymmetric(this.covariance_matrix));
    // console.log("isPositiveDefinite: ", isPositiveDefinite(this.covariance_matrix));
    // console.log("isInvertible: ", isInvertible(this.covariance_matrix));
    
    console.log("\nCholesky: ");
    print2D(this.cholesky_matrix);

    // let m = [
    //   [0.000030,	0.000004,	-0.000027,	-0.000022],
    //   [0.000004,	0.000005,	-0.000003,	0.000002],
    //   [-0.000027,	-0.000003,	0.000065,	0.000025],
    //   [-0.000022,	0.000002,	0.000025,	0.000045]
    // ];
    // let n = this.chol(m);
    // print2D(n);

    let uncorr = Array.from({length: Object.keys(this.stocks).length}, () => (Math.floor(Math.random()*100)/100)* 2 - 1);
    let corr_random = this.multiplyMatrix(this.cholesky_matrix, uncorr);

    let idx_list = {}
    for (let s in Object.keys(this.stocks)){
      idx_list[Object.keys(this.stocks)[s]] = s;
    }

    for(let stock of Object.keys(this.stocks)){
      let S = this.stocks[stock].last();
      let mu = 0.5;
      let vol = this.stocks[stock].vol();
      let period = 1 / (21600000);

      let cholesky_correlated_random = corr_random[idx_list[stock]];
      let SN = this.GBMsimulatorMultiVar(S,mu,vol,period, cholesky_correlated_random);
      this.stocks[stock].update(SN);  
    }
   
    
  }

  update() {

    let uncorr = Array.from({length: Object.keys(this.stocks).length}, () => (Math.floor(Math.random()*100)/100)* 2 - 1);
    let corr_random = this.multiplyMatrix(this.cholesky_matrix, uncorr);

    let idx_list = {}
    for (let s in Object.keys(this.stocks)){
      idx_list[Object.keys(this.stocks)[s]] = s;
    }

    for(let stock of Object.keys(this.stocks)){
      let S = this.stocks[stock].last();
      let mu = 0.5;
      let vol = this.stocks[stock].vol();
      let period = 1 / (5896800);

      let cholesky_correlated_random = corr_random[idx_list[stock]];
      // console.log(corr_random);
      let SN = this.GBMsimulatorMultiVar(S,mu,vol,period, cholesky_correlated_random);
      this.stocks[stock].update(SN);  
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

  // https://github.com/eliasmelul/finance_portfolio/blob/master/MCCholesky%20Initial.ipynb
  GBMsimulatorMultiVar(So, mu, sigma, period, Ran) {

    let drift = (mu - (sigma*sigma)/2)*period;

    let volatility = sigma*Math.sqrt(period)*Ran;
  
    // console.log(Ran,"-",drift,"-",volatility,"-",Math.exp(drift+volatility));

    let newS = So*Math.exp(drift+volatility);
    
    return newS;
    
  }

  // Generate an array of N equally spaced values from start to end
  linspace(start, end, N) {
    return Array(N).fill(0).map((x, i) => start + i * (end - start) / (N - 1));
  }

  // Generate an array of random numbers from a normal distribution with mean 0 and standard deviation 1
  randn(N) {
    return Array(N).fill(0).map(() => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    });
  }

  // Cholesky decomposition of a matrix A
  chol(A) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
      if (A[i][i] <= 0) return null;
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (A[i][j] != A[j][i]) return null;
      }
    }
    const L = new Array(n).fill(0).map( _ => new Array(n).fill(0));
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

  // Matrix multiplication of A and B
  matmul(A, B) {
    let m = A.length, n = A[0].length, p = B[0].length;
    let C = new Array(m).fill(1).map(() => new Array(p).fill(1));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  }
  
  multiplyMatrix(matrix, vector) {
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

  // Capital asset pricing model (CAPM) for estimating the required return on a stock
  CAPM(r_f, beta, r_m) {
    // r_f: risk-free rate
    // beta: beta of the stock
    // r_m: expected return of the market
    let r = r_f + beta * (r_m - r_f);  // required return on the stock
    return r;
  }

  // Dividend discount model (DDM) for estimating the expected return of a stock
  DDM(D, r, g) {
    // D: expected dividends per share
    // r: required return on the stock
    // g: expected growth rate of dividends
    let P = D / (r - g);  // stock price
    let R = (D * (1 + g)) / P;  // expected return
    return R;
  }

}

function print2D(array){
  for(let row in array){
    let r = "";
    for(let item in array[row]){
      r += " " + (Number(array[row][item]) >= 0 ? ' ' : '') + Number(array[row][item]).toFixed(2) ;
    }
    console.log(r);
  }
}

module.exports = Market;