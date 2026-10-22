import cors from "cors";
import express from "express";
import helmet from "helmet";
import { allowedOrigins } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { albumsRouter } from "./modules/gallery/albums.routes.js";
import { photosRouter } from "./modules/gallery/photos.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { goalsRouter } from "./modules/goals/goals.routes.js";
import { gradesRouter } from "./modules/grades/grades.routes.js";
import { journalsRouter } from "./modules/journals/journals.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";
import { transactionsRouter } from "./modules/transactions/transactions.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

const app = express();

app.set("trust proxy", 1); // di belakang proxy Vercel, agar rate-limit membaca IP asli
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/categories", categoriesRouter);
app.use("/transactions", transactionsRouter);
app.use("/finance", financeRouter);
app.use("/tasks", tasksRouter);
app.use("/goals", goalsRouter);
app.use("/events", eventsRouter);
app.use("/journals", journalsRouter);
app.use("/photos", photosRouter);
app.use("/albums", albumsRouter);
app.use("/grades", gradesRouter);
app.use("/search", searchRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
