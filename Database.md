-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role character varying DEFAULT 'admin'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cart_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cart_id bigint NOT NULL,
  variant_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.carts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint UNIQUE,
  session_id character varying UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active'::character varying,
  deleted_at timestamp with time zone,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id bigint,
  sender character varying NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.chat_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint,
  visitor_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'::character varying,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.colors (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  hex_code character varying,
  CONSTRAINT colors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer_addresses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint NOT NULL,
  is_default boolean DEFAULT false,
  address_type character varying DEFAULT 'Home'::character varying,
  detailed_address text NOT NULL,
  phone_number character varying NOT NULL,
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.customers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  email character varying NOT NULL UNIQUE,
  password_hash text,
  status character varying DEFAULT 'active'::character varying,
  refresh_token text,
  refresh_token_expires timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint NOT NULL,
  variant_id bigint NOT NULL,
  quantity integer NOT NULL,
  price_at_purchase numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint NOT NULL,
  status character varying NOT NULL,
  admin_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint,
  customer_email character varying,
  shipping_address text NOT NULL,
  shipping_phone character varying NOT NULL,
  shipping_city character varying,
  shipping_district character varying,
  shipping_ward character varying,
  fulfillment_status character varying DEFAULT 'pending'::character varying,
  payment_status character varying DEFAULT 'unpaid'::character varying,
  payment_method character varying DEFAULT 'cod'::character varying,
  shipping_fee numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.pages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  content text,
  status character varying DEFAULT 'Draft'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  transaction_id character varying,
  amount numeric NOT NULL,
  provider character varying,
  payment_method character varying,
  status character varying,
  response_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.product_images (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  variant_id bigint NOT NULL,
  image_url text NOT NULL,
  is_main boolean DEFAULT false,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.product_notifications (
  id character varying NOT NULL,
  user_id bigint NOT NULL,
  product_id bigint NOT NULL,
  size character varying,
  price_condition numeric,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  notified_at timestamp with time zone,
  CONSTRAINT product_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT product_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.customers(id),
  CONSTRAINT product_notifications_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  variant_id bigint NOT NULL,
  customer_id bigint NOT NULL,
  order_id bigint NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status character varying DEFAULT 'pending'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT product_reviews_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT product_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.product_variants (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id bigint NOT NULL,
  size_id bigint,
  color_id bigint,
  name character varying,
  sku character varying NOT NULL UNIQUE,
  total_stock integer DEFAULT 0,
  reserved_stock integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  status character varying DEFAULT 'active'::character varying,
  version integer DEFAULT 1,
  deleted_at timestamp with time zone,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_variants_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id),
  CONSTRAINT product_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id)
);
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  full_description text,
  cost_price numeric,
  selling_price numeric NOT NULL,
  status character varying DEFAULT 'active'::character varying,
  thumbnail_url text,
  average_rating numeric DEFAULT 0.00,
  total_reviews integer DEFAULT 0,
  attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.promotion_products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  promotion_id bigint NOT NULL,
  product_id bigint NOT NULL,
  flash_sale_price numeric NOT NULL,
  CONSTRAINT promotion_products_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.promotion_usage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  promotion_id bigint NOT NULL,
  order_id bigint NOT NULL,
  customer_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_usage_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_usage_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT promotion_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT promotion_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.promotions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL,
  discount_value numeric NOT NULL,
  discount_type character varying NOT NULL,
  number_limited integer,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'scheduled'::character varying,
  CONSTRAINT promotions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.restock_batches (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  admin_id bigint NOT NULL,
  type character varying DEFAULT 'Manual'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restock_batches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.restock_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  batch_id bigint NOT NULL,
  variant_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  CONSTRAINT restock_items_pkey PRIMARY KEY (id),
  CONSTRAINT restock_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.restock_batches(id),
  CONSTRAINT restock_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.sizes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT sizes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_ticket_replies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ticket_id bigint NOT NULL,
  admin_id bigint,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_ticket_replies_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id)
);
CREATE TABLE public.support_tickets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ticket_code character varying NOT NULL UNIQUE,
  customer_id bigint,
  customer_email character varying,
  subject character varying NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  source character varying DEFAULT 'contact_form'::character varying,
  message text,
  priority character varying DEFAULT 'medium'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.wishlist_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint NOT NULL,
  variant_id bigint NOT NULL,
  CONSTRAINT wishlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT wishlist_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);