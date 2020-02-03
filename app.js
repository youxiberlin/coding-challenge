const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
//TO-DO: delete 'util'
const util = require('util');
const validateData = require('./validator');

const API_PORT = 3000;
const app = express();
const router = express.Router();

const Data = mongoose.model('Data', new mongoose.Schema({
	// To-Do Add requirement
	key: { type: String },
	text: { type: String },
}));

const dbRoute = 'mongodb+srv://yuki:yuki@cluster0-xzvas.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(dbRoute, {
	useNewUrlParser: true,
	useUnifiedTopology: true, 
	useNewUrlParser: true,
	useFindAndModify: false,
});

let db = mongoose.connection;
db.collection('Data').createIndex( { "lastModifiedDate": 1 }, { expireAfterSeconds: 3600 } )

db.once('open', () => console.log('connected to the database'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

const makeRandomStr = () => Math.random().toString(36).substring(2);


router.get('/', async (req, res) => {
	const data = await Data.find().sort('key');
	const keys = data.map(item => item.key);
	res.send(keys)
});

router.post('/', async (req, res) => {
	const { error } = validateData(req.body); 
	if (error) return res.status(400).send(error.details[0].message);
	let data = new Data({
		key: req.body.key,
		text: req.body.text,
	})
	data = await data.save();
	res.send(data);
});

router.delete('/', async (req, res) => {
	mongoose.connection.db.dropCollection('Data', (err, result) => {
		console.log('err', err)
		res.send(result);
	});
});

router.put('/:key', async (req, res) => {
	const data = await Data.findOneAndUpdate({ key: req.params.key }, req.body, { new: true });
	// console.log(`reqparam: ${typeof req.params.key}, data: ${data}`)

	if (!data) return res.status(404).send('The data with the given ID was not found.');
	
	res.send(data);
});

router.delete('/:key', async (req, res) => {
	const data = await Data.findOneAndRemove({ key: req.params.key });
	// console.log(`reqparam: ${typeof req.params.key}, data: ${data}`)

	if (!data) return res.status(404).send('The data with the given ID was not found.');
	console.log(res.statusCode)
	if (res.statusCode === 200) {
		console.log(`Succecessfully deleted ${req.params.key}`)
		res.send(data);
	}
});


router.get('/:key', async (req, res) => {
	const data = await Data.find({ key: req.params.key });
	// To-Do: Add error detail object
	// if (key.length === 0) res.status(404).send('The data with the given key was not found');

	if (data.length === 0) {
		console.log('Cache miss');
		const randomStr = makeRandomStr();
		let newData = new Data({
			key: req.params.key,
			text: randomStr,
		})
		newData = await newData.save();
		res.send(newData);
	} else {
		console.log(`Cache hit! \n ${data}`);
		res.send(data)
	}
});

app.use('/api/data', router);
app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));
