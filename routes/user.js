const { response } = require("express");
const express = require("express");
const router = express.Router();
const productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const { check, validationResult } = require("express-validator");
const productHelpers = require("../helpers/product-helpers");
const { Db } = require("mongodb");
const db = require("../config/connection");
const collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectId;

const verifyLogin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.loggedIn) {
    next();
  } else {
    return res.redirect("/login");
  }
};

//get home page
router.get("/", async (req, res, next) => {
  let user = req.session.user;
  console.log(user);
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  productHelper.getAllProducts().then(async(products) => {
    let banner=await productHelpers.getAllBanner()
    // console.log(banner,"bannerId");
    banner[0].active=true
    res.render("user/view-products", { products, user,banner, cartCount });
  });
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.userLoginErr });
    req.session.userLoginErr = false;
  }
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post(
  "/signup",
  check("Name").notEmpty().withMessage("Please enter a Name"),
  check("Email").notEmpty().withMessage("Please enter a email"),
  check("Email")
    .matches(/^\w+([\._]?\w+)?@\w+(\.\w{2,3})(\.\w{2})?$/)
    .withMessage("Username must be a valid email id"),
  check("Password")
    .matches(/[\w\d!@#$%^&*?]{5,}/)
    .withMessage("Password must contain at least five characters"),
  check("Password")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter"),
  check("Password")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),
  check("Password")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
  check("Password")
    .matches(/[!@#$%^&*?]/)
    .withMessage("Password must contain at least one special character"),
  check("Mobilenumber")
    .matches(/[\d]{10}/)
    .withMessage("Please enter a valid mobile number"),
  check("Mobilenumber")
    .matches(/^[6-9][\d]{9}/)
    .withMessage("Please enter a valid mobile number"),
  (req, res) => {
    const errors = validationResult(req);
    console.log(errors);
    const error1 = errors.errors.find((item) => item.param === "Name") || "";
    const error2 = errors.errors.find((item) => item.param === "Email") || "";
    const error3 =
      errors.errors.find((item) => item.param === "Password") || "";
    const error4 =
      errors.errors.find((item) => item.param === "Mobilenumber") || "";

    console.log(error3.msg);
    if (!errors.isEmpty()) {
      let errors = {
        NameMsg: error1.msg,
        EmailMsg: error2.msg,
        PasswordMsg: error3.msg,
        MobileMsg: error4.msg,
      };
      res.render("user/signup", { errors });
    } else {
      userHelpers.doSignup(req.body).then((response) => {
        req.session.user = response;
        req.session.user.loggedIn = true;
        res.redirect("/otpLoginVerify");
      });
    }
  }
);
router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.user.loggedIn = true;
      res.redirect("/");
    } else {
      req.session.userLoginErr = "invalid username or password";
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  res.redirect("/");
});

router.get("/otpLoginVerify", (req, res) => {
  userHelpers.otpSignupVerifyGet(req, res);
  req.session.user = response;
  req.session.user.loggedIn = true;
  res.render("user/otpLoginVerify");
});
router.post("/otpLoginVerify", (req, res) => {
  userHelpers.otpSignupVerifyPost(req, res);
  console.log(response);
  req.session.loggedIn = true;
  req.session.user = response;
  res.redirect("/");
});

router.get("/otpSignupVerify", (req, res) => {
  userHelpers.otpSignupVerifyGet(req, res);
  res.render("user/otpLoginVerify");
});

router.post("/otpSignupVerify", (req, res) => {
  userHelpers.otpSignupVerifyPost(req, res);
  console.log(response);
  req.session.loggedIn = true;
  req.session.user = response;
  res.redirect("/");
});
router.get("/cart", verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id);

  if (products.length == 0) {
    res.render("user/empty-cart", { user: req.session.user });
  } else {
    let totalValue = await userHelpers.getTotalAmount(req.session.user._id);
    console.log(products);
    res.render("user/cart", {
      products,
      user: req.session.user._id,
      totalValue,
    });
  }
});
router.get("/add-to-cart/:id", (req, res) => {
  console.log("api call");
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

router.get("/categoryMen", async (req, res) => {
  let user = req.session.user;
  // console.log(user);
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  let men = await db
    .get()
    .collection(collections.PRODUCT_COLLECTION)
    .find({ category: "MEN" })
    .toArray();
  res.render("user/categoryMen", { men ,user,cartCount});
});
router.get("/categoryWomen", async (req, res) => {
  let user = req.session.user;
  // console.log(user);
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  let women = await db
    .get()
    .collection(collections.PRODUCT_COLLECTION)
    .find({ category: "WOMEN" })
    .toArray();
  res.render("user/categoryWomen", { women ,user,cartCount});
});
router.post("/change-product-quantity", (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

router.post("/remove-cart-product", (req, res, next) => {
  console.log("removing");
  console.log(req.body);
  userHelpers.removeCartProduct(req.body).then((response) => {
    // console.log(response);
    res.json(response);
  });
});

router.get("/place-order", verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id);
  const address = await userHelpers.getAddress(req.session.user._id);
  res.render("user/place-order", { total, user: req.session.user, address });
});

router.post("/place-order", async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId);
  let address = await userHelpers.getAddress(req.session.user._id);
  // let coupon=await userHelpers.checkCoupon(req)

  userHelpers
    .placeOrder(req.body, products, totalPrice, address)
    .then((orderId) => {
      console.log(req.body);
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    });
});

router.get("/order-success", verifyLogin, (req, res) => {
  res.render("user/order-success", { user: req.session.user });
});

router.get("/orders", verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id);

  let orders1 = [];

  for (let order of orders) {
    order.cancelButton = true;
    order.returnButton = true;
    // console.log(order.products.item());
    if (order.status == "Delivered") {
      order.rtrnButton = true;
      order.cancelButton = false;
    } else if (order.status == "Cancelled") {
      order.cancelButton = false;
      order.returnButton = false;
    } else if (order.status == "Returned") {
      order.cancelButton = false;
      order.returnButton = false;
    } else {
      order.returnButton = false;
      order.cancelButton = true;
    }
    orders1.push(order);
  }
  res.render("user/orders", { user: req.session.user, orders1 });
});

router.get("/view-order-products/:id", async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id);
  res.render("user/view-order-products", { user: req.session.user, products });
});

router.get("/single-product-view", async (req, res) => {
  let user = req.session.user;
  // console.log(user);
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  let id = req.query.id;
  console.log(id);
  let product = await productHelper.singleProductView(id);
  console.log(product);

  res.render("user/single-product-view", { product ,user,cartCount});
});

router.post("/verify-payment", (req, res) => {
  console.log(req.body);
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("Payment success");
        res.json({ status: true });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg: "" });
    });
});

router.get("/cancelOrder/:orderId", verifyLogin, (req, res) => {
  let orderId = req.params.orderId;
  userHelpers
    .cancelOrder(orderId)
    .then((response) => {
      res.redirect("/orders");
    })
    .catch((error) => {
      console.log(error);
      res.redirect("/error");
    });
});

router.get("/userProfile", verifyLogin, async (req, res) => {
  let user = req.session.user;
  let cartCount = await userHelpers.getCartCount(user._id);
  let address = await userHelpers.getAddress(user._id);
  let orders = await userHelpers.getUserOrders(req.session.user._id);
  console.log("hii prders::", orders);
  res.render("user/userProfile", { cartCount, address, user, orders });
});
router.get("/addAddress", verifyLogin, async (req, res) => {
  let user = req.session.user;
  let cartcount = await userHelpers.getCartCount(user._id);
  res.render("user/userNewAddress", { user, cartcount });
});

router.post("/addAddress", async (req, res) => {
  let user = req.session.user;
  let details = req.body;
  details.userId = user._id;
  details.default = false;

  userHelpers.addAddress(details).then((data) => {
    res.redirect("./userProfile");
  });
});

router.get("/returnOrder/:orderId", (req, res) => {
  let orderId = req.params.orderId;
  userHelpers
    .returnOrder(orderId)
    .then((response) => {
      res.redirect("/orders");
    })
    .catch((error) => {
      console.log(error);
      res.redirect("/error");
    });
});

router.get("/wishlist", verifyLogin, async (req, res) => {
  let products = await userHelpers.getWishlistProducts(req.session.user._id);
  // console.log(products);
  res.render("user/wishlist", { products, user: req.session.user._id });
});

router.get("/addToWishlist/:id", verifyLogin, (req, res) => {
  userHelpers.addToWishlist(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});
router.post("/removeWishlistProduct", (req, res, next) => {
  userHelpers.removeWishlistProduct(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/error", (req, res) => {
  res.render("user/error");
});
router.get('/userCoupon', verifyLogin, async (req, res) => {
  let user = req.session.user
  let cartcount = await userHelpers.getCartCount(user._id)
  let coupon = await userHelpers.getCoupon()

  res.render('user/userCoupon', {  user, cartcount, coupon })

})


router.post('/couponCheck', (req, res) => {
  let code = req.body.code;

  userHelpers.checkCoupon(code).then((data) => {

    let value = data.value
    res.json({ value })
  }).catch((err) => {

    res.json({ err: true })
  })

})

//sample banner


module.exports = router;
