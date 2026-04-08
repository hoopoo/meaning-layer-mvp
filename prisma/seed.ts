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

  const existingDemo = await prisma.world.findFirst({
    where: { title: "Threshold Garden" },
  });

  if (!existingDemo) {
    await prisma.world.create({
      data: {
        title: "Threshold Garden",
        sourceType: "BUD",
        accessMode: "APP_REQUIRED",
        sourceUrl: "bud://example/threshold-garden",
        creatorName: "A. Mercier",
        whyExists:
          "A liminal courtyard meant to slow breath before anything else happens. It exists as a buffer between urgency and interior life.",
        initialQuestion:
          "If a space asks nothing aloud, what do you still owe it in attention?",
        isUndecided: false,
        meanings: {
          create: [
            { tagId: tagMap.healing },
            { tagId: tagMap.silence },
            { tagId: tagMap.ritual },
          ],
        },
        interpretations: {
          create: [
            {
              authorName: "L. Ortega",
              body: "Reads as a deliberate exhale—architecture as a kindness rather than a goal.",
            },
            {
              authorName: "S. N.",
              body: "The silence is not empty; it is held. I interpret it as an invitation to rehearse being gentle with oneself.",
            },
          ],
        },
      },
    });

    await prisma.world.create({
      data: {
        title: "Unmarked Room",
        sourceType: "BUD",
        accessMode: "APP_REQUIRED",
        sourceUrl: "bud://example/unmarked-room",
        creatorName: "Chen",
        whyExists:
          "A chamber without signage or objective—built to test whether obligation can be removed from exploration.",
        initialQuestion: "When nothing is assigned, does freedom appear—or does unease?",
        isUndecided: true,
        meanings: {
          create: [{ tagId: tagMap.experiment }, { tagId: tagMap.boundary }, { tagId: tagMap.undecided }],
        },
        interpretations: {
          create: [
            {
              authorName: "M. Idris",
              body: "The boundary here feels procedural rather than spatial: a limit on what the world will claim about you.",
            },
          ],
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
