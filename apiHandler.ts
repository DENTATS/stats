import { Router, json } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
router.use(json());

// In-memory certificate and report storage
const certificateDatabase = new Map<string, any>();

// Seed sample certificate so verification works out-of-the-box
certificateDatabase.set('CERT-STAT-2026-88192', {
  certificateId: 'CERT-STAT-2026-88192',
  recordHash: 'sm4a7f2910c01b94238e51b143729d44e5f03a11b6d0811e9f4a7f2910c01b9423',
  studyTitle: 'Comparative Microtensile Shear Bond Strength of Bioactive Dental Adhesives',
  primaryOutcome: 'Microtensile Bond Strength (MPa)',
  researcherName: 'Dr. Sarah Lin, DDS, PhD',
  institution: 'Department of Biomaterials Research',
  issuedAt: '2026-03-15T09:30:00.000Z',
  softwareName: 'StatsMate Research',
  softwareVersion: 'v2.4 (Engine build 2026.1)',
  engineBuild: '2026.1-PROD-STABLE',
  studyDesign: 'Two Independent Means (Student/Welch)',
  methodName: 'Student two-sample t-test sample size with pooled variance',
  parameters: {
    alpha: 0.05,
    power: 0.80,
    hypothesis: 'Two-sided (α/2)',
    effectSize: 0.85,
    effectSizeName: "Cohen's d",
    evaluableN: 46,
    dropoutRate: 15,
    recruitmentN: 55,
    allocationRatio: 1.0,
    groupBreakdown: 'Arm 1 = 23, Arm 2 = 23',
  },
  assumptions: [
    'Continuous outcome measured on ratio scale (MPa).',
    'Normal distribution of bond strength within each material cohort.',
    'Independent specimen preparation and mechanical testing.',
  ],
  mandatoryDisclosure:
    'This certificate documents the statistical calculation performed by StatsMate Research using the recorded inputs, method and software version. It does not constitute institutional accreditation, ethics approval, independent statistical review, or a guarantee of study validity.',
  verificationUrl: 'https://ais-dev-ptwxqoj4mqd3des2fnybb7-40148676628.asia-southeast1.run.app/?verify=CERT-STAT-2026-88192#verify',
  isSessionOnly: false,
});

// GET /api/certificates
router.get('/certificates', (_req, res) => {
  const all = Array.from(certificateDatabase.values());
  res.json(all);
});

// POST /api/certificates
router.post('/certificates', (req, res) => {
  const cert = req.body;
  if (!cert || !cert.certificateId) {
    return res.status(400).json({ error: 'Invalid certificate payload' });
  }
  certificateDatabase.set(cert.certificateId, cert);
  if (cert.recordHash) {
    certificateDatabase.set(cert.recordHash, cert);
  }
  res.status(201).json({ success: true, certificateId: cert.certificateId });
});

// GET /api/certificates/verify/:id
router.get('/certificates/verify/:id', (req, res) => {
  const query = req.params.id.trim();
  const cert = certificateDatabase.get(query);
  if (cert) {
    return res.json(cert);
  }
  // Linear search case-insensitive
  for (const c of certificateDatabase.values()) {
    if (
      c.certificateId.toLowerCase() === query.toLowerCase() ||
      c.recordHash === query
    ) {
      return res.json(c);
    }
  }
  res.status(404).json({ error: 'Certificate record not found' });
});

// POST /api/ai-assist
router.post('/ai-assist', async (req, res) => {
  const { category, title, hypothesis, primaryOutcome, outcomeType, experimentalUnit, numberOfGroups } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI();
      const prompt = `You are an expert academic biostatistician and member of an institutional review board (IRB).
A researcher is planning a study with the following specifications:
- Methodology Category: ${category || 'Laboratory'}
- Title: ${title || 'Untitled'}
- Hypothesis: ${hypothesis || 'None provided'}
- Primary Outcome: ${primaryOutcome || 'Primary Endpoint'} (Type: ${outcomeType || 'continuous'})
- Experimental Unit: ${experimentalUnit || 'Specimen / Subject'}
- Number of Groups: ${numberOfGroups || 2}

Please provide concise, rigorous, expert methodological advice formatted in JSON with the following schema:
{
  "guidanceText": "A 2-3 sentence methodological recommendation strictly explaining the appropriate design and analysis strategy.",
  "recommendedDesign": "Name of the standard study design",
  "recommendedStatisticalTest": "Primary statistical test and any post-hoc or sensitivity tests",
  "experimentalUnitWarning": "A warning if the experimental unit risks pseudo-replication or clustering fallacy (e.g., teeth in a patient, multiple cuts from a specimen), otherwise null",
  "biasConsiderations": ["Bullet 1 regarding randomization/blinding/reporting checklists (CONSORT/STROBE/STARD/CRIS)", "Bullet 2", "Bullet 3"]
}

Return ONLY raw JSON, no markdown formatting or commentary.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to structured rules:', err.message);
    }
  }

  // Built-in rule-based fallback if no key or error
  res.json({
    guidanceText: `For a study evaluating ${primaryOutcome || 'the primary endpoint'} across ${numberOfGroups || 2} group(s), ensure the statistical unit matches the experimental unit. Pre-specify the Minimal Clinically Important Difference (MCID).`,
    recommendedDesign: (numberOfGroups || 2) > 2 ? 'One-Way ANOVA (Multi-Arm)' : 'Two Independent Groups',
    recommendedStatisticalTest: (numberOfGroups || 2) > 2 ? 'One-Way ANOVA with Tukey HSD Post-Hoc' : "Two-Sample t-Test (or Welch's t-Test if variances differ)",
    experimentalUnitWarning: (experimentalUnit || '').toLowerCase().includes('tooth')
      ? 'Unit of Analysis Alert: If multiple teeth are evaluated per patient, use cluster adjustments (ICC) or mixed models to avoid pseudo-replication.'
      : null,
    biasConsiderations: [
      'Ensure operator blinding to group assignments during testing.',
      'Pre-specify primary vs exploratory endpoints to control family-wise error rate.',
      'Adhere to reporting standards (CRIS for dental laboratory studies, CONSORT for trials).',
    ],
  });
});

export default router;
