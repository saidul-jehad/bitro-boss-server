const express = require('express')
const app = express();
const cors = require("cors")
const jwt = require('jsonwebtoken')
const stripe = require('stripe')("sk_test_51PLWnLB7d9Q4SFII9P0b1hdExAR2ucQ7cX2I3uJwJvcsNXFOlRo1Bgvdq8YWzKMEwYasXT5xcf967bf7KkLQ3nwk00nq6JHS5s")
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
        // Connect the client rsto the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("bistroDb").collection("users");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartsCollection = client.db("bistroDb").collection("carts");
        const paymentsCollection = client.db("bistroDb").collection("payments");


        // oun middleWare
        const verifyToken = async (req, res, next) => {
            const token = req?.headers?.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).send({ message: "unauthorized access" })
            }
            // console.log(token);
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    console.log("err");
                    return res
                        .status(401)
                        .send({ message: "unauthorized access" })
                }
                console.log("dec");
                req.decoded = decoded
                next()
            })
        }



        // use verify admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: "forbidden access" })
            }
            next()
        }

        // jwt related api 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })


        // users related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email

            if (email !== req?.decoded?.email) {
                return res
                    .status(403)
                    .send({ message: "forbidden access" })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)

            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
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
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })



        // menu related api
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: id }
            const result = await menuCollection.findOne(query)
            res.send(result)
        })

        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuItem = req.body
            const result = await menuCollection.insertOne(menuItem)
            res.send(result)

        })

        app.patch('/menu/:id', async (req, res) => {
            const id = req.params.id
            const item = req.body
            const query = { _id: id }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    recipe: item.recipe,
                    image: item.image,
                    price: item.price,
                    category: item.category,
                }
            }

            const result = await menuCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query)
            res.send(result)
        })

        // review collection
        app.get('/review', async (req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result)
        })


        // cart related api
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

        // payment related
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                "payment_method_types": [
                    "card"
                ],
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.get('/payments/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            console.log(email);
            if (email !== req?.decoded?.email) {
                return res
                    .status(403)
                    .send({ message: "forbidden access" })
            }

            const query = { email: email }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })


        app.post('/payments', async (req, res) => {
            const payment = req.body
            console.log('payment info ', payment);
            const paymentResult = await paymentsCollection.insertOne(payment)

            //  carefully delete each item from the cart
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            }
            const deleteResult = await cartsCollection.deleteMany(query)
            res.send({ paymentResult, deleteResult })
        })


        // stats and analytics
        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount()
            const menuItems = await menuCollection.estimatedDocumentCount()
            const orders = await paymentsCollection.estimatedDocumentCount()

            // this is not best wye
            // const payments = await paymentsCollection.find().toArray()
            // const revenue = payments.reduce((total, payment) => total + payment.price, 0)

            const result = await paymentsCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: '$price'
                        }
                    }
                }
            ]).toArray()

            const revenue = result.length > 0 ? result[0].totalRevenue : 0;

            res.send({
                users,
                menuItems,
                orders,
                revenue
            })
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