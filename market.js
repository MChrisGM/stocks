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
    
  }

  update() {
    // let randV = NormSInv(Math.random());
    // let randV = 0.1;
    // for (let stock of Object.keys(this.stocks)) {
    //   let last = this.stocks[stock].last();
    //   let shock = 0.1;
    //   // for (let corr_stock of Object.keys(correlation_matrix)) {
    //   //   if (corr_stock != stock) {
    //   //     shock += correlation_matrix[stock][corr_stock] * randV;
    //   //   }
    //   // }
    //   let newP = last * Math.exp(this.stocks[stock].vol() * Math.sqrt(1 / (21600000)) * shock);
    //   this.stocks[stock].update(newP);
    // }

    
    for(let stock of Object.keys(this.stocks)){
      let S = this.stocks[stock].last();
      let mu = 0.5;
      let vol = this.stocks[stock].vol();
      let period = 1 / (21600000);
      let N = 2
      let SN = this.GBMsimulatorMultiVar(S,mu,vol,period,N);
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
        Cov[i][j] = Math.pow(Sigma[i][j], 2);
      }
    }
    return Cov;
  }

  // https://github.com/eliasmelul/finance_portfolio/blob/master/MCCholesky%20Initial.ipynb
  GBMsimulatorMultiVar(So, mu, sigma, period, N) {

    let drift = mu - 0.5*(sigma*sigma);

    let volatility = sigma*Math.sqrt(period);

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
   //  const zeros = [...Array(A.length)].map( _ => Array(A.length).fill(0));
  	// const L = zeros.map((row, r, xL) => row.map((v, c) => {
  	// 	const sum = row.reduce((s, _, i) => i < c ? s + xL[r][i] * xL[c][i] : s, 0);
   //    let val = xL[r][c] = c < r + 1 ? r === c ? Math.sqrt(A[r][r] - sum) : (A[r][c] - sum) / xL[c][c] : v;
   //    // if(!val){val = 0}
  	// 	return val;
  	// }));
  	// return L;
    
    const n = A.length;
  
    // Check that matrix is positive definite
    for (let i = 0; i < n; i++) {
      if (A[i][i] <= 0) return null;
    }
  
    // Check that matrix is symmetric
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (A[i][j] != A[j][i]) return null;
      }
    }
  
    // Compute Cholesky decomposition
    const L = new Array(n).fill(0).map( _ => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = (i == j) ? Math.sqrt(A[i][i] - sum) : (A[i][j] - sum) / L[j][j];
      }
    }
    return L;
  }

  // Matrix multiplication of A and B
  matmul(A, B) {
    let m = A.length, n = A[0].length, p = B[0].length;
    let C = new Array(m).fill(0).map(() => new Array(p).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
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
    console.log(JSON.stringify(array[row]));
  }
}

module.exports = Market;