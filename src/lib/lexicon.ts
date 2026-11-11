// A small, transparent lexicon of charged and partisan-coded phrases.
// These are INDICATORS, not proof: context decides whether a word is biased.
// Pure data + helpers, so it runs on both the server and the client.

export type TermKind = 'charged' | 'left-coded' | 'right-coded'

const CHARGED = [
  'slams', 'slammed', 'blasts', 'blasted', 'destroys', 'destroyed', 'eviscerates', 'rips', 'torches', 'scorches',
  'lashes out', 'doubles down', 'caves', 'bombshell', 'explosive', 'shocking', 'stunning', 'outrage', 'outraged',
  'furious', 'fury', 'chaos', 'crisis', 'disaster', 'catastrophe', 'catastrophic', 'devastating', 'brutal', 'savage',
  'reckless', 'dangerous', 'radical', 'extremist', 'extremists', 'unprecedented', 'plunge', 'plunges', 'skyrocket',
  'skyrockets', 'soar', 'soars', 'collapse', 'meltdown', 'scandal', 'backlash', 'firestorm', 'showdown', 'crackdown',
  'purge', 'tirade', 'rant', 'humiliating', 'embarrassing', 'disgraceful', 'panic', 'terrifying', 'alarming',
  'war on', 'assault on', 'attack on', 'gutting', 'gutted', 'sham', 'witch hunt', 'power grab', 'slashes', 'chilling',
  'hammered', 'tears into', 'unhinged', 'bizarre', 'stunned', 'rocked', 'threatens', 'slap', 'smears', 'demolishes',
]

const LEFT_CODED = [
  'far-right', 'far right', 'right-wing extremists', 'white nationalist', 'authoritarian', 'fascist', 'fascism',
  'autocrat', 'autocratic', 'regime', 'anti-abortion', 'anti-choice', 'gun lobby', 'climate denier', 'climate deniers',
  'undocumented', 'voter suppression', 'corporate greed', 'billionaire class', 'gender-affirming', 'reproductive rights',
  'assault weapons', 'cronies', 'project 2025', 'dark money', 'maga extremists', 'rolling back rights', 'attack on democracy',
  'threat to democracy', 'corporate giveaways', 'tax cuts for the rich', 'trump regime',
]

const RIGHT_CODED = [
  'radical left', 'far-left', 'far left', 'woke', 'leftist', 'leftists', 'socialist', 'socialism', 'marxist', 'communist',
  'open borders', 'illegal aliens', 'illegals', 'illegal immigrants', 'mainstream media', 'fake news', 'deep state',
  'elites', 'globalist', 'globalists', 'rino', 'pro-abortion', 'abortion on demand', 'unborn', 'cancel culture',
  'the swamp', 'radical agenda', 'gun grabbers', 'border crisis', 'liberal media', 'democrat party', 'tax-and-spend',
  'nanny state', 'government overreach', 'big government', 'bureaucrats', 'entitlements', 'lawfare', 'weaponization',
  'weaponized', 'invasion at the border', 'defund the police', 'radical democrats', 'biden regime',
]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildRegex(terms: string[]): RegExp {
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  return new RegExp(`(?<![\\w-])(${sorted.map(escape).join('|')})(?![\\w-])`, 'gi')
}

const REGEXES: Record<TermKind, RegExp> = {
  charged: buildRegex(CHARGED),
  'left-coded': buildRegex(LEFT_CODED),
  'right-coded': buildRegex(RIGHT_CODED),
}

export interface TermHit {
  term: string
  kind: TermKind
  start: number
  end: number
}

export function findTerms(text: string): TermHit[] {
  const hits: TermHit[] = []
  for (const kind of Object.keys(REGEXES) as TermKind[]) {
    const re = new RegExp(REGEXES[kind].source, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      hits.push({ term: m[1].toLowerCase(), kind, start: m.index, end: m.index + m[1].length })
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

export const KIND_LABEL: Record<TermKind, string> = {
  charged: 'Emotionally charged',
  'left-coded': 'Left-coded phrase',
  'right-coded': 'Right-coded phrase',
}
