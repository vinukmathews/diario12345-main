const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const unirest = require("unirest");
const jwt = require("jsonwebtoken");

var cookies = require("cookie-parser");
const jwt_decode = require("jwt-decode");
var nodemailer = require("nodemailer");

var { MongoClient } = require("mongodb");
var url = "mongodb+srv://root:1234@cluster0.lraoz.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(url);
var database;

async function run() {
  try {
    await client.connect();
    database = client.db("mydb");
    console.log("Database(MongoDb) Connected");
  }
  catch (e) {
    console.log(e);
  }
}

const app = express();
app.use(cookies());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/assets", express.static(__dirname + "/public"));
const { decode } = require("punycode");


app.get("/logined", async function (req, res, next) {
  console.log(req.query.email);

  var email = req.query.email;
  var password = req.query.psw;

  const query = { email, pword: password };

  const result = await database.collection("users").findOne(query);

  if (result === null) {
    res.status(500).send({ error: "Login failed" });
  } else {
    var token = jwt.sign({ email: result.email }, "config.secret", {
      expiresIn: 86400, // expires in 24 hours
    });

    // res.status(200).send({ token: token });
    // ;

    // res.json({
    //     token
    // });
    res.cookie("jwt", token);
    res.redirect("/main");


  }


  console.log("login")
});

var decoded = "";

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.jwt;

  console.log("Verifying token", token);

  if (token) {
    jwt.verify(token, "config.secret", (err, user) => {
      if (err) {
        return res.sendStatus(403);
      } else {
        req.cookies.jwt;
        decoded = jwt_decode(token).email.replace(/[@.]/g, "a");

        next();
      }
    });
  } else {
    res.sendStatus(401);
  }
};

app.get("/setting", authenticateJWT, async function (req, res, next) {
  console.log(req.query.email);

  var email = req.query.Email;
  var password = req.query.Password;

  let data = { settingemail: email, pss: password };

  await database.collection(decoded).insertOne(data, function (err, res) {
    if (err) throw err;
    console.log(`1 document inserted in ${decoded} collection`);
  });
});

app.get("/emailed", function (req, res, next) {
  var email = req.query.email;
  var subject = req.query.subject;
  var content = req.query.content;
  console.log(content);

  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "vinukmathews@gmail.com",
      pass: "daQ3Wp4z",
    },
  });

  var mailOptions = {
    from: "vinukmathews@gmail.com",
    to: email,
    subject: subject,
    text: content,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
});

app.get("/email/:id", authenticateJWT, async function (req, res, next) {
  let id = req.params.id;
  console.log(id);

  var req = unirest('GET', 'https://api.companieshouse.gov.uk/company/' + id)
    .headers({
      'Authorization': 'fQhsbufsHoVxGd-RqVymvdEwFEe0oSI6vBzudk_4'
    })
    .end(function (res1) {

      data = JSON.parse(res1.raw_body)


      //  var next_due= data.accounts.next_due
      // var next_due1 = data.accounts.next_due
      var data2 = {

        next_due: new Date(data.accounts.next_due).toLocaleString().split(' ')[0],
        companyno: data.company_number,
        coname: data.company_name,
        next_made_up_to: new Date(data.accounts.next_made_up_to).toLocaleString().split(' ')[0],
        period_start_on: new Date(data.accounts.next_accounts.period_start_on).toLocaleString().split(' ')[0],


      }
      res.render('email', { data2 });

    });

  // await database.collection(decoded).find({ crn: id }).toArray(function (err, result) {
  //   if (err || result == 0) {
  //     console.log("failed");
  //     return;
  //   } else {
  //     res.render("email", { email: result[0].email });
  //     console.log(result[0].email);
  //   }
  // });


});
app.get("/settings", function (req, res, next) {
  res.render("settings");
});

app.get("/", function (req, res, next) {
  res.render("login");
});

app.get("/signup", function (req, res, next) {
  res.render("signup");
});

app.get("/todo", function (req, res, next) {
  res.render("todolist");
});

app.get("/saveuser", async function (req, res, next) {
  console.log(req.query.email);
  var email = req.query.email;
  var password = req.query.psw;
  console.log("emailpass");

  let userData = { username: "aa", email: email, pword: password };
  await database.collection("users").insertOne(userData, function (err, res) {
    if (err) throw err;
    console.log("1 document inserted in users collection");
  });

  var email23 = req.query.email.replace(/[@.]/g, "a");
  console.log("sdv" + email23);

  database.createCollection(email23, {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        properties: {
          slno: {
            bsonType: "string",
          },
          crn: {
            bsonType: "string",
          },
          email: {
            bsonType: "string",
          },
          settingemail: {
            bsonType: "string",
          },
          pass: {
            bsonType: "string",
          },
        },
      },
    },
  });

  res.redirect("/main");
});

app.get("/addcompany", authenticateJWT, function (req, res, next) {
  res.render("form");
});

app.get("/delete", authenticateJWT, function (req, res, next) {
  res.render("Delete");
});
app.get("/deleted", authenticateJWT, async function (req, res) {
  console.log(req.query.number);
  var a = req.query.number;

  var crnToDelete = { crn: a };
  await database.collection(decoded).deleteMany(crnToDelete, function (err, res) {
    if (err) throw err;
    console.log("1 document deleted");
  });
  res.redirect("/main");
});

app.get("/login", function (req, res, next) {
  res.render("login");
});

app.get("/saveaction", authenticateJWT, async function (req, res) {
  console.log(req.query.number);
  var a = req.query.number;
  var b = req.query.email;

  var newvalues = { crn: a };
  await database.collection(decoded).insertOne(newvalues, function (err, res) {
    if (err) throw err;
    console.log("1 document inserted");
  });
  res.redirect("/main");
});

app.get("/main", authenticateJWT, async (req, res) => {
  console.log(decoded);

  await database.collection(decoded).find({}).toArray(function (err, results) {
    if (err) {
    }
    count = results.length;
    if (count > 0) {
      var data1 = [];
      var promiseArray = [];

      async function dataretreive() {
        for (var i = 0; i < results.length; i++) {
          console.log(results[i].crn);


          promiseArray.push(
            new Promise((resolve, reject) => {
              unirest(
                "GET",
                "https://api.companieshouse.gov.uk/company/" + results[i].crn
              )
                .headers({
                  Authorization: "fQhsbufsHoVxGd-RqVymvdEwFEe0oSI6vBzudk_4",
                })
                .end(function (res1) {
                  data = JSON.parse(res1.raw_body);
                  // console.log(data);

                  var dataset = {
                    next_due: data.accounts.next_due,

                    companyno: data.company_number,
                    coname: data.company_name,
                    next_made_up_to: data.accounts.next_made_up_to,
                    period_start_on: data.accounts.next_accounts.period_start_on,
                    confirmation_statement:
                      data.confirmation_statement.next_due,

                    status: data.company_status_detail,
                    confirmation_statement_overdue: data.confirmation_statement.overdue,

                  };
                  // console.log(dataset);
                  data1.push(dataset);
                  resolve();
                });
            })
          );

        }
        await Promise.all(promiseArray);

        res.render("product_view", {
          data1, no: count,
        });
      }
      // console.log(data1);
      var no = data1.length
      console.log(no);



      dataretreive();
    } else {
      res.send("No data found");
    }
  });
});

app.listen(process.env.PORT || 3000, function () {
  run().catch(console.dir);
  console.log("port activated");
});





