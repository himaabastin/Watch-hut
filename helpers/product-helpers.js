const db = require("../config/connection");
const collection = require("../config/collections");
const { response } = require("express");
const objectId = require("mongodb").ObjectID;

module.exports = {
  addProduct: (product, callback) => {
    console.log(product);
    product.stock = parseInt(product.stock);
    product.Price = parseInt(product.Price);
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        callback(data.insertedId);
      });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(proId);
        });
    });
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(proId) })
        .then((product) => {
          resolve(product);
        });
    });
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      proDetails.stock = parseInt(proDetails.stock);
      proDetails.Price = parseInt(proDetails.Price);
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(proId) },
          {
            $set: {
              Name: proDetails.Name,
              Description: proDetails.Description,
              Price: proDetails.Price,
              category: proDetails.category,
              stock: proDetails.stock,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },

  singleProductView: (proId) => {
    console.log(proId);
    return new Promise(async (resolve, reject) => {
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(proId) });
      resolve(product);
    });
  },
  addBanner: (banner, callback) => {
    db.get()
      .collection("banner")
      .insertOne(banner)
      .then((data) => {
        callback(data.insertedId);
      });
  },
  getAllBanner: () => {
    return new Promise(async (resolve, reject) => {
      let banner = await db
        .get()
        .collection(collection.BANNER_COLLECTION)
        .find()
        .toArray();
      resolve(banner);
    });
  },
  deleteBanner: (bannerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BANNER_COLLECTION)
        .deleteOne({ _id: objectId(bannerId) })
        .then((response) => {
          resolve(bannerId);
        });
    });
  }
};
