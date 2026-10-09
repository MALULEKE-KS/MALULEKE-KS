// lib/guide/tone.ts
// The humor governor (docs/AI-GUIDE-PHASE2-PLAN.md §6). Owner's brief: the guide
// has a sense of humor, and it knows when one is called for — "calculated", not
// the model's mood. So the *decision* is made here, in code, from plain signals,
// and the model only carries it out:
//
//   gravity   a visitor in distress or hardship, a legal / medical / financial
//             question, a formal hiring or contract matter → no humor, and not for
//             the next couple of turns either (no pivoting to a joke right after);
//   register  a visitor who is playing (a riddle, a roast, "lol", an emoji) → play
//             along; a formal register → at most a dry touch;
//   cadence   never the very first answer unless the visitor opens playfully; then
//             one turn in three at most, so wit stays a seasoning;
//   ceiling   the owner's setting (concierge.humor: off / dry / playful) caps it all.
//
// The result is a short instruction added to that turn only. Pure and tested: the
// same inputs always give the same decision.

export type Humor = "off" | "dry" | "playful";
export type Mood = "steady" | "warm" | "playful";

export interface ToneInput {
  /** The visitor's current question. */
  question: string;
  /** Their earlier questions in this conversation, oldest first (not including the current one). */
  earlier: string[];
  /** Which question this is, counting from 1 (the current one included). */
  turn: number;
  /** The owner's ceiling (concierge.humor). */
  ceiling: Humor;
}

export interface ToneDecision {
  humor: Humor;
  /** What the character shows: steady (serious), warm (default), playful. */
  mood: Mood;
  /** Why, in plain words — for tests and the telemetry, never shown to a visitor. */
  reason: string;
}

const DISTRESS = /\b(suicid\w*|kill (?:myself|me)|end (?:it all|my life)|don'?t want to (?:live|be alive|exist)|self[- ]?harm\w*|hopeless|can'?t go on|want to die|no point (?:in )?(?:living|anything)|giv\w+ up on (?:everything|life))\b/i;
const HARDSHIP =
  /\b(failed (?:my|all|the|every)\b|i failed|lost my (?:job|savings|home|house|business|father|mother|dad|mom|mum|parent|friend)|got fired|was fired|laid off|retrench\w*|bereave\w*|passed away|funeral|grief|griev\w*|divorc\w*|diagnos\w*|cancer|bankrupt\w*|evict\w*|depress\w*|anxiety|anxious|panick\w*|panic|overwhelm\w*|burn(?:t|ed)?[- ]?out|struggling|stressed|scared|heartbroken|my (?:startup|business|company) (?:just )?(?:failed|collapsed|closed)|mental health)\b/i;
const SERIOUS_ADVICE = /\b(sue|lawsuit|lawyer|legal advice|my landlord|court|dosage|dose|medication|prescri\w*|symptoms?|invest(?:ing)? (?:my|all|everything)|my savings|loan|debt|tax return)\b/i;
const FORMAL_MATTER = /\b(dear (?:sir|madam|hiring)|to whom it may concern|kindly (?:provide|confirm|send|advise)|yours (?:sincerely|faithfully)|best regards|we (?:represent|wish to|are writing)|i am writing to|on behalf of (?:the|our)|due diligence|reference check|background check|offer letter|formal (?:summary|statement|reference))\b/i;
const MONEY_MATTER = /\b(salary|compensation|remuneration|rates?|contract|invoice|budget|quote|pricing)\b/i;
const PLAYFUL = /\b(lol|lmao|rofl|haha+|hehe+|joke|jokes|funny|riddle|roast|pun|puns|meme|fun fact|poem|haiku|limerick|make me laugh|banter|tell me something (?:fun|silly)|for fun|just kidding|jk)\b|[😂🤣😄😁😆😉🙃😎🎉🤪😜]/iu;
const PRESSURE = /\b(ignore (?:all |your )?(?:previous|prior|the above) (?:instructions|rules)|system prompt|developer mode|jailbreak|reveal your (?:instructions|prompt|rules)|you are now|override)\b/i;
const HOSTILE = /\b(stupid|useless|idiot|dumb|garbage|trash|worthless|shut up|you suck)\b/i;
const FACT_LOOKUP = /^(?:how many|when (?:did|was|is)|what(?:'s| is) (?:his|the) (?:email|cv|status|stack)|where (?:is|can)|which year)\b/i;

const RECENT_TURNS = 2;

/** Does the text carry a given signal? */
const has = (re: RegExp, text: string) => re.test(text);

export function decideTone({ question, earlier, turn, ceiling }: ToneInput): ToneDecision {
  const off = (reason: string): ToneDecision => ({ humor: "off", mood: "steady", reason });
  if (ceiling === "off") return off("the owner has switched humor off");

  const recent = earlier.slice(-RECENT_TURNS);

  // Gravity — now, or just before: a visitor who was hurting a moment ago isn't ready for a joke.
  if (has(DISTRESS, question) || recent.some((q) => has(DISTRESS, q))) return off("the visitor may be in distress");
  if (has(HARDSHIP, question) || recent.some((q) => has(HARDSHIP, q))) return off("the visitor is dealing with something hard");
  if (has(SERIOUS_ADVICE, question)) return off("a legal, medical or financial question");
  if (has(FORMAL_MATTER, question) || (has(MONEY_MATTER, question) && !has(PLAYFUL, question))) return off("a formal or money matter");

  const cap = (h: Humor): Humor => (ceiling === "dry" && h === "playful" ? "dry" : h);
  const done = (h: Humor, reason: string): ToneDecision => ({ humor: cap(h), mood: cap(h) === "playful" ? "playful" : cap(h) === "dry" ? "warm" : "steady", reason });

  // Register — the visitor is playing: play along.
  if (has(PLAYFUL, question)) return done("playful", "the visitor is being playful");

  // Under pressure (a jailbreak attempt, an insult) the brief is calm and unbothered — a dry line is welcome.
  if (has(PRESSURE, question) || has(HOSTILE, question)) return done("dry", "unbothered under pressure");

  // A plain lookup is answered plainly.
  if (FACT_LOOKUP.test(question.trim())) return off("a plain lookup");

  // Cadence — never the first answer, then one turn in three at most.
  if (turn <= 1) return off("the first answer is substance first");
  if (turn % 3 === 2) return done("dry", "a light moment in the rhythm");
  return off("keeping wit a seasoning");
}

const NEVER = "Never joke at the visitor's expense, about Kurhula's weaknesses, about named people or companies, or about identity, religion, politics or health.";

/** The instruction for this reply, added after the standing instructions — built here, never from visitor text. */
export function toneInstruction(decision: ToneDecision): string {
  switch (decision.humor) {
    case "off":
      return "Tone for this reply: steady. Warm and direct — no jokes, puns, wordplay or playful asides; the moment doesn't call for them.";
    case "dry":
      return `Tone for this reply: a touch of dry wit is welcome — at most one short line, after the substance and never instead of it, and only if it comes naturally. A joke never carries or bends a fact. ${NEVER}`;
    case "playful":
      return `Tone for this reply: the visitor is playful, so play along — wit, wordplay and a clever analogy are welcome, kept short, with the substance first where there is any. A joke never carries or bends a fact. ${NEVER}`;
  }
}
