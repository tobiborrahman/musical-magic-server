const express = require('express');
const app = express();

const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
// 	const authorization = req.headers.authorization;

// 	if (!authorization) {
// 		return res.status(401).send({ error: 'Unauthorized' });
// 	}

// 	try {
// 		const decoded = jwt.verify(token, process.env.SECRET_TOKEN_PASS);
// 		req.decoded = decoded;
// 		next();
// 	} catch (error) {
// 		return res.status(401).json({ error: 'Invalid token' });
// 	}
// };

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res
			.status(401)
			.send({ error: true, message: 'unauthorized access' });
	}
	// bearer token
	const token = authorization.split(' ')[1];

	jwt.verify(token, process.env.SECRET_TOKEN_PASS, (err, decoded) => {
		if (err) {
			console.log(err);
			return res
				.status(401)
				.send({ error: true, message: 'unauthorized access' });
		}
		req.decoded = decoded;
		next();
	});
};

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
		const classCollection = client.db('musicalMagic').collection('class');
		const approvedClassCollection = client
			.db('musicalMagic')
			.collection('approvedClass');
		const instructorCollection = client
			.db('musicalMagic')
			.collection('instructors');
		const paymentCollection = client
			.db('musicalMagic')
			.collection('payments');
		const addClassesCollection = client
			.db('musicalMagic')
			.collection('addedClasses');

		app.post('/jwt', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.SECRET_TOKEN_PASS, {
				expiresIn: '7d',
			});
			res.send({ token });
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

		app.get('/users/admin/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded.email !== email) {
				res.send({ admin: false });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			const result = { admin: user?.role === 'admin' };
			res.send(result);
		});

		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: 'admin',
				},
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;

			if (req.decoded.email !== email) {
				res.send({ instructor: false });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			const result = { instructor: user?.role === 'instructor' };
			res.send(result);
		});

		app.patch('/users/instructor/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: 'instructor',
				},
			};
			const result = await userCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		// selected classes by students

		app.get('/class', async (req, res) => {
			const result = await classCollection.find().toArray();
			res.send(result);
		});

		app.get('/class/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await classCollection.find(query).toArray();
			res.send(result);
		});

		app.post('/class', async (req, res) => {
			const query = req.body;
			const result = await classCollection.insertOne(query);
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

		// Approved classes
		app.get('/approvedClasses', async (req, res) => {
			const result = await approvedClassCollection.find().toArray();
			res.send(result);
		});

		app.post('/approvedClasses', async (req, res) => {
			const query = req.body;
			const result = await approvedClassCollection.insertOne(query);
			res.send(result);
		});

		// Instructor apis
		app.post('/instructors', async (req, res) => {
			const query = req.body;
			const result = await instructorCollection.insertOne(query);
			res.send(result);
		});

		// all instructors api
		app.get('/users/instructors', async (req, res) => {
			const query = { role: 'instructor' };
			const result = await userCollection.find(query).toArray();
			res.send(result);
		});

		// Payment method api
		app.post('/payment-intent-method', async (req, res) => {
			const { price } = req.body;
			const amount = parseInt(price * 100);
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: 'usd',
				payment_method_types: ['card'],
			});

			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		});

		// paid class collection
		app.post('/payments', async (req, res) => {
			const items = req.body;
			const result = await paymentCollection.insertOne(items);
			res.send(result);
		});

		app.get('/payments/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await paymentCollection.findOne(query);
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
