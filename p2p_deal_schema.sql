--
-- PostgreSQL database dump
--

\restrict oD36aGAlG4XYEVOGPKPJxsw4QzaWKgtVufZVnguJEK8vS8M51Fe4LFRzq4YN1Xx

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
    description text,
    courier_name character varying(100),
    tracking_number character varying(100),
    reviewed boolean DEFAULT false,
    admin_note text,
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
-- Name: dispute_resolution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dispute_resolution (
    resolution_id integer NOT NULL,
    dispute_id integer NOT NULL,
    resolved_by integer NOT NULL,
    decision character varying(50) NOT NULL,
    refund_amount numeric(10,2) DEFAULT 0.00,
    winner_user integer,
    resolution_note text,
    resolved_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dispute_resolution OWNER TO postgres;

--
-- Name: dispute_resolution_resolution_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dispute_resolution_resolution_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dispute_resolution_resolution_id_seq OWNER TO postgres;

--
-- Name: dispute_resolution_resolution_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dispute_resolution_resolution_id_seq OWNED BY public.dispute_resolution.resolution_id;


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    dispute_id integer NOT NULL,
    room_id integer NOT NULL,
    opened_by integer NOT NULL,
    against_user integer NOT NULL,
    dispute_type character varying(50) NOT NULL,
    buyer_choice character varying(30),
    status character varying(30) DEFAULT 'Open'::character varying,
    reason text,
    created_at timestamp without time zone DEFAULT now(),
    closed_at timestamp without time zone
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- Name: disputes_dispute_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disputes_dispute_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disputes_dispute_id_seq OWNER TO postgres;

--
-- Name: disputes_dispute_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disputes_dispute_id_seq OWNED BY public.disputes.dispute_id;


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
    invited_user_id integer,
    escrow_fee numeric(10,2) DEFAULT 0,
    total_paid numeric(10,2) DEFAULT 0,
    shipping_status character varying(30) DEFAULT 'NotShipped'::character varying,
    courier_name character varying(100),
    tracking_number character varying(100),
    cancel_requested_by integer,
    cancel_reason text,
    completed_at timestamp without time zone,
    reinvite_count integer DEFAULT 0 NOT NULL,
    max_reinvites integer DEFAULT 3 NOT NULL,
    CONSTRAINT room_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Waiting'::character varying, 'Paid'::character varying, 'Released'::character varying, 'Refunded'::character varying])::text[]))),
    CONSTRAINT room_status_check CHECK (((status)::text = ANY ((ARRAY['Waiting'::character varying, 'Accepted'::character varying, 'Rejected'::character varying, 'RolesAssigned'::character varying, 'Completed'::character varying, 'Cancelled'::character varying])::text[])))
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
    reject_reason text,
    reject_comment text,
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    bio character varying(120),
    show_email boolean DEFAULT false,
    show_phone boolean DEFAULT false,
    profile_visibility character varying(20) DEFAULT 'public'::character varying,
    username character varying(30),
    display_name character varying(50),
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_profile_visibility CHECK (((profile_visibility)::text = ANY ((ARRAY['public'::character varying, 'partners'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT chk_username_format CHECK (((username IS NULL) OR ((username)::text ~ '^[a-z0-9_]{3,30}$'::text))),
    CONSTRAINT chk_username_length CHECK (((username IS NULL) OR ((length((username)::text) >= 3) AND (length((username)::text) <= 30)))),
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
-- Name: dispute_resolution resolution_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispute_resolution ALTER COLUMN resolution_id SET DEFAULT nextval('public.dispute_resolution_resolution_id_seq'::regclass);


--
-- Name: disputes dispute_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes ALTER COLUMN dispute_id SET DEFAULT nextval('public.disputes_dispute_id_seq'::regclass);


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
-- Name: dispute_resolution dispute_resolution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispute_resolution
    ADD CONSTRAINT dispute_resolution_pkey PRIMARY KEY (resolution_id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (dispute_id);


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
-- Name: idx_user_details_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_details_username ON public.user_details USING btree (username);


--
-- Name: dispute_resolution dispute_resolution_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispute_resolution
    ADD CONSTRAINT dispute_resolution_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(dispute_id) ON DELETE CASCADE;


--
-- Name: dispute_resolution dispute_resolution_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispute_resolution
    ADD CONSTRAINT dispute_resolution_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_login(admin_id);


--
-- Name: dispute_resolution dispute_resolution_winner_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispute_resolution
    ADD CONSTRAINT dispute_resolution_winner_user_fkey FOREIGN KEY (winner_user) REFERENCES public.user_login(user_id);


--
-- Name: disputes disputes_against_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_against_user_fkey FOREIGN KEY (against_user) REFERENCES public.user_login(user_id);


--
-- Name: disputes disputes_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.user_login(user_id);


--
-- Name: disputes disputes_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


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
-- Name: user_details fk_user_details_reviewed_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_details
    ADD CONSTRAINT fk_user_details_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES public.admin_login(admin_id) ON DELETE SET NULL;


--
-- Name: user_details fk_userdetails_login; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_details
    ADD CONSTRAINT fk_userdetails_login FOREIGN KEY (user_id) REFERENCES public.user_login(user_id) ON DELETE CASCADE;


--
-- Name: room room_cancel_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_cancel_requested_by_fkey FOREIGN KEY (cancel_requested_by) REFERENCES public.user_login(user_id);


--
-- Name: room room_invited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.user_details(user_id);


--
-- Name: user_wallet user_wallet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_wallet
    ADD CONSTRAINT user_wallet_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_login(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict oD36aGAlG4XYEVOGPKPJxsw4QzaWKgtVufZVnguJEK8vS8M51Fe4LFRzq4YN1Xx

