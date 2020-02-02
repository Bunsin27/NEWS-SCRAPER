let express = require("express");
let mongoose = require("mongoose");
let axios = require("axios");
let cheerio = require("cheerio");

let db = require("./models");

let PORT = process.env.PORT || 3000;
let MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

let app = express();
app.unsubscribe(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/scrape", function(req, res) {
  axios.get("https://www.npr.org/").then(function(response) {
    let $ = cheerio.load(response.data);

    $(".story-wrap").each(function(index, element) {
      let result = {};
      result.title = $(this)
        .find("h3.title")
        .text();
      result.summary = $(this)
        .find(".teaser")
        .text();
      result.link = $(this)
        .find("h3.title")
        .parent("a[href]")
        .attr("href");
      result.notes = [];

      if (result.title && result.link) {
        db.Article.countDocuments({ link: result.link }, function(err, count) {
          if (err) return console.log(err);
          if (!count) {
            db.Article.create(result, function(err, dbArticle) {
              if (err) return console.log(err);
              console.log(dbArticle);
            });
          }
        });
      }
    });
    res.sendStatus(204);
  });
});

app.get("/articles", function(req, res) {
  db.Article.find({}, function(err, dbArticles) {
    if (err) res.json(err);
    else res.json(dbArticles);
  });
});

app.get("/articles/:id", function(req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .exec(function(err, dbArticle) {
      if (err) res.json(err);
      else res.json(dbArticle);
    });
});

app.post("/articles/:id", function(req, res) {
  db.Note.create({ body: req.body }, function(err, dbNote) {
    if (err) res.json(err);
    db.Article.findOneAndUpdate(
      { _id: req.params.id },
      { $push: { notes: dbNote } },
      { new: true },
      function(err, dbArticle) {
        if (err) res.json(err);
        else res.json(dbArticle);
      }
    );
  });
});

app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});