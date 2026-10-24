import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ip: text("ip").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  rtspUrl: text("rtsp_url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const streamSessions = pgTable("stream_sessions", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").references(() => cameras.id),
  sessionId: text("session_id").notNull(),
  isActive: boolean("is_active").default(true),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const streamStats = pgTable("stream_stats", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").references(() => cameras.id),
  bandwidth: text("bandwidth"),
  fps: integer("fps"),
  latency: integer("latency"),
  droppedFrames: integer("dropped_frames").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const deduction = pgTable("deduction", {
  bagId: serial("bag_id").primaryKey(),
  wbId: integer("wb_id").notNull(),
  bags: integer("bags"),
  pb: decimal("pb", { precision: 10, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
});

export const entryType = pgTable("entry_type", {
  id: serial("id").primaryKey(),
  typeName: text("type_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesDetails = pgTable("sales_details", {
  id: serial("id").primaryKey(),
  wbId: integer("wb_id").notNull(),
  doId: text("do_id").notNull(),
  doNo: text("do_no"),
  customerName: text("customer_name"),
  vehicleNo: text("vehicle_no"),
  doDate: text("do_date"),
  itemDescription: text("item_description"),
  dcQty: decimal("dc_qty", { precision: 10, scale: 2 }),
  doQty: decimal("do_qty", { precision: 10, scale: 2 }),
  branch: text("branch"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  userNo: integer("user_no").notNull().unique(),
  userName: text("user_name").notNull().unique(),
  userPassword: text("user_password").notNull(),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const branches = pgTable("branches", {
  branchId: serial("branch_id").primaryKey(),
  branchName: text("branch_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wbWeighbridge = pgTable("wb_weighbridge", {
  wbId: serial("wb_id").primaryKey(),
  slipNo: text("slip_no"),
  slipInTime: timestamp("slip_in_time"),
  firstWeight: decimal("first_weight", { precision: 10, scale: 2 }),
  secondWeight: decimal("second_weight", { precision: 10, scale: 2 }),
  netWeight: decimal("net_weight", { precision: 10, scale: 2 }),
  bardanaWeight: decimal("bardana_weight", { precision: 10, scale: 2 }),
  grossWeight: decimal("gross_weight", { precision: 10, scale: 2 }),
  freight: decimal("freight", { precision: 10, scale: 2 }),
  remarks: text("remarks"),
  driverName: text("driver_name"),
  companyId: integer("company_id"),
  branchId: integer("branch_id"),
  onlineEntry: text("online_entry"),
  offlineEntry: text("offline_entry"),
  createdBy: text("created_by"),
  creationDate: timestamp("creation_date"),
  lastUpdatedBy: text("last_updated_by"),
  lastUpdatedDate: timestamp("last_updated_date"),
  manualDcNo: text("manual_dc_no"),
  entryType: text("entry_type"),
  slipOutTime: timestamp("slip_out_time"),
  status: text("status"),
  slipDate: timestamp("slip_date"),
});

export const wbWeighbridgeItemsPurchase = pgTable("wb_weighbridge_items_purchase", {
  id: serial("id").primaryKey(),
  wbId: integer("wb_id").references(() => wbWeighbridge.wbId),
  bardanaType: text("bardana_type"),
  igpNo: text("igp_no"),
  vehicleNo: text("vehicle_no"),
  weightPerBags: decimal("weight_per_bags", { precision: 10, scale: 2 }),
  igpDate: text("igp_date"),
  supplierWeight: decimal("supplier_weight", { precision: 10, scale: 2 }),
  qualityDeduction: decimal("quality_deduction", { precision: 10, scale: 2 }),
  bardanaWeight: decimal("bardana_weight", { precision: 10, scale: 2 }),
  noOfBags: integer("no_of_bags"),
  vendorName: text("vendor_name"),
  bagCondition: text("bag_condition"),
  poNo: text("po_no"),
  itemCode: text("item_code"),
  itemDesc: text("item_desc"),
  poQty: decimal("po_qty", { precision: 10, scale: 2 }),
  igpQty: decimal("igp_qty", { precision: 10, scale: 2 }),
  balanceQty: decimal("balance_qty", { precision: 10, scale: 2 }),
  customerName: text("customer_name"),
  doNo: text("do_no"),
  doQty: decimal("do_qty", { precision: 10, scale: 2 }),
  dcQty: decimal("dc_qty", { precision: 10, scale: 2 }),
  customerId: integer("customer_id"),
  doId: integer("do_id"),
  doDate: text("do_date"),
  itemId: integer("item_id"),
  createdBy: text("created_by"),
  creationDate: timestamp("creation_date"),
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  createdAt: true,
});

export const insertStreamSessionSchema = createInsertSchema(streamSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export const insertStreamStatsSchema = createInsertSchema(streamStats).omit({
  id: true,
  timestamp: true,
});

export const insertDeductionSchema = createInsertSchema(deduction).omit({
  bagId: true,
} as const);

export const insertSalesDetailsSchema = createInsertSchema(salesDetails).omit({
  id: true,
  createdAt: true,
});

export const insertEntryTypeSchema = createInsertSchema(entryType).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  userId: true,
  userNo: true,
  createdAt: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  branchId: true,
  createdAt: true,
});

export const insertWbWeighbridgeSchema = createInsertSchema(wbWeighbridge).omit({
  wbId: true,
});

export const insertWbWeighbridgeItemsPurchaseSchema = createInsertSchema(wbWeighbridgeItemsPurchase).omit({
  id: true,
});

export const loginSchema = z.object({
  userName: z.string().min(1, "Username is required"),
  userPassword: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  userName: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  userPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  branchId: z.string().optional(),
}).refine((data) => data.userPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type StreamSession = typeof streamSessions.$inferSelect;
export type InsertStreamSession = z.infer<typeof insertStreamSessionSchema>;
export type StreamStats = typeof streamStats.$inferSelect;
export type InsertStreamStats = z.infer<typeof insertStreamStatsSchema>;
export type Deduction = typeof deduction.$inferSelect;
export type InsertDeduction = z.infer<typeof insertDeductionSchema>;
export type SalesDetails = typeof salesDetails.$inferSelect;
export type InsertSalesDetails = z.infer<typeof insertSalesDetailsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type EntryType = typeof entryType.$inferSelect;
export type InsertEntryType = z.infer<typeof insertEntryTypeSchema>;
export type WbWeighbridge = typeof wbWeighbridge.$inferSelect;
export type InsertWbWeighbridge = z.infer<typeof insertWbWeighbridgeSchema>;
export type WbWeighbridgeItemsPurchase = typeof wbWeighbridgeItemsPurchase.$inferSelect;
export type InsertWbWeighbridgeItemsPurchase = z.infer<typeof insertWbWeighbridgeItemsPurchaseSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;