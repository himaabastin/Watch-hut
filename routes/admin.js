const express = require("express");
// const{render}=require('../app')
// const productHelpers = require('../helpers/product-helpers')
const router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const bodyParser = require("body-parser");
const adminHelpers = require("../helpers/admin-helpers");
const userHelpers = require("../helpers/user-helpers");
const { check, validationResult } = require("express-validator");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const db = require("../config/connection");
const collections = require("../config/collections");
const { use } = require("./user");
const excelJs = require("exceljs");
const verifyAdminLogin = (req, res, next) => {
  if (req.session && req.session.admin && req.session.admin.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

router.get("/dashboard", async (req, res) => {
  try {
    let adminData = req.session.admin;
    let allCount = {};
    allCount.userCount = await adminHelpers.userCount();
    allCount.productCount = await adminHelpers.productCount();
    allCount.orderCount = await adminHelpers.orderCount();
    allCount.totalSales = await adminHelpers.totalSales();
    salesReport = await adminHelpers.weeklySales();
    productReport = await adminHelpers.getProductReport();
    // console.log(salesReport,"SAlesResdfdj");
    // console.log(productReport,"ProdutcResdfdj");

    res.render("admin/adminHome", {
      admin: true,
      adminData,
      allCount,
      salesReport,
      productReport,
    });
  } catch {
    let adminData = req.session.admin;
    let allCount = {};
    allCount.userCount = 0;
    allCount.productCount = 0;
    allCount.orderCount = 0;
    allCount.totalSales = 0;
    salesReport = 0;

    res.render("admin/adminHome", {
      admin: true,
      adminData,
      allCount,
      salesReport,
    });
  }
});

router.get("/", (req, res, next) => {
  let adminData = req.session.admin;
  if (!adminData) {
    res.render("admin/login", { admin: true });
  }
  productHelpers.getAllProducts().then((products) => {
    console.log(products);
    res.render("admin/view-products", { admin: true, products, adminData });
  });
});

router.get("/add-product", async (req, res) => {
  let category = await db
    .get()
    .collection(collections.CATEGORY_COLLECTION)
    .find()
    .toArray();

  res.render("admin/add-product", { category });
});
router.post("/add-product", (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image;
    console.log(id);
    image.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.redirect("/admin");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/delete-product/:id", (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect("/admin");
  });
});

router.get("/edit-product/:id", async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  let category = await db
    .get()
    .collection(collections.CATEGORY_COLLECTION)
    .find()
    .toArray();

  console.log(product);
  res.render("admin/edit-product", { product, category });
});

router.post("/edit-product/:id", (req, res) => {
  console.log(req.params.id);
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin");
    if (req.files) {
      let image = req.files.Image;
      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
});

router.get("/admin-signup", (req, res) => {
  res.render("admin/admin-signup");
});

router.post("/admin-signup", (req, res) => {
  adminHelpers.adminSignup(req.body).then((response) => {
    console.log(response);
    req.session.loggedIn = true;
    req.session.admin = response;
    res.redirect("/");
  });
});

router.get("/login", (req, res) => {
  if (req.session.admin) {
    res.redirect("/admin");
  } else {
    res.render("admin/login", {
      loginErr: req.session.adminLoginErr,
      admin: true,
    });
    req.session.adminLoginErr = false;
  }
});

router.post("/login", (req, res) => {
  adminHelpers.adminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.admin.loggedIn = true;
      res.redirect("/admin");
    } else {
      req.session.adminLoginErr = "invalid credentials";
      res.redirect("/admin/login");
    }
  });
});

router.get("/view-users", function (req, res) {
  let adminData = req.session.admin;
  userHelpers.getAllUsers().then((users) => {
    res.render("admin/view-users", { admin: true, users, adminData });
  });
});

router.get("/block-user/:id", async (req, res) => {
  userHelpers.blockUser(req.params.id);
  res.redirect("/admin/view-users");
});

router.get("/unblock-user/:id", async (req, res) => {
  userHelpers.unblockUser(req.params.id);
  res.redirect("/admin/view-users");
});

router.get("/logout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin/login");
});

router.get("/category-management", (req, res) => {
  let adminData = req.session.admin;

  adminHelpers.getCategory().then((category) => {
    console.log(category);
    res.render("admin/adminCategoryManagement", {
      admin: true,
      category,
      adminData,
    });
  });
});

router.get("/addNewCategory", (req, res) => {
  res.render("admin/addNewCategory");
});
router.post("/addNewCategory", (req, res) => {
  adminHelpers.addCategory(req.body, (id) => {
    adminHelpers.getCategory().then((category) => {
      console.log(category);
      res.render("admin/adminCategoryManagement", { admin: true, category });
    });
  });
});
router.get("/delete-category/:id", (req, res) => {
  let categoryId = req.params.id;

  adminHelpers.deleteCategory(categoryId).then((response) => {
    res.redirect("/admin/category-management");
  });
});

router.get("/order-management", verifyAdminLogin, (req, res) => {
  let adminData = req.session.admin;
  adminHelpers
    .allOrders()
    .then((orders) => {
      res.render("admin/order-management", { admin: true, orders, adminData });
    })
    .catch((error) => {
      console.log(error);
    });
});

router.get("/viewOrderUp/:orderId", verifyAdminLogin, async (req, res) => {
  let orderId = req.params.orderId;
  // console.log("SESSION",req.params.orderId);
  let adminData = req.session.admin;
  let proDetails = await userHelpers.getOrderProducts(orderId);
  // console.log("PRODUCT DETILAS123",proDetails);
  adminHelpers.orderDetails(orderId).then((orderDetails) => {
    res.render("admin/adminOrderView", {
      admin: true,
      orderDetails,
      proDetails,
      adminData,
    });
  });
});

router.post("/cancelOrder/:orderId", (req, res) => {
  let orderId = req.params.orderId;
  let remark = req.body.remark;
  adminHelpers
    .cancelOrder(orderId, remark)
    .then((response) => {
      res.redirect("../viewOrderUp/" + orderId);
    })
    .catch((error) => {
      console.log(error);
    });
});

router.post("/orderStatusUpdate/:orderId", (req, res) => {
  let orderId = req.params.orderId;
  let status = req.body.status;

  adminHelpers
    .updateOrderStatus(orderId, status)
    .then((response) => {
      res.redirect("../viewOrderUp/" + orderId);
    })
    .catch((error) => {
      console.log(error);
    });
});

router.get("/salesReport", verifyAdminLogin, async (req, res) => {
  adminData = req.session.admin;
  adminHelpers
    .allOrders()
    .then((orders) => {
      // console.log("hyy orderss::",orders);
      res.render("admin/salesReport", { admin: true, orders, adminData });
    })
    .catch(() => {
      res.redirect("user/error");
    });
});

router.get("/exportExcel", verifyAdminLogin, async (req, res) => {
  let salesReport = await adminHelpers.getTotalSalesReport();
  const prods = salesReport.map((prod) => {
    return prod.products;
  });
  console.log(prods);

  try {
    const workbook = new excelJs.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");
    worksheet.columns = [
      { header: "S no.", key: "s_no" },
      { header: "OrderID", key: "_id" },
      { header: "User", key: "name" },
      { header: "Date", key: "date" },

      { header: "Method", key: "paymentMethod" },
      { header: "status", key: "status" },
      { header: "Amount", key: "totalAmount" },
    ];
    let counter = 1;
    salesReport.forEach((report) => {
      report.s_no = counter;

      report.name = report.deliveryDetails.name;

      console.log(report.prods);
      worksheet.addRow(report);
      counter++;
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    res.header(
      "Content-Type",
      "application/vnd.oppenxmlformats-officedocument.spreadsheatml.sheet"
    );
    res.header("Content-Disposition", "attachment; filename=report.xlsx");

    workbook.xlsx.write(res);
  } catch (err) {
    console.log(err);
    res.redirect("/error");
  }
});

router.get("/coupon", verifyAdminLogin, (req, res) => {
  adminData = req.session.admin;
  adminHelpers.allCoupon().then((coupon) => {
    res.render("admin/coupon", { admin: true, coupon, adminData });
  });
});

router.post("/coupon", verifyAdminLogin, (req, res) => {
  adminData = req.session.admin;
 
  req.body.value = parseInt(req.body.value);
  adminHelpers
    .addCoupon(req.body)
    .then(() => {
      res.redirect("./coupon");
    })
    .catch((data) => {
      adminHelpers.allCoupon().then((coupon) => {
        let message = data.message;
        res.render("admin/coupon", { admin: true, adminData, coupon, message });
      });
    });
});

router.get("/couponDelete/:couponId", verifyAdminLogin, (req, res) => {
  let couponId = req.params.couponId;
  adminHelpers.couponDelete(couponId).then((response) => {
    res.redirect("/admin/coupon");
  });
});

router.get("/addBanner", async (req, res) => {

  res.render("admin/addBanner");
});
router.post("/addBanner", (req, res) => {
  productHelpers.addBanner(req.body, (id) => {
    let image = req.files.Image;
    console.log(id);
    image.mv("./public/banner/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.redirect("/admin/viewBanner");
      } else {
        console.log(err);
      }
    });
  });
});
router.get("/viewBanner",(req,res)=>{
  adminData=req.session.admin
  productHelpers.getAllBanner().then((banner) => {
    // console.log(banner);
    res.render("admin/viewBanner", { admin: true,banner, adminData });
  })

})
router.get("/deleteBanners/:id", (req, res) => {
  let BannerId = req.params.id;
  productHelpers.deleteBanner(BannerId).then((response) => {
    res.redirect("/admin/viewBanner");
  });
});


module.exports = router;
