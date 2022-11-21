const db = require("../config/connection");
const collection = require("../config/collections");
const bcrypt = require("bcrypt");
const {
  UserBindingContext,
} = require("twilio/lib/rest/chat/v2/service/user/userBinding");
const session = require("express-session");
const { adminCategoryManagement } = require("./admin-helpers");
const collections = require("../config/collections");
const { response } = require("express");
const dotenv = require("dotenv").config();
const client = require("twilio")(process.env.accountSid, process.env.authToken);
const ObjectId = require("mongodb").ObjectId;
const Razorpay = require("razorpay");
const { resolve } = require("path");

let instance = new Razorpay({
  key_id: "rzp_test_VackhYlxrGsXQV",
  key_secret: "JSpsuJ3nd6ONDlq7XBJNE61n",
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.userBlock = false;
      userData.Password = await bcrypt.hash(userData.Password, 10);
      client.verify
        .services(process.env.serviceID)
        .verifications.create({
          to: `+91${userData.Mobilenumber}`,
          channel: "sms",
        })
        .then((data) => {
          (Name1 = userData.Name),
            (Mobilenumber1 = userData.Mobilenumber),
            (Password1 = hashPassword),
            (Email1 = userData.Email);
          res.redirect("/otpSignupVerify");
        });
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          //console.log(data)
          resolve(data.insertedId);
          console.log(data);
        });
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (user && !user.userBlocked) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log("login success");
            response.user = user;
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
  otpSignupVerifyGet: (req, res) => {
    //session = req.session;
    if (session.userId) {
      res.redirect("/");
    } else if (session.invalidOTP) {
      session.invalidOTP = false;
      res.render("user/otpLoginVerify", {
        otpMsg: "Wrong phone number or code",
      });
    } else {
      res.render("user/otpSignupVerify");
    }
  },

  otpSignupVerifyPost: (req, res) => {
    if (req.body.otp.length === 6) {
      client.verify
        .services(process.env.serviceID)
        .verificationChecks.create({
          to: `+91${Mobilenumber1}`,
          code: req.body.otp,
        })
        .then((data) => {
          if (data.status === "approved") {
            const user = new User({
              Name: Name1,
              Mobilenumber: Mobilenumber1,
              Email: Email1,
              Password: Password1,
            });
            user
              .save()
              .then((result) => {
                console.log("otp signup successful");
              })
              .catch((err) => {
                console.log(err);
              });
            res.redirect("/");
          } else {
            session = req.session;
            session.invalidOTP = true;
            res.redirect("/otpLoginVerify");
          }
        });
    } else {
      session = req.session;
      session.invalidOTP = true;
      res.redirect("/otpLoginVerify");
    }
  },
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },

  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          {
            $set: {
              userBlocked: true,
            },
          }
        )
        .then((response) => {
          console.log(userId);
          resolve(response);
        });
    });
  },
  unblockUser: (user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(user) },
          {
            $set: {
              userBlocked: false,
            },
          }
        )
        .then((response) => {});
    });
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: ObjectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        console.log(proExist);
        if (proExist != -1) {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId), "products.item": ObjectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      // console.log(cartItems)
      resolve(cartItems);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
            { _id: ObjectId(details.cart) },
            {
              $pull: { products: { item: ObjectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
            {
              _id: ObjectId(details.cart),
              "products.item": ObjectId(details.product),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  removeCartProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CART_COLLECTION)
        .updateOne(
          { _id: ObjectId(details.cart) },
          {
            $pull: { products: { item: ObjectId(details.product) } },
          }
        )
        .then((response) => {
          // console.log(,details);
          resolve({ removeProduct: true });
        });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$product.Price" }],
                },
              },
            },
          },
        ])
        .toArray();
      // console.log(total[0].total)
      resolve(total[0]?.total);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  placeOrder: (order, products, total, address) => {
    return new Promise((resolve, reject) => {
      let d = new Date().toString();
      let index = d.lastIndexOf(":") + 3;
      let date = d.substring(0, index);
      let month = new Date().getMonth();
      switch (month) {
        case 0:
          month = "Jan";
          break;
        case 1:
          month = "Feb";
          break;
        case 2:
          month = "Mar";
          break;
        case 3:
          month = "Apr";
          break;
        case 4:
          month = "May";
          break;
        case 5:
          month = "Jun";
          break;
        case 6:
          month = "Jul";
          break;
        case 7:
          month = "Aug";
          break;
        case 8:
          month = "Sep";
          break;
        case 9:
          month = "Oct";
          break;
        case 10:
          month = "Nov";
          break;
        case 11:
          month = "Dec";
          break;
        default:
          "someting wrong";
      }
      console.log(order, products, total, address);
      let status = order["payment-method"] === "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: order.mobile,
          flat: order.flat,
          area: order.area,
          pincode: order.pincode,
          landmark: order.landmark,
          city: order.city,
          state: order.state,
        },
        userId: ObjectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        date: date,
        month: month,
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: ObjectId(order.userId) });
          resolve(response.insertedId);
        });
    });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      resolve(cart?.products);
    });
  },
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      console.log(userId);
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: ObjectId(userId) })
        .toArray();

      resolve(orders);
    });
  },

  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: ObjectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      // console.log(orderItems)

      resolve(orderItems);
    });
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      let options = {
        amount: total * 100, //amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          console.log("NEw Order:", order);
          resolve(order);
        }
      });
    });
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "JSpsuJ3nd6ONDlq7XBJNE61n");
      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      let status = "Cancelled";

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: status,
              cancelButton: false,
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
  addAddress: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ADDRESS_COLLECTION)
        .insertOne(details)
        .then((data) => {
          console.log(details);
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // updateAddress: (addressId, address) => {
  //   try {
  //     return new Promise(async (resolve, reject) => {
  //       await db
  //         .get()
  //         .collection(collection.ADDRESS_COLLECTION)
  //         .updateOne(
  //           {
  //             _id: ObjectId(addressId),
  //           },
  //           {
  //             $set: {
  //               Name: address.Name,
  //               Email: address.Email,
  //               Mobilenumber: address.Mobilenumber,
  //               Pincode: address.Pincode,
  //               address: address.address,
  //             },
  //           }
  //         )
  //         .then((response) => {
  //           resolve();
  //         });
  //     });
  //   } catch {
  //     reject();
  //   }
  // },

  getAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .find({ userId: userId })
        .toArray();
      resolve(address);
    });
  },
  returnOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let status = "Returned";

      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: status,
              returnButton: false,
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
  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlistItems = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      console.log(wishlistItems);

      resolve(wishlistItems);
    });
  },
  addToWishlist: (proId, userId) => {
    // console.log('fghgbhhjku');
    let proObj = {
      item: ObjectId(proId),
    };
    return new Promise(async (resolve, reject) => {
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      console.log(userWishlist);
      if (userWishlist) {
        let proExist = userWishlist.products.findIndex(
          (product) => product.item == proId
        );
        console.log(proExist);
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .updateOne(
            { user: ObjectId(userId) },
            {
              $addToSet: { products: proObj },
            }
          )
          .then((response) => {
            resolve();
          });
      } else {
        let wishlistObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishlistObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  removeWishlistProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WISHLIST_COLLECTION)
        .updateOne(
          { _id: ObjectId(details.wishlist) },
          {
            $pull: { products: { item: ObjectId(details.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },
  getCoupon:()=>{
    return new Promise(async(resolve,reject)=>{
      let coupon=await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
      resolve(coupon)
    })
  },
  checkCoupon:(code)=>{
    return new Promise(async(resolve,reject)=>{
      let coupon=await db.get().collection(collection.COUPON_COLLECTION).findOne({code:code})
      if(coupon){
        resolve(coupon)
      }
      else{
        reject()
      }
    })
  }
};
