require("dotenv").config();
var jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://advance-healthcare-sd246.web.app",
    ],
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
    // await client.connect();
    const db = client.db("AdvanceHealthService");
    const userCollection = db.collection("users");
    const doctorCollection = db.collection("doctors");
    const appointmentCollection = db.collection("appointments");

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

    app.get("/users", async (req, res) => {
      try {
        const users = userCollection.find();
        const collections = await users.toArray();
        res.send(collections);
      } catch (error) {
        res.status(201).send("internal server error!");
      }
    });

    app.post("/user", async (req, res) => {
      try {
        const { displayName, email } = req.body;
        const newUser = { displayName, email, role: "user" };
        if (!email || !displayName) {
          return res
            .status(400)
            .send({ message: "Email and Display Name are required." });
        }
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
          return res
            .status(201)
            .send({ message: "User already exists with this email." });
        }
        const result = await userCollection.insertOne(newUser);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    //doctors api request
    app.get("/doctors", async (req, res) => {
      try {
        const doctors = doctorCollection.find();
        const result = await doctors.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/doctor/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const doctor = await doctorCollection.findOne(query);

        if (!doctor) {
          return res.status(404).json({ message: "Doctor not found" });
        }

        res.json(doctor);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/doctors/:specialty", async (req, res) => {
      try {
        const { specialty } = req.params;
        const doctors = doctorCollection.find({ specialty });
        const result = await doctors.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    //Appointment api requests

    app.get("/appointments/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const query = { email };
        if (!req.decodedUser) {
          return res.status(401).send("UnAuthorize access");
        }
        const appointments = await appointmentCollection.find(query).toArray();
        res.send(appointments);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.post("/appointment", async (req, res) => {
      try {
        const appointment = req.body;
        const result = await appointmentCollection.insertOne(appointment);
        res.status(201).send(result);
      } catch (error) {
        res
          .status(500)
          .send("Having error in posting appointment", error.message);
      }
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
