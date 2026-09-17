import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import questionsJson from '../../../data/member-questions.json';

/**
 * The questions raised while every member's biography was researched
 * (data/member-questions.json): a date of birth a source contradicts, a
 * committee chair the site lacks, a name spelled two ways. None of them was
 * changed on the site; an editor settles each one.
 *
 * Whether a question is settled is kept in the audit log, as
 * question.resolved / question.reopened rows with the question's id in `field`,
 * so no new table is needed and every decision is on the record.
 */
export interface MemberQuestion {
  id: string;
  memberId: string;
  category: string;
  text: string;
  sources: string[];
}

const data = questionsJson as { generatedOn: string; categories: Record<string, string>; questions: MemberQuestion[] };

export const QUESTION_CATEGORIES = data.categories;
export const allQuestions = (): MemberQuestion[] => data.questions;
export const questionsFor = (memberId: string) => data.questions.filter((q) => q.memberId === memberId);

export interface QuestionState { resolved: boolean; by: string | null; at: string | null; note: string | null }

/** The latest decision on each question that has one. */
export async function questionStates(): Promise<Map<string, QuestionState>> {
  const out = new Map<string, QuestionState>();
  for (let from = 0; ; from += 1000) {
    const { data: rows } = await supabaseAdmin()
      .from('audit_log')
      .select('action,field,actor_email,created_at,new_value')
      .in('action', ['question.resolved', 'question.reopened'])
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    for (const r of rows ?? []) {
      out.set(r.field as string, {
        resolved: r.action === 'question.resolved',
        by: r.actor_email as string | null,
        at: r.created_at as string,
        note: r.new_value as string | null,
      });
    }
    if ((rows ?? []).length < 1000) return out;
  }
}
