const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

// musicalMagic
// tcuusrYMZux9Wib4

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ytasiev.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		// Send a ping to confirm a successful connection

		const userCollection = client.db('musicalMagic').collection('users');
		const addClassesCollection = client
			.db('musicalMagic')
			.collection('addedClasses');

		app.post('/jwt', async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.SECRET_TOKEN_PASS, {
				expiresIn: '2 days',
			});
			res.send({ token });
		});

		// role changes apis
		app.patch('/users/role/:id', async (req, res) => {
			const id = req.params.id;
			const { role } = req.body;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: role,
				},
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		// Users related apis
		app.get('/users', async (req, res) => {
			const result = await userCollection.find().toArray();
			res.send(result);
		});

		app.post('/users', async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = await userCollection.findOne(query);
			if (existingUser) {
				return res.send({ message: 'User already exist' });
			}
			const result = await userCollection.insertOne(user);
			res.send(result);
		});

		// Added class api by Instructor
		app.get('/addedClasses', async (req, res) => {
			const result = await addClassesCollection.find().toArray();
			res.send(result);
		});
		app.post('/addedClasses', async (req, res) => {
			const query = req.body;
			const result = await addClassesCollection.insertOne(query);
			res.send(result);
		});

		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('Musical magic is running');
});

app.listen(port, () => {
	console.log('Musical instruments is tuning');
});
