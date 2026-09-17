import { setQuestionResolved } from '@/app/admin/actions';
import type { MemberQuestion, QuestionState } from '@/lib/admin/questions';
import { QUESTION_CATEGORIES } from '@/lib/admin/questions';
import { Badge, when } from '@/app/admin/ui';

/** Links inside a question's text, made clickable; the rest stays as written. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)\]]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-brand underline decoration-brandring underline-offset-2 break-all">
            {(() => { try { return decodeURIComponent(new URL(p).hostname.replace(/^www\./, '')); } catch { return 'সূত্র'; } })()}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** One question: what the source says, and a way to settle it or open it again. */
export function QuestionItem({ question, state, back }: { question: MemberQuestion; state: QuestionState | null; back: string }) {
  const resolved = !!state?.resolved;
  return (
    <li className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={resolved ? 'good' : 'warn'}>{resolved ? 'নিষ্পন্ন' : 'খোলা'}</Badge>
        <span className="text-[12px] text-muted">{QUESTION_CATEGORIES[question.category] ?? question.category}</span>
      </div>
      <p className="text-[14px] leading-relaxed text-inksoft break-words" lang="en">
        <Linked text={question.text} />
      </p>
      {state && (
        <p className="text-[12.5px] text-muted">
          {resolved ? 'নিষ্পন্ন করেছেন' : 'আবার খুলেছেন'} {state.by ?? 'কেউ'}, {when(state.at)}
          {state.note ? `: ${state.note}` : ''}
        </p>
      )}
      <form action={setQuestionResolved} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="question_id" value={question.id} />
        <input type="hidden" name="member_id" value={question.memberId} />
        <input type="hidden" name="resolve" value={resolved ? '0' : '1'} />
        <input type="hidden" name="back" value={back} />
        {!resolved && (
          <input
            name="note"
            maxLength={500}
            placeholder="কী ঠিক করলেন (ঐচ্ছিক)"
            className="h-9 grow min-w-0 basis-[200px] rounded-lg border border-rule bg-surface px-3 text-[13.5px]"
          />
        )}
        <button
          type="submit"
          className={`h-9 px-3.5 rounded-lg text-[13.5px] font-semibold ${resolved ? 'border border-rule hover:border-ink' : 'bg-brand text-white hover:bg-branddark'}`}
        >
          {resolved ? 'আবার খুলুন' : 'নিষ্পন্ন'}
        </button>
      </form>
    </li>
  );
}
