--
-- PostgreSQL database dump
--

\restrict nfbXSBz3TsYY7HgdAoOJFbDyZFeJhAZ491QG6GCAqBjgzWrbdkzjxEXMBiKusSz

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_login; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_login (
    admin_id integer NOT NULL,
    email character varying(255) NOT NULL,
    passwordhash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_login OWNER TO postgres;

--
-- Name: admin_login_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_login_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_login_admin_id_seq OWNER TO postgres;

--
-- Name: admin_login_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_login_admin_id_seq OWNED BY public.admin_login.admin_id;


--
-- Name: buyer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buyer (
    room_id integer NOT NULL,
    buyer_id integer NOT NULL,
    agreed_amount numeric(12,2),
    ready boolean DEFAULT false NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.buyer OWNER TO postgres;

--
-- Name: deal_proofs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deal_proofs (
    proof_id integer NOT NULL,
    room_id integer NOT NULL,
    user_id integer NOT NULL,
    proof_type character varying(30) NOT NULL,
    file_path character varying(255) NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deal_proofs_type_check CHECK (((proof_type)::text = 'Fulfillment'::text))
);


ALTER TABLE public.deal_proofs OWNER TO postgres;

--
-- Name: deal_proofs_proof_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deal_proofs_proof_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deal_proofs_proof_id_seq OWNER TO postgres;

--
-- Name: deal_proofs_proof_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deal_proofs_proof_id_seq OWNED BY public.deal_proofs.proof_id;


--
-- Name: room; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room (
    room_id integer NOT NULL,
    room_code character varying(10) NOT NULL,
    created_by integer NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    archived_until timestamp without time zone,
    item_name character varying(255),
    item_description text,
    agreed_price numeric(12,2),
    payment_status character varying(20) DEFAULT 'Waiting'::character varying,
    bakong_transaction_id character varying(100),
    payment_verified_at timestamp without time zone,
    payment_provider character varying(30) DEFAULT 'Bakong'::character varying,
    CONSTRAINT room_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Waiting'::character varying, 'Paid'::character varying, 'Released'::character varying, 'Refunded'::character varying])::text[]))),
    CONSTRAINT room_status_check CHECK (((status)::text = ANY ((ARRAY['Waiting'::character varying, 'Ready'::character varying, 'Completed'::character varying, 'Cancelled'::character varying])::text[])))
);


ALTER TABLE public.room OWNER TO postgres;

--
-- Name: room_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_messages (
    message_id integer NOT NULL,
    room_id integer NOT NULL,
    sender_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.room_messages OWNER TO postgres;

--
-- Name: room_messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.room_messages_message_id_seq OWNER TO postgres;

--
-- Name: room_messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_messages_message_id_seq OWNED BY public.room_messages.message_id;


--
-- Name: room_room_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_room_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.room_room_id_seq OWNER TO postgres;

--
-- Name: room_room_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_room_id_seq OWNED BY public.room.room_id;


--
-- Name: seller; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller (
    room_id integer NOT NULL,
    seller_id integer NOT NULL,
    agreed_amount numeric(12,2),
    ready boolean DEFAULT false NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seller OWNER TO postgres;

--
-- Name: transactions_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions_history (
    transaction_id integer NOT NULL,
    room_id integer,
    room_code character varying(10),
    buyer_id integer NOT NULL,
    seller_id integer NOT NULL,
    item_name character varying(255),
    item_description text,
    agreed_price numeric(12,2),
    transaction_amount numeric(12,2) NOT NULL,
    fee_amount numeric(12,2) NOT NULL,
    seller_receive numeric(12,2) NOT NULL,
    platform_income numeric(12,2) NOT NULL,
    fulfillment_proof character varying(255),
    fulfillment_uploaded_at timestamp without time zone,
    payment_verified_at timestamp without time zone,
    released_at timestamp without time zone,
    transaction_status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    bakong_transaction_id character varying(100),
    payment_provider character varying(30) DEFAULT 'Bakong'::character varying,
    CONSTRAINT transactions_history_status_check CHECK (((transaction_status)::text = ANY ((ARRAY['Completed'::character varying, 'Cancelled'::character varying])::text[])))
);


ALTER TABLE public.transactions_history OWNER TO postgres;

--
-- Name: transactions_history_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_history_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_history_transaction_id_seq OWNER TO postgres;

--
-- Name: transactions_history_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_history_transaction_id_seq OWNED BY public.transactions_history.transaction_id;


--
-- Name: user_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_details (
    user_id integer NOT NULL,
    firstname character varying(50) NOT NULL,
    lastname character varying(50) NOT NULL,
    phonenumber character varying(20) NOT NULL,
    nationalidentity_id character varying(30) NOT NULL,
    dob date NOT NULL,
    address text NOT NULL,
    verify_status character varying(20) NOT NULL,
    national_id_front character varying(255),
    national_id_back character varying(255),
    profile_picture character varying(255),
    CONSTRAINT user_details_verify_status_check CHECK (((verify_status)::text = ANY ((ARRAY['Pending'::character varying, 'Verified'::character varying, 'Rejected'::character varying])::text[])))
);


ALTER TABLE public.user_details OWNER TO postgres;

--
-- Name: user_login; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_login (
    user_id integer NOT NULL,
    email character varying(255) NOT NULL,
    passwordhash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_login OWNER TO postgres;

--
-- Name: user_login_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_login_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_login_user_id_seq OWNER TO postgres;

--
-- Name: user_login_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_login_user_id_seq OWNED BY public.user_login.user_id;


--
-- Name: user_wallet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_wallet (
    wallet_id integer NOT NULL,
    user_id integer NOT NULL,
    available_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    pending_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_received numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_withdrawn numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_wallet OWNER TO postgres;

--
-- Name: user_wallet_wallet_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_wallet_wallet_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_wallet_wallet_id_seq OWNER TO postgres;

--
-- Name: user_wallet_wallet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_wallet_wallet_id_seq OWNED BY public.user_wallet.wallet_id;


--
-- Name: admin_login admin_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_login ALTER COLUMN admin_id SET DEFAULT nextval('public.admin_login_admin_id_seq'::regclass);


--
-- Name: deal_proofs proof_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal_proofs ALTER COLUMN proof_id SET DEFAULT nextval('public.deal_proofs_proof_id_seq'::regclass);


--
-- Name: room room_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room ALTER COLUMN room_id SET DEFAULT nextval('public.room_room_id_seq'::regclass);


--
-- Name: room_messages message_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_messages ALTER COLUMN message_id SET DEFAULT nextval('public.room_messages_message_id_seq'::regclass);


--
-- Name: transactions_history transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_history ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_history_transaction_id_seq'::regclass);


--
-- Name: user_login user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login ALTER COLUMN user_id SET DEFAULT nextval('public.user_login_user_id_seq'::regclass);


--
-- Name: user_wallet wallet_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallet ALTER COLUMN wallet_id SET DEFAULT nextval('public.user_wallet_wallet_id_seq'::regclass);


--
-- Data for Name: admin_login; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_login (admin_id, email, passwordhash, created_at) FROM stdin;
1	admin@p2pdeal.com	$2b$12$/6o4ye/XM8XSk0OES4gfM.Bex3rNGuzafboIcnQQfCc6rq/41votO	2026-07-27 11:00:26.34587
\.


--
-- Data for Name: buyer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buyer (room_id, buyer_id, agreed_amount, ready, joined_at) FROM stdin;
\.


--
-- Data for Name: deal_proofs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deal_proofs (proof_id, room_id, user_id, proof_type, file_path, uploaded_at) FROM stdin;
\.


--
-- Data for Name: room; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room (room_id, room_code, created_by, status, created_at, archived_until, item_name, item_description, agreed_price, payment_status, bakong_transaction_id, payment_verified_at, payment_provider) FROM stdin;
\.


--
-- Data for Name: room_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_messages (message_id, room_id, sender_id, message, created_at) FROM stdin;
\.


--
-- Data for Name: seller; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seller (room_id, seller_id, agreed_amount, ready, joined_at) FROM stdin;
\.


--
-- Data for Name: transactions_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions_history (transaction_id, room_id, room_code, buyer_id, seller_id, item_name, item_description, agreed_price, transaction_amount, fee_amount, seller_receive, platform_income, fulfillment_proof, fulfillment_uploaded_at, payment_verified_at, released_at, transaction_status, created_at, completed_at, bakong_transaction_id, payment_provider) FROM stdin;
\.


--
-- Data for Name: user_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_details (user_id, firstname, lastname, phonenumber, nationalidentity_id, dob, address, verify_status, national_id_front, national_id_back, profile_picture) FROM stdin;
2	kk	pp	+855987654332	987654321	2000-02-09	yguyguyguyfuyguyguygyv	Verified	uploads/national_ids/user_2_front_capture.jpg	uploads/national_ids/user_2_back_capture.jpg	\N
1	ab	ac	+855123456789	123456789	2007-01-19	huguyugugugbwabh	Verified	uploads/national_ids/user_1_front_capture.jpg	uploads/national_ids/user_1_back_capture.jpg	\N
\.


--
-- Data for Name: user_login; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_login (user_id, email, passwordhash, created_at) FROM stdin;
1	z@gmail.com	$2b$12$OCjnqB9feYLRPMzX87IHR..1//lqXyUtEkfwSy4SYayNWQaURTLvO	2026-07-27 10:53:50.7538
2	x@gmail.com	$2b$12$2HI6KO3hi6M5qcHTiqVM7OPUeaM0Pp5b4XWqTI5WtskE7DPUJHi/K	2026-07-27 10:54:53.122055
\.


--
-- Data for Name: user_wallet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_wallet (wallet_id, user_id, available_balance, pending_balance, total_received, total_withdrawn, created_at, updated_at) FROM stdin;
1	1	0.00	0.00	0.00	0.00	2026-07-27 10:53:50.7538	2026-07-27 10:53:50.7538
2	2	0.00	0.00	0.00	0.00	2026-07-27 10:54:53.122055	2026-07-27 10:54:53.122055
\.


--
-- Name: admin_login_admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_login_admin_id_seq', 1, true);


--
-- Name: deal_proofs_proof_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deal_proofs_proof_id_seq', 1, false);


--
-- Name: room_messages_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_messages_message_id_seq', 1, false);


--
-- Name: room_room_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_room_id_seq', 1, false);


--
-- Name: transactions_history_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_history_transaction_id_seq', 1, false);


--
-- Name: user_login_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_login_user_id_seq', 2, true);


--
-- Name: user_wallet_wallet_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_wallet_wallet_id_seq', 2, true);


--
-- Name: admin_login admin_login_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_login
    ADD CONSTRAINT admin_login_email_key UNIQUE (email);


--
-- Name: admin_login admin_login_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_login
    ADD CONSTRAINT admin_login_pkey PRIMARY KEY (admin_id);


--
-- Name: buyer buyer_buyer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer
    ADD CONSTRAINT buyer_buyer_id_key UNIQUE (buyer_id);


--
-- Name: buyer buyer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer
    ADD CONSTRAINT buyer_pkey PRIMARY KEY (room_id);


--
-- Name: deal_proofs deal_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal_proofs
    ADD CONSTRAINT deal_proofs_pkey PRIMARY KEY (proof_id);


--
-- Name: room room_bakong_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_bakong_transaction_id_unique UNIQUE (bakong_transaction_id);


--
-- Name: room_messages room_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT room_messages_pkey PRIMARY KEY (message_id);


--
-- Name: room room_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_pkey PRIMARY KEY (room_id);


--
-- Name: room room_room_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_room_code_key UNIQUE (room_code);


--
-- Name: seller seller_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller
    ADD CONSTRAINT seller_pkey PRIMARY KEY (room_id);


--
-- Name: seller seller_seller_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller
    ADD CONSTRAINT seller_seller_id_key UNIQUE (seller_id);


--
-- Name: transactions_history transactions_history_bakong_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_history
    ADD CONSTRAINT transactions_history_bakong_transaction_id_unique UNIQUE (bakong_transaction_id);


--
-- Name: transactions_history transactions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_history
    ADD CONSTRAINT transactions_history_pkey PRIMARY KEY (transaction_id);


--
-- Name: user_details user_details_nationalidentity_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_details
    ADD CONSTRAINT user_details_nationalidentity_id_key UNIQUE (nationalidentity_id);


--
-- Name: user_details user_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_details
    ADD CONSTRAINT user_details_pkey PRIMARY KEY (user_id);


--
-- Name: user_login user_login_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login
    ADD CONSTRAINT user_login_email_key UNIQUE (email);


--
-- Name: user_login user_login_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login
    ADD CONSTRAINT user_login_pkey PRIMARY KEY (user_id);


--
-- Name: user_wallet user_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallet
    ADD CONSTRAINT user_wallet_pkey PRIMARY KEY (wallet_id);


--
-- Name: user_wallet user_wallet_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallet
    ADD CONSTRAINT user_wallet_user_id_key UNIQUE (user_id);


--
-- Name: buyer fk_buyer_room; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer
    ADD CONSTRAINT fk_buyer_room FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


--
-- Name: buyer fk_buyer_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer
    ADD CONSTRAINT fk_buyer_user FOREIGN KEY (buyer_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: deal_proofs fk_proof_room; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal_proofs
    ADD CONSTRAINT fk_proof_room FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


--
-- Name: deal_proofs fk_proof_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deal_proofs
    ADD CONSTRAINT fk_proof_user FOREIGN KEY (user_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: room fk_room_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT fk_room_creator FOREIGN KEY (created_by) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: room_messages fk_room_message_room; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT fk_room_message_room FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


--
-- Name: room_messages fk_room_message_sender; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT fk_room_message_sender FOREIGN KEY (sender_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: seller fk_seller_room; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller
    ADD CONSTRAINT fk_seller_room FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


--
-- Name: seller fk_seller_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller
    ADD CONSTRAINT fk_seller_user FOREIGN KEY (seller_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: transactions_history fk_transaction_buyer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_history
    ADD CONSTRAINT fk_transaction_buyer FOREIGN KEY (buyer_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: transactions_history fk_transaction_seller; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions_history
    ADD CONSTRAINT fk_transaction_seller FOREIGN KEY (seller_id) REFERENCES public.user_details(user_id) ON DELETE RESTRICT;


--
-- Name: user_details fk_userdetails_login; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_details
    ADD CONSTRAINT fk_userdetails_login FOREIGN KEY (user_id) REFERENCES public.user_login(user_id) ON DELETE CASCADE;


--
-- Name: user_wallet user_wallet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallet
    ADD CONSTRAINT user_wallet_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_login(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nfbXSBz3TsYY7HgdAoOJFbDyZFeJhAZ491QG6GCAqBjgzWrbdkzjxEXMBiKusSz

