import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAG_NAMES = [
  "healing",
  "escape",
  "control",
  "memory",
  "ritual",
  "experiment",
  "loneliness",
  "boundary",
  "silence",
  "undecided",
] as const;

type DemoWorld = {
  title: string;
  sourceType: string;
  accessMode: string;
  sourceUrl: string;
  creatorName: string;
  whyExists: string;
  initialQuestion: string;
  isUndecided: boolean;
  tags: (typeof TAG_NAMES)[number][];
  interpretations: { authorName: string; body: string }[];
};

/**
 * Demo worlds now point at REAL, publicly shareable Roblox URLs
 * (https://www.roblox.com/games/{placeId}/{name}). These open the public
 * experience detail page; the Roblox app launches from there.
 */
const DEMO_WORLDS: DemoWorld[] = [
  {
    title: "Brookhaven",
    sourceType: "ROBLOX",
    accessMode: "APP_REQUIRED",
    sourceUrl: "https://www.roblox.com/games/4924922222/Brookhaven-RP",
    creatorName: "Wolfpaq",
    whyExists:
      "An open town with no scoreboard and no win state—built so that the only thing to 'do' is to live a small ordinary life alongside others.",
    initialQuestion:
      "When a world refuses to assign you a goal, what story do you choose to perform?",
    isUndecided: false,
    tags: ["ritual", "escape", "boundary"],
    interpretations: [
      {
        authorName: "L. Ortega",
        body: "Reads as a rehearsal space for domesticity—players practice routines they don't yet have words for.",
      },
      {
        authorName: "S. N.",
        body: "I interpret the absence of objectives as permission: the town asks nothing, so attention becomes the only currency.",
      },
    ],
  },
  {
    title: "Tower of Hell",
    sourceType: "ROBLOX",
    accessMode: "APP_REQUIRED",
    sourceUrl: "https://www.roblox.com/games/1962086868/Tower-of-Hell",
    creatorName: "YXCeptional Studios",
    whyExists:
      "A randomly generated vertical climb with no checkpoints—designed so that failure resets you completely and progress is never owned.",
    initialQuestion: "If every fall returns you to the start, is the climb a punishment or a practice?",
    isUndecided: true,
    tags: ["experiment", "control", "undecided"],
    interpretations: [
      {
        authorName: "M. Idris",
        body: "The boundary here is temporal: the world will not let you bank anything, so it keeps its claim on you minimal.",
      },
    ],
  },
];

async function main() {
  for (const name of TAG_NAMES) {
    await prisma.meaningTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const tagMap = Object.fromEntries(
    (await prisma.meaningTag.findMany({ select: { id: true, name: true } })).map((t) => [t.name, t.id]),
  ) as Record<(typeof TAG_NAMES)[number], string>;

  // Remove prior demo rows (legacy BUD placeholders + any re-seed of these worlds)
  // so the registry replaces rather than duplicates. Interpretations/tags cascade.
  await prisma.world.deleteMany({
    where: {
      OR: [
        { title: { in: ["Threshold Garden", "Unmarked Room"] } },
        { sourceUrl: { in: DEMO_WORLDS.map((w) => w.sourceUrl) } },
        { title: { in: DEMO_WORLDS.map((w) => w.title) } },
      ],
    },
  });

  for (const w of DEMO_WORLDS) {
    await prisma.world.create({
      data: {
        title: w.title,
        sourceType: w.sourceType,
        accessMode: w.accessMode,
        sourceUrl: w.sourceUrl,
        creatorName: w.creatorName,
        whyExists: w.whyExists,
        initialQuestion: w.initialQuestion,
        isUndecided: w.isUndecided,
        meanings: {
          create: w.tags.map((t) => ({ tagId: tagMap[t] })),
        },
        interpretations: {
          create: w.interpretations,
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
