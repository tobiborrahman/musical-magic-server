const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
// 	const authorization = req.headers.authorization;
// 	if (!authorization) {
// 		return res
// 			.status(401)
// 			.send({ err: true, message: 'unauthorized access' });
// 	}
// 	// bearer token
// 	const token = authorization.split(' ')[1];

// 	jwt.verify(token, process.env.SECRET_TOKEN_PASS, (err, decoded) => {
// 		if (err) {
// 			return res
// 				.status(401)
// 				.send({ err: true, message: 'unauthorized access' });
// 		}
// 		req.decoded = decoded;
// 		next();
// 	});
// };

const verifyJWT = (req, res, next) => {
	const token = req.headers.authorization;

	// Check if the token is provided in the request headers
	if (!token) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	try {
		// Verify and decode the JWT token
		const decoded = jwt.verify(token, process.env.SECRET_TOKEN_PASS);
		req.decoded = decoded; // Set the decoded token to req.decoded
		next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' });
	}
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
		const addClassesCollection = client
			.db('musicalMagic')
			.collection('addedClasses');

		app.post('/jwt', async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.SECRET_TOKEN_PASS, {
				expiresIn: '7d',
			});
			res.send({ token });
		});

		// role changes api
		app.get('/users/role/:email', async (req, res) => {
			const email = req.params.email;

			try {
				const user = await userCollection.findOne({ email: email });

				if (!user) {
					return res.status(404).json({ error: 'User not found' });
				}

				const roles = user.roles || [];

				const result = {
					isAdmin: roles.includes('admin'),
					isInstructor: roles.includes('instructor'),
					isUser: roles.includes('user'),
				};

				res.send(result);
			} catch (error) {
				console.error('Error retrieving user roles:', error);
				res.status(500).json({ error: 'Internal server error' });
			}
		});

		// app.get('/users/role/:email', verifyJWT, async (req, res) => {
		// 	const email = req.params.email;
		// 	console.log(email);

		// 	// 	security layer: verifyJWT
		// 	// 	email same
		// 	// 	check admin
		// 	if (req.decoded.email !== email) {
		// 		res.send({ admin: false });
		// 	}

		// 	const query = { email: email };
		// 	console.log(query);
		// 	const user = await userCollection.findOne(query);
		// 	const result = {
		// 		admin: user?.role === 'admin',
		// 		instructor: user?.role === 'instructor',
		// 		user: user?.role === 'user',
		// 	};
		// 	res.send(result);
		// });

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
