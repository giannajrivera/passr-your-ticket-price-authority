// Edit this file to change the onboarding questionnaire.
// Each question is a single screen. `multi: true` allows several answers.

export type OnboardingQuestion = {
  id: string;
  question: string;
  hint?: string;
  multi?: boolean;
  options: string[];
};

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: "categories",
    question: "what do you go out for?",
    hint: "pick as many as you like",
    multi: true,
    options: ["Concerts", "Sports", "Theater", "Comedy", "Festivals"],
  },
  {
    id: "genres",
    question: "what sounds like your night?",
    hint: "we'll watch prices for these first",
    multi: true,
    options: ["Pop", "Hip-hop", "Rock", "Country", "EDM", "R&B", "Latin", "Jazz"],
  },
  {
    id: "teams",
    question: "any sports you follow?",
    multi: true,
    options: ["NBA", "NFL", "MLB", "NHL", "Soccer", "College", "None really"],
  },
  {
    id: "budget",
    question: "what's a normal ticket for you?",
    hint: "out-the-door, fees included",
    options: ["Under $75", "$75 – $150", "$150 – $300", "$300+"],
  },
  {
    id: "seating",
    question: "where do you like to sit?",
    options: ["Cheapest seat in the house", "Good value middle", "Close as possible"],
  },
  {
    id: "travel",
    question: "how far will you travel?",
    options: ["My city only", "Within a few hours", "Anywhere worth it"],
  },
];
