import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";

/* =========================================================================
   Block Validation Schemas & Types
   ========================================================================= */

export const commandBlockDataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  shell: z.string().default("bash"),
  command: z.string().min(1, "Command is required"),
  sudo: z.boolean().default(false),
  os: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const stepsBlockDataSchema = z.object({
  title: z.string().optional(),
  steps: z
    .array(
      z.object({
        text: z.string().min(1, "Step text is required"),
        command: z.string().optional(),
      })
    )
    .default([]),
});

export const qaBlockDataSchema = z.object({
  question: z.string().min(1, "Question is required"),
  short: z.string().optional(),
  long: z.string().optional(),
});

export const noteBlockDataSchema = z.object({
  title: z.string().optional(),
  markdown: z.string().default(""),
});

export const fileBlockDataSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  caption: z.string().optional(),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("command"),
    data: commandBlockDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("steps"),
    data: stepsBlockDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("qa"),
    data: qaBlockDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("note"),
    data: noteBlockDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("file"),
    data: fileBlockDataSchema,
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type CommandBlock = Extract<Block, { type: "command" }>;
export type StepsBlock = Extract<Block, { type: "steps" }>;
export type QABlock = Extract<Block, { type: "qa" }>;
export type NoteBlock = Extract<Block, { type: "note" }>;
export type FileBlock = Extract<Block, { type: "file" }>;

/* =========================================================================
   Application Tables (Pages, Files, Redirects)
   ========================================================================= */

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").references((): any => pages.id, {
    onDelete: "cascade",
  }),
  slug: text("slug").notNull(),
  path: text("path").notNull().unique(), // e.g. '' (root vault), 'quickstart', 'system/arch/bootloader'
  title: text("title").notNull(),
  template: text("template").notNull().default("note"), // 'index' | 'command' | 'steps' | 'qa' | 'note'
  defaultChildTemplate: text("default_child_template"),
  position: integer("position").notNull().default(0),
  blocks: jsonb("blocks").$type<Block[]>().notNull().default([]),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("published"), // 'draft' | 'published'
  searchText: text("search_text").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  kind: text("kind").notNull().default("other"), // 'resume' | 'photo' | 'certificate' | 'other'
  version: integer("version").notNull().default(1),
  isCurrent: boolean("is_current").notNull().default(true),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;

export const pathRedirects = pgTable("path_redirects", {
  oldPath: text("old_path").primaryKey(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PathRedirect = typeof pathRedirects.$inferSelect;

// Legacy scratch documents table
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;

/* =========================================================================
   Better Auth Tables (PostgreSQL schema for user, session, account, verification)
   ========================================================================= */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passkey = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull(),
  transports: text("transports"),
  aaguid: text("aaguid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

