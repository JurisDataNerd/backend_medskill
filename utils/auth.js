export default function auth(req, res, next) {
  console.log("🔥 AUTH MIDDLEWARE HIT");
  // Accept several possible header names used in clients/tests
  const headerCandidates = ["x-user-id", "user-id", "userid", "user_id", "userId"];

  let user_id;
  for (const key of headerCandidates) {
    const val = req.headers[key];
    if (val !== undefined) {
      user_id = val;
      break;
    }
  }

  // Some clients accidentally send the literal string 'undefined'
  if (user_id === "undefined") user_id = undefined;

  console.log("AUTH header resolved to:", user_id);

  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = { id: user_id };

  next();
}