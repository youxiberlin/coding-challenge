const Joi = require('joi');

module.exports = function validateData(data) {
	const schema = {
		text: Joi.string().min(1).required(),
		key: Joi.string().min(1).required(),
	};

	return Joi.validate(data, schema);
};