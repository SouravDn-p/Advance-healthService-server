require("dotenv").config();
var jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "UnAuthorize access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorize access" });
    }
    req.decodedUser = decoded;
    next();
  });
};
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.pb8np.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("AdvanceHealthService");
    const userCollection = db.collection("users");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, `${process.env.JWT_SECRET}`, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.get("/users", verifyToken, async (req, res) => {
      const email = req.query.email;
      const users = userCollection.find();
      if (email != req.decodedUser.email) {
        return res.status(403).send({ message: "forbidden  access" });
      }
      const collections = await users.toArray();
      res.send(collections);
    });

    console.log("Connected to MongoDB successfully!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HealthCare Is Connected!");
});

app.listen(port, () => {
  console.log(`service is loading at port ${port}`);
});
