"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeStoredReference,
  parseAccessMode,
  parseSourceType,
  isValidSourceReference,
  type AccessMode,
  type SourceType,
} from "@/lib/source-reference";
import prisma from "@/lib/prisma";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createWorld(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const sourceUrlRaw = String(formData.get("sourceUrl") ?? "").trim();
  const sourceType: SourceType = parseSourceType(String(formData.get("sourceType") ?? "WEB"));
  const accessMode: AccessMode = parseAccessMode(String(formData.get("accessMode") ?? "UNKNOWN"));
  const creatorName = String(formData.get("creatorName") ?? "").trim();
  const whyExists = String(formData.get("whyExists") ?? "").trim();
  const initialQuestion = String(formData.get("initialQuestion") ?? "").trim();
  const isUndecided = formData.get("isUndecided") === "on";
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);

  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "Title is required.";
  if (!sourceUrlRaw) fieldErrors.sourceUrl = "World reference is required.";
  else if (!isValidSourceReference(sourceType, sourceUrlRaw)) {
    fieldErrors.sourceUrl =
      sourceType === "WEB"
        ? "Enter a complete URL starting with http:// or https://."
        : "Enter a deep link (e.g. bud://…) or a full https:// URL.";
  }
  if (!creatorName) fieldErrors.creatorName = "Creator name is required.";
  if (!whyExists) fieldErrors.whyExists = "This field is required.";
  if (!initialQuestion) fieldErrors.initialQuestion = "This field is required.";

  const existingTags =
    tagIds.length > 0
      ? await prisma.meaningTag.findMany({ where: { id: { in: tagIds } }, select: { id: true } })
      : [];
  if (existingTags.length !== tagIds.length) {
    fieldErrors.tagIds = "One or more tags are invalid.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const sourceUrlNormalized = normalizeStoredReference(sourceType, sourceUrlRaw);

  const world = await prisma.world.create({
    data: {
      title,
      sourceUrl: sourceUrlNormalized,
      sourceType,
      accessMode,
      creatorName,
      whyExists,
      initialQuestion,
      isUndecided,
      meanings: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  });

  revalidatePath("/");
  redirect(`/worlds/${world.id}`);
}

export async function updateWorld(
  worldId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const sourceUrlRaw = String(formData.get("sourceUrl") ?? "").trim();
  const sourceType: SourceType = parseSourceType(String(formData.get("sourceType") ?? "WEB"));
  const accessMode: AccessMode = parseAccessMode(String(formData.get("accessMode") ?? "UNKNOWN"));
  const creatorName = String(formData.get("creatorName") ?? "").trim();
  const whyExists = String(formData.get("whyExists") ?? "").trim();
  const initialQuestion = String(formData.get("initialQuestion") ?? "").trim();
  const isUndecided = formData.get("isUndecided") === "on";
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);

  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "Title is required.";
  if (!sourceUrlRaw) fieldErrors.sourceUrl = "World reference is required.";
  else if (!isValidSourceReference(sourceType, sourceUrlRaw)) {
    fieldErrors.sourceUrl =
      sourceType === "WEB"
        ? "Enter a complete URL starting with http:// or https://."
        : "Enter a deep link (e.g. bud://…) or a full https:// URL.";
  }
  if (!creatorName) fieldErrors.creatorName = "Creator name is required.";
  if (!whyExists) fieldErrors.whyExists = "This field is required.";
  if (!initialQuestion) fieldErrors.initialQuestion = "This field is required.";

  const existingTags =
    tagIds.length > 0
      ? await prisma.meaningTag.findMany({ where: { id: { in: tagIds } }, select: { id: true } })
      : [];
  if (existingTags.length !== tagIds.length) {
    fieldErrors.tagIds = "One or more tags are invalid.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const existing = await prisma.world.findUnique({ where: { id: worldId }, select: { id: true } });
  if (!existing) {
    return { error: "This world could not be found." };
  }

  const sourceUrlNormalized = normalizeStoredReference(sourceType, sourceUrlRaw);

  await prisma.world.update({
    where: { id: worldId },
    data: {
      title,
      sourceUrl: sourceUrlNormalized,
      sourceType,
      accessMode,
      creatorName,
      whyExists,
      initialQuestion,
      isUndecided,
      meanings: {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/worlds/${worldId}`);
  redirect(`/worlds/${worldId}`);
}

export async function addInterpretation(
  worldId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authorName = String(formData.get("authorName") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!authorName) fieldErrors.authorName = "Name is required.";
  if (!body) fieldErrors.body = "Interpretation is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const world = await prisma.world.findUnique({ where: { id: worldId }, select: { id: true } });
  if (!world) {
    return { error: "This world could not be found." };
  }

  await prisma.interpretation.create({
    data: {
      worldId,
      authorName,
      body,
    },
  });

  revalidatePath(`/worlds/${worldId}`);
  redirect(`/worlds/${worldId}`);
}
