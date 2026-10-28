/**
 * High-Precision Statistical Distribution Functions
 * Deterministic implementations of Standard Normal, Student's t,
 * Fisher-Snedecor F, and Chi-Square distributions.
 */

// Lanczos approximation coefficients for log-gamma (g = 7)
const LANCZOS_COEFFS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.138571095836524,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Natural logarithm of the Gamma function ln(Gamma(z))
 */
export function logGamma(z: number): number {
  if (z <= 0) {
    if (Number.isInteger(z)) return Infinity;
    // Reflection formula: Gamma(z)*Gamma(1-z) = pi / sin(pi*z)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = LANCZOS_COEFFS[0];
  for (let i = 1; i < 9; i++) {
    x += LANCZOS_COEFFS[i] / (z + i);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function gamma(z: number): number {
  return Math.exp(logGamma(z));
}

/**
 * Error Function erf(x)
 * High accuracy Chebyshev approximation
 */
export function erf(x: number): number {
  // Constants for approximation (A&S 7.1.26, max error < 1.5e-7)
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Standard Normal Cumulative Distribution Function Phi(z)
 */
export function normalCDF(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/**
 * Inverse Standard Normal Quantile (Probit) function
 * Peter Acklam's algorithm with relative error < 1.15e-9
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    throw new Error(`Probability p must be between 0 and 1, received ${p}`);
  }

  // Coefficients in rational approximations
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      )
    );
  }
}

/**
 * Regularized lower incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a)
 */
export function incompleteGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  if (x > 1000) return 1.0;

  if (x < a + 1) {
    // Series representation
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // Continued fraction representation (Legendre)
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 200; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    const q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return 1 - q;
  }
}

/**
 * Chi-Square Cumulative Distribution Function
 */
export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) return 0;
  return incompleteGamma(df / 2, x / 2);
}

/**
 * Regularized Incomplete Beta function I_x(a, b)
 * Using Lentz continued fraction method
 */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Symmetry transformation for faster convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a);
  }

  const factor = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) - logGamma(a) - logGamma(b) + logGamma(a + b)
  ) / a;

  // Lentz's method for continued fraction
  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 0; m <= 200; m++) {
    let dNumerator: number;
    if (m === 0) {
      dNumerator = 1;
    } else {
      const k = m;
      if (k % 2 === 0) {
        const step = k / 2;
        dNumerator = (step * (b - step) * x) / ((a + 2 * step - 1) * (a + 2 * step));
      } else {
        const step = (k - 1) / 2;
        dNumerator = -((a + step) * (a + b + step) * x) / ((a + 2 * step) * (a + 2 * step + 1));
      }
    }

    if (m > 0) {
      d = 1 + dNumerator * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + dNumerator / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = c * d;
      f *= delta;
      if (Math.abs(delta - 1) < 1e-15) break;
    }
  }

  return factor * (f - 1);
}

/**
 * Student's t Cumulative Distribution Function
 */
export function tCDF(t: number, df: number): number {
  if (df <= 0) throw new Error(`Degrees of freedom must be > 0, received ${df}`);
  if (t === 0) return 0.5;

  const x = df / (df + t * t);
  const ib = incompleteBeta(x, df / 2, 0.5);

  if (t > 0) {
    return 1 - 0.5 * ib;
  } else {
    return 0.5 * ib;
  }
}

/**
 * Student's t Quantile (inverse CDF)
 * Uses Hill's algorithm with Newton-Raphson polishing
 */
export function tQuantile(p: number, df: number): number {
  if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1');
  if (p === 0.5) return 0;
  if (df >= 1000) {
    return normalQuantile(p);
  }

  // Initial estimate via Cornish-Fisher / Hill's expansion
  const z = normalQuantile(p);
  const a = 1 / (df - 0.5);
  const b = 48 / (a * a);
  let t = z * Math.sqrt(
    (a *
      (df - 2/3 + 1/10 * a) *
      (1 + (z * z + 3) / b + ((z * z + 10) * z * z + 33) / (b * b * 10))) /
      df
  );

  // Fallback initial approximation if above numerical overflow occurs
  if (!Number.isFinite(t)) {
    t = z * Math.sqrt((df) / (df - 2 > 0 ? df - 2 : 1));
  }

  // Newton-Raphson refinement
  for (let iter = 0; iter < 15; iter++) {
    const cdf = tCDF(t, df);
    const err = cdf - p;
    if (Math.abs(err) < 1e-12) break;
    // PDF of Student's t:
    const pdf =
      Math.exp(
        logGamma((df + 1) / 2) -
          logGamma(df / 2) -
          0.5 * Math.log(df * Math.PI)
      ) * Math.pow(1 + (t * t) / df, -(df + 1) / 2);

    if (pdf <= 0) break;
    t -= err / pdf;
  }

  return t;
}

/**
 * Fisher-Snedecor F-Distribution Cumulative Distribution Function
 */
export function fCDF(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  if (df1 <= 0 || df2 <= 0) return 0;

  const x = (df1 * f) / (df1 * f + df2);
  return incompleteBeta(x, df1 / 2, df2 / 2);
}

/**
 * Fisher-Snedecor F Quantile (inverse CDF)
 * Binary search + Newton refinement
 */
export function fQuantile(p: number, df1: number, df2: number): number {
  if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1');

  // Initial bounds
  let low = 0.0001;
  let high = 1000.0;
  while (fCDF(high, df1, df2) < p && high < 1e7) {
    high *= 5;
  }

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const cdf = fCDF(mid, df1, df2);
    if (Math.abs(cdf - p) < 1e-9) return mid;
    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Non-central F Cumulative Distribution Function
 * Approximated via Patnaik's central F transformation or series expansion
 */
export function nonCentralFCDF(f: number, df1: number, df2: number, lambda: number): number {
  if (lambda <= 1e-7) {
    return fCDF(f, df1, df2);
  }
  // Patnaik's approximation:
  // df* = (df1 + lambda)^2 / (df1 + 2*lambda)
  // c = (df1 + lambda) / df1
  // F' / c ~ F(df*, df2)
  const dfStar = Math.pow(df1 + lambda, 2) / (df1 + 2 * lambda);
  const c = (df1 + lambda) / df1;
  const fAdj = f / c;
  return fCDF(fAdj, dfStar, df2);
}
