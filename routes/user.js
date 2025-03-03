const { Router } = require("express");
const User = require("../models/user");
const multer = require("multer");
const path = require("path");
const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //regex for validating email
const storage = multer.diskStorage({
  destination: "./public/uploads/profile/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

router.get("/signin", (req, res) => {
  const error = req.query.error || null; // Get error from query param if exists
  return res.render("signin", { error });
});


router.get("/signup", (req, res) => {
  return res.render("signup");
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);

    return res.cookie("token", token).redirect("/");
  } catch (error) {
    return res.render("signin", {
      error: "Incorrect Email or Password",
    });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/");
});

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!emailRegex.test(email)) {
    return res.render("signup",{error: "Invalid Password format",});
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/; //regular expression for validating password requirements
  if (!passwordRegex.test(password)) {
    return res.render("signup",{error: 'Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.',});
  }
  await User.create({
    fullName,
    email,
    password,
  });
  return res.redirect("/");
});

router.get("/profile", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  const user = await User.findById(req.user._id);
  return res.render("userProfile", { user });
});

router.get("/edit-profile", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");
  const user = await User.findById(req.user._id);
  return res.render("editProfile", { user });
});

router.post("/update-profile", upload.single("profileImage"), async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  try {
    const { fullName, email } = req.body;
    let profileImageURL = req.user.profileImageURL;

    if (req.file) {
      profileImageURL = "/uploads/profile/" + req.file.filename;
    }

    await User.findByIdAndUpdate(req.user._id, { fullName, email, profileImageURL });
    return res.redirect("/user/profile");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
  }
});

module.exports = router;
