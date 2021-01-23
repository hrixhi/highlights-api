function resolveURI() {
	// const env = process.env.APP_ENV || 'local';
	// switch (env) {
	// 	// case 'dev':
	// 	// 	return 'mongodb://localhost:27017/admin';
	// 	// case 'prod':
	// 	// 	return 'mongodb+srv://aws:2Lsdh3FqCGSmfv1Z@istkt-mdb-prod-bfody.mongodb.net/isotope-platform?retryWrites=true';
	// 	// case 'local':
	// 	// 	return 'mongodb+srv://aws:2Lsdh3FqCGSmfv1Z@istkt-mdb-prod-bfody.mongodb.net/isotope-platform?retryWrites=true';	// test
	// 	// case 'test':
	// 	// 	return 'mongodb+srv://aws:2Lsdh3FqCGSmfv1Z@istkt-mdb-prod-bfody.mongodb.net/isotope-platform?retryWrites=true';	// test
	// 	default:
	return 'mongodb+srv://hrishi:Woofyrox123!@cluster0-qvlwb.mongodb.net/cues?retryWrites=true&w=majority';
	//}
}
export const MongoConnectionURI = resolveURI();
