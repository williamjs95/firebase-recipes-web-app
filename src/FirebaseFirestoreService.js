import firebase from "./FirebaseConfig";

const firestore = firebase.firestore();

const createDocument = (collection, document) => {
  return firestore.collection(collection).add(document);
}

const readDocuments = ({collection, queries, orderByField, orderByDirection}) => {
  let collectionRef = firestore.collection(collection);

  if (queries && queries.length > 0) {
    for (const query of queries) {
      collectionRef = collectionRef.where(
        query.field,
        query.condition,
        query.value
      );
    }
  }

  if(orderByField && orderByDirection) {
    collectionRef = collectionRef.orderBy(orderByField, orderByDirection);
  }

  return collectionRef.get();
}

const updateDocument = (collection, id, document) => {
  return firestore.collection(collection).doc(id).update(document);
}

const deleteDocument = (collection, id) => {
  return firestore.collection(collection).doc(id).delete();
}

const FirebaseFirestoreService = {
  createDocument,
  readDocuments,
  updateDocument,
  deleteDocument
}

export default FirebaseFirestoreService;