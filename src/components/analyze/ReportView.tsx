'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/analysis'
import { BUCKET_META, leanBucket, leanColor, leanLabel } from '@/lib/outlets'
import { signed } from '@/lib/format'
import Notice from '@/components/ui/Notice'
import Tabs from '@/components/ui/Tabs'
import Disclosure from '@/components/ui/Disclosure'
import OutletIcon from '@/components/stories/OutletIcon'
import LeanGauge from './LeanGauge'
import ScoreBar from './ScoreBar'
import AnnotatedText from './AnnotatedText'
import { ExternalLink, ShieldCheck } from 'lucide-react'

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-7">
      <p className="label-mono mb-1">{kicker}</p>
      <h2 className="mb-5 font-headline text-xl font-bold md:text-2xl">{title}</h2>
      {children}
    </section>
  )
}

const DIR_STYLE: Record<string, string> = {
  left: 'bg-blue-100 text-blue-900',
  right: 'bg-rose-100 text-rose-900',
  neutral: 'bg-stone-100 text-stone-800',
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5" title={hint}>
      <div className="font-headline text-2xl font-black tabular-nums">{value}</div>
      <div className="label-mono mt-0.5">{label}</div>
      <div className="mt-1 text-[11px] leading-snug text-muted">{hint}</div>
    </div>
  )
}

export default function ReportView({ result }: { result: AnalysisResult }) {
  const { analysis: a, stats, outlet, article, verification } = result
  type TabKey = 'evidence' | 'wording' | 'logic' | 'sources' | 'metrics' | 'text'
  const [tab, setTab] = useState<TabKey>(a ? 'evidence' : 'metrics')
  const gradeLabel = stats.gradeLevel <= 8 ? 'Easy' : stats.gradeLevel <= 12 ? 'Moderate' : 'Advanced'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-7">
        {article.domain && (
          <OutletIcon name={article.source || article.domain} domain={article.domain} lean={outlet?.lean ?? null} size={48} />
        )}
        <div className="flex-1">
          <p className="label-mono">{article.source || article.domain || 'Pasted text'}</p>
          <h1 className="mt-1 font-headline text-xl font-black leading-snug md:text-2xl">{article.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>{article.totalWords.toLocaleString()} words{article.truncated ? ` (first ${stats.words.toLocaleString()} analyzed)` : ''}</span>
            {result.provider && <span>Model: {result.provider}</span>}
            {a && (
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> {verification.verified}/{verification.requested} quotes verified in the text
              </span>
            )}
            {article.url && (
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        </div>
      </div>

      {result.mode === 'data-only' && (
        <Notice tone="warn" title="Showing measurements only">
          {result.aiError} The statistics and highlighted wording below were computed directly from the text. Try again in a minute for the full AI report.
        </Notice>
      )}

      {/* Verdict */}
      {a && (
        <section className="card grid gap-8 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:p-7">
          <LeanGauge lean={a.leanScore} confidence={a.leanConfidence} outletLean={outlet?.lean} outletName={outlet?.name} />
          <div>
            <p className="label-mono mb-1">Verdict</p>
            <p className="font-headline text-lg font-bold leading-snug">{a.summary}</p>
            <div className="mt-3"><Disclosure title="Why this score?">{a.leanReasoning}</Disclosure></div>

            <div className="mt-5 overflow-hidden rounded-xl border border-line text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line bg-paper px-4 py-2 label-mono">
                <span>Independent signal</span>
                <span>Lean</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line px-4 py-2.5">
                <span>AI reading of this text</span>
                <b style={{ color: leanColor(a.leanScore) }}>{signed(a.leanScore)} · {leanLabel(a.leanScore)}</b>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line px-4 py-2.5">
                <span>
                  Partisan-phrase balance
                  <span className="block text-xs text-muted">
                    {stats.loadedTerms.leftCoded} left-coded vs {stats.loadedTerms.rightCoded} right-coded phrases
                  </span>
                </span>
                {stats.lexiconLean !== null ? (
                  <b style={{ color: leanColor(stats.lexiconLean) }}>{signed(stats.lexiconLean)}</b>
                ) : (
                  <span className="text-xs text-muted">too few hits</span>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2.5">
                <span>
                  {outlet ? `${outlet.name} typical rating` : 'Outlet rating'}
                  <span className="block text-xs text-muted">{outlet ? `${outlet.reliability} reliability · approximate` : 'Publisher not in our table'}</span>
                </span>
                {outlet ? (
                  <b style={{ color: leanColor(outlet.lean) }}>{signed(outlet.lean)} · {BUCKET_META[leanBucket(outlet.lean)].label}</b>
                ) : (
                  <span className="text-xs text-muted">n/a</span>
                )}
              </div>
            </div>
            {outlet && (
              <p className="mt-3 text-xs text-muted">
                This article reads {Math.abs(a.leanScore - outlet.lean) <= 15 ? 'in line with' : a.leanScore > outlet.lean ? 'further right than' : 'further left than'}{' '}
                {outlet.name}&apos;s typical rating (difference {signed(a.leanScore - outlet.lean)}).
              </p>
            )}
          </div>
        </section>
      )}

      {/* Score tiles */}
      {a && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <ScoreBar label="Subjectivity" value={a.scores.subjectivity} goodHigh={false} hint="0 = pure reporting, 100 = pure opinion." />
          <ScoreBar label="Sensationalism" value={a.scores.sensationalism} goodHigh={false} hint="How much the wording is built to provoke." />
          <ScoreBar label="Evidence quality" value={a.scores.evidenceQuality} goodHigh hint="Named sources, data, and attribution." />
          <ScoreBar label="Balance" value={a.scores.balance} goodHigh hint="How fairly competing views are represented." />
          <ScoreBar label="Tone" value={a.scores.tone} min={-100} max={100} bipolar hint="Negative = hostile, positive = warm." />
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ...(a ? [{ key: 'evidence' as TabKey, label: 'Evidence', count: a.biasEvidence.length }] : []),
          ...(a && a.loadedLanguage.length ? [{ key: 'wording' as TabKey, label: 'Wording', count: a.loadedLanguage.length }] : []),
          ...(a && (a.fallacies.length || a.claims.length) ? [{ key: 'logic' as TabKey, label: 'Logic & claims', count: a.fallacies.length + a.claims.length }] : []),
          ...(a ? [{ key: 'sources' as TabKey, label: 'Sources & framing' }] : []),
          { key: 'metrics' as TabKey, label: 'Metrics' },
          { key: 'text' as TabKey, label: 'Annotated text' },
        ]}
      />

      {/* Evidence */}
      {tab === 'evidence' && a && (
        <Section kicker={`Evidence · ${a.biasEvidence.length} verified`} title="Where the bias shows up">
          {a.biasEvidence.length === 0 ? (
            <Notice>No clear, quotable bias signals were found in this text — which is itself a finding.</Notice>
          ) : (
            <div className="space-y-4">
              {a.biasEvidence.map((e, i) => (
                <div key={i} className="rounded-xl border border-line p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${DIR_STYLE[e.direction]}`}>
                      {e.direction === 'neutral' ? 'loaded (non-partisan)' : `favors ${e.direction}`}
                    </span>
                    <span className="label-mono">{e.technique}</span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted" title={`Severity ${e.severity} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`h-2 w-2 rounded-full ${n <= e.severity ? 'bg-primary' : 'bg-line'}`} />
                      ))}
                    </span>
                  </div>
                  <blockquote className="border-l-4 border-primary/60 bg-paper px-4 py-2.5 font-headline text-[15px] italic leading-relaxed">
                    “{e.quote}”
                  </blockquote>
                  <p className="mt-2.5 text-sm leading-relaxed">{e.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Loaded language */}
      {tab === 'wording' && a && a.loadedLanguage.length > 0 && (
        <Section kicker={`Word choice · ${a.loadedLanguage.length} phrases`} title="Loaded language and neutral alternatives">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-line">
                  <th className="py-2 pr-4 font-medium">As written</th>
                  <th className="py-2 pr-4 font-medium">Leans</th>
                  <th className="py-2 pr-4 font-medium">More neutral</th>
                  <th className="py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.loadedLanguage.map((l, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-3 pr-4 font-semibold text-red-900">“{l.phrase}”</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${DIR_STYLE[l.direction]}`}>{l.direction}</span>
                    </td>
                    <td className="py-3 pr-4 text-emerald-800">{l.neutralAlternative || '—'}</td>
                    <td className="py-3 text-muted">{l.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Fallacies + claims */}
      {tab === 'logic' && a && (
        <div className="grid gap-6 lg:grid-cols-2">
          {a.fallacies.length > 0 && (
            <Section kicker={`Logic · ${a.fallacies.length}`} title="Fallacies and weak reasoning">
              <div className="space-y-4">
                {a.fallacies.map((f, i) => (
                  <div key={i}>
                    <p className="mb-1 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-900">{f.name}</p>
                    <blockquote className="border-l-4 border-purple-300 pl-3 text-sm italic">“{f.quote}”</blockquote>
                    <p className="mt-1.5 text-sm text-ink/80">{f.explanation}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {a.claims.length > 0 && (
            <Section kicker={`Fact-check queue · ${a.claims.length}`} title="Claims worth verifying">
              <div className="space-y-4">
                {a.claims.map((c, i) => (
                  <div key={i}>
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">{c.type}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          c.support === 'cited' ? 'bg-emerald-100 text-emerald-900' : c.support === 'uncited' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {c.support}
                      </span>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{c.checkability} to check</span>
                    </div>
                    <blockquote className="border-l-4 border-sky-300 pl-3 text-sm italic">“{c.quote}”</blockquote>
                    <p className="mt-1.5 text-sm text-ink/80"><b>How to verify:</b> {c.howToVerify}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Sources + framing */}
      {tab === 'sources' && a && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section kicker="Sourcing" title="Who is quoted — and who isn't">
            {a.sources.named.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {a.sources.named.map((s, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span>
                      <b>{s.name}</b>
                      {s.role && <span className="text-muted"> — {s.role}</span>}
                    </span>
                    {s.perspective && <span className="label-mono shrink-0 rounded bg-paper px-1.5 py-0.5">{s.perspective}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No named sources identified.</p>
            )}
            {a.sources.missingPerspectives.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="label-mono mb-2 !text-amber-800">Missing perspectives</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {a.sources.missingPerspectives.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </Section>

          <Section kicker="Framing" title="The lens of the story">
            <p className="font-headline text-base font-bold leading-snug">{a.framing.frame}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label-mono mb-1.5">Emphasized</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">{a.framing.emphasized.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div>
                <p className="label-mono mb-1.5">Downplayed / omitted</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">{a.framing.downplayed.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>
            {a.framing.oppositeFraming && (
              <div className="mt-5 rounded-xl bg-ink p-4 text-sm leading-relaxed text-white">
                <p className="label-mono mb-1.5 !text-white/60">How the other side might frame it</p>
                {a.framing.oppositeFraming}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Metrics */}
      {tab === 'metrics' && (
      <Section kicker="Measured directly from the text" title="Text metrics">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <Stat label="Words" value={stats.words.toLocaleString()} hint={`${stats.sentences} sentences, ${stats.avgSentenceWords} words each on average.`} />
          <Stat label="Reading level" value={`Gr. ${Math.max(0, stats.gradeLevel).toFixed(1)}`} hint={`${gradeLabel} · Flesch ease ${stats.readingEase}.`} />
          <Stat label="Direct quotes" value={stats.quotes} hint={`${stats.quotedWordShare}% of the text is quoted speech.`} />
          <Stat label="Attributions" value={stats.attributions} hint={'"said", "according to" … — signals sourced claims.'} />
          <Stat label="Anonymous sources" value={stats.anonymousSources} hint="Unnamed sourcing is harder for readers to check." />
          <Stat label="Numbers cited" value={stats.numbers} hint="Figures and percentages that can be verified." />
          <Stat label="Hedging words" value={stats.hedges} hint={'"may", "reportedly" … — signals uncertainty.'} />
          <Stat label="Intensifiers" value={stats.intensifiers} hint={'"very", "massive" … — emphasis words.'} />
          <Stat label="Loaded terms /1k" value={stats.loadedPer1000} hint={`${stats.loadedTerms.charged} charged · ${stats.loadedTerms.leftCoded} left-coded · ${stats.loadedTerms.rightCoded} right-coded.`} />
          <Stat label="First-person /1k" value={stats.firstPersonPer1000} hint={'"I", "we", "our" — more common in opinion writing.'} />
          <Stat label="Exclamation marks" value={stats.exclamations} hint="Rare in straight news reporting." />
          <Stat label="ALL-CAPS words" value={stats.allCapsWords} hint="Shouting for emphasis (acronyms excluded by length)." />
        </div>
        {stats.topTerms.length > 0 && (
          <div className="mt-5">
            <p className="label-mono mb-2">Most frequent charged / partisan-coded terms</p>
            <div className="flex flex-wrap gap-2">
              {stats.topTerms.map((t) => (
                <span key={t.kind + t.term} className="rounded-full border border-line bg-white px-3 py-1 text-xs">
                  <b>{t.term}</b> ×{t.count} <span className="text-muted">· {t.kind}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">Term lists are indicators, not proof — context decides whether a word is biased.</p>
      </Section>
      )}

      {/* Annotated text */}
      {tab === 'text' && (
      <Section kicker="Close reading" title="The article, annotated">
        <AnnotatedText text={article.text} highlights={result.highlights} />
      </Section>
      )}
    </div>
  )
}
