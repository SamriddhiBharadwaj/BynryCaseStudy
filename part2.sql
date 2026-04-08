create table companies(
    id int primary key generated always as identity,
    name varchar(255) not null
);

create table warehouses(
    id int primary key generated always as identity,
    company_id int not null,
    name varchar(255) not null,
    location varchar(255),

    foreign key(company_id) references companies(id)
)   

create table products(
    id int primary key generated always as identity, 
    name varchar(255) not null,
    sku varchar(255) not null unique,
    price decimal(10, 2) not null,

    check (price >= 0)
)

create table inventory(
    id int primary key generated always as identity,
    warehouse_id int not null,
    product_id int not null,
    quantity int default 0 not null,

    foreign key(warehouse_id) references warehouses(id),

    foreign key(product_id) references products(id),

    unique(product_id, warehouse_id),
    check (quantity >= 0)
)

create table inventory_logs(
    id int primary key generated always as identity,
    warehouse_id int not null,
    product_id int not null,
    change int not null,
    created_at timestamp default current_timestamp,

    foreign key(warehouse_id) references warehouses(id),

    foreign key(product_id) references products(id)
)

create table suppliers(
    id int primary key generated always as identity,
    name varchar(255) not null
)

create table supplier_products(
    supplier_id int not null,
    product_id int not null,

    primary key(supplier_id, product_id),

    foreign key(supplier_id) references suppliers(id),
    foreign key(product_id) references products(id)
)

create table product_bundles(
    bundle_id int not null,
    component_product_id int not null,
    quantity int not null,

    primary key(bundle_id, product_id),

    foreign key(component_product_id) references products(id),
    foreign key(bundle_id) references products(id)
)