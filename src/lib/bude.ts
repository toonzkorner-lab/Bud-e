export type Method = "flower" | "edible" | "vape" | "dab" | "drink" | "other";
export type Unit = "mg" | "g";
export type Experience = "new" | "some" | "experienced";
export type Setting = "couch" | "outside" | "friends" | "solo";
export type Sound = "music" | "a show" | "quiet" | "a podcast";
export type Snack = "salty" | "sweet" | "crunchy" | "cold";
export type Energy = "chill" | "giggly" | "sleepy" | "creative";

export type Session = {
  method: Method;
  amount: string;
  unit: Unit;
  unsure: boolean;
  timeTaken: string;
  experience: Experience;
};

export type Vibe = {
  setting: Setting | null;
  sound: Sound | null;
  snack: Snack | null;
  energy: Energy | null;
};

export type Safety = "emergency" | "pet" | "drive" | "too-high";
export type BuddyAction = "timer" | "breathe" | "munchies";

export type BuddyReply = {
  text: string;
  action?: BuddyAction;
  safety?: Safety;
};

export const METHODS: Record<
  Method,
  { label: string; unit: Unit; inhaled: boolean; hint: string }
> = {
  flower: { label: "Flower", unit: "g", inhaled: true, hint: "Joint, bowl, bong" },
  edible: { label: "Edible", unit: "mg", inhaled: false, hint: "Gummy, brownie, chocolate" },
  vape: { label: "Vape", unit: "mg", inhaled: true, hint: "Cart or disposable" },
  dab: { label: "Dab", unit: "mg", inhaled: true, hint: "Concentrate" },
  drink: { label: "Drink", unit: "mg", inhaled: false, hint: "Seltzer, tea, soda" },
  other: { label: "Other", unit: "mg", inhaled: false, hint: "Tincture, mix, not sure" },
};

export const EXPERIENCE: Record<Experience, string> = {
  new: "New to this",
  some: "Some experience",
  experienced: "I know my dose",
};

export const SETTINGS: Record<Setting, string> = {
  couch: "Couch",
  outside: "Outside",
  friends: "With friends",
  solo: "Solo",
};

export const SOUNDS: Record<Sound, string> = {
  music: "Music",
  "a show": "A show",
  quiet: "Quiet",
  "a podcast": "A podcast",
};

export const SNACKS: Record<Snack, string> = {
  salty: "Salty",
  sweet: "Sweet",
  crunchy: "Crunchy",
  cold: "Cold",
};

export const ENERGIES: Record<Energy, string> = {
  chill: "Chill",
  giggly: "Giggly",
  sleepy: "Sleepy",
  creative: "Creative",
};

export const EMPTY_VIBE: Vibe = {
  setting: null,
  sound: null,
  snack: null,
  energy: null,
};

const WINDOW_MIN = 14 * 60;

export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatClock(minutes: number): string {
  const t = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function clockNow(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Minutes since a clock time, assuming a session under 14 hours. */
export function minutesSince(
  timeTaken: string,
  now = new Date(),
): { minutes: number; future: boolean } | null {
  const taken = parseClock(timeTaken);
  if (taken === null) return null;
  const nowM = now.getHours() * 60 + now.getMinutes();
  const back = (nowM - taken + 1440) % 1440;
  if (back <= WINDOW_MIN) return { minutes: back, future: false };
  return { minutes: (taken - nowM + 1440) % 1440, future: true };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function dosePhrase(session: Session): string {
  const name = METHODS[session.method].label.toLowerCase();
  if (session.unsure || !session.amount.trim()) return name;
  return `${session.amount.trim()}${session.unit} ${name}`;
}

export function waitMinutesFor(session: Session): number {
  return METHODS[session.method].inhaled ? 15 : 120;
}

export function waitTitle(session: Session | null): string {
  if (!session) return "Wait timer";
  return METHODS[session.method].inhaled ? "Settle timer" : "Edible wait";
}

export type Phase = { label: string; detail: string };

export function timeline(session: Session): Phase[] {
  if (METHODS[session.method].inhaled) {
    return [
      { label: "First few minutes", detail: "One or two small hits, then wait." },
      { label: "15–30 min", detail: "You should feel where it landed." },
      { label: "About an hour", detail: "Usually the peak for flower and vapes." },
      { label: "2–4 hours", detail: "Easing off. Sleepy is normal." },
    ];
  }
  return [
    { label: "0–45 min", detail: "Often feels like nothing. That is normal." },
    { label: "45–90 min", detail: "Onset for most people. Still don't stack." },
    { label: "2–4 hours", detail: "Peak window. This is the top." },
    { label: "4–8 hours", detail: "Coming down. Can linger toward 12." },
  ];
}

export function activePhase(session: Session, now = new Date()): number | null {
  const since = session.timeTaken ? minutesSince(session.timeTaken, now) : null;
  if (!since || since.future) return null;
  const m = since.minutes;
  if (METHODS[session.method].inhaled) {
    if (m < 15) return 0;
    if (m < 45) return 1;
    if (m < 120) return 2;
    return 3;
  }
  if (m < 45) return 0;
  if (m < 120) return 1;
  if (m < 240) return 2;
  return 3;
}

const EMERGENCY =
  /chest pain|can.?t breathe|trouble breathing|faint|passed out|pass(?:ed|ing)? out|seizure|throwing up blood|vomit(?:ing)? blood|heart attack|stroke|overdose|loss of consciousness|unconscious/i;
const PET =
  /\b(dog|cat|puppy|kitten|pet)\b.{0,48}\b(ate|eaten|eat|got into|chewed)\b|\b(ate|eaten|got into)\b.{0,48}\b(edible|gummy|weed|pot|thc|brownie)\b/i;
const DRIVE = /\b(driv(?:e|ing)|behind the wheel|get home|keys)\b/i;
const TOO_HIGH =
  /\b(too high|green(?:ing)? out|spinning|anxious|anxiety|panic|paranoid|heart racing|racing heart|scared|freaking|dizzy|nausea|nauseous|throw(?:ing)? up|vomit)\b/i;
const REDOSE =
  /\b(redose|take more|another (?:one|dose|gummy|hit|puff)|more (?:mg|weed|edible)|second (?:dose|gummy|one)|eat another|smoke more)\b/i;
const NOT_YET =
  /\b(feel nothing|don.?t feel|not feeling|nothing happening|not working|not kicking|hasn.?t kicked|no effect|when will (?:it|this) (?:hit|kick)|how long (?:till|until|before)|how much longer)\b/i;
const TIMELINE = /\b(how long|timeline|kick in|kicks in|peak|onset|wear off|lasts)\b/i;
const EDIBLE_WORD = /\b(edible|gummy|gummies|brownie|cookie|chocolate|drink|seltzer)\b/i;
const LEGAL = /\b(legal|illegal|law|texas|police|cop|arrest|jail)\b/i;
const MUNCHIE_RE = /\b(munchies|snack|hungry|food|eat something|craving)\b/i;
const SLEEP = /\b(sleep|sleepy|tired|insomnia|can.?t sleep|nap|bed)\b/i;
const DOSE = /\b(how much|dose|dosage|start|beginner|first time|new to|too much|milligram)\b/i;
const TOLERANCE = /\b(tolerance|t-break|tolerance break|not working anymore|used to it|need more to feel)\b/i;
const GREET = /^(hi|hey|hello|yo|sup|what'?s up|good (evening|night|morning|afternoon))\b/i;

function edibleContext(session: Session | null, question: string, recent: string): boolean {
  if (EDIBLE_WORD.test(question)) return true;
  if (/\b(flower|joint|vape|dab|smoke|smoking|bowl)\b/i.test(question)) return false;
  if (session && !METHODS[session.method].inhaled) return true;
  return EDIBLE_WORD.test(recent);
}

function edibleWindow(session: Session | null, now: Date): string {
  const phrase = session && !METHODS[session.method].inhaled ? dosePhrase(session) : "an edible";
  const since = session?.timeTaken ? minutesSince(session.timeTaken, now) : null;
  if (!session || METHODS[session.method].inhaled || !since || since.future) {
    return `${cap(phrase)} usually shows up in 45–90 minutes, peaks around 2–4 hours, and can last 4–8 hours (sometimes toward 12). Log the time you took it and I can do the math for your night.`;
  }
  const taken = parseClock(session.timeTaken)!;
  const waitUntil = formatClock(taken + 120);
  const peakEnd = formatClock(taken + 240);
  const name = cap(dosePhrase(session));
  if (since.minutes < 120) {
    const left = 120 - since.minutes;
    const into = since.minutes === 0 ? "you just took it" : `you're ${plural(since.minutes, "minute")} in`;
    return `${name} — ${into}. Edibles usually take 45–90 minutes to show up, so this is very likely just early. Do not take more. Give it until at least ${waitUntil} (${plural(left, "minute")} from now). Peak for you is about ${waitUntil} to ${peakEnd}.`;
  }
  if (since.minutes < 240) {
    const hours = Math.floor(since.minutes / 60);
    return `${name} — you're about ${plural(hours, "hour")} in, which is the peak window (${waitUntil} to ${peakEnd}). It should be doing its thing and will ease off over the next few hours. Sip water and ride it.`;
  }
  const hours = Math.floor(since.minutes / 60);
  return `${name} — you're ${hours}+ hours in, past the peak and on the way down. Edibles can hang around 4–8 hours (up to 12), so mellow or sleepy for a while longer is normal.`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function replyTo(
  raw: string,
  session: Session | null,
  history: { role: string; text: string }[],
  now = new Date(),
): BuddyReply {
  const text = raw.trim();
  const q = text.toLowerCase();
  const recent = history
    .slice(-6)
    .map((m) => m.text.toLowerCase())
    .join(" ");
  const edible = edibleContext(session, q, recent);
  const since = session?.timeTaken ? minutesSince(session.timeTaken, now) : null;
  const phrase = session ? dosePhrase(session) : null;

  if (EMERGENCY.test(q)) {
    return {
      safety: "emergency",
      text: "Stop and treat this as urgent. Chest pain, trouble breathing, fainting, a seizure, or vomiting blood means real help now — call 911 or have someone get you to an ER. I can't tell how serious it is from here, and this is the one time you don't wait it out. Are you alone, or is someone with you?",
    };
  }
  if (PET.test(q)) {
    return {
      safety: "pet",
      text: "If a pet ate edibles, call a vet or animal poison control right now. Don't wait to see how they act, and don't make them throw up unless a vet tells you to. Tell them what it was and roughly how much. How long ago, and how are they acting?",
    };
  }
  if (DRIVE.test(q)) {
    return {
      safety: "drive",
      text: "Never drive high. No exceptions. Wait until you are fully sober — after an edible, that means a full night's sleep, not the moment you feel \"okay-ish.\" A ride, a couch, or staying put beats a car. Want help thinking through where you can crash?",
    };
  }
  if (TOO_HIGH.test(q)) {
    return {
      safety: "too-high",
      action: "breathe",
      text: "You're alright. This passes, even when it really doesn't feel like it. Lie down somewhere soft, sip water, eat a little if you can, and get cooler air. CBD will not undo it quickly, and neither will a cold shower trick — time does, usually a couple of hours. I can run a slow breathing bubble with you.",
    };
  }
  if (REDOSE.test(q)) {
    if (edible && since && !since.future && since.minutes < 120) {
      const taken = parseClock(session!.timeTaken)!;
      return {
        action: "timer",
        text: `Not yet. You're only ${plural(since.minutes, "minute")} into that ${phrase}, and edibles stack in a sneaky way. More right now is how a calm night becomes a bad one. Wait until at least ${formatClock(taken + 120)} before you even think about it. I can start the wait timer.`,
      };
    }
    if (edible && since && !since.future) {
      return {
        text: `You're ${plural(Math.floor(since.minutes / 60), "hour")} into that ${phrase}, so you're past the "too early" zone. If you do take more, make it half of what you started with and give it another full 2 hours. How are you feeling, honestly?`,
      };
    }
    if (!edible && session && METHODS[session.method].inhaled) {
      return {
        action: "timer",
        text: `Easy. With ${phrase}, wait 15–20 minutes between hits and see where you actually land. You can always take more. You can't take less. Want a 15-minute settle timer?`,
      };
    }
    return {
      text: "Easy does it. Edibles: wait a full 2 hours before even thinking about more, because they stack. Smoking or vaping: wait 15–20 minutes between hits. Tell me what you took and when, and I'll be specific.",
    };
  }
  if (NOT_YET.test(q)) {
    if (!edible && session && METHODS[session.method].inhaled) {
      const mins = since && !since.future ? ` You're ${plural(since.minutes, "minute")} in.` : "";
      return {
        action: "timer",
        text: `${cap(phrase!)} usually lands in 5–15 minutes — much faster than an edible.${mins} Give it a full 15 before another hit. If this was actually an edible, say so.`,
      };
    }
    return {
      action: since && !since.future && since.minutes >= 120 ? undefined : "timer",
      text: edibleWindow(session, now),
    };
  }
  if (TIMELINE.test(q) && edible) {
    return { text: edibleWindow(session, now) };
  }
  if (TIMELINE.test(q) && session && METHODS[session.method].inhaled) {
    const inhaledSince = since && !since.future ? ` You're ${plural(since.minutes, "minute")} in.` : "";
    return {
      text: `${cap(phrase!)} usually lands in 5–15 minutes and peaks within an hour, then eases over 2–4 hours.${inhaledSince} If it was actually an edible, say so — those play by totally different rules.`,
    };
  }
  if (TIMELINE.test(q)) {
    return {
      text: "Flower and vapes usually land in 5–15 minutes. Edibles are the slow ones: 45–90 minutes to kick in, peak at 2–4 hours, lasting 4–8. Which one are you on?",
    };
  }
  if (LEGAL.test(q)) {
    const texas = /\btexas\b/i.test(q)
      ? " In Texas, recreational cannabis is still illegal, and hemp-derived THC products sit in a gray area that keeps changing."
      : " Rules depend on where you are, and they change.";
    return {
      text: `This isn't legal advice.${texas} Keep amounts small, don't carry more than you mean to, and never drive with it. Want to get back to how tonight actually feels?`,
    };
  }
  if (MUNCHIE_RE.test(q)) {
    return {
      action: "munchies",
      text: "Munchies have entered the chat. Salty and sweet together is the move. Drink a glass of water first, then snack slow so the kitchen survives. I can pick something from the munchies maker.",
    };
  }
  if (SLEEP.test(q)) {
    return {
      text: "Cannabis can make you sleepy, but it's sneaky sleep — you might drop off fast and still wake up foggy. Dim the lights and put the phone down. An edible can linger 4–8 hours, so morning might feel soft too. Winding down, or trying to stay up?",
    };
  }
  if (DOSE.test(q)) {
    if (session && !session.unsure && session.amount.trim()) {
      const amount = Number(session.amount);
      if (session.experience === "new" && !METHODS[session.method].inhaled && !Number.isNaN(amount) && amount > 5) {
        return {
          text: `Real talk: ${dosePhrase(session)} is a lot for a first edible — most new folks start at 2.5–5 mg. You already took it, so no stressing: don't take more, drink water, and give it the full 2 hours. Next time, start at 5 mg or less.`,
        };
      }
      return {
        text: `You're at ${dosePhrase(session)} — ${session.experience === "experienced" ? "a familiar dose if that matches your usual" : session.experience === "new" ? "a beginner-range amount if you stay here" : "a middle-of-the-road amount"}. Same rule either way: start low, go slow, and don't stack early. How's it treating you?`,
      };
    }
    return {
      text: "Start low, go slow. New to edibles? 2.5–5 mg, then a full 2 hours. Flower or a vape? One or two small hits, then 15 minutes. You can always take more. You can't take less. What are you working with tonight?",
    };
  }
  if (TOLERANCE.test(q)) {
    return {
      text: "Tolerance is real — same amount, less magic. Even 2–3 days off helps a little. A week or two resets a lot more. When you come back, start at half your usual. Thinking about a break, or just curious?",
    };
  }
  if (GREET.test(q) || history.filter((m) => m.role === "user").length === 0) {
    const known =
      session && since && !since.future
        ? ` I see your ${phrase} from ${formatClock(parseClock(session.timeTaken)!)} — I'll keep that in mind.`
        : session
          ? ` I see you logged ${phrase}. Add the time if you want exact windows.`
          : "";
    return {
      text: `Hey. I'm Bud-E — no judgment, just straight answers.${known} Tell me how you feel, what you took, or ask something like "when will this hit?" What's the plan tonight?`,
    };
  }
  return {
    text: "I missed that one. Ask it again in a few seconds and I'll answer it properly.",
  };
}

export const MUNCHIES: { text: string; tags: Snack[] }[] = [
  { text: "Salty popcorn and gummy bears. The classic sweet-and-salty tag team.", tags: ["salty", "sweet"] },
  { text: "Nachos with cheese and a cold soda. Crunchy, melty, done.", tags: ["salty", "crunchy", "cold"] },
  { text: "Peanut butter toast with banana. Sweet, filling, almost no work.", tags: ["sweet"] },
  { text: "Ice cream from the tub, pretzels on the side.", tags: ["sweet", "cold", "salty"] },
  { text: "Chips, salsa, and a big glass of ice water. Hydrate while you crunch.", tags: ["salty", "crunchy", "cold"] },
  { text: "Grilled cheese and tomato soup. Warm and couch-approved.", tags: ["salty"] },
  { text: "Mango, strawberries, and whipped cream. Cold and sweet.", tags: ["sweet", "cold"] },
  { text: "Ramen and a soft egg. Slurpy comfort in about five minutes.", tags: ["salty"] },
  { text: "Cereal, dry, straight from the box. No bowl, no rules.", tags: ["crunchy", "sweet"] },
  { text: "Quesadilla, sour cream, hot sauce. Cheesy with a little kick.", tags: ["salty"] },
  { text: "Frozen grapes and a square of dark chocolate. Lazy, but fancy.", tags: ["cold", "sweet"] },
  { text: "PB&J and a glass of cold milk. Childhood, upgraded.", tags: ["sweet", "cold"] },
];

export const THOUGHTS = [
  "Do fish ever get thirsty? Asking for a friend.",
  "If you bite it and you die, it's poisonous. If it bites you and you die, it's venomous. What if we're both just vibing?",
  "Somewhere, someone is eating a sandwich you'll never taste. Wild.",
  "Why do we say \"tuna fish\" but never \"chicken bird\"?",
  "Your couch has seen things. It keeps your secrets.",
  "What if the moon is just Earth's night-light?",
  "Somebody invented the high-five and just… decided. Legend.",
  "Do clouds ever look down and go \"that one looks like a couch\"?",
  "The snack you want already knows you want it.",
  "If time is money, naps are a heist.",
  "What if dogs think \"sit\" is a weird trick we do?",
  "Every pizza is a personal pizza if you believe in yourself.",
  "Is cereal soup? Defend your answer. You have four hours.",
  "The fridge light is waiting for you. It never clocks out.",
  "Somewhere, a playlist is one song away from perfect. Go find it.",
];

export type TriviaQ = {
  question: string;
  options: string[];
  answer: number;
  fact: string;
};

export const TRIVIA: TriviaQ[] = [
  {
    question: "What does THC stand for?",
    options: ["Tetrahydrocannabinol", "Total Hemp Compound", "Tri-Hydro Carbon", "The High Chemical"],
    answer: 0,
    fact: "THC is the main compound that gets you high.",
  },
  {
    question: "What gives cannabis its smell and flavor?",
    options: ["Terpenes", "Chlorophyll", "Seeds", "The stems"],
    answer: 0,
    fact: "Terpenes are aromatic oils — limonene is citrusy, myrcene is earthy.",
  },
  {
    question: "How long do edibles usually take to kick in?",
    options: ["Instantly", "5–10 minutes", "30–120 minutes", "6 hours exactly"],
    answer: 2,
    fact: "Most people feel edibles in 45–90 minutes. That's why the 2-hour rule exists.",
  },
  {
    question: "What does CBD do on its own?",
    options: [
      "Gets you just as high as THC",
      "It won't get you high",
      "It cancels all THC instantly",
      "It only works on pets",
    ],
    answer: 1,
    fact: "CBD is non-intoxicating, and it will not undo a high in a few minutes.",
  },
  {
    question: "Which of these is a real strain name?",
    options: ["Blue Dream", "Purple Tractor", "Green Keyboard", "Orange Laptop"],
    answer: 0,
    fact: "Blue Dream is a classic sweet, mellow hybrid.",
  },
  {
    question: "A sensible first edible dose is closest to…",
    options: ["50 mg", "2.5–5 mg", "Whatever the bag says is one serving, times three", "A whole brownie"],
    answer: 1,
    fact: "2.5–5 mg, then wait two hours. You can take more later. You can't untake it.",
  },
  {
    question: "When is it okay to drive after an edible?",
    options: [
      "As soon as you feel fine",
      "After a cold shower",
      "When you're fully sober — often the next day",
      "If you go slow",
    ],
    answer: 2,
    fact: "Feeling \"okay-ish\" is not sober. After edibles, wait until you've slept.",
  },
  {
    question: "How long should you wait between hits of flower or a vape?",
    options: ["No wait", "About 15 minutes", "Two hours", "Until tomorrow"],
    answer: 1,
    fact: "One or two small hits, then 15 minutes. Inhaled cannabis lands fast, which makes it easy to overdo.",
  },
  {
    question: "Why do edibles often feel stronger than smoking the same milligrams?",
    options: [
      "The wrapper adds THC",
      "Your liver changes THC into a stronger form",
      "Sugar multiplies THC",
      "They don't. It's a myth",
    ],
    answer: 1,
    fact: "The liver turns THC into 11-hydroxy-THC. That's why edibles can feel heavier and last longer.",
  },
  {
    question: "When do edibles usually peak?",
    options: ["In the first 5 minutes", "Around 2–4 hours", "Exactly at 12 minutes", "The next morning, always"],
    answer: 1,
    fact: "Onset is often 45–90 minutes. The peak is later, around 2–4 hours. The wait is the hard part.",
  },
  {
    question: "How long does a typical edible stay with you?",
    options: ["20 minutes", "The same as one hit", "About 4–8 hours", "Three days, every time"],
    answer: 2,
    fact: "Plan the night, not the next hour. A strong one can still be around after midnight.",
  },
  {
    question: "Flower usually lasts closest to…",
    options: ["2–4 hours", "12 hours", "Two days", "Five minutes"],
    answer: 0,
    fact: "Inhaled cannabis is the short one. Edibles and drinks are the long ones.",
  },
  {
    question: "A cannabis drink should be treated like…",
    options: ["A soda you can chug", "An edible", "A cup of coffee", "Something that wears off in 10 minutes"],
    answer: 1,
    fact: "Drinks are still eaten THC. Wait, don't stack, and don't drive.",
  },
  {
    question: "What is the classic edible mistake?",
    options: [
      "Waiting the full two hours",
      "Taking more because you feel nothing at 45 minutes",
      "Starting at 2.5 mg",
      "Reading the label",
    ],
    answer: 1,
    fact: "Nothing at 45 minutes is normal. More on top of that is how the night gets away from you.",
  },
  {
    question: "One gummy in a bag is often…",
    options: ["The whole bag", "One serving, if the label says so", "Always 100 mg", "Not cannabis"],
    answer: 1,
    fact: "Check the package. A candy can be 5 mg or 50 mg. The bag is not the serving.",
  },
  {
    question: "What does a cold shower do to a high?",
    options: ["Cancels it", "Cuts it in half", "Nothing useful. It still has to pass", "Makes edibles kick in faster"],
    answer: 2,
    fact: "Water, a shower, and coffee do not sober you up. Time does.",
  },
  {
    question: "Cottonmouth is…",
    options: ["A strain", "Dry mouth", "A kind of edible", "A reason to drive home"],
    answer: 1,
    fact: "Sip water. It helps the dry mouth. It does not end the high.",
  },
  {
    question: "If it feels like too much, the useful move is…",
    options: [
      "Take more to balance it",
      "Get in the car for air",
      "Sit or lie down, sip water, and wait it out",
      "A shot of alcohol",
    ],
    answer: 2,
    fact: "It passes. Quiet, water, slow breathing. Alcohol on top makes it messier.",
  },
  {
    question: "Alcohol plus cannabis, if you're new to the mix…",
    options: ["Cancels the cannabis", "Can hit harder than either one alone", "Is required", "Wears off faster"],
    answer: 1,
    fact: "They stack. If you don't know the mix, skip the drink.",
  },
  {
    question: "CBD on its own will…",
    options: ["Get you as high as THC", "Not get you high", "Erase a high in two minutes", "Only work if you smoke it"],
    answer: 1,
    fact: "CBD is non-intoxicating. It is not a rescue button for too much THC.",
  },
  {
    question: "A product labeled hemp-derived…",
    options: ["Cannot intoxicate, by definition", "Can still get you high if it has intoxicating cannabinoids", "Is always CBD only", "Is always a topical"],
    answer: 1,
    fact: "Delta-8 and other hemp-derived cannabinoids can still intoxicate, and the labels are often sloppy.",
  },
  {
    question: "Most cannabis creams rubbed on the skin…",
    options: ["Get you just as high as an edible", "Don't get you high", "Peak in 15 seconds", "Replace a dose of flower"],
    answer: 1,
    fact: "A regular skin cream is not a session. Don't assume a balm is a brownie, or the other way around.",
  },
  {
    question: "Hemp seed oil…",
    options: ["Is a strong edible", "Doesn't get you high", "Is pure THC", "Is the same as a vape cart"],
    answer: 1,
    fact: "Seed oil is food. It is not the same as cannabis extract.",
  },
  {
    question: "Indica and sativa on a label…",
    options: [
      "Guarantee how you will feel",
      "Are messy nicknames, not a promise",
      "Tell you the exact milligrams",
      "Mean one is non-intoxicating",
    ],
    answer: 1,
    fact: "The same name can be a different jar. Your own notes beat the label.",
  },
  {
    question: "The same strain name from two growers…",
    options: ["Is chemically identical", "Can feel completely different", "Is always CBD", "Is illegal to compare"],
    answer: 1,
    fact: "Names are marketing. Log how that jar actually landed.",
  },
  {
    question: "Myrcene is the terpene that smells like…",
    options: ["Earthy mango", "Blue cheese only", "Nothing. Terpenes have no smell", "Burnt plastic, always"],
    answer: 0,
    fact: "Myrcene is earthy and mango-like. People associate it with a heavy feel. That's folklore, not a guarantee.",
  },
  {
    question: "Limonene usually smells like…",
    options: ["Citrus peel", "Black pepper", "Pine sap", "Lavender"],
    answer: 0,
    fact: "Limonene is the citrus one. Often described as bright rather than sleepy.",
  },
  {
    question: "Pinene smells like…",
    options: ["Pine or rosemary", "Vanilla frosting", "Nothing", "Diesel only"],
    answer: 0,
    fact: "Pinene is the pine-sol of terpenes. People say it feels clearer. It will not make you sober.",
  },
  {
    question: "Linalool is the one that smells like…",
    options: ["Lavender", "Lemon pledge", "Campfire", "The ocean"],
    answer: 0,
    fact: "Linalool is floral. People reach for it when they want the edges off.",
  },
  {
    question: "Caryophyllene smells like…",
    options: ["Black pepper", "Banana candy", "Fresh snow", "Cucumber"],
    answer: 0,
    fact: "It's the peppery terpene, and it can also interact with CB2 receptors.",
  },
  {
    question: "THCA is…",
    options: [
      "The raw form of THC before heat",
      "A kind of vape battery",
      "Another name for CBD",
      "The alcohol in a drink",
    ],
    answer: 0,
    fact: "Heat turns THCA into THC. Smoking does that as you go. Raw flower eaten plain usually won't.",
  },
  {
    question: "CBN is best described as…",
    options: ["A guaranteed sleeping pill", "The sleepy rumor, with thin evidence", "Stronger than any edible", "What makes the plant green"],
    answer: 1,
    fact: "CBN gets marketed for bed. The research is thin. A low dose and a dark room still matter more.",
  },
  {
    question: "CBG is…",
    options: ["A minor cannabinoid, not a magic switch", "The only cannabinoid that matters", "Pure caffeine", "A terpene that smells like mint"],
    answer: 0,
    fact: "It's present in small amounts. Be suspicious of products that promise a new personality.",
  },
  {
    question: "THC mostly acts on receptors…",
    options: ["Your body already has", "That cannabis installs permanently", "Only in your hair", "That turn off after one use"],
    answer: 0,
    fact: "Cannabinoid receptors are part of normal physiology. THC is visiting, not building new hardware.",
  },
  {
    question: "Trichomes are…",
    options: ["The crystal glands on the flower", "The seeds", "The paper", "A brand of grinder"],
    answer: 0,
    fact: "Those frosty glands are where a lot of the cannabinoids and terpenes sit.",
  },
  {
    question: "Kief is…",
    options: ["Collected trichomes", "A type of drink", "Stems and fan leaves", "CBD isolate, always"],
    answer: 0,
    fact: "It's the dusty crystals that fall off the flower. It's stronger than the bud it came from, so go smaller.",
  },
  {
    question: "A dab is…",
    options: ["A tiny edible mint", "Concentrated cannabis", "A non-intoxicating tea", "The same as hemp seed oil"],
    answer: 1,
    fact: "Concentrates are easy to overshoot. A rice-grain is already a real dose for a lot of people.",
  },
  {
    question: "Vape carts are easy to overdo because…",
    options: ["Each pull is weak and slow", "They're fast and it's easy to take another pull", "They take two hours to start", "They contain no THC"],
    answer: 1,
    fact: "One pull, then pause. The next one can wait 15 minutes.",
  },
  {
    question: "A tincture held under the tongue…",
    options: ["Is always instant", "Can be faster than a gummy, and still not instant", "Cannot intoxicate", "Lasts 30 seconds"],
    answer: 1,
    fact: "Faster than a brownie is not the same as immediate. Give it time before you take more.",
  },
  {
    question: "If a pet eats an edible, you should…",
    options: ["Wait and see until morning", "Give it CBD", "Call a vet", "Take the pet for a drive"],
    answer: 2,
    fact: "Dogs and cats do not handle THC the way people do. A vet is the move, not a home remedy.",
  },
  {
    question: "Homemade edibles should be…",
    options: ["Left in a candy bowl", "Labeled and kept away from kids and pets", "Stored in the car", "Assumed to be 5 mg each"],
    answer: 1,
    fact: "If it looks like a snack, someone will treat it like a snack. Write the dose on it and put it up.",
  },
  {
    question: "A drug test can still be positive…",
    options: ["Only while you feel high", "After you feel sober, sometimes for days or longer", "For ten minutes, then never", "Only if you used edibles"],
    answer: 1,
    fact: "Feeling normal is not the same as a clean test. THC can linger in the body.",
  },
  {
    question: "A tolerance break is…",
    options: ["Taking more so it works again", "Time off so a smaller dose can work later", "A kind of dab", "Required every night"],
    answer: 1,
    fact: "Time off lowers tolerance. When you come back, start lower than you remember.",
  },
  {
    question: "Red eyes from cannabis are mostly from…",
    options: ["Allergies to paper, always", "Expanded blood vessels", "THC dye", "Not blinking for an hour, only"],
    answer: 1,
    fact: "It's blood vessels, not a stain. Drops are cosmetic. They don't make you sober.",
  },
  {
    question: "The munchies are…",
    options: ["Proof the dose was fake", "A real appetite effect", "Only caused by edibles", "A reason to skip water"],
    answer: 1,
    fact: "Have the snack ready before you're negotiating with the fridge. Drink water too.",
  },
  {
    question: "Who is this app for?",
    options: ["Anyone with a phone", "Adults 21 and over", "Pets", "People who need to drive in an hour"],
    answer: 1,
    fact: "Bud-E is a 21+ companion. It is not a doctor, not a shop, and not a reason to drive.",
  },
  {
    question: "Laws about cannabis…",
    options: ["Are the same everywhere", "Depend on where you are", "Don't apply to edibles", "Are decided by strain names"],
    answer: 1,
    fact: "Bud-E is not legal advice. Legal in one place can be a charge in another.",
  },
  {
    question: "The safest first move with a new product is…",
    options: ["The whole piece", "A small dose, then wait", "Double the label", "Mix it with a drink"],
    answer: 1,
    fact: "Start low, go slow. You can take more later. You cannot untake it.",
  },
  {
    question: "Feeling fine after an edible means…",
    options: ["You are sober enough to drive", "You might still be high", "The dose was CBD", "The timer was wrong"],
    answer: 1,
    fact: "Okay-ish is not sober. Keys stay put until you have actually slept it off.",
  },
  {
    question: "Water during a session…",
    options: ["Ends the high", "Helps dry mouth and is still a good idea", "Makes edibles stronger", "Is optional because soda counts double"],
    answer: 1,
    fact: "Hydrate. It is comfort, not an antidote.",
  },
  {
    question: "Coffee during a high…",
    options: ["Cancels THC", "Does not sober you up", "Is the same as CBD", "Shortens an edible to 20 minutes"],
    answer: 1,
    fact: "Caffeine can make you alert and still high. Alert is not sober.",
  },
  {
    question: "OG Kush is usually described as smelling like…",
    options: ["Pine, earth, and fuel", "Plain cucumber", "Nothing at all", "Only lavender"],
    answer: 0,
    fact: "That's the folklore. Your jar can still be different. The shelf is the record that counts.",
  },
  {
    question: "Blue Dream is…",
    options: ["A real, very common strain name", "A cleaning product", "A kind of paper", "CBD with the THC removed"],
    answer: 0,
    fact: "People mean a sweet, berry-ish hybrid. The name is not a lab result.",
  },
  {
    question: "If you are storing flower, the boring good answer is…",
    options: ["A hot car", "Cool, dark, and away from kids and pets", "The freezer, loose, forever", "An open bowl on the table"],
    answer: 1,
    fact: "Heat, light, and curious housemates are the enemies. A closed jar in a cupboard beats the dashboard.",
  },
];

export function pick<T>(items: T[], current?: T): T {
  if (items.length === 0) throw new Error("empty");
  if (items.length === 1) return items[0]!;
  let next = items[Math.floor(Math.random() * items.length)]!;
  let guard = 0;
  while (next === current && guard < 6) {
    next = items[Math.floor(Math.random() * items.length)]!;
    guard += 1;
  }
  return next;
}

export type PlanModel = {
  ready: boolean;
  rows: { label: string; value: string }[];
  tips: string[];
  fine: string[];
  plain: string;
};

export function buildPlan(session: Session | null, vibe: Vibe, timerNote: string, now = new Date()): PlanModel {
  const rows: { label: string; value: string }[] = [];
  const tips: string[] = [];
  const fine = [
    "21+ only. Never drive high — fully sober, and after edibles, after a full night's sleep.",
    "Bud-E is a buddy, not a doctor. If something feels seriously wrong, get real help.",
  ];

  if (!session) {
    rows.push({ label: "Session", value: "Nothing logged yet" });
  } else {
    const since = session.timeTaken ? minutesSince(session.timeTaken, now) : null;
    let when = "Time not set";
    if (since?.future) when = `${formatClock(parseClock(session.timeTaken)!)} is still ahead`;
    else if (since) {
      const clock = formatClock(parseClock(session.timeTaken)!);
      when = since.minutes === 0 ? `${clock} · just now` : `${clock} · ${plural(since.minutes, "minute")} ago`;
    }
    rows.push({
      label: "Dose",
      value: `${cap(dosePhrase(session))} · ${EXPERIENCE[session.experience].toLowerCase()}`,
    });
    rows.push({ label: "When", value: when });
    if (METHODS[session.method].inhaled) {
      tips.push("One or two small hits, wait 15 minutes, then decide. Don't chain them.");
    } else {
      tips.push("Wait a full 2 hours before even thinking about more. Onset 45–90 min, peak 2–4 hrs, lasts 4–8.");
    }
  }

  const vibeBits = [
    vibe.setting ? SETTINGS[vibe.setting].toLowerCase() : null,
    vibe.sound ? SOUNDS[vibe.sound].toLowerCase() : null,
    vibe.snack ? `craving ${SNACKS[vibe.snack].toLowerCase()}` : null,
    vibe.energy ? `feeling ${ENERGIES[vibe.energy].toLowerCase()}` : null,
  ].filter(Boolean);
  rows.push({
    label: "Vibe",
    value: vibeBits.length ? vibeBits.join(" · ") : "Not checked in",
  });
  rows.push({ label: "Timer", value: timerNote });

  tips.push("Drink water. Have the snack ready before the munchies vote.");
  tips.push("If it feels like too much: lie down, sip water, breathe slow. It passes.");

  const plain = [
    "MY BUD-E PLAN FOR TONIGHT",
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    "",
    ...tips.map((t) => `• ${t}`),
    "",
    ...fine,
  ].join("\n");

  return { ready: Boolean(session), rows, tips, fine, plain };
}

export function timerNoteFor(status: string, remainingLabel: string | null): string {
  if (status === "running" && remainingLabel) return `${remainingLabel} left`;
  if (status === "paused" && remainingLabel) return `Paused · ${remainingLabel} left`;
  if (status === "done") return "Finished — still don't stack if you feel nothing";
  return "Not running";
}

export type Landing = "quiet" | "right" | "strong" | "too-much";

export type JournalEntry = {
  id: string;
  at: string;
  method: Method;
  amount: string;
  unit: Unit;
  unsure: boolean;
  landing: Landing;
  note: string;
  strain: string;
};

export const LANDINGS: Record<Landing, { label: string; detail: string }> = {
  quiet: { label: "Too quiet", detail: "Barely there" },
  right: { label: "Just right", detail: "Where you wanted" },
  strong: { label: "Strong", detail: "A lot, but okay" },
  "too-much": { label: "Too much", detail: "Dial it back next time" },
};

export function todayStamp(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type ShelfGroup = {
  key: string;
  name: string;
  entries: JournalEntry[];
};

export function strainKey(name: string | undefined): string {
  const raw = (name ?? "").trim().toLowerCase();
  return raw || "__none";
}

export function shelfGroups(entries: JournalEntry[]): ShelfGroup[] {
  const map = new Map<string, ShelfGroup>();
  for (const entry of entries) {
    const raw = (entry.strain ?? "").trim();
    const key = strainKey(raw);
    const existing = map.get(key);
    if (existing) existing.entries.push(entry);
    else map.set(key, { key, name: raw || "No name", entries: [entry] });
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === "__none") return 1;
    if (b.key === "__none") return -1;
    return b.entries.length - a.entries.length || a.name.localeCompare(b.name);
  });
}

export function landingLine(entries: JournalEntry[]): string {
  const counts = new Map<Landing, number>();
  for (const entry of entries) {
    if (!LANDINGS[entry.landing]) continue;
    counts.set(entry.landing, (counts.get(entry.landing) ?? 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => `${count} ${LANDINGS[id].label.toLowerCase()}`).join(" · ");
}

export const JARS = {
  flower: { label: "Flower", unit: "g" as const, step: 0.5 },
  edible: { label: "Edible", unit: "mg" as const, step: 5 },
  vape: { label: "Vape", unit: "mg" as const, step: 5 },
  dab: { label: "Dab", unit: "mg" as const, step: 5 },
  drink: { label: "Drink", unit: "mg" as const, step: 5 },
} as const;

export type JarId = keyof typeof JARS;

export type StashHeld = { method: JarId; taken: number; want: number };

export type StashBook = {
  jars: Record<JarId, number>;
  held: StashHeld | null;
};

export function emptyBook(): StashBook {
  return { jars: { flower: 0, edible: 0, vape: 0, dab: 0, drink: 0 }, held: null };
}

export function isJarId(value: string): value is JarId {
  return value in JARS;
}

function roundUnit(amount: number, unit: Unit): number {
  const places = unit === "g" ? 1000 : 10;
  return Math.round((amount + Number.EPSILON) * places) / places;
}

export function formatStashAmount(amount: number, unit: Unit): string {
  const rounded = roundUnit(amount, unit);
  const text = unit === "g" ? rounded.toFixed(2) : rounded.toFixed(1);
  return `${Number(text)} ${unit}`;
}

export function parseStashAmount(raw: string): number | null {
  const amount = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function doseInJarUnits(session: Session): number | null {
  if (!isJarId(session.method) || session.unsure) return null;
  const match = String(session.amount).trim().replace(/,/g, ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const to = JARS[session.method].unit;
  if (session.unit === to) return value;
  if (session.unit === "mg" && to === "g") return value / 1000;
  return value * 1000;
}

export function settleBook(book: StashBook, session: Session | null): StashBook {
  const jars = { ...book.jars };
  if (book.held) {
    const unit = JARS[book.held.method].unit;
    jars[book.held.method] = roundUnit(jars[book.held.method] + book.held.taken, unit);
  }
  const want = session ? doseInJarUnits(session) : null;
  if (!session || want === null || !isJarId(session.method)) return { jars, held: null };
  const unit = JARS[session.method].unit;
  const taken = Math.min(jars[session.method], want);
  jars[session.method] = roundUnit(jars[session.method] - taken, unit);
  return {
    jars,
    held: { method: session.method, taken: roundUnit(taken, unit), want: roundUnit(want, unit) },
  };
}

export function adjustBook(book: StashBook, method: JarId, delta: number, session: Session | null): StashBook {
  const unit = JARS[method].unit;
  const jars = { ...book.jars, [method]: Math.max(0, roundUnit(book.jars[method] + delta, unit)) };
  const next = { ...book, jars };
  const short = book.held?.method === method && book.held.taken + 1e-9 < book.held.want;
  if (delta > 0 && short) return settleBook(next, session);
  return next;
}

export function stashNote(book: StashBook, session?: Session | null): string | null {
  if (!book.held) {
    if (session && isJarId(session.method) && !session.unsure && doseInJarUnits(session) === null) {
      return `Put a number on the ${JARS[session.method].label.toLowerCase()} dose and Bud-E will take it off the jar.`;
    }
    return null;
  }
  const jar = JARS[book.held.method];
  const name = jar.label.toLowerCase();
  if (book.held.taken + 1e-9 < book.held.want) {
    const short = formatStashAmount(book.held.want - book.held.taken, jar.unit);
    if (book.held.taken <= 0) return `The ${name} jar is empty. Short ${short}. Add some and Bud-E will finish tonight's dose.`;
    return `Bud-E took ${formatStashAmount(book.held.taken, jar.unit)} off the ${name} jar. Short ${short}.`;
  }
  return `Bud-E took ${formatStashAmount(book.held.taken, jar.unit)} off the ${name} jar.`;
}

export const CANNABINOIDS = [
  {
    name: "THC",
    line: "The compound that intoxicates.",
    detail: "It is what people mean by “high.” Edibles turn it into a stronger form in the liver, which is why they hit later and harder.",
  },
  {
    name: "CBD",
    line: "Does not get you high.",
    detail: "It will not cancel a high in a few minutes, no matter what a label promises. Some people like it alongside THC. It is not a rescue button.",
  },
  {
    name: "CBN",
    line: "The sleepy rumor.",
    detail: "Often sold for bed. The research is thin. If you are winding down, dim lights and a low dose still matter more than a CBN claim.",
  },
  {
    name: "CBG",
    line: "A minor cannabinoid.",
    detail: "Present in small amounts. Not a shortcut to a specific feeling. Treat products that promise a personality change with suspicion.",
  },
];

export const TERPENES = [
  { name: "Myrcene", smell: "Earthy, mango, hoppy", note: "The one people associate with a heavy, couch-leaning feel." },
  { name: "Limonene", smell: "Citrus peel", note: "Bright and loud. Often described as lifted rather than sleepy." },
  { name: "Pinene", smell: "Pine, rosemary", note: "People say it feels clearer. It will not make you sober." },
  { name: "Linalool", smell: "Lavender", note: "Floral. Commonly picked when someone wants the edges off." },
  { name: "Caryophyllene", smell: "Black pepper", note: "Spicy. Unusual because it can also interact with CB2 receptors." },
  { name: "Terpinolene", smell: "Fresh, a little sweet", note: "Less common. Some people find it racy instead of calm." },
];

export const EFFECT_MATCHES = [
  {
    id: "calm",
    label: "Calm",
    reach: "A low dose and a familiar product. Myrcene or linalool are the smells people chase for this.",
    start: "New edible: 2.5 mg, then the full two hours. Flower: one small hit, then 15 minutes.",
    skip: "Do not add more because the first 20 minutes of an edible feel like nothing.",
  },
  {
    id: "social",
    label: "Social",
    reach: "A light inhaled dose is easier to steer in a room full of people than a big edible.",
    start: "Stay under your usual. You can step outside. You cannot untake a gummy.",
    skip: "Skip a new edible right before you have to talk to anyone who matters.",
  },
  {
    id: "sleep",
    label: "Sleep",
    reach: "Lower and earlier. A strong dose can knock you out and still leave the morning foggy.",
    start: "If it is an edible, take it with hours of night left, not at the moment you want to be asleep.",
    skip: "Do not keep redosing because you are still scrolling. That is how 2 a.m. gets weird.",
  },
  {
    id: "create",
    label: "Create",
    reach: "People often want limonene or pinene and a dose they have already met.",
    start: "One or two hits, or a small edible you know. Then put the phone down and start the thing.",
    skip: "A heroic dose is a nap, not a project.",
  },
  {
    id: "body",
    label: "Body",
    reach: "Heavier flower or a modest edible. Myrcene shows up a lot in that conversation.",
    start: "Same rule: less than you think, then wait. Have water and a place to lie down.",
    skip: "Do not drive to “see if it wore off.” It did not.",
  },
];

export const METHOD_TIMES = [
  { method: "Flower", onset: "5–15 min", peak: "About an hour", length: "2–4 hours", steer: "Wait 15 minutes between hits." },
  { method: "Vape", onset: "A few minutes", peak: "30–60 min", length: "2–3 hours", steer: "Easy to overdo. One pull, then pause." },
  { method: "Edible", onset: "45–90 min", peak: "2–4 hours", length: "4–8 hours", steer: "Wait two hours before any more." },
  { method: "Drink", onset: "30–90 min", peak: "1–3 hours", length: "4–8 hours", steer: "Treat it like an edible, not a soda." },
];

