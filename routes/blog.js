const { Router } = require("express");
const multer = require("multer");
const path = require("path");

const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads/`));
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

router.get("/add-new", (req, res) => {
  return res.render("addBlog", {
    user: req.user,
  });
});

router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate("createdBy");
  const comments = await Comment.find({ blogId: req.params.id })
    .populate("createdBy")
    .populate({
      path: 'replies',
      populate: { path: 'createdBy' }  // Populate createdBy for replies
    });

  return res.render("blog", {
    user: req.user,
    blog,
    comments,
  });
});

router.post("/comment/:blogId", async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});


router.post("/", upload.single("coverImage"), async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/signin?error=You must log in first to add a blog");
  }

  const { title, body } = req.body;
  const blog = await Blog.create({
    body,
    title,
    createdBy: req.user._id,
    coverImageURL: `/uploads/${req.file.filename}`,
  });

  return res.redirect(`/blog/${blog._id}`);
});

router.post("/like/:id", async (req, res) => {
  if (!req.user) {
    return res.redirect("/user/signin?error=You must log in first to like a blog");
  }

  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.redirect("/");

  const userId = req.user._id;
  const likeIndex = blog.likes.indexOf(userId);

  if (likeIndex === -1) {
    // If user hasn't liked before, add like
    blog.likes.push(userId);
  } else {
    // If user has already liked, remove like (toggle)
    blog.likes.splice(likeIndex, 1);
  }

  await blog.save();
  return res.redirect(`/blog/${blog._id}`);
});


router.get("/edit/:id", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin?error=You must log in first");

  const blog = await Blog.findById(req.params.id);
  if (!blog || blog.createdBy.toString() !== req.user._id.toString()) {
    return res.redirect("/?error=Unauthorized access");
  }

  return res.render("editBlog", { blog });
});


router.post("/edit/:id", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin?error=You must log in first");

  const blog = await Blog.findById(req.params.id);
  if (!blog || blog.createdBy.toString() !== req.user._id.toString()) {
    return res.redirect("/?error=Unauthorized access");
  }

  blog.title = req.body.title;
  blog.body = req.body.body;
  await blog.save();

  return res.redirect(`/blog/${blog._id}`);
});


router.post("/delete/:id", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin?error=You must log in first");

  const blog = await Blog.findById(req.params.id);
  if (!blog || blog.createdBy.toString() !== req.user._id.toString()) {
    return res.redirect("/?error=Unauthorized access");
  }

  await Blog.findByIdAndDelete(req.params.id);
  return res.redirect("/");
});

router.post("/comment/like/:commentId", async (req, res) => {
  const userId = req.user._id; 
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);

    if (comment.likes.includes(userId)) {
      comment.likes.pull(userId); // Remove user ID from the likes array
    } else {
      comment.likes.push(userId); // Add user ID to the likes array
    }

    await comment.save();
    return res.redirect("/blog/" + comment.blogId); 
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
  }
});

router.get("/comment/edit/:commentId", async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);
    
    // Check if the logged-in user is the one who created the comment
    if (comment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    return res.render("editComment", { comment }); 
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
  }
});

router.post("/comment/update/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  try {
    const comment = await Comment.findById(commentId);

    if (comment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    comment.content = content;
    await comment.save();

    return res.redirect("/blog/" + comment.blogId); 
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
  }
});


module.exports = router;
