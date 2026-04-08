const express = require("express");
const router = express.Router();
const { Op, fn, col, literal } = require("sequelize");

const {
  Product,
  Warehouse,
  Inventory,
  InventoryLog,
  Supplier,
  SupplierProduct
} = require("../models");

router.get("/api/companies/:company_id/alerts/low-stock", async (req, res) => {
  const { company_id } = req.params;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // sales aggregation subquery
    const salesData = await InventoryLog.findAll({
      attributes: [
        "product_id",
        "warehouse_id",
        [fn("SUM", fn("ABS", col("change"))), "total_sold"],
        [fn("COUNT", col("id")), "days_with_sales"]
      ],
      where: {
        change: { [Op.lt]: 0 },
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      group: ["product_id", "warehouse_id"],
      raw: true
    });

    // converting salesData to a lookup map
    const salesMap = {};
    salesData.forEach(s => {
      const key = `${s.product_id}_${s.warehouse_id}`;
      salesMap[key] = s;
    });

    // main query
    const inventoryRows = await Inventory.findAll({
      include: [
        {
          model: Product,
          attributes: ["id", "name", "sku", "threshold"]
        },
        {
          model: Warehouse,
          attributes: ["id", "name"],
          where: { company_id }
        }
      ],
      raw: true,
      nest: true
    });

    // alerts array
    const alerts = [];

    for (let row of inventoryRows) {
      const key = `${row.product_id}_${row.warehouse_id}`;
      const sales = salesMap[key];

      if (!sales) continue;

      const { total_sold, days_with_sales } = sales;

      if (!days_with_sales || total_sold === 0) continue;

      const avgDailySales = total_sold / days_with_sales;

      if (avgDailySales === 0) continue;

      const threshold = row.Product.threshold;

      if (row.quantity >= threshold) continue;

      const daysUntilStockout = Math.floor(row.quantity / avgDailySales);

      // fetch first supplier
      const supplier = await Supplier.findOne({
        include: [{
          model: SupplierProduct,
          where: { product_id: row.product_id }
        }]
      });

      alerts.push({
        product_id: row.Product.id,
        product_name: row.Product.name,
        sku: row.Product.sku,
        warehouse_id: row.Warehouse.id,
        warehouse_name: row.Warehouse.name,
        current_stock: row.quantity,
        threshold,
        days_until_stockout: daysUntilStockout,
        supplier: supplier ? {
          id: supplier.id,
          name: supplier.name,
          contact_email: supplier.contact_email
        } : null
      });
    }

    // return alerts
    return res.json({
      alerts,
      total_alerts: alerts.length
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;