const { MongoClient, ObjectId } = require('mongodb');

let client;
let usersCollectionPromise;

function getSettings() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  return {
    databaseName: process.env.MONGODB_DATABASE || 'cats_co',
    uri,
  };
}

async function getUsersCollection() {
  if (!usersCollectionPromise) {
    usersCollectionPromise = (async () => {
      const { databaseName, uri } = getSettings();
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();

      const collection = client.db(databaseName).collection('users');
      await Promise.all([
        collection.createIndex({ nicknameKey: 1 }, { unique: true, sparse: true }),
        collection.createIndex({ email: 1 }, { unique: true, sparse: true }),
      ]);
      return collection;
    })().catch((error) => {
      usersCollectionPromise = undefined;
      throw error;
    });
  }

  return usersCollectionPromise;
}

async function createUser(user) {
  const collection = await getUsersCollection();
  const result = await collection.insertOne({
    ...user,
    createdAt: new Date(),
  });
  return { ...user, _id: result.insertedId };
}

async function findUserByNickname(nickname) {
  const collection = await getUsersCollection();
  const nicknameKey = nickname.trim().toLowerCase();

  return collection.findOne({
    $or: [
      { nicknameKey },
      { nickname: nicknameKey },
      { nickname },
    ],
  });
}

async function findUserById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

async function closeDatabase() {
  usersCollectionPromise = undefined;
  if (client) {
    await client.close();
    client = undefined;
  }
}

module.exports = {
  closeDatabase,
  createUser,
  findUserById,
  findUserByNickname,
};
