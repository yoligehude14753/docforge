import type { MatchMatrix, Requirement } from '@/lib/knowledge/matcher';

export interface Gap {
  requirement: Requirement;
  type: 'missing-material' | 'insufficient-detail' | 'needs-verification';
  suggestion: string;
  autoResearchable: boolean;
}

const COMPANY_PATTERNS =
  /我司|我公司|本单位|本公司|贵司|投标人|本公司承诺|我公司承诺|具体项目名称|本合同|本项目特定/i;
const VERIFICATION_KEYWORDS =
  /证明|证书|原件|盖章|签字|资质|许可证|审计|第三方|公证|备案|verify|certificat|notar|legal compliance/i;

function looksAutoResearchable(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return true;
  if (COMPANY_PATTERNS.test(t)) return false;
  return true;
}

function suggestionFor(
  type: Gap['type'],
  requirement: Requirement,
  coverageNote?: string,
): string {
  const short = requirement.text.slice(0, 120) + (requirement.text.length > 120 ? '…' : '');
  if (type === 'missing-material') {
    return `No knowledge-base material matches: "${short}". Add reference documents or run research to cover this requirement.`;
  }
  if (type === 'insufficient-detail') {
    return `Coverage is partial for: "${short}". Expand internal write-ups or attach evidence that addresses: ${coverageNote ?? 'the full requirement'}.`;
  }
  return `Confirm with authoritative sources or internal records: "${short}". ${coverageNote ?? 'Verify claims and compliance wording.'}`;
}

export function detectGaps(matchMatrix: MatchMatrix): Gap[] {
  const gaps: Gap[] = [];

  for (const row of matchMatrix.results) {
    const { requirement, coverage, matches, gapDescription } = row;
    const topScore = matches[0]?.score ?? 0;

    if (coverage === 'none') {
      gaps.push({
        requirement,
        type: 'missing-material',
        suggestion: suggestionFor('missing-material', requirement, gapDescription),
        autoResearchable: looksAutoResearchable(requirement.text),
      });
      continue;
    }

    if (coverage === 'partial') {
      gaps.push({
        requirement,
        type: 'insufficient-detail',
        suggestion: suggestionFor(
          'insufficient-detail',
          requirement,
          gapDescription ?? 'similar passages found but not a full match',
        ),
        autoResearchable: looksAutoResearchable(requirement.text),
      });
      continue;
    }

    // coverage === 'full'
    if (topScore > 0 && topScore < 0.35) {
      gaps.push({
        requirement,
        type: 'needs-verification',
        suggestion: suggestionFor(
          'needs-verification',
          requirement,
          'Match scores are borderline; double-check facts and completeness.',
        ),
        autoResearchable: looksAutoResearchable(requirement.text),
      });
      continue;
    }

    if (VERIFICATION_KEYWORDS.test(requirement.text)) {
      gaps.push({
        requirement,
        type: 'needs-verification',
        suggestion: suggestionFor(
          'needs-verification',
          requirement,
          'Requirement implies certificates or formal proof; confirm against latest records.',
        ),
        autoResearchable: false,
      });
    }
  }

  return gaps;
}
