# StatsMate Research — Sample Size, Biostatistics & Statistical Certificate System

A professional, full-stack biostatistical research application designed for dental researchers, postgraduate students, clinicians, universities, and biomedical scientists.

StatsMate Research performs exact, deterministic sample size calculations, provides a full dataset statistical analysis suite, guides researchers through study design planning (CRIS/CONSORT/STARD), and issues verifiable calculation certificates backed by cryptographic SHA-256 hashes and online QR-code verification.

---

## 1. Supported Sample Size Calculators (Module A)

All calculations use exact formulas or validated numerical algorithms (no approximations substituted silently):

| Study Design | Model & Algorithm | Reference Standard |
| :--- | :--- | :--- |
| **Two Independent Means** | Student / Welch $t$-test, pooled variance, arbitrary allocation ratio $k$ | Cohen (1988), R `pwr.t.test` |
| **Paired Means** | Paired difference model with standardized effect size $d_z$ | Bland (2015) Med Stats |
| **One-Way ANOVA** | Iterative non-central $F$-distribution power inversion ($\ge 3$ groups) | Cohen (1988) Table 8.4.4 |
| **Two Independent Proportions** | Fleiss uncorrected & continuity-corrected formula with allocation ratio | Fleiss et al. (2003) |
| **Prevalence & Single Proportion** | Wilson score / Wald precision formula with finite population correction | Daniel (2013) Biostatistics |
| **One-Sample Mean** | Single population mean versus hypothesized standard | Rosner (2015) |
| **Correlation Studies** | Fisher's $z$-transformation with $+3$ sample bias correction | Hulley et al. (2013) |
| **Diagnostic Accuracy** | Buderer dual-precision formula for Sensitivity and Specificity | Buderer (1996) Acad Emerg Med |
| **Non-Inferiority (Means)** | Blackwelder one-sided non-inferiority margin test | Blackwelder (1982) |
| **Cluster-Randomized Trials** | Donner & Klar design effect inflated for ICC ($\text{VIF} = 1 + (m-1)\rho$) | Donner & Klar (2000) |

*Every design incorporates user-specified attrition / dropout compensation:*
$$N_{\text{recruitment}} = \left\lceil \frac{N_{\text{evaluable}}}{1 - (\text{dropout}\% / 100)} \right\rceil$$

---

## 2. Dataset Statistical Analysis Suite (Module B)

- **Data Import**: Local CSV files, Microsoft Excel (`.xlsx`, `.xls`), and direct Google Sheets import via Google Workspace REST API.
- **Variable Detection**: Automatic classification into continuous, discrete numerical, categorical, binary, or identifier.
- **Missing Value Handling**: Transparent counts and percentages. Missing data is never silently deleted.
- **Descriptive Statistics**: Sample Mean, Bessel-corrected Standard Deviation ($n-1$), Sample Variance, Median, Interquartile Range ($Q_3 - Q_1$), Minimum, Maximum, Sample Skewness, and Excess Kurtosis.
- **Distributional Diagnostics**:
  - D'Agostino-Pearson Omnibus $K^2$ normality test.
  - Levene's Test (Brown-Forsythe median-centered) for homoscedasticity.
- **Inferential Hypothesis Tests**:
  - Independent-samples Student's $t$-test & Welch's $t$-test (Satterthwaite $df$).
  - Paired-samples $t$-test.
  - One-Way ANOVA with Tukey HSD post-hoc comparisons.
  - Mann–Whitney $U$ test (Wilcoxon rank-sum) with tie correction and rank-biserial correlation effect size.
  - Wilcoxon signed-rank test for paired non-parametric data.
  - Kruskal–Wallis test with epsilon-squared ($\epsilon^2$) effect size.
  - Pearson's Chi-square test of independence & Cochran's rule check.
  - Pearson and Spearman rank correlation with Fisher $z$ 95% confidence intervals.
  - Ordinary Least Squares (OLS) simple linear regression.
- **Vector Graphics**: Histograms with density guidelines, box-and-whisker plots with outlier markers, and scatter plots with linear regression fit lines.

---

## 3. Verifiable Statistical Certificates (Module E & F)

Generates official, print-ready PDF certificates titled:
**"CERTIFICATE OF STATISTICAL CALCULATION"**

Each certificate includes:
- Unique Certificate Number (e.g., `CERT-STAT-2026-XXXXX`).
- Principal Investigator, Institution, Study Title, Primary Endpoint.
- Exact methodology parameters ($\alpha$, $1-\beta$, effect size, allocation ratio, dropout buffer).
- Final evaluable sample size ($N_{\text{eval}}$) and recruitment target ($N_{\text{rec}}$).
- Software version: `StatsMate Research v2.4 (Engine build 2026.1)`.
- Cryptographic SHA-256 calculation record hash.
- Scannable QR code directing to the online verification portal (`?verify=...#verify`).
- Statutory regulatory disclosure.

---

## 4. Google Workspace Sheets Integration

Authenticated via Firebase Auth and Google Workspace OAuth scopes (`https://www.googleapis.com/auth/spreadsheets`):
- Connect account with the official "Sign in with Google" button.
- In-memory access token caching (never persisted in `localStorage`).
- Import research datasets directly from Google Sheets URLs or IDs.
- Export sample size calculation protocols and dataset analysis tables directly into a new spreadsheet in the researcher's Google Drive.
- Mandatory user confirmation dialog before any file creation or mutation in Google Drive.

---

## 5. Automated Validation Benchmark Matrix

Concordance benchmarks against R statistical packages and authoritative literature:

| Test ID | Category | Target Output | Reference Source | Tolerance |
| :--- | :--- | :--- | :--- | :--- |
| `BENCH-SS-01` | Two Means ($d=0.8, \text{pow}=0.8$) | $N=52$ ($n=26$/arm) | Cohen (1988) / R `pwr.t.test` | Exact match |
| `BENCH-SS-02` | Paired Means ($\text{pow}=0.9$) | $N=27$ pairs | Bland (2015) Med Stats | Exact match |
| `BENCH-SS-03` | Prevalence ($P=0.15, d=0.05$) | $N=196$ | Daniel (2013) Biostatistics | Exact match |
| `BENCH-SS-04` | One-Way ANOVA ($k=3, f=0.25$) | $N=159$ ($n=53$/arm) | R `pwr.anova.test` | $\pm 1$ sample |
| `BENCH-DIST-01` | Standard Normal Quantile | $Z_{0.975} = 1.95996$ | NIST Standard Tables | $< 10^{-4}$ error |
| `BENCH-DIST-02` | Student $t$ CDF ($df=24, t=2.064$) | $p = 0.975$ | Student (1908) / R `pt()` | $< 10^{-3}$ error |
| `BENCH-DIST-03` | Fisher $F$ CDF ($df_1=3, df_2=20$) | $p = 0.950$ | R `pf()` | $< 2 \times 10^{-3}$ |
| `BENCH-TEST-01` | Independent $t$-Test | $t(8) = 5.0, p = 0.00105$ | Textbook Dataset | $< 10^{-3}$ |
| `BENCH-TEST-02` | Pearson Correlation | $r = 0.800$ | Standard Vector Set | $< 0.01$ |
| `BENCH-DESC-01` | Sample Variance & SD | Mean=40, SD=21.602 | ISO 3534-1 Standards | $< 0.01$ |

---

## 6. Development & Deployment

```bash
# Install dependencies
npm install

# Start Vite development server (Port 3000)
npm run dev

# Run TypeScript linting and validation
npm run lint

# Build production bundle
npm run build

# Start full-stack Node/Express server
npm start
```
