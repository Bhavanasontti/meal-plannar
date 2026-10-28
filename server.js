// require("dotenv").config();

// const express = require("express");
// const path = require("path");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");
// const supabase = require("./supabase");

// const app = express();
// const PORT = Number(process.env.PORT || 3000);
// const JWT_SECRET = process.env.JWT_SECRET;

// if (!JWT_SECRET || JWT_SECRET.length < 32) {
//     throw new Error(
//         "Set JWT_SECRET to a random secret of at least 32 characters in backend/.env"
//     );
// }

// app.disable("x-powered-by");

// app.use(helmet({ contentSecurityPolicy: false }));
// app.use(express.json({ limit: "20kb" }));

// app.use(express.static(path.join(__dirname, "..", "frontend")));

// app.use(
//     "/api/auth",
//     rateLimit({
//         windowMs: 15 * 60 * 1000,
//         limit: 30,
//         standardHeaders: "draft-8",
//         legacyHeaders: false
//     })
// );

// // Helper functions

// const fail = (res, status, error) => {
//     return res.status(status).json({ error });
// };

// const validEmail = (value) => {
//     return (
//         typeof value === "string" &&
//         value.length <= 254 &&
//         /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
//     );
// };

// const text = (value, max) => {
//     return (
//         typeof value === "string" &&
//         value.trim().length > 0 &&
//         value.trim().length <= max
//     );
// };

// const optionalText = (value, max) => {
//     return (
//         value == null ||
//         (typeof value === "string" && value.length <= max)
//     );
// };

// const validDate = (value) => {
//     if (
//         typeof value !== "string" ||
//         !/^\d{4}-\d{2}-\d{2}$/.test(value)
//     ) {
//         return false;
//     }

//     const date = new Date(`${value}T12:00:00Z`);

//     return (
//         !Number.isNaN(date.getTime()) &&
//         date.toISOString().slice(0, 10) === value
//     );
// };

// function dbError(res, error) {
//     console.error(
//         "Database operation failed:",
//         error?.message || "Unknown database error"
//     );

//     return fail(
//         res,
//         500,
//         "The database operation failed. Check your Supabase setup and schema."
//     );
// }

// // Authentication functions

// function signToken(user) {
//     return jwt.sign(
//         {
//             sub: user.id,
//             role: user.role
//         },
//         JWT_SECRET,
//         {
//             expiresIn: "8h",
//             issuer: "meal-plannar"
//         }
//     );
// }

// async function findUserByEmail(email) {
//     const { data, error } = await supabase
//         .from("users")
//         .select("*")
//         .eq("email", email.toLowerCase())
//         .maybeSingle();

//     if (error) {
//         throw error;
//     }

//     return data;
// }

// async function requireAuth(req, res, next) {
//     const header = req.headers.authorization || "";

//     if (!header.startsWith("Bearer ")) {
//         return fail(res, 401, "Please sign in to continue.");
//     }

//     try {
//         const payload = jwt.verify(header.slice(7), JWT_SECRET, {
//             issuer: "meal-plannar"
//         });

//         const { data: user, error } = await supabase
//             .from("users")
//             .select("id,name,email,role")
//             .eq("id", payload.sub)
//             .maybeSingle();

//         if (error) {
//             return dbError(res, error);
//         }

//         if (!user) {
//             return fail(
//                 res,
//                 401,
//                 "This account no longer exists. Please sign in again."
//             );
//         }

//         req.user = user;

//         return next();
//     } catch {
//         return fail(
//             res,
//             401,
//             "Your session is invalid or has expired. Please sign in again."
//         );
//     }
// }

// // Admin setup

// async function ensureAdmin() {
//     const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
//     const password = process.env.ADMIN_PASSWORD;

//     if (!email || !password) {
//         console.warn(
//             "ADMIN_EMAIL/ADMIN_PASSWORD not configured; admin bootstrap skipped."
//         );
//         return;
//     }

//     if (!validEmail(email) || password.length < 8) {
//         throw new Error(
//             "ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain at least 8 characters."
//         );
//     }

//     const existing = await findUserByEmail(email);

//     const password_hash = await bcrypt.hash(password, 12);

//     if (existing) {
//         const { error } = await supabase
//             .from("users")
//             .update({ role: "admin" })
//             .eq("id", existing.id);

//         if (error) {
//             throw error;
//         }

//         console.log(
//             `Admin role ensured for ${email}. Password is not reset on existing accounts.`
//         );
//     } else {
//         const { error } = await supabase
//             .from("users")
//             .insert({
//                 name: (process.env.ADMIN_NAME || "Administrator").slice(0, 80),
//                 email,
//                 password_hash,
//                 role: "admin"
//             });

//         if (error) {
//             throw error;
//         }

//         console.log(`Admin account created for ${email}.`);
//     }
// }

// // Health check

// app.get("/api/health", (req, res) => {
//     res.json({
//         status: "ok",
//         service: "meal-plannar"
//     });
// });

// // User signup

// app.post("/api/auth/signup", async (req, res) => {
//     const { name, email, password } = req.body || {};

//     if (
//         !text(name, 80) ||
//         !validEmail(email) ||
//         typeof password !== "string" ||
//         password.length < 8 ||
//         password.length > 72
//     ) {
//         return fail(
//             res,
//             400,
//             "Enter a name (max 80 characters), a valid email, and a password between 8 and 72 characters."
//         );
//     }

//     try {
//         const normalized = email.trim().toLowerCase();

//         if (await findUserByEmail(normalized)) {
//             return fail(
//                 res,
//                 409,
//                 "An account with that email already exists."
//             );
//         }

//         const password_hash = await bcrypt.hash(password, 12);

//         const { data: user, error } = await supabase
//             .from("users")
//             .insert({
//                 name: name.trim(),
//                 email: normalized,
//                 password_hash,
//                 role: "user"
//             })
//             .select("id,name,email,role")
//             .single();

//         if (error) {
//             if (error.code === "23505") {
//                 return fail(
//                     res,
//                     409,
//                     "An account with that email already exists."
//                 );
//             }

//             return dbError(res, error);
//         }

//         return res.status(201).json({
//             token: signToken(user),
//             user
//         });
//     } catch (error) {
//         return dbError(res, error);
//     }
// });

// // User signin

// app.post("/api/auth/signin", async (req, res) => {
//     const { email, password } = req.body || {};

//     if (
//         !validEmail(email) ||
//         typeof password !== "string" ||
//         password.length > 72
//     ) {
//         return fail(res, 400, "Enter a valid email and password.");
//     }

//     try {
//         const user = await findUserByEmail(
//             email.trim().toLowerCase()
//         );

//         if (
//             !user ||
//             !(await bcrypt.compare(password, user.password_hash))
//         ) {
//             return fail(res, 401, "Incorrect email or password.");
//         }

//         const safeUser = {
//             id: user.id,
//             name: user.name,
//             email: user.email,
//             role: user.role
//         };

//         return res.json({
//             token: signToken(safeUser),
//             user: safeUser
//         });
//     } catch (error) {
//         return dbError(res, error);
//     }
// });

// // Get current user

// app.get("/api/auth/me", requireAuth, (req, res) => {
//     res.json({
//         user: req.user
//     });
// });

// // Get meals

// app.get("/api/meals", requireAuth, async (req, res) => {
//     const { start, end } = req.query;

//     if (
//         !validDate(start) ||
//         !validDate(end) ||
//         start > end
//     ) {
//         return fail(
//             res,
//             400,
//             "Provide valid start and end dates (YYYY-MM-DD)."
//         );
//     }

//     const span =
//         (Date.parse(end) - Date.parse(start)) / 86400000;

//     if (span > 13) {
//         return fail(
//             res,
//             400,
//             "A meal query can cover no more than 14 days."
//         );
//     }

//     const { data, error } = await supabase
//         .from("meals")
//         .select(
//             "id,meal_date,meal_type,name,ingredients,notes,created_at,updated_at"
//         )
//         .eq("user_id", req.user.id)
//         .gte("meal_date", start)
//         .lte("meal_date", end)
//         .order("meal_date")
//         .order("created_at");

//     if (error) {
//         return dbError(res, error);
//     }

//     return res.json({
//         meals: data
//     });
// });

// // Add a meal

// app.post("/api/meals", requireAuth, async (req, res) => {
//     const b = req.body || {};

//     if (
//         !validDate(b.meal_date) ||
//         !["Breakfast", "Lunch", "Dinner", "Snack"].includes(b.meal_type) ||
//         !text(b.name, 120) ||
//         !optionalText(b.ingredients, 1000) ||
//         !optionalText(b.notes, 500)
//     ) {
//         return fail(
//             res,
//             400,
//             "Provide a valid date, meal type, meal name (max 120 characters), ingredients (max 1000), and notes (max 500)."
//         );
//     }

//     const { data, error } = await supabase
//         .from("meals")
//         .insert({
//             user_id: req.user.id,
//             meal_date: b.meal_date,
//             meal_type: b.meal_type,
//             name: b.name.trim(),
//             ingredients: (b.ingredients || "").trim(),
//             notes: (b.notes || "").trim()
//         })
//         .select(
//             "id,meal_date,meal_type,name,ingredients,notes,created_at,updated_at"
//         )
//         .single();

//     if (error) {
//         return dbError(res, error);
//     }

//     return res.status(201).json({
//         meal: data
//     });
// });

// // Update a meal

// app.put("/api/meals/:id", requireAuth, async (req, res) => {
//     const b = req.body || {};

//     if (
//         !validDate(b.meal_date) ||
//         !["Breakfast", "Lunch", "Dinner", "Snack"].includes(b.meal_type) ||
//         !text(b.name, 120) ||
//         !optionalText(b.ingredients, 1000) ||
//         !optionalText(b.notes, 500)
//     ) {
//         return fail(
//             res,
//             400,
//             "Check the date, meal type, name, ingredients, and notes."
//         );
//     }

//     const { data, error } = await supabase
//         .from("meals")
//         .update({
//             meal_date: b.meal_date,
//             meal_type: b.meal_type,
//             name: b.name.trim(),
//             ingredients: (b.ingredients || "").trim(),
//             notes: (b.notes || "").trim()
//         })
//         .eq("id", req.params.id)
//         .eq("user_id", req.user.id)
//         .select(
//             "id,meal_date,meal_type,name,ingredients,notes,created_at,updated_at"
//         )
//         .maybeSingle();

//     if (error) {
//         return dbError(res, error);
//     }

//     if (!data) {
//         return fail(res, 404, "Meal not found.");
//     }

//     return res.json({
//         meal: data
//     });
// });

// // Delete a meal

// app.delete("/api/meals/:id", requireAuth, async (req, res) => {
//     const { data, error } = await supabase
//         .from("meals")
//         .delete()
//         .eq("id", req.params.id)
//         .eq("user_id", req.user.id)
//         .select("id")
//         .maybeSingle();

//     if (error) {
//         return dbError(res, error);
//     }

//     if (!data) {
//         return fail(res, 404, "Meal not found.");
//     }

//     return res.json({
//         message: "Meal removed."
//     });
// });

// // Get shopping list

// app.get("/api/shopping", requireAuth, async (req, res) => {
//     const { data, error } = await supabase
//         .from("shopping_items")
//         .select("id,item_name,is_checked,created_at,updated_at")
//         .eq("user_id", req.user.id)
//         .order("is_checked")
//         .order("created_at", { ascending: false });

//     if (error) {
//         return dbError(res, error);
//     }

//     return res.json({
//         items: data
//     });
// });

// // Add shopping item

// app.post("/api/shopping", requireAuth, async (req, res) => {
//     const { item_name } = req.body || {};

//     if (!text(item_name, 120)) {
//         return fail(
//             res,
//             400,
//             "Enter an item name up to 120 characters."
//         );
//     }

//     const { data, error } = await supabase
//         .from("shopping_items")
//         .insert({
//             user_id: req.user.id,
//             item_name: item_name.trim()
//         })
//         .select("id,item_name,is_checked,created_at,updated_at")
//         .single();

//     if (error) {
//         return dbError(res, error);
//     }

//     return res.status(201).json({
//         item: data
//     });
// });

// // Update shopping item checkbox

// app.patch("/api/shopping/:id", requireAuth, async (req, res) => {
//     const { is_checked } = req.body || {};

//     if (typeof is_checked !== "boolean") {
//         return fail(
//             res,
//             400,
//             "is_checked must be true or false."
//         );
//     }

//     const { data, error } = await supabase
//         .from("shopping_items")
//         .update({ is_checked })
//         .eq("id", req.params.id)
//         .eq("user_id", req.user.id)
//         .select("id,item_name,is_checked,created_at,updated_at")
//         .maybeSingle();

//     if (error) {
//         return dbError(res, error);
//     }

//     if (!data) {
//         return fail(res, 404, "Shopping item not found.");
//     }

//     return res.json({
//         item: data
//     });
// });

// // Delete shopping item

// app.delete("/api/shopping/:id", requireAuth, async (req, res) => {
//     const { data, error } = await supabase
//         .from("shopping_items")
//         .delete()
//         .eq("id", req.params.id)
//         .eq("user_id", req.user.id)
//         .select("id")
//         .maybeSingle();

//     if (error) {
//         return dbError(res, error);
//     }

//     if (!data) {
//         return fail(res, 404, "Shopping item not found.");
//     }

//     return res.json({
//         message: "Shopping item removed."
//     });
// });

// // Handle unknown API routes

// app.use("/api", (req, res) => {
//     return fail(res, 404, "API endpoint not found.");
// });

// // Handle unexpected errors

// app.use((err, req, res, next) => {
//     console.error(
//         "Unexpected server error:",
//         err?.message || err
//     );

//     if (res.headersSent) {
//         return next(err);
//     }

//     return fail(
//         res,
//         500,
//         "An unexpected server error occurred."
//     );
// });

// // Start the server

// async function start() {
//     try {
//         const { error } = await supabase
//             .from("users")
//             .select("id")
//             .limit(1);

//         if (error) {
//             throw error;
//         }

//         await ensureAdmin();

//         app.listen(PORT, () => {
//             console.log(
//                 `Meal Plannar is running at http://localhost:${PORT}`
//             );
//         });
//     } catch (error) {
//         console.error(
//             "Startup failed. Verify backend/.env and run database/schema.sql in Supabase."
//         );

//         console.error(error.message || error);

//         process.exit(1);
//     }
// }

// start();