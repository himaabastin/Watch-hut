const db = require("../config/connection");
const collection = require("../config/collections");
const bcrypt = require("bcrypt");
const ObjectId = require("mongodb").ObjectID;
const session = require("express-session");
const { validationResult } = require("express-validator");
const { ObjectID } = require("bson");

module.exports = {
  adminSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      adminData.Password = await bcrypt.hash(adminData.Password, 10);
      db.get()
        .collection(collection.ADMIN_COLLECTION)
        .insertOne(adminData)
        .then((data) => {
          console.log(data);
          resolve(data.insertedId);
        });
    });
  },

  adminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let admin = await db
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt.compare(adminData.Password, admin.Password).then((status) => {
          if (status) {
            console.log("admin login success");
            response.admin = admin;
            response.status = true;
            resolve(response);
          } else {
            console.log("login failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("login failed");
        resolve({ status: false });
      }
    });
  },
  addCategory: (category, callback) => {
    console.log(category);
    db.get()
      .collection("category")
      .insertOne(category)
      .then((data) => {
        callback(data.insertedId);
      });
  },
  getCategory: () => {
    return new Promise(async (resolve, reject) => {
      let category = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(category);
    });
  },
  deleteCategory: (categoryId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .deleteOne({ _id: ObjectId(categoryId) })
        .then((response) => {
          resolve(categoryId);
        });
    });
  },
  allOrders: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { status: { $nin: ["Waiting for approval"] } },
            },
          ])
          .sort({ date: -1 })
          .toArray();
        console.log("this:::", orders);
        resolve(orders);
      } catch {
        reject();
      }
    });
  },
  orderDetails: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderDetails = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ _id: ObjectID(orderId) })
        .toArray();
      resolve(orderDetails);
    });
  },
  cancelOrder: (orderId, remark) => {
    return new Promise((resolve, reject) => {
      let status = "Cancelled";
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: ObjectID(orderId),
          },
          {
            $set: {
              status: status,
              remark: remark,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  },
  updateOrderStatus: (orderId, status) => {
    let s1 = status;
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectID(orderId) },
          {
            $set: {
              status: s1,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  },

  userCount: () => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .count()
        .then((count) => {
          resolve(count);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  productCount: () => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .count()
        .then((count) => {
          resolve(count);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  orderCount: () => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .count()
        .then((count) => {
          resolve(count);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  totalSales: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let total = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { status: { $ne: "Cancelled" } },
            },
            {
              $project: {
                totalAmount: 1,
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ])
          .toArray();
        resolve(total[0].total);
      } catch {
        reject();
      }
    });
  },

  weeklySales: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let sales = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $group: {
                _id: "$month",
                count: {
                  $count: {},
                },
              },
            },
          ])
          .toArray();
        resolve(sales);
      } catch {
        reject();
      }
    });
  },
  getProductReport: () => {
    currentYear = new Date().getFullYear();
    return new Promise(async (resolve, reject) => {
      let productReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $unwind: "$products",
          },
          {
            $project: {
              products: 1,
            },
          },
          {
            $group: {
              _id: "$products.item",
              count: { $sum: "$products.quantity" },
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: "$product",
          },
          {
            $project: {
              name: "$product.Name",
              count: 1,
              _id: 0,
            },
          },
          { $sort: { count: -1 } },
        ])
        .toArray();

      resolve(productReport);
    });
  },
  getTotalSalesReport: () => {
    return new Promise(async (resolve, reject) => {
      let salesReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "product.item",
              foreignField: "_id",
              as: "product",
            },
          },
        ])
        .toArray();
      // console.log(salesReport.products,"saleesrerergjdkjg::");
      resolve(salesReport);
    });
  },
  allCoupon: () => {
    return new Promise(async (resolve, reject) => {
      let coupon = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .find()
        .toArray();
      console.log(coupon);
      resolve(coupon);
    });
  },
  addCoupon: (details) => {
    return new Promise(async (resolve, reject) => {
      let code = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ code: details.code });

      if (code) {
        reject({ message: "Coupons already exist." });
      } else {
        
        db.get()
          .collection(collection.COUPON_COLLECTION)
          .insertOne(details)
          .then((data) => {
            resolve(data);
          });
        
      }
    });
  },

  couponDelete: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .deleteOne({ _id: ObjectId(couponId) })
        .then((data) => {
          resolve(data);
        });
    });
  },
};
