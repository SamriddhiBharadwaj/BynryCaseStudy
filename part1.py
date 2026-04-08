from decimal import Decimal
from flask import request, jsonify

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()

    # check if response is ok
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    # validate required fields
    required_fields = ['name', 'sku', 'price', 'warehouse_id']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400
    
    # wrap in a try-catch block
    try:
        # validate price
        price = Decimal(str(data['price']))
        if price < 0:
            return jsonify({"error": "Price cannot be negative"}), 400
        
        warehouse_id = data['warehouse_id']

        # optional fields
        quantity = data.get('initial_quantity') # use get to prevent key error
        # validate quantity
        if quantity < 0:
            return jsonify({"error": "Quantity cannot be negative"}), 400

        # check if sku already exists
        existing_product = Product.query.filter_by(sku=data['sku']).first()
        if existing_product:
            return jsonify({"error": "SKU already exists"}), 409

        # create product
        product = Product(
            name=data['name'],
            sku=data['sku'],
            price=price
            # warehouse_id removed since each product can be in multiple warehouses
        )

        db.session.add(product)
        db.session.flush()
        # Create inventory ONLY if warehouse provided
        inventory = Inventory(
            product_id=product.id,
            warehouse_id=warehouse_id,
            quantity=quantity
        )

        db.session.add(inventory)
        db.session.commit()

        return jsonify({
            "message": "Product created",
            "product_id": product.id
        }), 201
    # incase of exception, rollback
    except Exception:
        db.session.rollback()
