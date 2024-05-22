const express = require('express')
const app = express();
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;



// middleWare
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://bistro-boss-restaurant-finel-project.netlify.app"
        ],
        credentials: true,
    })
);
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ujjqksd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("bistroDb").collection("users");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartsCollection = client.db("bistroDb").collection("carts");

        // users related api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const isExitingUser = await userCollection.findOne(query)
            if (isExitingUser) {
                return res.send({ message: "user already have" })
            } else {
                const result = await userCollection.insertOne(user)
                res.send(result)
            }
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await userCollection.updateOne(filter)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })



        // menu collection
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        // review collection
        app.get('/review', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })


        // cartsCollection
        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const cartItem = req.body
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send("Bistro Boss Server is running")
})

app.listen(port, () => {
    console.log(`Bistro Boss Server is Running Port: ${port}`)
})